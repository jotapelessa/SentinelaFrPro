from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import asyncio
from app.db.session import get_db
from app.db.models import PairedDevice
from app.services.pip_gateway import pip_gateway_service
from app.services.scanner_service import scanner_service
from app.services.audit_service import audit_service

router = APIRouter(prefix="/devices", tags=["Devices"])

@router.get("/discover")
async def discover_tvs(request: Request):
    """Scans LAN subnet for Smart TVs and Chromecast devices."""
    tvs = await scanner_service.discover_smart_tvs()
    await audit_service.log(
        action="LAN_TV_SCAN",
        module="PIP",
        severity="INFO",
        details=f"Varredura de Smart TVs na rede local: {len(tvs)} dispositivo(s) encontrado(s).",
        client_ip=request.client.host if request.client else "unknown"
    )
    return tvs

class DeviceCreate(BaseModel):
    device_identifier: str
    friendly_name: str
    device_type: str = "android_tv" # android_tv, tablet, web, kiosk
    ip_address: Optional[str] = None
    tailscale_ip: Optional[str] = None
    permission_status: str = "allowed"

class DeviceStatusUpdate(BaseModel):
    permission_status: str # allowed, blocked, paused

class TestPiPRequest(BaseModel):
    camera_name: str = "camera_principal"
    label: str = "person"

class TestSingleDeviceRequest(BaseModel):
    camera_name: str = "camera_principal"

@router.get("/")
async def list_devices(db: AsyncSession = Depends(get_db)):
    stmt = select(PairedDevice)
    result = await db.execute(stmt)
    return result.scalars().all()

@router.get("/health")
async def check_devices_health(db: AsyncSession = Depends(get_db)):
    """Checks real-time online/reachable status for all paired screens."""
    stmt = select(PairedDevice)
    result = await db.execute(stmt)
    devices = result.scalars().all()

    async def check_one(d: PairedDevice):
        ip = d.tailscale_ip if d.tailscale_ip else d.ip_address
        is_online = await pip_gateway_service.check_device_online(ip)
        return {
            "id": d.id,
            "name": d.friendly_name,
            "ip": ip,
            "online": is_online
        }

    statuses = await asyncio.gather(*[check_one(d) for d in devices])
    return statuses

@router.post("/")
async def register_device(dev: DeviceCreate, request: Request, db: AsyncSession = Depends(get_db)):
    stmt = select(PairedDevice).where(PairedDevice.device_identifier == dev.device_identifier)
    res = await db.execute(stmt)
    existing = res.scalar_one_or_none()
    if existing:
        existing.friendly_name = dev.friendly_name
        existing.ip_address = dev.ip_address
        existing.tailscale_ip = dev.tailscale_ip
        existing.device_type = dev.device_type
        await db.commit()
        await audit_service.log(
            action="DEVICE_UPDATED",
            module="PIP",
            severity="INFO",
            details=f"Dados da tela/TV {existing.friendly_name} ({existing.ip_address}) atualizados.",
            client_ip=request.client.host if request.client else "unknown"
        )
        return existing

    new_dev = PairedDevice(**dev.model_dump())
    db.add(new_dev)
    await db.commit()
    await db.refresh(new_dev)
    await audit_service.log(
        action="DEVICE_PAIRED",
        module="PIP",
        severity="SUCCESS",
        details=f"Nova Smart TV/tela pareada: {new_dev.friendly_name} ({new_dev.ip_address})",
        client_ip=request.client.host if request.client else "unknown"
    )
    return new_dev

@router.patch("/{device_id}/status")
async def update_status(device_id: int, update: DeviceStatusUpdate, request: Request, db: AsyncSession = Depends(get_db)):
    stmt = select(PairedDevice).where(PairedDevice.id == device_id)
    res = await db.execute(stmt)
    dev = res.scalar_one_or_none()
    if not dev:
        raise HTTPException(status_code=404, detail="Device not found")
    dev.permission_status = update.permission_status
    await db.commit()
    await audit_service.log(
        action="DEVICE_STATUS_CHANGED",
        module="PIP",
        severity="INFO",
        details=f"Status da tela {dev.friendly_name} alterado para '{update.permission_status}'.",
        client_ip=request.client.host if request.client else "unknown"
    )
    return dev

@router.delete("/{device_id}")
async def delete_device(device_id: int, request: Request, db: AsyncSession = Depends(get_db)):
    stmt = select(PairedDevice).where(PairedDevice.id == device_id)
    res = await db.execute(stmt)
    dev = res.scalar_one_or_none()
    if not dev:
        raise HTTPException(status_code=404, detail="Device not found")
    dev_name = dev.friendly_name
    await db.delete(dev)
    await db.commit()
    await audit_service.log(
        action="DEVICE_DELETED",
        module="PIP",
        severity="WARNING",
        details=f"Tela {dev_name} despareada e removida do Sentinela.",
        client_ip=request.client.host if request.client else "unknown"
    )
    return {"status": "deleted", "id": device_id}

@router.post("/{device_id}/test")
async def test_single_device(device_id: int, req: Optional[TestSingleDeviceRequest] = None):
    """Triggers an interactive PiP test to this single TV with the selected camera."""
    cam_name = req.camera_name if req else "camera_principal"
    return await pip_gateway_service.test_single_device(device_id=device_id, camera_name=cam_name)

@router.post("/test-pip")
async def test_pip(req: TestPiPRequest):
    """Triggers a broadcast PiP test to all active TVs."""
    from app.core.config import settings
    snapshot_url = f"{settings.FRIGATE_API_URL}/api/{req.camera_name}/latest.jpg"
    stream_url = f"rtsp://{req.camera_name}"
    res = await pip_gateway_service.dispatch_pip_alert(
        camera_name=req.camera_name,
        label=req.label,
        snapshot_url=snapshot_url,
        stream_url=stream_url,
        duration_seconds=15
    )
    return res

