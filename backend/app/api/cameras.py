from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import logging
from app.db.session import get_db
from app.db.models import Camera
from app.services.audit_service import audit_service

logger = logging.getLogger(__name__)
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
    return list(cameras)

@router.post("/")
async def add_camera(cam: CameraCreate, request: Request, db: AsyncSession = Depends(get_db)):
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

    # Sync immediately with Frigate and go2rtc
    try:
        await sync_camera_to_frigate(db_cam)
    except Exception as e:
        logger.warning(f"Error syncing new camera to Frigate: {e}")

    await audit_service.log(
        action="CAMERA_ADDED",
        module="CAMERA",
        severity="SUCCESS",
        details=f"Nova câmera cadastrada: {db_cam.name} ({db_cam.ip_address})",
        client_ip=request.client.host if request.client else "unknown"
    )
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
async def update_camera(camera_id: str, update: CameraUpdate, request: Request, db: AsyncSession = Depends(get_db)):
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

    # Sync RTSP and camera state directly with Frigate config
    try:
        await sync_camera_to_frigate(cam)
    except Exception as e:
        logger.warning(f"Error syncing camera to Frigate config: {e}")

    await audit_service.log(
        action="CAMERA_UPDATED",
        module="CAMERA",
        severity="INFO",
        details=f"Parâmetros da câmera {cam.name} alterados ({', '.join(update_data.keys())})",
        client_ip=request.client.host if request.client else "unknown"
    )
    return cam

class RtspTestPayload(BaseModel):
    rtsp_url: str

@router.post("/test-rtsp")
async def test_rtsp_connection(payload: RtspTestPayload):
    """Tests TCP connectivity to the camera's RTSP endpoint with predictive port scanning."""
    import re
    import asyncio

    rtsp_url = payload.rtsp_url.strip()
    m = re.search(r"rtsp://(?:[^@]+@)?([^:/]+)(?::(\d+))?", rtsp_url)
    if not m:
        return {"success": False, "message": "URL RTSP inválida. Formato esperado: rtsp://[user:pass@]ip[:porta]/caminho"}
    
    host = m.group(1)
    port = int(m.group(2)) if m.group(2) else 554

    try:
        fut = asyncio.open_connection(host, port)
        reader, writer = await asyncio.wait_for(fut, timeout=2.5)
        writer.close()
        await writer.wait_closed()
        return {
            "success": True,
            "host": host,
            "port": port,
            "message": f"Conexão bem-sucedida! Porta RTSP {port} em {host} está aberta e respondendo."
        }
    except Exception as e:
        # Predictive Port Scan: if user typed a port other than 554 (e.g. 8554), check if standard 554 is open!
        suggested_url = None
        suggested_port = None
        if port != 554:
            try:
                fut554 = asyncio.open_connection(host, 554)
                r554, w554 = await asyncio.wait_for(fut554, timeout=1.5)
                w554.close()
                await w554.wait_closed()
                suggested_port = 554
                suggested_url = re.sub(r":\d+", ":554", rtsp_url)
            except Exception:
                pass

        if suggested_port:
            return {
                "success": False,
                "host": host,
                "port": port,
                "suggested_port": suggested_port,
                "suggested_url": suggested_url,
                "message": f"A porta {port} recusou conexão em {host}. No entanto, a porta padrão 554 de câmeras IP está ABERTA e respondendo!"
            }

        return {
            "success": False,
            "host": host,
            "port": port,
            "message": f"Falha de conexão com {host}:{port}: {str(e)}"
        }

@router.get("/{camera_id}/diagnostics")
async def get_camera_diagnostics(camera_id: str, db: AsyncSession = Depends(get_db)):
    """Aggregates real-time Frigate stats, go2rtc stream health, filtered ffmpeg/watchdog logs and SQLite audit trail."""
    import httpx
    from app.core.config import settings
    from app.db.models import AuditLog

    cam_name = camera_id if not camera_id.isdigit() else "camera_principal"
    
    # Fetch camera from DB
    cam = None
    if camera_id.isdigit():
        stmt = select(Camera).where(Camera.id == int(camera_id))
        res = await db.execute(stmt)
        cam = res.scalar_one_or_none()
    if not cam:
        stmt = select(Camera).where(Camera.name == camera_id)
        res = await db.execute(stmt)
        cam = res.scalar_one_or_none()

    if cam:
        cam_name = cam.name

    # 1. Fetch Frigate Stats & Version
    frigate_stats = {}
    frigate_online = False
    camera_fps = 0.0
    detection_fps = 0.0
    process_fps = 0.0
    pid = None
    is_fallback = False

    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            stats_resp = await client.get(f"{settings.FRIGATE_API_URL}/api/stats")
            if stats_resp.status_code == 200:
                frigate_online = True
                frigate_stats = stats_resp.json()
                cams_stats = frigate_stats.get("cameras", {})
                cam_stat = cams_stats.get(cam_name, {})
                camera_fps = cam_stat.get("camera_fps", 0.0)
                detection_fps = cam_stat.get("detection_fps", 0.0)
                process_fps = cam_stat.get("process_fps", 0.0)
                pid = cam_stat.get("pid")
    except Exception:
        pass

    # 2. Fetch go2rtc Stream Info
    go2rtc_info = {}
    go2rtc_online = False
    producers_count = 0
    consumers_count = 0
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            g_resp = await client.get("http://frigate:1984/api/streams")
            if g_resp.status_code == 200:
                go2rtc_online = True
                g_data = g_resp.json()
                stream_data = g_data.get(cam_name, {})
                if isinstance(stream_data, dict):
                    producers = stream_data.get("producers", [])
                    consumers = stream_data.get("consumers", [])
                    producers_count = len(producers) if isinstance(producers, list) else 0
                    consumers_count = len(consumers) if isinstance(consumers, list) else 0
                    go2rtc_info = stream_data
                    for p in producers:
                        if isinstance(p, dict) and "testsrc" in str(p.get("url", "")):
                            is_fallback = True
    except Exception:
        pass

    # 3. Fetch Recent Frigate / go2rtc logs filtered for this camera
    filtered_logs = []
    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            logs_resp = await client.get(f"{settings.FRIGATE_API_URL}/api/logs/frigate")
            if logs_resp.status_code == 200:
                data = logs_resp.json()
                raw_lines = data.get("lines", []) if isinstance(data, dict) else str(logs_resp.text).splitlines()
                for line in raw_lines:
                    if any(k in str(line).lower() for k in [cam_name.lower(), "ffmpeg", "watchdog", "video", "rtsp"]):
                        filtered_logs.append(str(line))
    except Exception:
        pass

    if not filtered_logs:
        filtered_logs = [
            f"[{cam_name}] Status do pipeline: {'🟢 Online' if camera_fps > 0 else '⚠️ Aguardando quadros'}",
            f"[{cam_name}] Detecção de objetos: {'Ativa' if cam and cam.enabled else 'Desativada'}",
            f"[{cam_name}] Endereço RTSP: {cam.rtsp_main if cam else 'N/A'}"
        ]

    # 4. Fetch SQLite Audit Logs for this camera
    stmt_audit = select(AuditLog).where(
        (AuditLog.module.in_(["CAMERA", "FRIGATE"])) |
        (AuditLog.details.ilike(f"%{cam_name}%"))
    ).order_by(AuditLog.id.desc()).limit(15)
    
    res_audit = await db.execute(stmt_audit)
    audit_entries = res_audit.scalars().all()
    audit_history = [
        {
            "id": a.id,
            "action": a.action,
            "severity": a.severity,
            "details": a.details,
            "created_at": a.created_at.strftime("%d/%m/%Y %H:%M:%S") if a.created_at else "",
            "client_ip": a.client_ip
        }
        for a in audit_entries
    ]

    return {
        "camera_name": cam_name,
        "friendly_name": cam.friendly_name if cam else cam_name,
        "enabled": cam.enabled if cam else True,
        "is_fallback": is_fallback,
        "health": {
            "frigate_online": frigate_online,
            "go2rtc_online": go2rtc_online,
            "status": "online" if camera_fps > 0 else ("fallback" if is_fallback else "offline"),
            "camera_fps": round(camera_fps, 1),
            "detection_fps": round(detection_fps, 1),
            "process_fps": round(process_fps, 1),
            "pid": pid,
            "producers": producers_count,
            "consumers": consumers_count
        },
        "logs": filtered_logs[-50:],
        "audit_history": audit_history
    }

@router.post("/{camera_id}/toggle-fallback")
async def toggle_camera_fallback(camera_id: str, request: Request, db: AsyncSession = Depends(get_db)):
    """Toggles virtual SMPTE test pattern stream vs real RTSP stream in Frigate configuration."""
    import os
    import yaml
    import httpx
    from app.core.config import settings

    cam_name = camera_id if not camera_id.isdigit() else "camera_principal"
    cam = None
    if camera_id.isdigit():
        stmt = select(Camera).where(Camera.id == int(camera_id))
        res = await db.execute(stmt)
        cam = res.scalar_one_or_none()
    if not cam:
        stmt = select(Camera).where(Camera.name == camera_id)
        res = await db.execute(stmt)
        cam = res.scalar_one_or_none()

    config_path = get_frigate_config_path()
    cfg = {}
    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            resp = await client.get(f"{settings.FRIGATE_API_URL}/api/config/raw")
            if resp.status_code == 200:
                cfg = yaml.safe_load(resp.text) or {}
    except Exception:
        pass

    if not cfg and os.path.exists(config_path):
        try:
            with open(config_path, "r", encoding="utf-8") as f:
                cfg = yaml.safe_load(f) or {}
        except Exception:
            pass

    if "go2rtc" not in cfg:
        cfg["go2rtc"] = {}
    if "streams" not in cfg["go2rtc"]:
        cfg["go2rtc"]["streams"] = {}

    current_stream = cfg["go2rtc"]["streams"].get(cam_name, [])
    is_currently_fallback = False
    if isinstance(current_stream, list) and current_stream:
        if any("testsrc" in str(s) for s in current_stream):
            is_currently_fallback = True

    new_fallback_state = not is_currently_fallback
    test_pattern_url = f"exec:ffmpeg -re -f lavfi -i testsrc=size=1280x720:rate=15 -c:v libx264 -preset ultrafast -tune zerolatency -b:v 1000k -f rtsp rtsp://127.0.0.1:8554/{cam_name}"
    
    if new_fallback_state:
        cfg["go2rtc"]["streams"][cam_name] = [test_pattern_url]
    else:
        real_url = cam.rtsp_main if (cam and cam.rtsp_main) else "rtsp://192.168.1.6:554/stream"
        real_tagged = real_url if ("#" in real_url) else f"{real_url}#transport=tcp"
        cfg["go2rtc"]["streams"][cam_name] = [real_tagged]

    updated_yaml = yaml.dump(cfg, default_flow_style=False, allow_unicode=True, sort_keys=False)

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            await client.post(
                f"{settings.FRIGATE_API_URL}/api/config/save?restart=1",
                content=updated_yaml,
                headers={"Content-Type": "text/plain"}
            )
    except Exception as e:
        logger.warning(f"Error posting config save to Frigate: {e}")

    if os.path.exists(os.path.dirname(config_path)) or os.path.exists(config_path):
        try:
            with open(config_path, "w", encoding="utf-8") as f:
                f.write(updated_yaml)
        except Exception as e:
            pass

    action_desc = "Ativado Stream de Teste Virtual (SMPTE)" if new_fallback_state else "Restaurado Stream RTSP Real"
    await audit_service.log(
        action="CAMERA_FALLBACK_TOGGLED",
        module="CAMERA",
        severity="INFO",
        details=f"{action_desc} para a câmera {cam_name}",
        client_ip=request.client.host if request.client else "unknown"
    )

    return {
        "status": "success",
        "is_fallback": new_fallback_state,
        "message": f"Modo alterado com sucesso: {action_desc}."
    }

async def sync_camera_to_frigate(cam: Camera):
    import os
    import yaml
    import httpx
    from app.core.config import settings

    config_path = get_frigate_config_path()
    cfg = {}

    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get(f"{settings.FRIGATE_API_URL}/api/config/raw")
            if resp.status_code == 200:
                cfg = yaml.safe_load(resp.text) or {}
    except Exception:
        pass

    if not cfg and os.path.exists(config_path):
        try:
            with open(config_path, "r", encoding="utf-8") as f:
                cfg = yaml.safe_load(f) or {}
        except Exception:
            pass

    if not cfg:
        cfg = {}

    if "go2rtc" not in cfg:
        cfg["go2rtc"] = {}
    if "streams" not in cfg["go2rtc"]:
        cfg["go2rtc"]["streams"] = {}

    cam_name = cam.name or "camera_principal"
    rtsp_url = cam.rtsp_main
    if rtsp_url:
        rtsp_url_tagged = rtsp_url if ("#" in rtsp_url) else f"{rtsp_url}#transport=tcp"
        cfg["go2rtc"]["streams"][cam_name] = [rtsp_url_tagged]
    if cam.rtsp_sub and cam.rtsp_sub.strip():
        sub_tagged = cam.rtsp_sub.strip() if ("#" in cam.rtsp_sub) else f"{cam.rtsp_sub.strip()}#transport=tcp"
        cfg["go2rtc"]["streams"][f"{cam_name}_sub"] = [sub_tagged]

    if "cameras" not in cfg:
        cfg["cameras"] = {}
    if cam_name not in cfg["cameras"]:
        cfg["cameras"][cam_name] = {
            "ffmpeg": {
                "inputs": [
                    {
                        "path": f"rtsp://127.0.0.1:8554/{cam_name}",
                        "input_args": "preset-rtsp-restream",
                        "roles": ["detect", "record"]
                    }
                ]
            },
            "detect": {
                "enabled": bool(cam.enabled),
                "width": 1280,
                "height": 720,
                "fps": 5
            },
            "live": {
                "stream_name": cam_name
            }
        }
    else:
        if "detect" in cfg["cameras"][cam_name]:
            cfg["cameras"][cam_name]["detect"]["enabled"] = bool(cam.enabled)

    updated_yaml = yaml.dump(cfg, default_flow_style=False, allow_unicode=True, sort_keys=False)

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            await client.post(
                f"{settings.FRIGATE_API_URL}/api/config/save?restart=1",
                content=updated_yaml,
                headers={"Content-Type": "text/plain"}
            )
    except Exception as e:
        logger.warning(f"Failed to post updated config to Frigate API: {e}")

    if os.path.exists(os.path.dirname(config_path)) or os.path.exists(config_path):
        try:
            with open(config_path, "w", encoding="utf-8") as f:
                f.write(updated_yaml)
        except Exception as e:
            logger.warning(f"Failed to write config file: {e}")


async def remove_camera_from_frigate(cam_name: str):
    import os
    import yaml
    import httpx
    from app.core.config import settings

    config_path = get_frigate_config_path()
    cfg = {}
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get(f"{settings.FRIGATE_API_URL}/api/config/raw")
            if resp.status_code == 200:
                cfg = yaml.safe_load(resp.text) or {}
    except Exception:
        pass

    if not cfg and os.path.exists(config_path):
        try:
            with open(config_path, "r", encoding="utf-8") as f:
                cfg = yaml.safe_load(f) or {}
        except Exception:
            pass

    changed = False
    if "go2rtc" in cfg and "streams" in cfg["go2rtc"]:
        if cam_name in cfg["go2rtc"]["streams"]:
            del cfg["go2rtc"]["streams"][cam_name]
            changed = True

    if "cameras" in cfg and cam_name in cfg["cameras"]:
        del cfg["cameras"][cam_name]
        changed = True

    if changed:
        updated_yaml = yaml.dump(cfg, default_flow_style=False, allow_unicode=True, sort_keys=False)
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                await client.post(
                    f"{settings.FRIGATE_API_URL}/api/config/save?restart=1",
                    content=updated_yaml,
                    headers={"Content-Type": "text/plain"}
                )
        except Exception as e:
            logger.warning(f"Failed to post updated config to Frigate API: {e}")

        if os.path.exists(os.path.dirname(config_path)) or os.path.exists(config_path):
            try:
                with open(config_path, "w", encoding="utf-8") as f:
                    f.write(updated_yaml)
            except Exception:
                pass

@router.delete("/{camera_id}")
async def delete_camera(camera_id: str, request: Request, db: AsyncSession = Depends(get_db)):
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

    cam_name = cam.name
    await db.delete(cam)
    await db.commit()

    try:
        await remove_camera_from_frigate(cam_name)
    except Exception as e:
        logger.warning(f"Error removing camera from Frigate: {e}")

    await audit_service.log(
        action="CAMERA_DELETED",
        module="CAMERA",
        severity="WARNING",
        details=f"Câmera {cam_name} removida do Sentinela.",
        client_ip=request.client.host if request.client else "unknown"
    )
    return {"status": "deleted", "id": camera_id, "camera_name": cam_name}


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
    import httpx
    from app.core.config import settings

    cam_name = camera_id if not camera_id.isdigit() else "camera_principal"
    cfg = {}

    # 1. Try fetching directly from Frigate REST API
    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            resp = await client.get(f"{settings.FRIGATE_API_URL}/api/config/raw")
            if resp.status_code == 200:
                cfg = yaml.safe_load(resp.text) or {}
    except Exception:
        pass

    # 2. Fallback to local file if API was unavailable
    if not cfg:
        config_path = get_frigate_config_path()
        if os.path.exists(config_path):
            try:
                with open(config_path, "r", encoding="utf-8") as f:
                    cfg = yaml.safe_load(f) or {}
            except Exception:
                pass

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

@router.post("/{camera_id}/frigate-zones")
async def save_frigate_camera_zones(camera_id: str, payload: FrigateZonesPayload):
    import os
    import yaml
    import httpx
    from app.core.config import settings

    cam_name = camera_id if not camera_id.isdigit() else "camera_principal"
    cfg = None
    raw_yaml_text = None

    # 1. Fetch current raw YAML from Frigate API or File
    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            resp = await client.get(f"{settings.FRIGATE_API_URL}/api/config/raw")
            if resp.status_code == 200:
                raw_yaml_text = resp.text
                cfg = yaml.safe_load(raw_yaml_text) or {}
    except Exception:
        pass

    if not cfg:
        config_path = get_frigate_config_path()
        if os.path.exists(config_path):
            with open(config_path, "r", encoding="utf-8") as f:
                cfg = yaml.safe_load(f) or {}

    if not cfg:
        cfg = {}

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

    updated_yaml = yaml.dump(cfg, default_flow_style=False, allow_unicode=True, sort_keys=False)

    saved_via_api = False
    # Try pushing directly to Frigate API (with automatic validation & restart)
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            save_resp = await client.post(
                f"{settings.FRIGATE_API_URL}/api/config/save?restart=1",
                content=updated_yaml,
                headers={"Content-Type": "text/plain"}
            )
            if save_resp.status_code == 200:
                saved_via_api = True
    except Exception as e:
        logger.warning(f"Frigate API save failed: {e}")

    # Fallback to direct file save
    config_path = get_frigate_config_path()
    if os.path.exists(os.path.dirname(config_path)) or os.path.exists(config_path):
        try:
            with open(config_path, "w", encoding="utf-8") as f:
                f.write(updated_yaml)
        except Exception as e:
            logger.warning(f"File save failed: {e}")

    await audit_service.log(
        action="ZONES_UPDATED",
        module="FRIGATE",
        severity="SUCCESS",
        details=f"Zonas e Máscaras da câmera {cam_name} atualizadas e sincronizadas com Frigate NVR."
    )

    return {
        "status": "saved",
        "camera": cam_name,
        "saved_via_api": saved_via_api,
        "message": "Zonas e Máscaras gravadas com sucesso no Frigate NVR!"
    }





