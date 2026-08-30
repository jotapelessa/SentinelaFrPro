import httpx
import logging
import datetime
import asyncio
from typing import Dict, Any, List, Optional
from app.db.session import AsyncSessionLocal
from app.db.models import PairedDevice
from sqlalchemy import select

logger = logging.getLogger(__name__)

def _cast_sync(ip: str, media_url: str, content_type: str = "image/jpeg") -> bool:
    try:
        import pychromecast
        chromecasts, browser = pychromecast.get_chromecasts(known_hosts=[ip])
        if chromecasts:
            cast = chromecasts[0]
            cast.wait()
            mc = cast.media_controller
            mc.play_media(media_url, content_type)
            mc.block_until_active(timeout=3)
            return True
    except Exception as e:
        logger.debug(f"Chromecast cast error on {ip}: {e}")
    return False

class PiPGatewayService:
    def __init__(self):
        self._dnd_enabled = False
        self._dnd_start_hour = 23 # 23:00
        self._dnd_end_hour = 6    # 06:00

    def is_in_dnd(self) -> bool:
        """Checks if current time falls in Do Not Disturb period."""
        if not self._dnd_enabled:
            return False
        now_hour = datetime.datetime.now().hour
        if self._dnd_start_hour > self._dnd_end_hour:
            return now_hour >= self._dnd_start_hour or now_hour < self._dnd_end_hour
        return self._dnd_start_hour <= now_hour < self._dnd_end_hour

    async def get_active_tv_devices(self) -> List[Dict[str, Any]]:
        """Fetches allowed Android TV / Tablet devices from DB."""
        async with AsyncSessionLocal() as session:
            stmt = select(PairedDevice).where(PairedDevice.permission_status == "allowed")
            result = await session.execute(stmt)
            devices = result.scalars().all()
            return [
                {
                    "id": d.id,
                    "name": d.friendly_name,
                    "type": d.device_type,
                    "target_ip": d.tailscale_ip if d.tailscale_ip else d.ip_address,
                    "local_ip": d.ip_address,
                    "tailscale_ip": d.tailscale_ip
                }
                for d in devices
            ]

    async def dispatch_pip_alert(
        self,
        camera_name: str,
        label: str,
        snapshot_url: str,
        stream_url: Optional[str] = None,
        duration_seconds: int = 20,
        position: int = 1 # Top-Right
    ) -> Dict[str, Any]:
        """
        Dispatches Picture-in-Picture or Google Cast notification to registered TVs.
        Supports Native Google Cast / Chromecast, PiP-Up, and Notifications for Android TV protocols.
        """
        if self.is_in_dnd():
            logger.info("PiP alert skipped due to active Do-Not-Disturb (DND) schedule.")
            return {"status": "skipped", "reason": "dnd_active"}

        devices = await self.get_active_tv_devices()
        if not devices:
            logger.info("No paired TV devices found for PiP dispatch.")
            return {"status": "no_devices", "dispatched": 0}

        results = []
        async with httpx.AsyncClient(timeout=3.0) as client:
            for dev in devices:
                target_ip = dev["target_ip"]
                if not target_ip:
                    continue

                dispatched = False

                # 1. Native Google Cast / Chromecast for Google TV / TCL
                if dev.get("type") in ["android_tv", "chromecast", "google_tv", "tcl"]:
                    try:
                        cast_success = await asyncio.to_thread(
                            _cast_sync,
                            target_ip,
                            snapshot_url,
                            "image/jpeg"
                        )
                        if cast_success:
                            dispatched = True
                            results.append({"device": dev["name"], "ip": target_ip, "status": "delivered", "protocol": "google_cast"})
                    except Exception as e:
                        logger.debug(f"Google Cast attempt failed for {target_ip}: {e}")

                # 2. PiP-Up / Notifications for Android TV REST HTTP fallback
                if not dispatched:
                    payload = {
                        "title": f"🛡️ Sentinela: {label.upper()}",
                        "message": f"Movimento detectado em {camera_name}",
                        "duration": duration_seconds,
                        "position": position,
                        "image": snapshot_url,
                        "video": stream_url or snapshot_url,
                        "type": 2 # PiP overlay
                    }

                    target_urls = [
                        f"http://{target_ip}:7986/notify",
                        f"http://{target_ip}:5463/notify"
                    ]

                    for url in target_urls:
                        try:
                            resp = await client.post(url, json=payload)
                            if resp.status_code in [200, 201, 204]:
                                dispatched = True
                                results.append({"device": dev["name"], "ip": target_ip, "status": "delivered", "protocol": "pip_rest"})
                                break
                        except Exception as e:
                            logger.debug(f"Failed to post to {url}: {e}")

                if not dispatched:
                    results.append({"device": dev["name"], "ip": target_ip, "status": "failed_or_offline"})

        return {
            "status": "completed",
            "dispatched_count": len([r for r in results if r["status"] == "delivered"]),
            "details": results
        }

pip_gateway_service = PiPGatewayService()
