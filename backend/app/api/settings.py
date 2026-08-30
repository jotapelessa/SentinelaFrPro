from fastapi import APIRouter, Depends, HTTPException, Body
from pydantic import BaseModel
from typing import Optional, Dict, Any
from app.services.telegram_vault import telegram_vault_service
from app.services.pip_gateway import pip_gateway_service
from app.core.config import settings
from app.db.session import get_db
from app.db.models import Camera, PairedDevice
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

router = APIRouter(prefix="/settings", tags=["Settings"])

class TelegramConfigUpdate(BaseModel):
    bot_token: str
    chat_id: str

class PauseAlertsRequest(BaseModel):
    minutes: int = 60

class DNDConfigUpdate(BaseModel):
    enabled: bool
    start_hour: int
    end_hour: int

class ZoneUpdate(BaseModel):
    camera_name: str
    zone_name: str
    coordinates: str # e.g. "0,720,1280,720,1280,100,0,100"

@router.get("/")
async def get_settings():
    return {
        "telegram_configured": telegram_vault_service.is_configured,
        "telegram_chat_id": settings.TELEGRAM_CHAT_ID[:4] + "***" if settings.TELEGRAM_CHAT_ID else "",
        "alerts_paused": telegram_vault_service.is_paused(),
        "frigate_url": settings.FRIGATE_API_URL,
        "mqtt_broker": f"{settings.MQTT_BROKER}:{settings.MQTT_PORT}",
        "dnd_enabled": pip_gateway_service._dnd_enabled,
        "dnd_start_hour": pip_gateway_service._dnd_start_hour,
        "dnd_end_hour": pip_gateway_service._dnd_end_hour
    }

@router.post("/telegram")
async def update_telegram_config(config: TelegramConfigUpdate):
    settings.TELEGRAM_BOT_TOKEN = config.bot_token
    settings.TELEGRAM_CHAT_ID = config.chat_id
    telegram_vault_service.bot_token = config.bot_token
    telegram_vault_service.chat_id = config.chat_id
    return {"status": "updated", "configured": telegram_vault_service.is_configured}

@router.post("/telegram/test")
async def test_telegram_alert():
    return await telegram_vault_service.test_connection()

@router.get("/dnd")
async def get_dnd_settings():
    return {
        "enabled": pip_gateway_service._dnd_enabled,
        "start_hour": pip_gateway_service._dnd_start_hour,
        "end_hour": pip_gateway_service._dnd_end_hour
    }

@router.post("/dnd")
async def update_dnd_settings(cfg: DNDConfigUpdate):
    pip_gateway_service._dnd_enabled = cfg.enabled
    pip_gateway_service._dnd_start_hour = cfg.start_hour
    pip_gateway_service._dnd_end_hour = cfg.end_hour
    return {"status": "updated", "dnd": cfg.model_dump()}

@router.post("/pause")
async def pause_alerts(req: PauseAlertsRequest):
    telegram_vault_service.pause_alerts(req.minutes)
    return {
        "status": "paused",
        "minutes": req.minutes,
        "until": telegram_vault_service.pause_until.isoformat() if telegram_vault_service.pause_until else None
    }

@router.post("/resume")
async def resume_alerts():
    telegram_vault_service.pause_until = None
    return {"status": "resumed"}

@router.get("/backup")
async def export_backup(db: AsyncSession = Depends(get_db)):
    cams_res = await db.execute(select(Camera))
    cams = cams_res.scalars().all()
    devs_res = await db.execute(select(PairedDevice))
    devs = devs_res.scalars().all()

    return {
        "version": "2.0-pro",
        "cameras": [
            {
                "name": c.name,
                "friendly_name": c.friendly_name,
                "rtsp_main": c.rtsp_main,
                "ip_address": c.ip_address,
                "enabled": c.enabled
            }
            for c in cams
        ],
        "devices": [
            {
                "identifier": d.device_identifier,
                "name": d.friendly_name,
                "type": d.device_type,
                "ip": d.ip_address
            }
            for d in devs
        ],
        "telegram_configured": telegram_vault_service.is_configured,
        "dnd_enabled": pip_gateway_service._dnd_enabled
    }

