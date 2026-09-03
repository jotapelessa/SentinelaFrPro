import asyncio
import json
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Set
from app.services.telemetry import telemetry_service
from app.services.telegram_vault import telegram_vault_service
from app.services.mqtt_service import mqtt_service

logger = logging.getLogger(__name__)
router = APIRouter(tags=["WebSocket"])

class WebSocketManager:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)
        logger.info(f"WebSocket client connected. Active: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)
        logger.info(f"WebSocket client disconnected. Active: {len(self.active_connections)}")

    async def broadcast_json(self, data: dict):
        if not self.active_connections:
            return
        payload = json.dumps(data)
        disconnected = set()
        for connection in list(self.active_connections):
            try:
                await connection.send_text(payload)
            except Exception:
                disconnected.add(connection)
        
        for conn in disconnected:
            self.active_connections.discard(conn)

ws_manager = WebSocketManager()

# Hook MQTT service broadcast to WS manager
mqtt_service.register_ws_callback(ws_manager.broadcast_json)

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        # Send initial telemetry snapshot on connect
        snapshot = telemetry_service.get_telemetry_snapshot()
        snapshot["type"] = "TELEMETRY_UPDATE"
        snapshot["telegram"] = {
            "configured": telegram_vault_service.is_configured,
            "paused": telegram_vault_service.is_paused()
        }
        await websocket.send_text(json.dumps(snapshot))

        # Keep listening for client commands if any
        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                if msg.get("action") == "PING":
                    await websocket.send_text(json.dumps({"type": "PONG"}))
            except Exception:
                pass
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception as e:
        logger.debug(f"WS error: {e}")
        ws_manager.disconnect(websocket)

async def telemetry_broadcast_loop():
    """Background loop sending hardware telemetry every 2.0 seconds to connected UI clients."""
    while True:
        try:
            if ws_manager.active_connections:
                snapshot = telemetry_service.get_telemetry_snapshot()
                snapshot["type"] = "TELEMETRY_UPDATE"
                snapshot["telegram"] = {
                    "configured": telegram_vault_service.is_configured,
                    "paused": telegram_vault_service.is_paused()
                }
                await ws_manager.broadcast_json(snapshot)
        except Exception as e:
            logger.debug(f"Telemetry broadcast error: {e}")
        await asyncio.sleep(2.0)
