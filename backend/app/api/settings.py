from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from app.services.telegram_vault import telegram_vault_service
from app.core.config import settings

router = APIRouter(prefix="/settings", tags=["Settings"])

class TelegramConfigUpdate(BaseModel):
    bot_token: str
    chat_id: str

class PauseAlertsRequest(BaseModel):
    minutes: int = 60

@router.get("/")
async def get_settings():
    return {
        "telegram_configured": telegram_vault_service.is_configured,
        "telegram_chat_id": settings.TELEGRAM_CHAT_ID[:4] + "***" if settings.TELEGRAM_CHAT_ID else "",
        "alerts_paused": telegram_vault_service.is_paused(),
        "frigate_url": settings.FRIGATE_API_URL,
        "mqtt_broker": f"{settings.MQTT_BROKER}:{settings.MQTT_PORT}"
    }

@router.post("/telegram")
async def update_telegram_config(config: TelegramConfigUpdate):
    settings.TELEGRAM_BOT_TOKEN = config.bot_token
    settings.TELEGRAM_CHAT_ID = config.chat_id
    telegram_vault_service.bot_token = config.bot_token
    telegram_vault_service.chat_id = config.chat_id
    return {"status": "updated", "configured": telegram_vault_service.is_configured}

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
