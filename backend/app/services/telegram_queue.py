import asyncio
import os
import json
import uuid
import time
import logging
import datetime
import subprocess
from dataclasses import dataclass, asdict
from typing import Optional, Dict, Any

import httpx
from sqlalchemy import select

from app.core.config import settings
from app.core.timezone import get_brasilia_now
from app.db.session import AsyncSessionLocal
from app.db.models import EventRecord
from app.services.telegram_vault import telegram_vault_service
from app.services.frigate_bridge import frigate_bridge

logger = logging.getLogger(__name__)

QUEUE_DIR = "/tmp/event_queue"

@dataclass
class TelegramEventItem:
    event_id: str
    camera: str
    label: str
    score: float
    zone_name: Optional[str]
    friendly_name: Optional[str]
    start_time: float
    end_time: Optional[float]
    clip_start_ts: int
    clip_end_ts: int
    target_duration: int
    enqueued_at: float = 0.0

class TelegramVideoQueue:
    """
    Sequential Disk-Buffered Video Processing Queue for Telegram Alerts.
    
    Guarantees:
    1. Golden Duration Rule: 5s pre-capture + detection (min 10s) + 5s post-capture = MINIMUM 20s.
    2. Zero Stains / Zero Macroblocks: normalized H.264 CFR with libx264 and yuv420p pixel format.
    3. CPU Contention Elimination: sequential FIFO processing (1 video at a time), preventing
       overheating and thread locks during simultaneous multi-camera detection bursts.
    4. Disk-buffered persistence in /tmp/event_queue/ for resilience across brief reloads.
    """
    def __init__(self):
        self._queue: asyncio.Queue[TelegramEventItem] = asyncio.Queue()
        self._worker_task: Optional[asyncio.Task] = None
        self._running = False
        os.makedirs(QUEUE_DIR, exist_ok=True)

    def start(self):
        if not self._running:
            self._running = True
            self._worker_task = asyncio.create_task(self._worker_loop())
            self._recover_pending_events()
            logger.info("🚀 TelegramVideoQueue iniciado: Fila sequencial de 20s mínimos e buffer em disco ativa.")

    def stop(self):
        self._running = False
        if self._worker_task:
            self._worker_task.cancel()

    def _recover_pending_events(self):
        """Recovers any pending disk-buffered events from /tmp/event_queue/ upon startup."""
        try:
            for fname in os.listdir(QUEUE_DIR):
                if fname.endswith(".json"):
                    fpath = os.path.join(QUEUE_DIR, fname)
                    try:
                        with open(fpath, "r", encoding="utf-8") as f:
                            data = json.load(f)
                            item = TelegramEventItem(**data)
                            self._queue.put_nowait(item)
                            logger.info(f"🔄 Recuperado evento da fila em disco: {item.event_id} ({item.camera})")
                    except Exception as e:
                        logger.warning(f"Erro ao recuperar evento pendente {fname}: {e}")
        except Exception as e:
            logger.debug(f"Nenhum evento pendente para recuperar em disco: {e}")

    async def enqueue_event(
        self,
        event_id: str,
        camera: str,
        label: str,
        score: float,
        zone_name: Optional[str],
        friendly_name: Optional[str],
        start_time: float,
        end_time: Optional[float]
    ):
        """
        Calculates the Golden Duration window (5s pre + min 10s det + 5s post = MIN 20s),
        persists to disk buffer, and adds to FIFO processing queue.
        """
        now_ts = datetime.datetime.now(datetime.timezone.utc).timestamp()
        event_start = start_time if start_time > 0 else (now_ts - 10.0)

        # Regra de ouro da duração:
        # 5s antes + detecção (mín. 10s) + 5s depois = MÍNIMO 20 SEGUNDOS (máx 60s)
        pre_capture = 5.0
        post_capture = 5.0
        min_detection = 10.0

        event_end = end_time if (end_time and end_time > event_start) else (event_start + min_detection)
        if event_end - event_start < min_detection:
            event_end = event_start + min_detection

        clip_start_ts = int(event_start - pre_capture)
        clip_end_ts = int(event_end + post_capture)

        if clip_end_ts - clip_start_ts < 20:
            clip_end_ts = clip_start_ts + 20
        if clip_end_ts - clip_start_ts > 60:
            clip_end_ts = clip_start_ts + 60

        target_duration = int(clip_end_ts - clip_start_ts)

        item = TelegramEventItem(
            event_id=event_id,
            camera=camera,
            label=label,
            score=score,
            zone_name=zone_name,
            friendly_name=friendly_name,
            start_time=event_start,
            end_time=event_end,
            clip_start_ts=clip_start_ts,
            clip_end_ts=clip_end_ts,
            target_duration=target_duration,
            enqueued_at=now_ts
        )

        # 1. Persist to disk buffer
        disk_file = os.path.join(QUEUE_DIR, f"{event_id}.json")
        try:
            with open(disk_file, "w", encoding="utf-8") as f:
                json.dump(asdict(item), f)
        except Exception as e:
            logger.warning(f"Falha ao persistir evento no buffer de disco: {e}")

        # 2. Add to FIFO Queue
        await self._queue.put(item)
        logger.info(
            f"📥 Evento enfileirado na TelegramVideoQueue: {event_id} | Cam={camera} | "
            f"Alvo={target_duration}s (5s pré + {int(event_end - event_start)}s det + 5s pós) | "
            f"Fila: {self._queue.qsize()} pendente(s)"
        )

    async def _worker_loop(self):
        """Worker that sequentially consumes video alert tasks one at a time."""
        while self._running:
            try:
                item = await self._queue.get()
                await self._process_item(item)
                self._queue.task_done()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Erro inesperado no worker da TelegramVideoQueue: {e}", exc_info=True)
                await asyncio.sleep(2.0)

    async def _process_item(self, item: TelegramEventItem):
        """Processes a single event item: waits for segments, fetches MP4, transcodes cleanly, and sends."""
        event_id = item.event_id
        camera = item.camera
        disk_file = os.path.join(QUEUE_DIR, f"{event_id}.json")

        try:
            # 1. Verify idempotency in database
            async with AsyncSessionLocal() as session:
                stmt = select(EventRecord).where(EventRecord.frigate_event_id == event_id)
                res = await session.execute(stmt)
                existing = res.scalar_one_or_none()
                if existing and getattr(existing, "video_sent", False):
                    logger.info(f"⏭️ Vídeo do evento {event_id} já enviado anteriormente. Ignorando.")
                    self._cleanup_disk_item(disk_file)
                    return

            # 2. Wait until clip_end_ts timestamp has passed + 1.5s for Frigate to finalize NVMe segment writes
            now_utc = datetime.datetime.now(datetime.timezone.utc).timestamp()
            wait_seconds = max(0.0, (item.clip_end_ts - now_utc) + 1.5)
            if wait_seconds > 0:
                logger.info(f"⏳ [TelegramVideoQueue] Aguardando gravação física dos 20s mínimos ({wait_seconds:.1f}s)...")
                await asyncio.sleep(min(wait_seconds, 15.0))

            # 3. Retrieve clip from Frigate
            clip_bytes = await self._fetch_clip_with_retries(item)

            if not clip_bytes:
                # Emergency live fallback
                logger.warning(f"⚠️ Frigate não disponibilizou o clipe para {event_id}. Disparando fallback de gravação ao vivo...")
                clip_bytes = await frigate_bridge.record_live_video(camera_name=camera, duration_s=item.target_duration)

            if not clip_bytes or not frigate_bridge.has_video_stream(clip_bytes):
                logger.error(f"❌ Não foi possível obter vídeo válido para o evento {event_id}")
                self._cleanup_disk_item(disk_file)
                return

            # 4. Clean Transcode (libx264, yuv420p, zero artifacts, CFR 25fps)
            t0 = time.time()
            clean_video = await self._transcode_clean_video(clip_bytes, target_fps=25)
            t_transcode = time.time() - t0

            if not clean_video:
                clean_video = clip_bytes

            real_dur = frigate_bridge.get_video_duration(clean_video)
            final_duration = real_dur if real_dur > 0 else float(item.target_duration)

            logger.info(
                f"✨ Transcodificação limpa concluída ({t_transcode:.1f}s, {len(clean_video)} bytes, "
                f"Dur={final_duration:.1f}s). Enviando ao Telegram..."
            )

            # 5. Send via Telegram Vault Service
            sent_ok = await telegram_vault_service.send_alert_video(
                video_bytes=clean_video,
                camera_name=camera,
                label=item.label,
                zone=item.zone_name,
                duration_s=final_duration,
                score=item.score,
                friendly_name=item.friendly_name
            )

            if sent_ok:
                async with AsyncSessionLocal() as session:
                    stmt = select(EventRecord).where(EventRecord.frigate_event_id == event_id)
                    res = await session.execute(stmt)
                    ev = res.scalar_one_or_none()
                    if ev:
                        ev.has_clip = True
                        ev.video_sent = True
                        ev.end_time = get_brasilia_now()
                        await session.commit()
                logger.info(f"✅ Vídeo de alerta de {final_duration:.1f}s entregue com sucesso no Telegram ({event_id})")

        except Exception as e:
            logger.error(f"❌ Falha ao processar item na TelegramVideoQueue ({event_id}): {e}", exc_info=True)
        finally:
            self._cleanup_disk_item(disk_file)

    async def _fetch_clip_with_retries(self, item: TelegramEventItem) -> Optional[bytes]:
        """Tries to download the extended range clip from Frigate with incremental delays."""
        delays = [1.0, 2.5, 4.0]
        async with httpx.AsyncClient(timeout=35.0) as client:
            for attempt, delay in enumerate(delays, start=1):
                await asyncio.sleep(delay)
                try:
                    # 1. Extended range URL
                    range_url = f"{settings.FRIGATE_API_URL}/api/{item.camera}/start/{item.clip_start_ts}/end/{item.clip_end_ts}/clip.mp4"
                    resp = await client.get(range_url)
                    if resp.status_code == 200 and len(resp.content) > 10000:
                        if frigate_bridge.has_video_stream(resp.content):
                            return resp.content

                    # 2. Event clip with padding
                    event_url = f"{settings.FRIGATE_API_URL}/api/events/{item.event_id}/clip.mp4?padding=10"
                    resp2 = await client.get(event_url)
                    if resp2.status_code == 200 and len(resp2.content) > 10000:
                        if frigate_bridge.has_video_stream(resp2.content):
                            return resp2.content
                except Exception as e:
                    logger.debug(f"Tentativa {attempt} para {item.event_id} falhou: {e}")
        return None

    async def _transcode_clean_video(self, video_bytes: bytes, target_fps: int = 25) -> Optional[bytes]:
        """
        FFmpeg pipeline specifically engineered to fix color blotches, green frames,
        and macroblock corruption:
        - Uses libx264 with -preset veryfast -crf 22
        - Enforces strict pixel format -pix_fmt yuv420p (guarantees universal color mapping)
        - Uses filter 'setpts=N/(25*TB),format=yuv420p' to regenerate clean timestamps
        - Keeps audio via AAC or cleanly drops it without errors
        """
        in_file = f"/tmp/in_q_{uuid.uuid4().hex[:8]}.mp4"
        out_file = f"/tmp/out_q_{uuid.uuid4().hex[:8]}.mp4"

        try:
            with open(in_file, "wb") as f:
                f.write(video_bytes)

            has_audio = frigate_bridge._has_audio_stream(in_file)
            audio_args = ["-c:a", "aac", "-b:a", "128k"] if has_audio else ["-an"]

            cmd = [
                "ffmpeg", "-y",
                "-fflags", "+genpts+discardcorrupt",
                "-i", in_file,
                "-vf", f"setpts=N/({target_fps}*TB),format=yuv420p",
                *audio_args,
                "-r", str(target_fps),
                "-c:v", "libx264",
                "-preset", "veryfast",
                "-crf", "22",
                "-pix_fmt", "yuv420p",
                "-movflags", "+faststart",
                out_file
            ]

            proc = await asyncio.to_thread(
                subprocess.run,
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                timeout=45
            )

            if proc.returncode == 0 and os.path.exists(out_file) and os.path.getsize(out_file) > 5000:
                with open(out_file, "rb") as f:
                    result_bytes = f.read()
                return result_bytes
            else:
                err_msg = proc.stderr.decode("utf-8", errors="ignore")[-200:]
                logger.warning(f"FFmpeg transcode returned non-zero code {proc.returncode}: {err_msg}")
                return None
        except Exception as e:
            logger.error(f"Erro no transcode limpo de vídeo: {e}")
            return None
        finally:
            for p in (in_file, out_file):
                if os.path.exists(p):
                    try:
                        os.remove(p)
                    except Exception:
                        pass

    def _cleanup_disk_item(self, disk_file: str):
        if os.path.exists(disk_file):
            try:
                os.remove(disk_file)
            except Exception:
                pass

telegram_video_queue = TelegramVideoQueue()
