import asyncio
import json
import uuid
import datetime
from aiomqtt import Client
from app.core.config import settings

async def publish_simulated_event(
    camera: str = "portao_principal",
    label: str = "person",
    zone: str = "zona_portao",
    score: float = 0.88
):
    """Publishes a mock Frigate security event to Mosquitto MQTT."""
    event_id = f"{int(datetime.datetime.utcnow().timestamp())}.{uuid.uuid4().hex[:6]}-test"
    payload = {
        "type": "new",
        "before": {},
        "after": {
            "id": event_id,
            "camera": camera,
            "frame_time": datetime.datetime.utcnow().timestamp(),
            "snapshot_time": datetime.datetime.utcnow().timestamp(),
            "label": label,
            "top_score": score,
            "score": score,
            "false_positive": False,
            "start_time": datetime.datetime.utcnow().timestamp(),
            "end_time": None,
            "has_clip": True,
            "has_snapshot": True,
            "current_zones": [zone],
            "entered_zones": [zone]
        }
    }

    print(f"📡 Disparando evento simulado para MQTT: {camera} -> {label} ({zone})...")
    try:
        async with Client(hostname=settings.MQTT_BROKER, port=settings.MQTT_PORT) as client:
            await client.publish(f"{settings.MQTT_TOPIC_PREFIX}/events", json.dumps(payload))
            print("✅ Evento simulado publicado com sucesso!")
    except Exception as e:
        print(f"❌ Erro ao conectar ao MQTT: {e}")

if __name__ == "__main__":
    asyncio.run(publish_simulated_event())
