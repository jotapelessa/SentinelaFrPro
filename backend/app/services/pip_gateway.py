import json
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
        import importlib
        try:
            pychromecast = importlib.import_module("pychromecast")
        except ImportError:
            return False
        import warnings
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            if hasattr(pychromecast, "get_listed_chromecasts"):
                chromecasts, browser = pychromecast.get_listed_chromecasts(ips=[ip])
            else:
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

    async def get_active_tv_devices(
        self,
        camera_name: Optional[str] = None,
        label: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Fetches allowed Android TV / Tablet devices from DB with granular camera & event filtering."""
        async with AsyncSessionLocal() as session:
            stmt = select(PairedDevice).where(
                PairedDevice.permission_status == "allowed",
                PairedDevice.allow_pip_alerts == True
            )
            result = await session.execute(stmt)
            devices = result.scalars().all()
            filtered_devices = []
            for d in devices:
                # 1. Filter by allowed cameras if specified
                if camera_name and d.allowed_cameras:
                    try:
                        cams = json.loads(d.allowed_cameras)
                        if cams and len(cams) > 0 and camera_name not in cams:
                            continue
                    except Exception:
                        pass

                # 2. Filter by allowed events / labels if specified
                if label and d.allowed_events:
                    try:
                        events = json.loads(d.allowed_events)
                        if events and len(events) > 0 and label.lower() not in [e.lower() for e in events]:
                            continue
                    except Exception:
                        pass

                filtered_devices.append({
                    "id": d.id,
                    "name": d.friendly_name,
                    "type": d.device_type,
                    "target_ip": d.tailscale_ip if d.tailscale_ip else d.ip_address,
                    "local_ip": d.ip_address,
                    "tailscale_ip": d.tailscale_ip,
                    "pip_default_size": d.pip_default_size or "medium",
                    "pip_duration_seconds": d.pip_duration_seconds or 10
                })
            return filtered_devices

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

        devices = await self.get_active_tv_devices(camera_name=camera_name, label=label)
        if not devices:
            logger.info(f"No paired TV devices found for PiP dispatch (Camera: {camera_name}, Label: {label}).")
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

        return {
            "status": "success",
            "dispatched_count": len(results),
            "results": results
        }

    async def check_device_online(self, ip: str) -> bool:
        """Fast non-blocking port check to verify if Smart TV / device is reachable on the LAN."""
        if not ip:
            return False
        common_ports = [8008, 8009, 7986, 5463, 80, 8080]
        for port in common_ports:
            try:
                fut = asyncio.open_connection(ip, port)
                reader, writer = await asyncio.wait_for(fut, timeout=0.6)
                writer.close()
                await writer.wait_closed()
                return True
            except Exception:
                pass
        return False

    async def test_single_device(
        self,
        device_id: int,
        camera_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """Dispatches an interactive test PiP alert to a specific TV using real accessible camera frame."""
        import socket
        from app.core.config import settings
        from app.services.audit_service import audit_service
        from app.db.models import Camera

        async with AsyncSessionLocal() as session:
            stmt = select(PairedDevice).where(PairedDevice.id == device_id)
            res = await session.execute(stmt)
            dev = res.scalar_one_or_none()
            if not dev:
                return {"status": "error", "message": "Dispositivo não encontrado."}

            target_ip = dev.tailscale_ip if dev.tailscale_ip else dev.ip_address
            dev_name = dev.friendly_name

            # Dynamically select an existing active camera if specified one is missing
            cam_stmt = select(Camera).where(Camera.enabled == True)
            cam_res = await session.execute(cam_stmt)
            active_cams = cam_res.scalars().all()
            
            chosen_cam = None
            if camera_name:
                chosen_cam = next((c for c in active_cams if c.name == camera_name), None)
            if not chosen_cam and active_cams:
                chosen_cam = active_cams[0]
                camera_name = chosen_cam.name
            elif not chosen_cam:
                camera_name = "sentinela"

        # Resolve server LAN IP so the TV on the local network can fetch the snapshot image
        server_ip = "192.168.1.247"
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect((target_ip, 80))
            server_ip = s.getsockname()[0]
            s.close()
        except Exception:
            pass

        snapshot_url = f"http://{server_ip}:5000/api/{camera_name}/latest.jpg" if active_cams else f"http://{server_ip}:8088/icon-192.png"
        stream_url = f"rtsp://{server_ip}:8554/{camera_name}" if active_cams else ""

        dispatched = False
        protocol_used = "none"

        # 1. Native Sentinela WebSocket Broadcast (for Sentinela Android/Tablet/Smart TV app)
        try:
            from app.api.ws import ws_manager
            if ws_manager.active_connections:
                await ws_manager.broadcast_json({
                    "type": "pip_alert",
                    "camera": camera_name,
                    "label": "TESTE DE PiP",
                    "title": f"🛡️ Sentinela Pro: {camera_name.upper()}",
                    "message": "Teste de Notificação Picture-in-Picture",
                    "snapshot_url": snapshot_url,
                    "stream_url": stream_url,
                    "duration": 15,
                    "device_id": device_id
                })
                dispatched = True
                protocol_used = "sentinela_app_ws"
        except Exception as e:
            logger.debug(f"WS PiP broadcast error: {e}")

        async with httpx.AsyncClient(timeout=4.0) as client:
            # 2. Native Cast
            if not dispatched and dev.device_type in ["android_tv", "chromecast", "google_tv", "tcl"]:
                try:
                    cast_ok = await asyncio.to_thread(_cast_sync, target_ip, snapshot_url, "image/jpeg")
                    if cast_ok:
                        dispatched = True
                        protocol_used = "google_cast"
                except Exception as e:
                    logger.debug(f"Cast fail on {target_ip}: {e}")

            # 3. PiP-Up / Notifications for Android TV REST HTTP
            if not dispatched:
                payload = {
                    "title": f"🛡️ Sentinela Pro: {camera_name.upper()}",
                    "message": "Teste de Notificação Picture-in-Picture",
                    "duration": 15,
                    "position": 1,
                    "image": snapshot_url,
                    "video": stream_url,
                    "type": 2
                }
                for url in [f"http://{target_ip}:7986/notify", f"http://{target_ip}:5463/notify"]:
                    try:
                        r = await client.post(url, json=payload)
                        if r.status_code in [200, 201, 204]:
                            dispatched = True
                            protocol_used = "pip_rest"
                            break
                    except Exception:
                        pass

        if dispatched:
            await audit_service.log(
                action="PIP_TEST_SUCCESS",
                module="PIP",
                severity="SUCCESS",
                details=f"Alerta PiP de teste entregue para {dev_name} ({target_ip}) via {protocol_used} usando {camera_name}."
            )
            return {
                "status": "success",
                "message": f"Alerta PiP enviado com sucesso para {dev_name}!",
                "protocol": protocol_used,
                "target_ip": target_ip
            }
        else:
            await audit_service.log(
                action="PIP_TEST_FAILED",
                module="PIP",
                severity="WARNING",
                details=f"Tentativa de teste PiP falhou para {dev_name} ({target_ip}). Verifique se a TV está ligada e com o app PiP-Up/Notifications ativo ou Google Cast liberado."
            )
            return {
                "status": "warning",
                "message": f"Comando enviado para {dev_name} ({target_ip}), mas o dispositivo não confirmou recebimento. Dica: Na TV TCL/Android TV, instale o app 'PiP-Up' ou 'Notifications for Android TV' da Play Store para notificações flutuantes durante o uso de outros apps.",
                "target_ip": target_ip
            }

pip_gateway_service = PiPGatewayService()

