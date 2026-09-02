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
        """Dynamically loads live Telegram settings configured in the Web Dashboard."""
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
            cooldown_duration = tg_policy.get("cooldown_seconds", 5.0)

            if event_id not in self._processed_events and (now_ts - last_time > cooldown_duration):
                self._mark_processed(event_id)
                self._cooldowns[cooldown_key] = now_ts
                logger.info(f"🚨 Security event: {label} on {camera} (zone: {zone_name}, score: {score:.2f})")

                snapshot_bytes = None
                async with httpx.AsyncClient(timeout=4.0) as client:
                    try:
                        resp = await client.get(f"{settings.FRIGATE_API_URL}/api/events/{event_id}/snapshot.jpg")
                        if resp.status_code == 200:
                            snapshot_bytes = resp.content
                        else:
                            resp_latest = await client.get(f"{settings.FRIGATE_API_URL}/api/{camera}/latest.jpg")
                            if resp_latest.status_code == 200:
                                snapshot_bytes = resp_latest.content
                    except Exception as e:
                        logger.warning(f"Could not retrieve snapshot: {e}")

                telegram_ok = False
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

                # Strict Enforcement of Telegram send_mode
                send_mode = tg_policy.get("send_mode", "both")
                allowed_tg_events = tg_policy.get("allowed_events", list(CRITICAL_LABELS))

                if snapshot_bytes and send_mode in ["both", "photo_only"] and label in allowed_tg_events:
                    telegram_ok = await telegram_vault_service.send_alert_photo(
                        image_bytes=snapshot_bytes,
                        camera_name=camera,
                        label=label,
                        zone=zone_name,
                        score=score,
                        friendly_name=friendly_name
                    )

                snapshot_url = f"{settings.FRIGATE_API_URL}/api/events/{event_id}/snapshot.jpg"
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

            await self.broadcast_event({
                "type": "CAMERA_DETECTION_ACTIVE",
                "camera": camera,
                "label": label,
                "score": round(score * 100) if score <= 1 else round(score),
                "zone": zone_name,
                "box": after.get("box"),
                "active": True
            })

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
                            friendly_name=friendly_name
                        )
                    )

    async def _dispatch_telegram_video_with_retry(
        self,
        event_id: str,
        camera: str,
        label: str,
        zone_name: Optional[str],
        duration_s: float,
        score: float,
        friendly_name: Optional[str]
    ):
        """Asynchronously polls Frigate for the finalized MP4 clip and sends to Telegram."""
        delays = [2.0, 3.0, 5.0, 8.0, 10.0, 12.0, 15.0]
        for attempt, delay in enumerate(delays, start=1):
            await asyncio.sleep(delay)
            try:
                async with httpx.AsyncClient(timeout=40.0) as client:
                    clip_url = f"{settings.FRIGATE_API_URL}/api/events/{event_id}/clip.mp4"
                    clip_resp = await client.get(clip_url)
                    if clip_resp.status_code == 200 and len(clip_resp.content) > 1024:
                        logger.info(f"✅ Clipe MP4 obtido do Frigate (tentativa {attempt}/{len(delays)}, {len(clip_resp.content)} bytes). Transcodificando a 30 FPS...")
                        from app.services.frigate_bridge import frigate_bridge
                        smooth_video = await frigate_bridge.transcode_to_30fps(clip_resp.content, target_fps=30)
                        sent_ok = await telegram_vault_service.send_alert_video(
                            video_bytes=smooth_video,
                            camera_name=camera,
                            label=label,
                            zone=zone_name,
                            duration_s=duration_s,
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
                    else:
                        logger.debug(f"Aguardando Frigate gravar MP4 ({attempt}/{len(delays)}: HTTP {clip_resp.status_code})...")
            except Exception as e:
                logger.warning(f"Tentativa {attempt} de envio de vídeo ao Telegram falhou: {e}")

        logger.warning(f"⚠️ Clipe MP4 não finalizado a tempo pelo Frigate para o evento {event_id}.")

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
