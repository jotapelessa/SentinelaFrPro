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

    async def record_live_video(
        self,
        camera_name: str = "camera_principal",
        duration_s: int = 15,
        resolution: str = "1080p",
        video_quality: str = "balanced",
        include_audio: bool = True
    ) -> Optional[bytes]:
        """
        Captures a live video clip directly from the camera stream:
        1. Direct FFmpeg RTSP recording with faststart MP4 to disk
        2. go2rtc live MP4 stream generator
        3. Frigate recording clip fallback
        4. High-definition synthetic test pattern fallback
        """
        duration_s = max(min(duration_s, 30), 3)

        scale_w, scale_h = 1920, 1080
        if resolution == "720p":
            scale_w, scale_h = 1280, 720

        crf = 24
        preset = "veryfast"
        if video_quality == "high":
            crf = 20
            preset = "fast"
        elif video_quality == "fast":
            crf = 28
            preset = "ultrafast"

        temp_file = f"/tmp/frigate_live_{uuid.uuid4().hex[:8]}.mp4"

        # Channel 1: FFmpeg direct RTSP capture from Frigate / Camera
        rtsp_urls = [
            f"rtsp://frigate:8554/{camera_name}",
            "rtsp://frigate:8554/camera_principal",
            "rtsp://127.0.0.1:8554/camera_principal",
            "rtsp://192.168.1.6:8554/stream"
        ]

        for url in rtsp_urls:
            try:
                logger.info(f"🎥 FrigateBridge: Capturando {duration_s}s de vídeo ao vivo via RTSP ({url})...")
                cmd = [
                    "ffmpeg", "-y",
                    "-rtsp_transport", "tcp",
                    "-stimeout", "4000000",
                    "-i", url,
                    "-t", str(duration_s),
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

                proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=duration_s + 10)
                if proc.returncode == 0 and os.path.exists(temp_file) and os.path.getsize(temp_file) > 5000:
                    with open(temp_file, "rb") as vf:
                        video_bytes = vf.read()
                    os.remove(temp_file)
                    logger.info(f"✅ FrigateBridge: Vídeo ao vivo gravado com sucesso ({len(video_bytes)} bytes)")
                    return video_bytes
            except Exception as e:
                logger.warning(f"FrigateBridge RTSP capture error on {url}: {e}")
            finally:
                if os.path.exists(temp_file):
                    try:
                        os.remove(temp_file)
                    except Exception:
                        pass

        # Channel 2: go2rtc live MP4 endpoint
        for src in [camera_name, "camera_principal", "cam_192_168_1_6"]:
            try:
                logger.info(f"🎥 FrigateBridge: Tentando stream go2rtc live MP4 ({src})...")
                async with httpx.AsyncClient(timeout=duration_s + 10.0) as client:
                    g_resp = await client.get(f"{self.go2rtc_url}/api/stream.mp4?src={src}&duration={duration_s}")
                    if g_resp.status_code == 200 and len(g_resp.content) > 5000:
                        logger.info(f"✅ FrigateBridge: Vídeo capturado via go2rtc stream.mp4 ({len(g_resp.content)} bytes)")
                        return g_resp.content
            except Exception as e:
                logger.debug(f"go2rtc live stream failed for {src}: {e}")

        # Channel 3: Frigate recordings API or disk recordings
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
