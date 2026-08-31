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
async def get_settings(db: AsyncSession = Depends(get_db)):
    from app.db.models import SystemSetting
    stmt = select(SystemSetting)
    res = await db.execute(stmt)
    all_settings = {s.key: s.value for s in res.scalars().all()}

    saved_token = all_settings.get("telegram_bot_token") or telegram_vault_service.bot_token or ""
    saved_chat_id = all_settings.get("telegram_chat_id") or telegram_vault_service.chat_id or ""

    # Sync back to in-memory vault
    if saved_token:
        telegram_vault_service.bot_token = saved_token
        settings.TELEGRAM_BOT_TOKEN = saved_token
    if saved_chat_id:
        telegram_vault_service.chat_id = saved_chat_id
        settings.TELEGRAM_CHAT_ID = saved_chat_id

    dnd_enabled_val = all_settings.get("dnd_enabled", "false").lower() == "true"
    dnd_start_val = int(all_settings.get("dnd_start_hour", "23"))
    dnd_end_val = int(all_settings.get("dnd_end_hour", "6"))

    pip_gateway_service._dnd_enabled = dnd_enabled_val
    pip_gateway_service._dnd_start_hour = dnd_start_val
    pip_gateway_service._dnd_end_hour = dnd_end_val

    return {
        "telegram_configured": bool(saved_token and saved_chat_id),
        "bot_token": saved_token,
        "chat_id": saved_chat_id,
        "telegram_chat_id": saved_chat_id,
        "alerts_paused": telegram_vault_service.is_paused(),
        "frigate_url": settings.FRIGATE_API_URL,
        "mqtt_broker": f"{settings.MQTT_BROKER}:{settings.MQTT_PORT}",
        "dnd_enabled": dnd_enabled_val,
        "dnd_start_hour": dnd_start_val,
        "dnd_end_hour": dnd_end_val
    }

@router.post("/telegram")
async def update_telegram_config(config: TelegramConfigUpdate, db: AsyncSession = Depends(get_db)):
    clean_token = config.bot_token.strip()
    clean_chat_id = config.chat_id.strip()

    settings.TELEGRAM_BOT_TOKEN = clean_token
    settings.TELEGRAM_CHAT_ID = clean_chat_id
    telegram_vault_service.bot_token = clean_token
    telegram_vault_service.chat_id = clean_chat_id

    # Persist to database SQLite SystemSetting table
    from app.db.models import SystemSetting
    for k, v in [("telegram_bot_token", clean_token), ("telegram_chat_id", clean_chat_id)]:
        stmt = select(SystemSetting).where(SystemSetting.key == k)
        res = await db.execute(stmt)
        setting_obj = res.scalar_one_or_none()
        if setting_obj:
            setting_obj.value = v
        else:
            db.add(SystemSetting(key=k, value=v))
    await db.commit()

    # Restart interactive polling task with new credentials
    if clean_token and clean_chat_id:
        telegram_vault_service.start_polling_task()

    return {
        "status": "updated",
        "configured": telegram_vault_service.is_configured,
        "bot_token": clean_token,
        "chat_id": clean_chat_id
    }


@router.post("/telegram/test")
async def test_telegram_alert():
    return await telegram_vault_service.test_connection()

@router.get("/dnd")
async def get_dnd_settings(db: AsyncSession = Depends(get_db)):
    from app.db.models import SystemSetting
    stmt = select(SystemSetting)
    res = await db.execute(stmt)
    all_settings = {s.key: s.value for s in res.scalars().all()}

    dnd_enabled_val = all_settings.get("dnd_enabled", "false").lower() == "true"
    dnd_start_val = int(all_settings.get("dnd_start_hour", "23"))
    dnd_end_val = int(all_settings.get("dnd_end_hour", "6"))

    return {
        "enabled": dnd_enabled_val,
        "start_hour": dnd_start_val,
        "end_hour": dnd_end_val
    }

@router.post("/dnd")
async def update_dnd_settings(cfg: DNDConfigUpdate, db: AsyncSession = Depends(get_db)):
    pip_gateway_service._dnd_enabled = cfg.enabled
    pip_gateway_service._dnd_start_hour = cfg.start_hour
    pip_gateway_service._dnd_end_hour = cfg.end_hour

    from app.db.models import SystemSetting
    for k, v in [("dnd_enabled", str(cfg.enabled).lower()), ("dnd_start_hour", str(cfg.start_hour)), ("dnd_end_hour", str(cfg.end_hour))]:
        stmt = select(SystemSetting).where(SystemSetting.key == k)
        res = await db.execute(stmt)
        setting_obj = res.scalar_one_or_none()
        if setting_obj:
            setting_obj.value = v
        else:
            db.add(SystemSetting(key=k, value=v))
    await db.commit()

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

