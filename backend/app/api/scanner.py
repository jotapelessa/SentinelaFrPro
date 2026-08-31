from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from app.services.scanner_service import scanner_service

router = APIRouter(prefix="/scanner", tags=["Scanner"])

class ScanPayload(BaseModel):
    subnet: Optional[str] = None

@router.post("/run")
async def trigger_network_scan(payload: Optional[ScanPayload] = None):
    """Triggers concurrent ONVIF Discovery and verified CCTV port scanner."""
    subnet = payload.subnet if payload else None
    results = await scanner_service.run_full_scan(subnet=subnet)
    return results
