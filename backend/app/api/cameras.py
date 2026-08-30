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
async def update_camera(camera_id: str, update: CameraUpdate, db: AsyncSession = Depends(get_db)):
    cam = None
    if camera_id.isdigit():
        stmt = select(Camera).where(Camera.id == int(camera_id))
        res = await db.execute(stmt)
        cam = res.scalar_one_or_none()
    
    if not cam:
        stmt = select(Camera).where(Camera.name == camera_id)
        res = await db.execute(stmt)
        cam = res.scalar_one_or_none()

    if not cam:
        stmt_first = select(Camera)
        res_first = await db.execute(stmt_first)
        cam = res_first.scalars().first()

    if not cam:
        raise HTTPException(status_code=404, detail="Camera not found")

    update_data = update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(cam, field, value)

    await db.commit()
    await db.refresh(cam)
    return cam

@router.delete("/{camera_id}")
async def delete_camera(camera_id: str, db: AsyncSession = Depends(get_db)):
    cam = None
    if camera_id.isdigit():
        stmt = select(Camera).where(Camera.id == int(camera_id))
        res = await db.execute(stmt)
        cam = res.scalar_one_or_none()

    if not cam:
        stmt = select(Camera).where(Camera.name == camera_id)
        res = await db.execute(stmt)
        cam = res.scalar_one_or_none()

    if not cam:
        raise HTTPException(status_code=404, detail="Camera not found")

    await db.delete(cam)
    await db.commit()
    return {"status": "deleted", "id": camera_id}

class FrigateZonesPayload(BaseModel):
    zones: Optional[Dict[str, Any]] = None
    motion_mask: Optional[str] = None
    object_masks: Optional[Dict[str, str]] = None

def get_frigate_config_path() -> str:
    import os
    if os.path.exists("/config/config.yml"):
        return "/config/config.yml"
    elif os.path.exists("./frigate/config/config.yml"):
        return "./frigate/config/config.yml"
    return "/config/config.yml"

@router.get("/{camera_id}/frigate-zones")
async def get_frigate_camera_zones(camera_id: str):
    import os
    import yaml
    config_path = get_frigate_config_path()
    if not os.path.exists(config_path):
        return {"zones": {}, "motion_mask": "", "object_masks": {}}

    try:
        with open(config_path, "r", encoding="utf-8") as f:
            cfg = yaml.safe_load(f) or {}

        cam_name = camera_id if not camera_id.isdigit() else "camera_principal"
        cameras_cfg = cfg.get("cameras", {})
        cam_data = cameras_cfg.get(cam_name, {})

        zones = cam_data.get("zones", {})
        motion_mask = cam_data.get("motion", {}).get("mask", "")
        if isinstance(motion_mask, list):
            motion_mask = " ".join(motion_mask)

        object_masks = {}
        obj_filters = cam_data.get("objects", {}).get("filters", {})
        for label, f_data in obj_filters.items():
            if isinstance(f_data, dict) and "mask" in f_data:
                object_masks[label] = f_data["mask"]

        return {
            "camera": cam_name,
            "zones": zones,
            "motion_mask": motion_mask,
            "object_masks": object_masks
        }
    except Exception as e:
        return {"error": str(e), "zones": {}, "motion_mask": "", "object_masks": {}}

@router.post("/{camera_id}/frigate-zones")
async def save_frigate_camera_zones(camera_id: str, payload: FrigateZonesPayload):
    import os
    import yaml
    import httpx
    from app.core.config import settings

    config_path = get_frigate_config_path()
    if not os.path.exists(config_path):
        raise HTTPException(status_code=404, detail="Frigate config.yml não encontrado")

    try:
        with open(config_path, "r", encoding="utf-8") as f:
            cfg = yaml.safe_load(f) or {}

        cam_name = camera_id if not camera_id.isdigit() else "camera_principal"
        if "cameras" not in cfg:
            cfg["cameras"] = {}
        if cam_name not in cfg["cameras"]:
            cfg["cameras"][cam_name] = {}

        cam_data = cfg["cameras"][cam_name]

        # 1. Update Zones
        if payload.zones is not None:
            cam_data["zones"] = payload.zones

        # 2. Update Motion Mask
        if payload.motion_mask is not None:
            if "motion" not in cam_data:
                cam_data["motion"] = {}
            if payload.motion_mask.strip():
                cam_data["motion"]["mask"] = payload.motion_mask.strip()
            elif "mask" in cam_data["motion"]:
                del cam_data["motion"]["mask"]

        # 3. Update Object Masks
        if payload.object_masks is not None:
            if "objects" not in cam_data:
                cam_data["objects"] = {}
            if "filters" not in cam_data["objects"]:
                cam_data["objects"]["filters"] = {}
            for label, mask_val in payload.object_masks.items():
                if mask_val.strip():
                    if label not in cam_data["objects"]["filters"]:
                        cam_data["objects"]["filters"][label] = {}
                    cam_data["objects"]["filters"][label]["mask"] = mask_val.strip()

        with open(config_path, "w", encoding="utf-8") as f:
            yaml.dump(cfg, f, default_flow_style=False, allow_unicode=True)

        # Trigger Frigate API config reload/restart
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                await client.post(f"{settings.FRIGATE_API_URL}/api/restart")
        except Exception:
            pass

        return {"status": "saved", "camera": cam_name, "message": "Zonas e Máscaras gravadas com sucesso no Frigate NVR!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao gravar no Frigate: {str(e)}")



