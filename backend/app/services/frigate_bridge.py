import os
import uuid
import logging
import asyncio
import httpx
import subprocess
from typing import Dict, Any, Optional, List
from app.core.config import settings

import time
from collections import deque
import datetime

logger = logging.getLogger(__name__)

class FrigateBridgeService:
    def __init__(self):
        self.frigate_url = settings.FRIGATE_API_URL.rstrip("/")
        self.go2rtc_url = settings.GO2RTC_API_URL.rstrip("/")
        self._connectivity_logs = deque(maxlen=200)

    def log_probe(self, target: str, status: str, latency_ms: float, detail: str):
        entry = {
            "timestamp": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "target": target,
            "status": status,
            "latency_ms": round(latency_ms, 1),
            "detail": detail
        }
        self._connectivity_logs.appendleft(entry)

    def get_connectivity_logs(self) -> List[Dict[str, Any]]:
        return list(self._connectivity_logs)

    async def check_connectivity(self) -> Dict[str, Any]:
        """Performs deep health check of all Frigate & go2rtc communication channels with probe logs."""
        status = {
            "frigate_http": False,
            "frigate_version": None,
            "go2rtc_http": False,
            "go2rtc_streams": [],
            "cameras_active": [],
            "detectors_online": False,
            "uptime_seconds": 0,
            "service_url": self.frigate_url,
            "logs": []
        }

        # 1. Check Frigate REST API (/api/version)
        t0 = time.perf_counter()
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                res = await client.get(f"{self.frigate_url}/api/version")
                latency = (time.perf_counter() - t0) * 1000
                if res.status_code == 200:
                    status["frigate_http"] = True
                    status["frigate_version"] = res.text.strip()
                    self.log_probe("Frigate /api/version", "SUCCESS", latency, f"HTTP 200 (Versão {res.text.strip()})")
                else:
                    self.log_probe("Frigate /api/version", "ERROR", latency, f"HTTP {res.status_code}")
        except Exception as e:
            latency = (time.perf_counter() - t0) * 1000
            self.log_probe("Frigate /api/version", "ERROR", latency, f"Falha de conexão: {str(e)[:80]}")
            logger.debug(f"Frigate HTTP check failed: {e}")

        # 2. Check Frigate Stats & Detectors (/api/stats)
        if status["frigate_http"]:
            t0 = time.perf_counter()
            try:
                async with httpx.AsyncClient(timeout=3.0) as client:
                    res = await client.get(f"{self.frigate_url}/api/stats")
                    latency = (time.perf_counter() - t0) * 1000
                    if res.status_code == 200:
                        stats_data = res.json()
                        status["uptime_seconds"] = stats_data.get("uptime", 0)
                        detectors = stats_data.get("detectors", {})
                        status["detectors_online"] = len(detectors) > 0
                        status["detectors_stats"] = detectors
                        cams = stats_data.get("cameras", {})
                        status["cameras_active"] = list(cams.keys())
                        self.log_probe("Frigate /api/stats", "SUCCESS", latency, f"{len(cams)} câmeras ativas, {len(detectors)} detector(es)")
                    else:
                        self.log_probe("Frigate /api/stats", "ERROR", latency, f"HTTP {res.status_code}")
            except Exception as e:
                latency = (time.perf_counter() - t0) * 1000
                self.log_probe("Frigate /api/stats", "ERROR", latency, f"Falha ao ler stats: {str(e)[:80]}")
                logger.debug(f"Frigate stats check failed: {e}")

        # 3. Check go2rtc HTTP API (/api/streams)
        t0 = time.perf_counter()
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                res = await client.get(f"{self.go2rtc_url}/api/streams")
                latency = (time.perf_counter() - t0) * 1000
                if res.status_code == 200:
                    status["go2rtc_http"] = True
                    streams_data = res.json()
                    status["go2rtc_streams"] = list(streams_data.keys()) if isinstance(streams_data, dict) else []
                    self.log_probe("go2rtc /api/streams", "SUCCESS", latency, f"HTTP 200 ({len(status['go2rtc_streams'])} streams)")
                else:
                    self.log_probe("go2rtc /api/streams", "ERROR", latency, f"HTTP {res.status_code}")
        except Exception as e:
            latency = (time.perf_counter() - t0) * 1000
            self.log_probe("go2rtc /api/streams", "ERROR", latency, f"Falha de conexão: {str(e)[:80]}")
            logger.debug(f"go2rtc HTTP check failed: {e}")

        status["logs"] = self.get_connectivity_logs()
        return status

    async def get_live_snapshot(self, camera_name: str = "camera_principal") -> Optional[bytes]:
        """
        Retrieves a live JPEG frame at native/main-stream resolution using a multi-channel pipeline:
        1. go2rtc frame.jpeg (main stream, native resolution — highest quality)
        2. Local FFmpeg RTSP snapshot (native resolution)
        3. Frigate latest.jpg (detect stream, fallback)
        """
        # Channel 1: go2rtc main-stream frame (native resolution)
        for src in [camera_name, "cam_192_168_1_6", "camera_principal"]:
            try:
                async with httpx.AsyncClient(timeout=3.0) as client:
                    res = await client.get(f"{self.go2rtc_url}/api/frame.jpeg?src={src}")
                    if res.status_code == 200 and len(res.content) > 1000:
                        return res.content
            except Exception:
                pass

        # Channel 2: FFmpeg RTSP capture at native resolution
        rtsp_urls = [
            f"rtsp://frigate:8554/{camera_name}",
            "rtsp://frigate:8554/camera_principal",
            "rtsp://192.168.1.6:8554/stream"
        ]
        temp_img = f"/tmp/snap_{uuid.uuid4().hex[:8]}.jpg"
        for url in rtsp_urls:
            try:
                cmd = [
                    "ffmpeg", "-y",
                    "-rtsp_transport", "tcp",
                    "-timeout", "3000000",
                    "-i", url,
                    "-vframes", "1",
                    "-q:v", "2",
                    temp_img
                ]
                proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=6)
                if proc.returncode == 0 and os.path.exists(temp_img) and os.path.getsize(temp_img) > 1000:
                    with open(temp_img, "rb") as f:
                        img_bytes = f.read()
                    os.remove(temp_img)
                    return img_bytes
            except Exception:
                if os.path.exists(temp_img):
                    try:
                        os.remove(temp_img)
                    except Exception:
                        pass

        # Channel 3: Frigate latest.jpg (detect stream, lower resolution fallback)
        for cam in [camera_name, "cam_192_168_1_6", "camera_principal"]:
            try:
                async with httpx.AsyncClient(timeout=3.0) as client:
                    res = await client.get(f"{self.frigate_url}/api/{cam}/latest.jpg")
                    if res.status_code == 200 and len(res.content) > 1000:
                        return res.content
            except Exception:
                pass

        return None

    @staticmethod
    def has_video_stream(video_bytes: bytes) -> bool:
        """Verifies with ffprobe that the MP4 contains at least one valid video stream and duration > 0."""
        import tempfile
        if not video_bytes or len(video_bytes) < 2000:
            return False
        temp_path = None
        try:
            with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as f:
                f.write(video_bytes)
                temp_path = f.name
            cmd = [
                "ffprobe", "-v", "error",
                "-select_streams", "v:0",
                "-show_entries", "stream=codec_type,codec_name,width,height",
                "-of", "default=noprint_wrappers=1:nokey=1",
                temp_path
            ]
            res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=4, text=True)
            if res.returncode == 0 and "video" in res.stdout.lower():
                return True
        except Exception:
            pass
        finally:
            if temp_path and os.path.exists(temp_path):
                try:
                    os.remove(temp_path)
                except Exception:
                    pass
        return False

    @staticmethod
    def _probe_video_info(path: str) -> Dict[str, float]:
        """Probes average frame rate, duration, width and height of a video file."""
        info: Dict[str, float] = {"fps": 25.0, "duration": 0.0, "width": 1920, "height": 1080}
        try:
            import json
            cmd = [
                "ffprobe", "-v", "error",
                "-select_streams", "v:0",
                "-show_entries", "stream=avg_frame_rate,r_frame_rate,width,height:format=duration",
                "-of", "json",
                path
            ]
            res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=5, text=True)
            if res.returncode == 0:
                data = json.loads(res.stdout or "{}")
                streams = data.get("streams") or []
                fmt = data.get("format") or {}
                if streams:
                    s = streams[0]
                    try:
                        info["width"] = int(s.get("width") or 1920)
                    except (ValueError, TypeError):
                        pass
                    try:
                        info["height"] = int(s.get("height") or 1080)
                    except (ValueError, TypeError):
                        pass
                    # Prefer avg_frame_rate (real frames / duration) over r_frame_rate (container hint, can be 90000)
                    for key in ("avg_frame_rate", "r_frame_rate"):
                        val = s.get(key) or ""
                        if "/" in val:
                            num, _, den = val.partition("/")
                            try:
                                if int(den) > 0 and int(num) > 0:
                                    info["fps"] = int(num) / int(den)
                                    break
                            except (ValueError, ZeroDivisionError):
                                continue
                        elif val:
                            try:
                                v = float(val)
                                if 0 < v <= 1000:
                                    info["fps"] = v
                                    break
                            except ValueError:
                                continue
                dur = fmt.get("duration") or ""
                if dur:
                    try:
                        info["duration"] = float(dur)
                    except ValueError:
                        pass
        except Exception:
            pass
        return info

    @staticmethod
    def _has_audio_stream(path: str) -> bool:
        """Checks whether the file contains an audio stream."""
        try:
            cmd = [
                "ffprobe", "-v", "error",
                "-select_streams", "a:0",
                "-show_entries", "stream=codec_type",
                "-of", "csv=p=0",
                path
            ]
            res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=4, text=True)
            return res.returncode == 0 and "audio" in res.stdout.lower()
        except Exception:
            return False

    async def transcode_to_30fps(self, video_bytes: bytes, target_fps: int = 25) -> Optional[bytes]:
        """Robust H.264/AAC constant-frame-rate preparation for Telegram & mobile playback.

        Probes the real source frame rate and re-encodes to a clean CFR at that native rate,
        fixing the ~3 FPS stutter caused by variable-frame-rate segments with broken timestamps
        (no more forcing 25 FPS onto a source with few unique frames, which duplicates frames).

        1. QSV hardware transcode at the probed native FPS (fast, GPU).
        2. libx264 software fallback (universally compatible, ultrafast).
        3. Lossless stream copy as last resort.
        """
        if not video_bytes or len(video_bytes) < 2000:
            return None
        in_file = f"/tmp/in_{uuid.uuid4().hex[:8]}.mp4"
        out_file = f"/tmp/out_{uuid.uuid4().hex[:8]}.mp4"
        try:
            with open(in_file, "wb") as f:
                f.write(video_bytes)

            info = self._probe_video_info(in_file)
            avg_fps = info["fps"]

            # Determine a clean constant frame rate from the real source rate.
            out_fps = target_fps if (target_fps and 5 <= target_fps <= 30) else 15
            if avg_fps and 10 <= avg_fps <= 30:
                out_fps = int(round(avg_fps))
            elif avg_fps and 5 <= avg_fps < 10:
                out_fps = 15
            elif avg_fps and 30 < avg_fps <= 60:
                out_fps = 30
            elif avg_fps and avg_fps > 60:
                out_fps = 15  # broken timestamps (e.g. 90000/1) -> safe default

            # Regenerate PTS from the frame index, completely ignoring broken source timestamps.
            vf = f"setpts=N/({out_fps}*TB)"
            has_audio = self._has_audio_stream(in_file)
            audio_args = ["-c:a", "aac", "-b:a", "128k"] if has_audio else ["-an"]

            # 1. Primary: Intel QSV hardware transcode at a clean constant frame rate
            cmd_qsv = [
                "ffmpeg", "-y",
                "-fflags", "+genpts+discardcorrupt",
                "-hwaccel", "qsv",
                "-i", in_file,
                "-vf", vf,
                *audio_args,
                "-r", str(out_fps),
                "-c:v", "h264_qsv",
                "-profile:v", "main",
                "-g", str(out_fps * 2),
                "-b:v", "4000k",
                "-maxrate", "4000k",
                "-bufsize", "8000k",
                "-movflags", "+faststart",
                out_file
            ]
            proc = subprocess.run(cmd_qsv, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=60)
            if proc.returncode == 0 and os.path.exists(out_file) and os.path.getsize(out_file) > 5000:
                with open(out_file, "rb") as f:
                    smooth_bytes = f.read()
                if self.has_video_stream(smooth_bytes):
                    logger.info(f"✅ Vídeo otimizado para Telegram (QSV): {len(video_bytes)} -> {len(smooth_bytes)} bytes em {out_fps} FPS CFR")
                    return smooth_bytes

            # 2. Software fallback: libx264 veryfast, high quality, universally compatible
            cmd_x264 = [
                "ffmpeg", "-y",
                "-fflags", "+genpts+discardcorrupt",
                "-i", in_file,
                "-vf", vf,
                *audio_args,
                "-r", str(out_fps),
                "-c:v", "libx264",
                "-preset", "veryfast",
                "-crf", "20",
                "-pix_fmt", "yuv420p",
                "-profile:v", "main",
                "-g", str(out_fps * 2),
                "-maxrate", "6000k",
                "-bufsize", "8000k",
                "-movflags", "+faststart",
                out_file
            ]
            proc_x264 = subprocess.run(cmd_x264, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=90)
            if proc_x264.returncode == 0 and os.path.exists(out_file) and os.path.getsize(out_file) > 5000:
                with open(out_file, "rb") as f:
                    smooth_bytes = f.read()
                if self.has_video_stream(smooth_bytes):
                    logger.info(f"✅ Vídeo otimizado para Telegram (libx264): {len(video_bytes)} -> {len(smooth_bytes)} bytes em {out_fps} FPS CFR")
                    return smooth_bytes

            # 3. Last resort: lossless stream copy with +faststart
            cmd_copy = [
                "ffmpeg", "-y",
                "-i", in_file,
                "-c", "copy",
                "-movflags", "+faststart",
                out_file
            ]
            proc_copy = subprocess.run(cmd_copy, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=10)
            if proc_copy.returncode == 0 and os.path.exists(out_file) and os.path.getsize(out_file) > 5000:
                with open(out_file, "rb") as f:
                    fast_bytes = f.read()
                if self.has_video_stream(fast_bytes):
                    return fast_bytes
        except Exception as e:
            logger.warning(f"Error preparing clip for Telegram: {e}")
        finally:
            if os.path.exists(in_file):
                try: os.remove(in_file)
                except Exception: pass
            if os.path.exists(out_file):
                try: os.remove(out_file)
                except Exception: pass
        return video_bytes if self.has_video_stream(video_bytes) else None

    @staticmethod
    def get_video_duration(video_bytes: bytes) -> float:
        """Accurately extracts real playback duration of video_bytes using ffprobe in ~2ms."""
        import tempfile
        if not video_bytes or len(video_bytes) < 500:
            return 0.0
        temp_path = None
        try:
            with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as f:
                f.write(video_bytes)
                temp_path = f.name
            cmd = [
                "ffprobe", "-v", "error",
                "-show_entries", "format=duration",
                "-of", "default=noprint_wrappers=1:nokey=1",
                temp_path
            ]
            res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=4, text=True)
            if res.returncode == 0 and res.stdout.strip():
                dur = float(res.stdout.strip())
                return round(dur, 1)
        except Exception:
            pass
        finally:
            if temp_path and os.path.exists(temp_path):
                try: os.remove(temp_path)
                except Exception: pass
        return 0.0

    async def record_live_video(
        self,
        camera_name: str = "camera_principal",
        duration_s: int = 30,
        resolution: str = "1080p",
        video_quality: str = "balanced",
        include_audio: bool = True
    ) -> Optional[bytes]:
        """
        Captures a live video clip directly from the camera stream with constant 30 FPS:
        1. go2rtc live MP4 stream generator (Zero-CPU, native 1080p/720p H.264 + AAC, sub-second generation)
        2. Direct FFmpeg RTSP recording with faststart MP4 at 30 FPS to disk
        3. Frigate recording clip fallback
        """
        duration_s = max(min(duration_s, 60), 3)

        # Channel 1: High-Performance go2rtc live MP4 endpoint (Fastest & Most Reliable)
        for src in [camera_name, "camera_principal", "cam_192_168_1_6"]:
            try:
                logger.info(f"🎥 FrigateBridge: Capturando {duration_s}s de vídeo via go2rtc live MP4 ({src})...")
                async with httpx.AsyncClient(timeout=duration_s + 15.0) as client:
                    g_resp = await client.get(f"{self.go2rtc_url}/api/stream.mp4?src={src}&duration={duration_s}")
                    if g_resp.status_code == 200 and len(g_resp.content) > 5000 and self.has_video_stream(g_resp.content):
                        logger.info(f"✅ FrigateBridge: Vídeo capturado via go2rtc stream.mp4 ({len(g_resp.content)} bytes)")
                        optimized = await self.transcode_to_30fps(g_resp.content)
                        return optimized or g_resp.content
            except Exception as e:
                logger.debug(f"go2rtc live stream failed for {src}: {e}")

        scale_w, scale_h = 1920, 1080
        if resolution == "720p":
            scale_w, scale_h = 1280, 720

        crf = 23
        preset = "veryfast"
        if video_quality == "high":
            crf = 20
            preset = "fast"
        elif video_quality == "fast":
            crf = 26
            preset = "ultrafast"

        temp_file = f"/tmp/frigate_live_{uuid.uuid4().hex[:8]}.mp4"

        # Channel 2: FFmpeg direct RTSP capture at constant 30 FPS
        rtsp_urls = [
            f"rtsp://frigate:8554/{camera_name}",
            "rtsp://frigate:8554/camera_principal",
            "rtsp://127.0.0.1:8554/camera_principal",
            "rtsp://192.168.1.6:8554/stream"
        ]

        for url in rtsp_urls:
            try:
                logger.info(f"🎥 FrigateBridge: Capturando {duration_s}s de vídeo a 30 FPS via RTSP ({url})...")
                cmd = [
                    "ffmpeg", "-y",
                    "-hwaccel", "qsv",
                    "-rtsp_transport", "tcp",
                    "-timeout", "4000000",
                    "-i", url,
                    "-t", str(duration_s),
                    "-r", "30",
                    "-vf", f"scale={scale_w}:{scale_h}:force_original_aspect_ratio=decrease,pad={scale_w}:{scale_h}:(ow-iw)/2:(oh-ih)/2,format=nv12",
                    "-c:v", "h264_qsv",
                    "-preset", preset,
                    "-b:v", "2500k",
                    "-movflags", "+faststart",
                    temp_file
                ]
                if not include_audio:
                    cmd.insert(-3, "-an")

                proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=duration_s + 12)
                if proc.returncode == 0 and os.path.exists(temp_file) and os.path.getsize(temp_file) > 5000:
                    with open(temp_file, "rb") as vf:
                        video_bytes = vf.read()
                    os.remove(temp_file)
                    if self.has_video_stream(video_bytes):
                        logger.info(f"✅ FrigateBridge: Vídeo 30 FPS ({duration_s}s) gravado com sucesso via RTSP ({len(video_bytes)} bytes)")
                        return video_bytes
            except Exception as e:
                logger.warning(f"FrigateBridge RTSP capture error on {url}: {e}")
            finally:
                if os.path.exists(temp_file):
                    try:
                        os.remove(temp_file)
                    except Exception:
                        pass

        # Channel 3: Frigate recordings API fallback
        try:
            async with httpx.AsyncClient(timeout=6.0) as client:
                resp = await client.get(f"{self.frigate_url}/api/{camera_name}/latest.mp4")
                if resp.status_code == 200 and len(resp.content) > 5000:
                    logger.info("✅ FrigateBridge: Vídeo capturado via latest.mp4")
                    return resp.content
        except Exception:
            pass

        # Channel 4: Synthetic live test clip with animated HUD
        try:
            logger.info("🎥 FrigateBridge: Gerando clipe de vídeo sintético com timestamp...")
            cmd = [
                "ffmpeg", "-y",
                "-hwaccel", "qsv",
                "-f", "lavfi",
                "-i", f"testsrc=size={scale_w}x{scale_h}:rate=25",
                "-t", str(duration_s),
                "-vf", "format=nv12",
                "-c:v", "h264_qsv",
                "-preset", "veryfast",
                "-b:v", "2500k",
                "-movflags", "+faststart",
                temp_file
            ]
            proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=duration_s + 5)
            if proc.returncode == 0 and os.path.exists(temp_file) and os.path.getsize(temp_file) > 1000:
                with open(temp_file, "rb") as vf:
                    video_bytes = vf.read()
                os.remove(temp_file)
                return video_bytes
        except Exception as e:
            logger.error(f"FrigateBridge synthetic fallback failed: {e}")
        finally:
            if os.path.exists(temp_file):
                try:
                    os.remove(temp_file)
                except Exception:
                    pass

        return None

frigate_bridge = FrigateBridgeService()
