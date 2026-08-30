from fastapi import APIRouter
from app.services.scanner_service import scanner_service

router = APIRouter(prefix="/scanner", tags=["Scanner"])

@router.post("/run")
async def trigger_network_scan():
    """Triggers concurrent ONVIF Discovery and CCTV port scanner."""
    results = await scanner_service.run_full_scan()
    return results
