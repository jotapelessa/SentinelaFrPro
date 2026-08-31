import json
import asyncio
import logging
import httpx
import datetime
from typing import Set, Dict, Any, Callable, List
from aiomqtt import Client, MqttError
from app.core.config import settings
from app.db.session import AsyncSessionLocal
from app.db.models import EventRecord
from app.services.telegram_vault import telegram_vault_service
from app.services.pip_gateway import pip_gateway_service
from sqlalchemy import select

logger = logging.getLogger(__name__)

# Objects we care about
CRITICAL_LABELS = {"person", "car", "motorcycle", "bus", "truck", "dog", "cat"}

class MQTTService:
    def __init__(self):
        self.ws_broadcast_callbacks: List[Callable[[Dict[str, Any]], Any]] = []
        self._processed_events: Set[str] = set()
        self._cooldowns: Dict[str, float] = {} # camera:label -> last_trigger_timestamp

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

    async def handle_frigate_event(self, payload: Dict[str, Any]):
        event_type = payload.get("type") # new, update, end
        after = payload.get("after", {})
        before = payload.get("before", {})

        event_id = after.get("id") or before.get("id")
        camera = after.get("camera") or before.get("camera", "camera")
        label = after.get("label") or before.get("label", "unknown")
        score = after.get("top_score") or after.get("score") or 0.0
        current_zones = after.get("current_zones", [])
        entered_zones = after.get("entered_zones", [])
        zones = list(set(current_zones + entered_zones))
        zone_name = zones[0] if zones else None

        if label not in CRITICAL_LABELS:
            return

        # Handle 'new' or 'update' event
        if event_type in ["new", "update"]:
            cooldown_key = f"{camera}:{label}:{zone_name}"
            now_ts = asyncio.get_event_loop().time()
            last_time = self._cooldowns.get(cooldown_key, 0)

            # 10s cooldown per camera/label/zone to prevent alert flood
            if event_id not in self._processed_events and (now_ts - last_time > 10.0):
                self._processed_events.add(event_id)
                self._cooldowns[cooldown_key] = now_ts
                logger.info(f"🚨 Qualifying security event detected: {label} on {camera} (zone: {zone_name})")

                # 1. Fetch snapshot from Frigate
                snapshot_bytes = None
                async with httpx.AsyncClient(timeout=3.0) as client:
                    try:
                        # Try event snapshot first, fallback to latest frame
                        resp = await client.get(f"{settings.FRIGATE_API_URL}/api/events/{event_id}/snapshot.jpg")
                        if resp.status_code == 200:
                            snapshot_bytes = resp.content
                        else:
                            resp_latest = await client.get(f"{settings.FRIGATE_API_URL}/api/{camera}/latest.jpg")
                            if resp_latest.status_code == 200:
                                snapshot_bytes = resp_latest.content
                    except Exception as e:
                        logger.warning(f"Could not retrieve snapshot from Frigate: {e}")

                # 2. Telegram Alert Dispatch (< 1.2s)
                telegram_ok = False
                friendly_name = None
                try:
                    from app.db.models import Camera
                    async with AsyncSessionLocal() as session:
                        cam_stmt = select(Camera).where((Camera.name == camera) | (Camera.ip_address == camera))
                        cam_res = await session.execute(cam_stmt)
                        cam_obj = cam_res.scalar_one_or_none()
                        if cam_obj and cam_obj.friendly_name:
                            friendly_name = cam_obj.friendly_name
                except Exception:
                    pass

                if snapshot_bytes:
                    telegram_ok = await telegram_vault_service.send_alert_photo(
                        image_bytes=snapshot_bytes,
                        camera_name=camera,
                        label=label,
                        zone=zone_name,
                        score=score,
                        friendly_name=friendly_name
                    )

                # 3. PiP Gateway Dispatch (Smart TVs & Tablets)
                snapshot_url = f"{settings.FRIGATE_API_URL}/api/events/{event_id}/snapshot.jpg"
                stream_url = f"rtsp://{camera}"
                pip_res = await pip_gateway_service.dispatch_pip_alert(
                    camera_name=camera,
                    label=label,
                    snapshot_url=snapshot_url,
                    stream_url=stream_url
                )

                # 4. Save Event Record in Database
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

                # 5. Broadcast to Web UI via WebSockets
                await self.broadcast_event({
                    "type": "NEW_DETECTION",
                    "event_id": event_id,
                    "camera": camera,
                    "label": label,
                    "score": round(score * 100),
                    "zone": zone_name,
                    "timestamp": datetime.datetime.utcnow().isoformat(),
                    "snapshot_url": snapshot_url
                })

        # Handle 'end' event (Clip is finalized by Frigate)
        elif event_type == "end":
            has_clip = after.get("has_clip", False)
            if has_clip and event_id:
                logger.info(f"Event {event_id} finished with video clip.")
                start_t = after.get("start_time", 0)
                end_t = after.get("end_time", 0)
                dur = max(1.0, float(end_t - start_t)) if (end_t and start_t) else 15.0

                friendly_name = None
                try:
                    from app.db.models import Camera
                    async with AsyncSessionLocal() as session:
                        cam_stmt = select(Camera).where((Camera.name == camera) | (Camera.ip_address == camera))
                        cam_res = await session.execute(cam_stmt)
                        cam_obj = cam_res.scalar_one_or_none()
                        if cam_obj and cam_obj.friendly_name:
                            friendly_name = cam_obj.friendly_name
                except Exception:
                    pass

                # Download clip and send to Telegram
                async with httpx.AsyncClient(timeout=30.0) as client:
                    try:
                        clip_resp = await client.get(f"{settings.FRIGATE_API_URL}/api/events/{event_id}/clip.mp4")
                        if clip_resp.status_code == 200:
                            await telegram_vault_service.send_alert_video(
                                video_bytes=clip_resp.content,
                                camera_name=camera,
                                label=label,
                                duration_s=dur,
                                score=score,
                                friendly_name=friendly_name
                            )
                    except Exception as e:
                        logger.warning(f"Failed to fetch event clip: {e}")


                # Update in DB
                async with AsyncSessionLocal() as session:
                    stmt = select(EventRecord).where(EventRecord.frigate_event_id == event_id)
                    res = await session.execute(stmt)
                    ev = res.scalar_one_or_none()
                    if ev:
                        ev.has_clip = True
                        ev.end_time = datetime.datetime.utcnow()
                        await session.commit()

    async def start_listening(self):
        """Connects to MQTT and runs consumer loop with automatic reconnection."""
        while True:
            try:
                logger.info(f"Connecting to MQTT Broker at {settings.MQTT_BROKER}:{settings.MQTT_PORT}...")
                async with Client(
                    hostname=settings.MQTT_BROKER,
                    port=settings.MQTT_PORT,
                    identifier=settings.MQTT_CLIENT_ID
                ) as client:
                    topic = f"{settings.MQTT_TOPIC_PREFIX}/events"
                    await client.subscribe(topic)
                    logger.info(f"Subscribed to MQTT topic: {topic}")

                    async for message in client.messages:
                        try:
                            payload = json.loads(message.payload.decode("utf-8"))
                            await self.handle_frigate_event(payload)
                        except Exception as e:
                            logger.error(f"Error handling MQTT message: {e}")
            except MqttError as e:
                logger.warning(f"MQTT connection lost: {e}. Retrying in 5s...")
                await asyncio.sleep(5)
            except Exception as e:
                logger.error(f"Unexpected MQTT error: {e}. Retrying in 5s...")
                await asyncio.sleep(5)

mqtt_service = MQTTService()
