from fastapi import APIRouter
from app.services.telemetry import telemetry_service
from app.services.telegram_vault import telegram_vault_service

router = APIRouter(prefix="/telemetry", tags=["Telemetry"])

@router.get("/")
async def get_telemetry():
    snapshot = telemetry_service.get_telemetry_snapshot()
    snapshot["telegram"] = {
        "configured": telegram_vault_service.is_configured,
        "paused": telegram_vault_service.is_paused()
    }
    return snapshot
