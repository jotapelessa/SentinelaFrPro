from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import List, Optional
from app.db.session import get_db
from app.db.models import Camera

router = APIRouter(prefix="/cameras", tags=["Cameras"])

class CameraCreate(BaseModel):
    name: str
    friendly_name: Optional[str] = None
    rtsp_main: str
    rtsp_sub: Optional[str] = None
    ip_address: Optional[str] = None
    onvif_port: Optional[int] = 80
    enabled: Optional[bool] = True

@router.get("/")
async def list_cameras(db: AsyncSession = Depends(get_db)):
    stmt = select(Camera)
    result = await db.execute(stmt)
    cameras = result.scalars().all()
    
    # Auto-provision real camera if not present
    if not cameras or not any(c.ip_address == "192.168.1.6" for c in cameras):
        # Clear mock cameras and insert real camera
        for c in cameras:
            await db.delete(c)
        real_cam = Camera(
            name="camera_principal",
            friendly_name="Câmera Principal (IP 192.168.1.6)",
            rtsp_main="rtsp://192.168.1.6:8554/stream",
            ip_address="192.168.1.6",
            enabled=True,
            onvif_port=80
        )
        db.add(real_cam)
        await db.commit()
        await db.refresh(real_cam)
        return [real_cam]

    return cameras

@router.post("/")
async def add_camera(cam: CameraCreate, db: AsyncSession = Depends(get_db)):
    db_cam = Camera(
        name=cam.name,
        friendly_name=cam.friendly_name or cam.name,
        rtsp_main=cam.rtsp_main,
        rtsp_sub=cam.rtsp_sub,
        ip_address=cam.ip_address,
        onvif_port=cam.onvif_port or 80,
        enabled=cam.enabled if cam.enabled is not None else True
    )
    db.add(db_cam)
    await db.commit()
    await db.refresh(db_cam)
    return db_cam

class CameraUpdate(BaseModel):
    friendly_name: Optional[str] = None

    rtsp_main: Optional[str] = None
    rtsp_sub: Optional[str] = None
    ip_address: Optional[str] = None
    onvif_port: Optional[int] = None
    enabled: Optional[bool] = None
    zones: Optional[str] = None
    objects_to_track: Optional[str] = None
    min_score: Optional[float] = None
    record_mode: Optional[str] = None
    record_retain_days: Optional[int] = None
    record_audio: Optional[bool] = None
    notify_telegram: Optional[bool] = None
    notify_tv: Optional[bool] = None
    notify_audio: Optional[bool] = None
    cooldown_seconds: Optional[int] = None

@router.patch("/{camera_id}")
async def update_camera(camera_id: int, update: CameraUpdate, db: AsyncSession = Depends(get_db)):
    stmt = select(Camera).where(Camera.id == camera_id)
    res = await db.execute(stmt)
    cam = res.scalar_one_or_none()
    if not cam:
        raise HTTPException(status_code=404, detail="Camera not found")

    update_data = update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(cam, field, value)

    await db.commit()
    await db.refresh(cam)
    return cam

@router.delete("/{camera_id}")
async def delete_camera(camera_id: int, db: AsyncSession = Depends(get_db)):
    stmt = select(Camera).where(Camera.id == camera_id)
    res = await db.execute(stmt)
    cam = res.scalar_one_or_none()
    if not cam:
        raise HTTPException(status_code=404, detail="Camera not found")

    await db.delete(cam)
    await db.commit()
    return {"status": "deleted", "id": camera_id}

