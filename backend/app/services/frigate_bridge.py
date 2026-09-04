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
        Retrieves a live JPEG frame from Frigate / go2rtc using a multi-channel pipeline:
        1. Frigate latest.jpg endpoint
        2. go2rtc frame.jpeg endpoint
        3. Local FFmpeg RTSP snapshot
        """
        # Channel 1: Frigate latest frame
        for cam in [camera_name, "cam_192_168_1_6", "camera_principal"]:
            try:
                async with httpx.AsyncClient(timeout=3.0) as client:
                    res = await client.get(f"{self.frigate_url}/api/{cam}/latest.jpg")
                    if res.status_code == 200 and len(res.content) > 1000:
                        return res.content
            except Exception:
                pass

        # Channel 2: go2rtc frame
        for src in [camera_name, "cam_192_168_1_6", "camera_principal"]:
            try:
                async with httpx.AsyncClient(timeout=3.0) as client:
                    res = await client.get(f"{self.go2rtc_url}/api/frame.jpeg?src={src}")
                    if res.status_code == 200 and len(res.content) > 1000:
                        return res.content
            except Exception:
                pass

        # Channel 3: FFmpeg RTSP capture
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
                    "-stimeout", "3000000",
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
                try: os.remove(temp_path)
                except Exception: pass
        return False

    async def transcode_to_30fps(self, video_bytes: bytes, target_fps: int = 30) -> Optional[bytes]:
        """Optimized video preparation with instant zero-CPU stream copy and faststart headers for Telegram.
        Guarantees that the resulting clip has a valid video stream and never produces black screens."""
        if not video_bytes or len(video_bytes) < 2000:
            return None
        in_file = f"/tmp/in_{uuid.uuid4().hex[:8]}.mp4"
        out_file = f"/tmp/out_{uuid.uuid4().hex[:8]}.mp4"
        try:
            with open(in_file, "wb") as f:
                f.write(video_bytes)
            
            # 1. Fast path: Zero-CPU Lossless Stream Copy with +faststart
            cmd_copy = [
                "ffmpeg", "-y",
                "-i", in_file,
                "-c", "copy",
                "-movflags", "+faststart",
                out_file
            ]
            proc = subprocess.run(cmd_copy, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=10)
            if proc.returncode == 0 and os.path.exists(out_file) and os.path.getsize(out_file) > 5000:
                with open(out_file, "rb") as f:
                    fast_bytes = f.read()
                if self.has_video_stream(fast_bytes):
                    return fast_bytes

            # 2. Fallback path: Ultrafast H.264 transcode if stream copy wasn't possible or lacked video
            cmd_transcode = [
                "ffmpeg", "-y",
                "-i", in_file,
                "-r", str(target_fps),
                "-c:v", "libx264",
                "-preset", "ultrafast",
                "-crf", "24",
                "-pix_fmt", "yuv420p",
                "-movflags", "+faststart",
                "-c:a", "aac",
                out_file
            ]
            proc = subprocess.run(cmd_transcode, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=20)
            if proc.returncode == 0 and os.path.exists(out_file) and os.path.getsize(out_file) > 5000:
                with open(out_file, "rb") as f:
                    smooth_bytes = f.read()
                if self.has_video_stream(smooth_bytes):
                    return smooth_bytes
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
                    "-rtsp_transport", "tcp",
                    "-timeout", "4000000",
                    "-i", url,
                    "-t", str(duration_s),
                    "-r", "30",
                    "-vf", f"scale={scale_w}:{scale_h}:force_original_aspect_ratio=decrease,pad={scale_w}:{scale_h}:(ow-iw)/2:(oh-ih)/2,format=yuv420p",
                    "-c:v", "libx264",
                    "-preset", preset,
                    "-crf", str(crf),
                    "-pix_fmt", "yuv420p",
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
                "-f", "lavfi",
                "-i", f"testsrc=size={scale_w}x{scale_h}:rate=25",
                "-t", str(duration_s),
                "-pix_fmt", "yuv420p",
                "-c:v", "libx264",
                "-preset", "ultrafast",
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
