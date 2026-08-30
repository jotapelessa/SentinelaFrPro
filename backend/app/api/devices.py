from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
from app.db.session import get_db
from app.db.models import PairedDevice
from app.services.pip_gateway import pip_gateway_service

router = APIRouter(prefix="/devices", tags=["Devices"])

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
    camera_name: str = "portao_principal"
    label: str = "person"

@router.get("/")
async def list_devices(db: AsyncSession = Depends(get_db)):
    stmt = select(PairedDevice)
    result = await db.execute(stmt)
    return result.scalars().all()

@router.post("/")
async def register_device(dev: DeviceCreate, db: AsyncSession = Depends(get_db)):
    stmt = select(PairedDevice).where(PairedDevice.device_identifier == dev.device_identifier)
    res = await db.execute(stmt)
    existing = res.scalar_one_or_none()
    if existing:
        existing.friendly_name = dev.friendly_name
        existing.ip_address = dev.ip_address
        existing.tailscale_ip = dev.tailscale_ip
        existing.device_type = dev.device_type
        await db.commit()
        return existing

    new_dev = PairedDevice(**dev.model_dump())
    db.add(new_dev)
    await db.commit()
    await db.refresh(new_dev)
    return new_dev

@router.patch("/{device_id}/status")
async def update_status(device_id: int, update: DeviceStatusUpdate, db: AsyncSession = Depends(get_db)):
    stmt = select(PairedDevice).where(PairedDevice.id == device_id)
    res = await db.execute(stmt)
    dev = res.scalar_one_or_none()
    if not dev:
        raise HTTPException(status_code=404, detail="Device not found")
    dev.permission_status = update.permission_status
    await db.commit()
    return dev

@router.post("/test-pip")
async def test_pip(req: TestPiPRequest):
    res = await pip_gateway_service.dispatch_pip_alert(
        camera_name=req.camera_name,
        label=req.label,
        snapshot_url="https://via.placeholder.com/640x360.jpg?text=Sentinela+PiP+Test",
        duration_seconds=15
    )
    return res
