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

class CameraResponse(CameraCreate):
    id: int
    created_at: Optional[str] = None

@router.get("/")
async def list_cameras(db: AsyncSession = Depends(get_db)):
    stmt = select(Camera)
    result = await db.execute(stmt)
    cameras = result.scalars().all()
    # If DB is empty, provide configured camera
    if not cameras:
        return [
            {
                "id": 1,
                "name": "camera_principal",
                "friendly_name": "Câmera Principal (IP 192.168.1.6)",
                "rtsp_main": "rtsp://192.168.1.6:8554/stream",
                "ip_address": "192.168.1.6",
                "enabled": True,
                "zones": ["zona_monitoramento"]
            }
        ]
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
