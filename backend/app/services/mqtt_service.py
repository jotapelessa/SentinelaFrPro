import json
import asyncio
import logging
import httpx
import datetime
from cachetools import TTLCache
from typing import Dict, Any, Callable, List, Optional
from aiomqtt import Client, MqttError
from app.core.config import settings
from app.db.session import AsyncSessionLocal
from app.db.models import EventRecord
from app.services.telegram_vault import telegram_vault_service
from app.services.pip_gateway import pip_gateway_service
from sqlalchemy import select

logger = logging.getLogger(__name__)

CRITICAL_LABELS = {"person", "car", "motorcycle", "bus", "truck", "dog", "cat"}
_MAX_PROCESSED_EVENTS = 500


class MQTTService:
    def __init__(self):
        self.ws_broadcast_callbacks: List[Callable[[Dict[str, Any]], Any]] = []
        self._processed_events: TTLCache = TTLCache(maxsize=10000, ttl=86400)
        self._cooldowns: Dict[str, float] = {}
        self._mqtt_traffic: List[Dict[str, Any]] = []

    def record_mqtt_traffic(self, topic: str, payload_summary: Dict[str, Any]):
        entry = {
            "timestamp": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "topic": topic,
            "data": payload_summary
        }
        self._mqtt_traffic.insert(0, entry)
        if len(self._mqtt_traffic) > 200:
            self._mqtt_traffic.pop()

    def get_mqtt_traffic(self, limit: int = 100) -> List[Dict[str, Any]]:
        return self._mqtt_traffic[:limit]

    def register_ws_callback(self, cb: Callable[[Dict[str, Any]], Any]):
        self.ws_broadcast_callbacks.append(cb)

    async def broadcast_event(self, event_data: Dict[str, Any]):
        for cb in self.ws_broadcast_callbacks:
            try:
                res = cb(event_data)
                if asyncio.iscoroutine(res):
                    await res
            except Exception as e:
                logger.error(f"Error in ws callback: {e}")

    def _mark_processed(self, event_id: str):
        self._processed_events[event_id] = True

    async def _get_telegram_policy(self) -> Dict[str, Any]:
        """Dynamically loads live Telegram settings with 30s in-memory cache."""
        # Return cached policy if still fresh
        if hasattr(self, '_tg_policy_cache') and self._tg_policy_cache:
            import time
            if (time.time() - self._tg_policy_cache_time) < 30.0:
                return self._tg_policy_cache

        policy = {
            "send_mode": "both",
            "clip_duration_seconds": 15,
            "allowed_events": ["person", "car", "motorcycle", "bus", "truck", "dog", "cat"],
            "cooldown_seconds": 5.0
        }
        try:
            from app.db.models import SystemSetting
            async with AsyncSessionLocal() as session:
                stmt = select(SystemSetting).where(
                    SystemSetting.key.in_([
                        "telegram_send_mode",
                        "telegram_clip_duration_seconds",
                        "telegram_allowed_events",
                        "telegram_cooldown_seconds"
                    ])
                )
                res = await session.execute(stmt)
                for s in res.scalars().all():
                    if s.key == "telegram_send_mode" and s.value:
                        policy["send_mode"] = s.value.lower()
                    elif s.key == "telegram_clip_duration_seconds" and s.value:
                        policy["clip_duration_seconds"] = max(10, int(s.value))
                    elif s.key == "telegram_allowed_events" and s.value:
                        try:
                            policy["allowed_events"] = json.loads(s.value)
                        except Exception:
                            pass
                    elif s.key == "telegram_cooldown_seconds" and s.value:
                        policy["cooldown_seconds"] = max(1.0, float(s.value))
        except Exception as e:
            logger.debug(f"Could not load live telegram policy: {e}")

        # Cache the result
        import time
        self._tg_policy_cache = policy
        self._tg_policy_cache_time = time.time()
        return policy

    async def handle_frigate_event(self, payload: Dict[str, Any]):
        if not isinstance(payload, dict):
            return
        event_type = payload.get("type")
        after = payload.get("after") or {}
        before = payload.get("before") or {}

        event_id = after.get("id") or before.get("id")
        camera = after.get("camera") or before.get("camera", "camera")
        label = after.get("label") or before.get("label", "unknown")
        score = after.get("top_score") or after.get("score") or 0.0
        
        current_zones = after.get("current_zones") or []
        entered_zones = after.get("entered_zones") or []
        zones = list(set(current_zones + entered_zones))
        zone_name = zones[0] if zones else None

        self.record_mqtt_traffic(f"frigate/events ({event_type})", {
            "id": event_id,
            "camera": camera,
            "label": label,
            "score": round(score * 100, 1),
            "zone": zone_name
        })

        if label not in CRITICAL_LABELS:
            return

        # Filter out low-confidence false positives
        min_required_score = 0.65 if label in ["dog", "cat", "car", "motorcycle"] else 0.60
        if score > 0 and score < min_required_score:
            logger.debug(f"Descartando detecção de baixa confiança: {label} ({score:.2f} < {min_required_score})")
            return

        tg_policy = await self._get_telegram_policy()

        if event_type in ["new", "update"]:
            cooldown_key = f"{camera}:{label}"
            now_ts = asyncio.get_event_loop().time()
            last_time = self._cooldowns.get(cooldown_key, 0)
            cooldown_duration = tg_policy.get("cooldown_seconds", 3.0)

            # 1. Instant WebSocket Broadcast (<10ms) for UI & PiP
            await self.broadcast_event({
                "type": "CAMERA_DETECTION_ACTIVE",
                "camera": camera,
                "label": label,
                "score": round(score * 100) if score <= 1 else round(score),
                "zone": zone_name,
                "box": after.get("box"),
                "active": True
            })

            if event_id not in self._processed_events and (now_ts - last_time > cooldown_duration):
                self._mark_processed(event_id)
                self._cooldowns[cooldown_key] = now_ts
                logger.info(f"🚨 Security event: {label} on {camera} (zone: {zone_name}, score: {score:.2f})")

                snapshot_url = f"{settings.FRIGATE_API_URL}/api/events/{event_id}/snapshot.jpg"

                # Instant PiP Alert and New Detection messages to Android TV & Web
                await self.broadcast_event({
                    "type": "pip_alert",
                    "camera": camera,
                    "label": label,
                    "score": round(score * 100),
                    "zone": zone_name,
                    "event_id": event_id,
                    "snapshot_url": snapshot_url
                })

                await self.broadcast_event({
                    "type": "NEW_DETECTION",
                    "event_id": event_id,
                    "camera": camera,
                    "label": label,
                    "score": round(score * 100),
                    "zone": zone_name,
                    "box": after.get("box"),
                    "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                    "snapshot_url": snapshot_url
                })

                # 2. Asynchronous Background Task: Telegram Dispatch & DB Logging (Non-blocking)
                asyncio.create_task(
                    self._dispatch_background_alert_tasks(
                        event_id=event_id,
                        camera=camera,
                        label=label,
                        score=score,
                        zone_name=zone_name,
                        snapshot_url=snapshot_url,
                        tg_policy=tg_policy
                    )
                )

        elif event_type == "end":
            await self.broadcast_event({
                "type": "CAMERA_DETECTION_ACTIVE",
                "camera": camera,
                "label": label,
                "active": False
            })

            if event_id:
                start_t = after.get("start_time", 0)
                end_t = after.get("end_time", 0)
                configured_dur = tg_policy.get("clip_duration_seconds", 15)
                dur = max(float(configured_dur), float(end_t - start_t) if (end_t and start_t) else 10.0)

                send_mode = tg_policy.get("send_mode", "both")
                allowed_tg_events = tg_policy.get("allowed_events", list(CRITICAL_LABELS))

                if send_mode in ["both", "video_only"] and label in allowed_tg_events:
                    friendly_name = None
                    try:
                        from app.db.models import Camera
                        async with AsyncSessionLocal() as session:
                            cam_stmt = select(Camera).where(
                                (Camera.name == camera) | (Camera.ip_address == camera)
                            )
                            cam_res = await session.execute(cam_stmt)
                            cam_obj = cam_res.scalar_one_or_none()
                            if cam_obj and cam_obj.friendly_name:
                                friendly_name = cam_obj.friendly_name
                    except Exception:
                        pass

                    # Launch resilient background retry task to deliver MP4 video to Telegram
                    asyncio.create_task(
                        self._dispatch_telegram_video_with_retry(
                            event_id=event_id,
                            camera=camera,
                            label=label,
                            zone_name=zone_name,
                            duration_s=dur,
                            score=score,
                            friendly_name=friendly_name,
                            start_time=start_t,
                            end_time=end_t
                        )
                    )

    async def _dispatch_background_alert_tasks(
        self,
        event_id: str,
        camera: str,
        label: str,
        score: float,
        zone_name: Optional[str],
        snapshot_url: str,
        tg_policy: Dict[str, Any]
    ):
        """Asynchronously handles Telegram photo dispatch, DB logging, and Chromecast without blocking PiP."""
        try:
            snapshot_bytes = None
            async with httpx.AsyncClient(timeout=6.0) as client:
                try:
                    # 1. Fetch full uncropped HD snapshot (clean=0 preserves annotations, crop=0 guarantees full sensor frame, h=1080)
                    resp = await client.get(f"{settings.FRIGATE_API_URL}/api/events/{event_id}/snapshot.jpg?crop=0&h=1080")
                    if resp.status_code == 200 and len(resp.content) > 2000:
                        snapshot_bytes = resp.content
                    else:
                        # 2. Direct event snapshot fallback
                        resp_ev = await client.get(f"{settings.FRIGATE_API_URL}/api/events/{event_id}/snapshot.jpg")
                        if resp_ev.status_code == 200 and len(resp_ev.content) > 2000:
                            snapshot_bytes = resp_ev.content
                        else:
                            # 3. High-definition current camera frame fallback
                            resp_latest = await client.get(f"{settings.FRIGATE_API_URL}/api/{camera}/latest.jpg?h=1080")
                            if resp_latest.status_code == 200 and len(resp_latest.content) > 2000:
                                snapshot_bytes = resp_latest.content
                except Exception as e:
                    logger.debug(f"Could not retrieve snapshot: {e}")

            friendly_name = None
            try:
                from app.db.models import Camera
                async with AsyncSessionLocal() as session:
                    cam_stmt = select(Camera).where(
                        (Camera.name == camera) | (Camera.ip_address == camera)
                    )
                    cam_res = await session.execute(cam_stmt)
                    cam_obj = cam_res.scalar_one_or_none()
                    if cam_obj and cam_obj.friendly_name:
                        friendly_name = cam_obj.friendly_name
            except Exception:
                pass

            send_mode = tg_policy.get("send_mode", "both")
            allowed_tg_events = tg_policy.get("allowed_events", list(CRITICAL_LABELS))
            telegram_ok = False

            if snapshot_bytes and send_mode in ["both", "photo_only"] and label in allowed_tg_events:
                telegram_ok = await telegram_vault_service.send_alert_photo(
                    image_bytes=snapshot_bytes,
                    camera_name=camera,
                    label=label,
                    zone=zone_name,
                    score=score,
                    friendly_name=friendly_name
                )

            pip_res = await pip_gateway_service.dispatch_pip_alert(
                camera_name=camera,
                label=label,
                snapshot_url=snapshot_url,
                stream_url=f"rtsp://{camera}"
            )

            async with AsyncSessionLocal() as session:
                ev_record = EventRecord(
                    frigate_event_id=event_id,
                    camera_name=camera,
                    label=label,
                    top_score=float(score),
                    zone=zone_name,
                    has_snapshot=bool(snapshot_bytes),
                    has_clip=False,
                    telegram_notified=telegram_ok,
                    pip_dispatched=pip_res.get("dispatched_count", 0) > 0
                )
                session.add(ev_record)
                try:
                    await session.commit()
                except Exception as e:
                    await session.rollback()
                    logger.error(f"Error saving event to DB: {e}")
        except Exception as e:
            logger.error(f"Error in background alert dispatch: {e}")

    async def _dispatch_telegram_video_with_retry(
        self,
        event_id: str,
        camera: str,
        label: str,
        zone_name: Optional[str],
        duration_s: float,
        score: float,
        friendly_name: Optional[str],
        start_time: float = 0.0,
        end_time: float = 0.0
    ):
        """Asynchronously acquires the exact duration 30 FPS MP4 video with >= 7s pre-capture, >= 7s post-capture, and min 25s duration."""
        from app.services.frigate_bridge import frigate_bridge

        now_ts = datetime.datetime.now(datetime.timezone.utc).timestamp()
        event_start = start_time if start_time > 0 else (now_ts - 10.0)
        
        # 1. 7 full seconds of pre-capture before the object enters the detection zone
        clip_start_ts = int(event_start - 7.0)
        
        # 2. At least 7 seconds of post-capture after the object finishes moving AND guarantee minimum 30 seconds (capped at 45s max for Telegram)
        event_end = end_time if end_time > 0 else (event_start + duration_s)
        clip_end_ts = int(min(max(event_end + 7.0, clip_start_ts + 30.0), clip_start_ts + 45.0))
        
        target_duration = int(clip_end_ts - clip_start_ts)
        logger.info(f"🎬 Solicitando clipe estendido ({clip_start_ts} até {clip_end_ts} = ~{target_duration}s com 7s pré + 7s pós, min 30s/max 45s) para Telegram (Câmera: {camera}, Evento: {event_id})...")

        # 3. Intelligent synchronization: wait until clip_end_ts timestamp has passed + 1s for Frigate to flush disk segments
        wait_seconds = max(0.0, (clip_end_ts - datetime.datetime.now(datetime.timezone.utc).timestamp()) + 1.0)
        if wait_seconds > 0:
            logger.info(f"⏳ Aguardando gravação completa do clipe estendido ({wait_seconds:.1f}s)...")
            await asyncio.sleep(min(wait_seconds, 15.0))

        # Strategy 1: Fetch extended range clip from Frigate NVR (/api/{camera}/start/{start}/end/{end}/clip.mp4)
        # This guarantees at least 7s pre-capture, object duration, at least 7s post-capture, and min 25s total duration.
        delays = [1.0, 2.0, 3.0, 5.0]
        for attempt, delay in enumerate(delays, start=1):
            await asyncio.sleep(delay)
            try:
                async with httpx.AsyncClient(timeout=45.0) as client:
                    # 1. Primary: Extended range clip guaranteeing full pre and post capture
                    range_url = f"{settings.FRIGATE_API_URL}/api/{camera}/start/{clip_start_ts}/end/{clip_end_ts}/clip.mp4"
                    clip_resp = await client.get(range_url)

                    # 2. Secondary fallback: Official Frigate detection event clip with 10s padding
                    if clip_resp.status_code != 200 or len(clip_resp.content) < 1024:
                        event_url = f"{settings.FRIGATE_API_URL}/api/events/{event_id}/clip.mp4?padding=10"
                        clip_resp = await client.get(event_url)

                    # 3. Tertiary fallback: Raw Frigate detection event clip without query
                    if clip_resp.status_code != 200 or len(clip_resp.content) < 1024:
                        event_raw_url = f"{settings.FRIGATE_API_URL}/api/events/{event_id}/clip.mp4"
                        clip_resp = await client.get(event_raw_url)

                    if clip_resp.status_code == 200 and len(clip_resp.content) > 1024:
                        if not frigate_bridge.has_video_stream(clip_resp.content):
                            logger.warning(f"⚠️ Clipe retornado pelo Frigate para evento {event_id} ainda não possui stream de vídeo finalizado (tentativa {attempt}/{len(delays)}). Aguardando flush...")
                            continue

                        logger.info(f"✅ Clipe MP4 estendido obtido do Frigate ({len(clip_resp.content)} bytes). Preparando fluxo H.264 CFR 25 FPS fluidos...")
                        smooth_video = await frigate_bridge.transcode_to_30fps(clip_resp.content, target_fps=25)
                        if smooth_video and frigate_bridge.has_video_stream(smooth_video):
                            real_clip_dur = frigate_bridge.get_video_duration(smooth_video)
                            final_dur = real_clip_dur if real_clip_dur > 0 else target_duration
                            sent_ok = await telegram_vault_service.send_alert_video(
                                video_bytes=smooth_video,
                                camera_name=camera,
                                label=label,
                                zone=zone_name,
                                duration_s=final_dur,
                                score=score,
                                friendly_name=friendly_name
                            )
                            if sent_ok:
                                async with AsyncSessionLocal() as session:
                                    stmt = select(EventRecord).where(EventRecord.frigate_event_id == event_id)
                                    res = await session.execute(stmt)
                                    ev = res.scalar_one_or_none()
                                    if ev:
                                        ev.has_clip = True
                                        ev.end_time = datetime.datetime.utcnow()
                                        await session.commit()
                                return
            except Exception as e:
                logger.warning(f"Tentativa {attempt} de envio de clipe do Frigate falhou: {e}")

        logger.warning(f"⚠️ Não foi possível obter o clipe oficial do Frigate para o evento {event_id} após {len(delays)} tentativas. Acionando gravação de emergência via FrigateBridge...")
        try:
            live_clip = await frigate_bridge.record_live_video(
                camera_name=camera,
                duration_s=min(int(target_duration), 20)
            )
            if live_clip and frigate_bridge.has_video_stream(live_clip):
                smooth_live = await frigate_bridge.transcode_to_30fps(live_clip, target_fps=20) or live_clip
                logger.info(f"✅ Vídeo de emergência capturado com sucesso via FrigateBridge ({len(smooth_live)} bytes). Enviando para o Telegram...")
                await telegram_vault_service.send_alert_video(
                    video_bytes=smooth_live,
                    camera_name=camera,
                    label=label,
                    zone=zone_name,
                    duration_s=min(target_duration, 20.0),
                    score=score,
                    friendly_name=friendly_name
                )
        except Exception as fb_err:
            logger.error(f"❌ Falha no fallback de gravação ao vivo para Telegram: {fb_err}")

    async def start_listening(self):
        """Connects to MQTT and runs consumer loop with automatic reconnection."""
        while True:
            try:
                logger.info(f"Connecting to MQTT at {settings.MQTT_BROKER}:{settings.MQTT_PORT}...")
                async with Client(
                    hostname=settings.MQTT_BROKER,
                    port=settings.MQTT_PORT,
                    identifier=settings.MQTT_CLIENT_ID
                ) as client:
                    prefix = settings.MQTT_TOPIC_PREFIX
                    await client.subscribe(f"{prefix}/events")
                    await client.subscribe(f"{prefix}/reviews")
                    await client.subscribe(f"{prefix}/+/motion")
                    await client.subscribe(f"{prefix}/+/person")
                    await client.subscribe(f"{prefix}/+/car")
                    await client.subscribe(f"{prefix}/+/motorcycle")
                    await client.subscribe(f"{prefix}/+/object_count/+")
                    logger.info(f"MQTT subscribed to all Frigate topics under: {prefix}/#")

                    async for message in client.messages:
                        try:
                            topic_str = str(message.topic)
                            msg_str = message.payload.decode("utf-8", errors="ignore")

                            if topic_str.endswith("/events"):
                                payload = json.loads(msg_str)
                                await self.handle_frigate_event(payload)

                            elif topic_str.endswith("/reviews"):
                                try:
                                    rev = json.loads(msg_str)
                                    if isinstance(rev, dict):
                                        rev_type = rev.get("type")
                                        if rev_type in ["new", "update"]:
                                            after = rev.get("after") or {}
                                            await self.broadcast_event({
                                                "type": "FRIGATE_REVIEW",
                                                "camera": after.get("camera", ""),
                                                "severity": after.get("severity", "detection"),
                                                "review_id": after.get("id"),
                                            })
                                except Exception:
                                    pass

                            elif topic_str.endswith("/motion"):
                                parts = topic_str.split("/")
                                if len(parts) >= 2:
                                    cam_name = parts[-2]
                                    is_motion = (msg_str.strip().upper() == "ON" or msg_str.strip() == "1")
                                    await self.broadcast_event({
                                        "type": "CAMERA_MOTION_STATUS",
                                        "camera": cam_name,
                                        "motion": is_motion
                                    })

                            elif "/object_count/" in topic_str:
                                parts = topic_str.split("/")
                                if len(parts) >= 4:
                                    cam_name = parts[-3]
                                    obj_label = parts[-1]
                                    count_val = int(msg_str) if msg_str.strip().isdigit() else 0
                                    await self.broadcast_event({
                                        "type": "CAMERA_OBJECTS_COUNT",
                                        "camera": cam_name,
                                        "label": obj_label,
                                        "count": count_val
                                    })

                            else:
                                parts = topic_str.split("/")
                                if len(parts) >= 3:
                                    cam_name = parts[-2]
                                    obj_label = parts[-1]
                                    if obj_label in CRITICAL_LABELS:
                                        count_val = int(msg_str) if msg_str.strip().isdigit() else 0
                                        await self.broadcast_event({
                                            "type": "CAMERA_OBJECTS_COUNT",
                                            "camera": cam_name,
                                            "label": obj_label,
                                            "count": count_val
                                        })
                        except Exception as e:
                            logger.error(f"Error handling MQTT message: {e}")

            except MqttError as e:
                logger.warning(f"MQTT connection lost: {e}. Retrying in 5s...")
                await asyncio.sleep(5)
            except Exception as e:
                logger.error(f"Unexpected MQTT error: {e}. Retrying in 5s...")
                await asyncio.sleep(5)


mqtt_service = MQTTService()
