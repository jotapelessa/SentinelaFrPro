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
    """
    Unified Camera Provider:
    Returns all cameras. Automatically discovers and synchronizes any cameras and streams
    configured in Frigate NVR and go2rtc into Sentinela. If a camera works in Frigate,
    it is automatically present, active, and streaming in Sentinela.
    """
    import os
    import json
    import yaml
    import httpx
    from app.core.config import settings

    frigate_stats = {}
    cfg_data = {}

    # 1. Fetch live telemetry / stats from Frigate
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            stats_resp = await client.get(f"{settings.FRIGATE_API_URL}/api/stats")
            if stats_resp.status_code == 200:
                frigate_stats = stats_resp.json().get("cameras", {})
    except Exception:
        pass

    # 2. Fetch authoritative local config from disk first
    config_path = get_frigate_config_path()
    if os.path.exists(config_path):
        try:
            with open(config_path, "r", encoding="utf-8") as f:
                cfg_data = yaml.safe_load(f) or {}
        except Exception:
            pass

    # Fallback to Frigate API if local file was not found
    if not cfg_data:
        try:
            async with httpx.AsyncClient(timeout=2.0) as client:
                cfg_resp = await client.get(f"{settings.FRIGATE_API_URL}/api/config")
                if cfg_resp.status_code == 200:
                    cfg_data = cfg_resp.json()
        except Exception:
            pass

    if isinstance(cfg_data, dict):
        frigate_cams = cfg_data.get("cameras", {})
        go2rtc_streams = cfg_data.get("go2rtc", {}).get("streams", {})

        db_changed = False
        if isinstance(frigate_cams, dict):
            for cam_name, cam_cfg in frigate_cams.items():
                if not cam_name or not isinstance(cam_cfg, dict):
                    continue

                stmt = select(Camera).where(Camera.name == cam_name)
                res_c = await db.execute(stmt)
                existing = res_c.scalar_one_or_none()

                # Extract RTSP URL
                rtsp_url = f"rtsp://frigate:8554/{cam_name}"
                if isinstance(go2rtc_streams, dict) and cam_name in go2rtc_streams:
                    g_stream = go2rtc_streams[cam_name]
                    if isinstance(g_stream, list) and len(g_stream) > 0 and isinstance(g_stream[0], str) and g_stream[0].startswith("rtsp://"):
                        rtsp_url = g_stream[0].split("#")[0]
                    elif isinstance(g_stream, str) and g_stream.startswith("rtsp://"):
                        rtsp_url = g_stream.split("#")[0]

                # Parse Zones
                detect_w = cam_cfg.get("detect", {}).get("width", 1280) if isinstance(cam_cfg.get("detect"), dict) else 1280
                detect_h = cam_cfg.get("detect", {}).get("height", 720) if isinstance(cam_cfg.get("detect"), dict) else 720
                cam_zones = cam_cfg.get("zones", {})
                parsed_zone_items = []

                if isinstance(cam_zones, dict):
                    for z_idx, (z_name, z_info) in enumerate(cam_zones.items()):
                        coords = z_info.get("coordinates") if isinstance(z_info, dict) else z_info
                        if coords:
                            pts = parse_frigate_coordinates(coords, detect_w, detect_h)
                            if pts:
                                parsed_zone_items.append({
                                    "id": f"zone_{z_name}",
                                    "name": z_name.replace("_", " ").title(),
                                    "slug": z_name,
                                    "type": "zone",
                                    "color": ZONE_PALETTE[z_idx % len(ZONE_PALETTE)],
                                    "points": pts,
                                    "objects": z_info.get("objects", ["person", "car", "motorcycle"]) if isinstance(z_info, dict) else ["person", "car", "motorcycle"]
                                })

                motion_mask = cam_cfg.get("motion", {}).get("mask") if isinstance(cam_cfg.get("motion"), dict) else None
                if motion_mask:
                    m_pts = parse_frigate_coordinates(motion_mask, detect_w, detect_h)
                    if m_pts:
                        parsed_zone_items.append({
                            "id": f"mask_{cam_name}",
                            "name": "Máscara de Movimento",
                            "slug": "motion_mask",
                            "type": "mask",
                            "color": "#f43f5e",
                            "points": m_pts
                        })

                zones_json_str = json.dumps(parsed_zone_items) if parsed_zone_items else None

                if not existing:
                    friendly = "Câmera Principal" if cam_name == "camera_principal" else cam_name.replace("_", " ").title()
                    new_c = Camera(
                        name=cam_name,
                        friendly_name=friendly,
                        rtsp_main=rtsp_url,
                        ip_address="192.168.1.6" if ("192_168_1_6" in cam_name or cam_name == "camera_principal") else "127.0.0.1",
                        onvif_port=80,
                        enabled=cam_cfg.get("enabled", True),
                        zones=zones_json_str
                    )
                    db.add(new_c)
                    db_changed = True
                else:
                    if zones_json_str and not existing.zones:
                        existing.zones = zones_json_str
                        db_changed = True
                    if not existing.rtsp_main or existing.rtsp_main.startswith("rtsp://frigate"):
                        existing.rtsp_main = rtsp_url
                        db_changed = True

        # Purge any DB cameras that are not in Frigate config
        if isinstance(frigate_cams, dict) and len(frigate_cams) > 0:
            stmt_all = select(Camera)
            res_all = await db.execute(stmt_all)
            for db_c in res_all.scalars().all():
                if db_c.name not in frigate_cams:
                    await db.delete(db_c)
                    db_changed = True

        if db_changed:
            try:
                await db.commit()
            except Exception as e:
                logger.warning(f"Failed to auto-commit discovered cameras: {e}")

    # 3. Retrieve all registered cameras from DB
    stmt = select(Camera)
    result = await db.execute(stmt)
    cameras = result.scalars().all()

    # 4. Attach Frigate real-time stats and return
    output = []
    for c in cameras:
        cam_stat = frigate_stats.get(c.name, {})
        cam_dict = {
            "id": c.id,
            "name": c.name,
            "friendly_name": c.friendly_name or c.name,
            "rtsp_main": c.rtsp_main,
            "rtsp_sub": c.rtsp_sub,
            "ip_address": c.ip_address,
            "onvif_port": c.onvif_port,
            "enabled": c.enabled,
            "zones": c.zones,
            "objects_to_track": c.objects_to_track,
            "min_score": c.min_score,
            "record_mode": c.record_mode,
            "record_retain_days": c.record_retain_days,
            "record_audio": c.record_audio,
            "notify_telegram": c.notify_telegram,
            "notify_tv": c.notify_tv,
            "notify_audio": c.notify_audio,
            "cooldown_seconds": c.cooldown_seconds,
            "live_stats": {
                "camera_fps": cam_stat.get("camera_fps", 0),
                "detection_fps": cam_stat.get("detection_fps", 0),
                "process_fps": cam_stat.get("process_fps", 0),
                "online": True if (c.name in frigate_stats or c.enabled) else False
            }
        }
        output.append(cam_dict)

    return output

@router.post("/sync-frigate")
async def sync_cameras_from_frigate(request: Request, db: AsyncSession = Depends(get_db)):
    """Deep synchronization: Reads all active cameras from Frigate NVR API and creates or updates them in Sentinela."""
    import httpx
    from app.core.config import settings
    
    synced_count = 0
    errors = []
    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            res = await client.get(f"{settings.FRIGATE_API_URL}/api/config")
            if res.status_code == 200:
                cfg_data = res.json()
                frigate_cams = cfg_data.get("cameras", {})
                go2rtc_streams = cfg_data.get("go2rtc", {}).get("streams", {})

                for cam_name, cam_cfg in frigate_cams.items():
                    # Determine RTSP URL
                    rtsp_url = f"rtsp://frigate:8554/{cam_name}"
                    if cam_name in go2rtc_streams:
                        g_stream = go2rtc_streams[cam_name]
                        if isinstance(g_stream, list) and len(g_stream) > 0 and isinstance(g_stream[0], str) and g_stream[0].startswith("rtsp://"):
                            rtsp_url = g_stream[0].split("#")[0]
                        elif isinstance(g_stream, str) and g_stream.startswith("rtsp://"):
                            rtsp_url = g_stream.split("#")[0]

                    # Parse zones from Frigate
                    cam_zones = cam_cfg.get("zones", {})
                    detect_w = cam_cfg.get("detect", {}).get("width", 1280)
                    detect_h = cam_cfg.get("detect", {}).get("height", 720)
                    
                    parsed_zone_items = []
                    if isinstance(cam_zones, dict):
                        for z_idx, (z_name, z_info) in enumerate(cam_zones.items()):
                            coords = z_info.get("coordinates") if isinstance(z_info, dict) else z_info
                            if coords:
                                pts = parse_frigate_coordinates(coords, detect_w, detect_h)
                                if pts:
                                    parsed_zone_items.append({
                                        "id": f"zone_{z_name}",
                                        "name": z_name.replace("_", " ").title(),
                                        "slug": z_name,
                                        "type": "zone",
                                        "color": "#06b6d4" if z_idx == 0 else "#3b82f6",
                                        "points": pts,
                                        "objects": z_info.get("objects", ["person", "car", "motorcycle"]) if isinstance(z_info, dict) else ["person", "car", "motorcycle"]
                                    })
                    
                    motion_mask = cam_cfg.get("motion", {}).get("mask")
                    if motion_mask:
                        m_pts = parse_frigate_coordinates(motion_mask, detect_w, detect_h)
                        if m_pts:
                            parsed_zone_items.append({
                                "id": f"mask_{cam_name}",
                                "name": "Máscara de Movimento",
                                "slug": "motion_mask",
                                "type": "mask",
                                "color": "#f43f5e",
                                "points": m_pts
                            })

                    import json
                    zones_json_str = json.dumps(parsed_zone_items) if parsed_zone_items else None

                    # Check if already in DB
                    stmt = select(Camera).where(Camera.name == cam_name)
                    res_c = await db.execute(stmt)
                    existing = res_c.scalar_one_or_none()

                    if not existing:
                        friendly = "Câmera Principal" if cam_name == "camera_principal" else cam_name.replace("_", " ").title()
                        new_c = Camera(
                            name=cam_name,
                            friendly_name=friendly,
                            rtsp_main=rtsp_url,
                            ip_address="192.168.1.6" if "192_168_1_6" in cam_name or cam_name == "camera_principal" else "127.0.0.1",
                            onvif_port=80,
                            enabled=cam_cfg.get("enabled", True),
                            zones=zones_json_str
                        )
                        db.add(new_c)
                        synced_count += 1
                    else:
                        existing.enabled = cam_cfg.get("enabled", True)
                        if not existing.rtsp_main or existing.rtsp_main.startswith("rtsp://frigate"):
                            existing.rtsp_main = rtsp_url
                        if zones_json_str:
                            existing.zones = zones_json_str
                        synced_count += 1

                await db.commit()
    except Exception as e:
        errors.append(str(e))
        logger.error(f"Error syncing from Frigate API: {e}")

    await audit_service.log(
        action="FRIGATE_CAMERAS_SYNCED",
        module="FRIGATE",
        severity="SUCCESS" if not errors else "WARNING",
        details=f"Sincronização com Frigate concluída ({synced_count} câmeras sincronizadas).",
        client_ip=request.client.host if request.client else "unknown"
    )

    return {
        "status": "success" if not errors else "partial",
        "synced_cameras": synced_count,
        "errors": errors
    }


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

    cfg = sanitize_frigate_config(cfg)
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

def sanitize_frigate_config(cfg: dict) -> dict:
    """
    Sanitizes Frigate 0.17 configuration to strictly satisfy Pydantic models.
    Guarantees mandatory top-level blocks (mqtt, detectors, ffmpeg, go2rtc, cameras),
    ensuring Frigate never crashes with 'mqtt - Field required' or 'KeyError: ffmpeg'.
    """
    if not isinstance(cfg, dict):
        cfg = {}

    # 1. Guarantee MQTT section
    if "mqtt" not in cfg or not isinstance(cfg["mqtt"], dict):
        cfg["mqtt"] = {
            "enabled": True,
            "host": "mosquitto",
            "port": 1883,
            "topic_prefix": "frigate",
            "client_id": "frigate_nvr"
        }
    else:
        if "host" not in cfg["mqtt"] or not cfg["mqtt"]["host"]:
            cfg["mqtt"]["host"] = "mosquitto"
        if "port" not in cfg["mqtt"]:
            cfg["mqtt"]["port"] = 1883
        if "enabled" not in cfg["mqtt"]:
            cfg["mqtt"]["enabled"] = True

    # 2. Guarantee Model & Detectors section with OpenVINO GPU Acceleration
    if "model" not in cfg or not isinstance(cfg["model"], dict):
        cfg["model"] = {
            "path": "/openvino-model/ssdlite_mobilenet_v2.xml"
        }
    elif "path" not in cfg["model"] or not cfg["model"]["path"]:
        cfg["model"]["path"] = "/openvino-model/ssdlite_mobilenet_v2.xml"

    if "detectors" not in cfg or not isinstance(cfg["detectors"], dict) or len(cfg["detectors"]) == 0:
        cfg["detectors"] = {
            "ov": {
                "type": "openvino",
                "device": "GPU"
            }
        }

    # 3. Guarantee Motion, Snapshots, Objects defaults (Optimized for Intel N5105)
    if "motion" not in cfg or not isinstance(cfg["motion"], dict):
        cfg["motion"] = {
            "threshold": 30,
            "contour_area": 15,
            "improve_contrast": False
        }

    if "objects" not in cfg or not isinstance(cfg["objects"], dict):
        cfg["objects"] = {
            "track": ["person", "car", "motorcycle", "bus", "dog", "cat"]
        }

    if "snapshots" not in cfg or not isinstance(cfg["snapshots"], dict):
        cfg["snapshots"] = {
            "enabled": True,
            "clean_copy": True,
            "timestamp": True,
            "bounding_box": True
        }

    if "cameras" not in cfg or not isinstance(cfg["cameras"], dict):
        cfg["cameras"] = {}
    if "go2rtc" not in cfg or not isinstance(cfg["go2rtc"], dict):
        cfg["go2rtc"] = {}
    if "streams" not in cfg["go2rtc"] or not isinstance(cfg["go2rtc"]["streams"], dict):
        cfg["go2rtc"]["streams"] = {}

    # 4. Sanitize go2rtc stream definitions (resolve bare stream aliases)
    for s_name, s_val in list(cfg["go2rtc"]["streams"].items()):
        if isinstance(s_val, str) and not s_val.startswith(("rtsp://", "http://", "https://", "ffmpeg:", "exec:", "echo:", "#")):
            target = s_val.strip()
            if target in cfg["go2rtc"]["streams"] and target != s_name and isinstance(cfg["go2rtc"]["streams"][target], list):
                cfg["go2rtc"]["streams"][s_name] = cfg["go2rtc"]["streams"][target]
            else:
                cfg["go2rtc"]["streams"][s_name] = [f"rtsp://127.0.0.1:8554/{target}"]
        elif isinstance(s_val, list):
            new_list = []
            for item in s_val:
                if isinstance(item, str) and not item.startswith(("rtsp://", "http://", "https://", "ffmpeg:", "exec:", "echo:", "#")):
                    target = item.strip()
                    if target in cfg["go2rtc"]["streams"] and target != s_name and isinstance(cfg["go2rtc"]["streams"][target], list):
                        new_list.extend(cfg["go2rtc"]["streams"][target])
                    else:
                        new_list.append(f"rtsp://127.0.0.1:8554/{target}")
                else:
                    new_list.append(item)
            cfg["go2rtc"]["streams"][s_name] = new_list

    for cam_name, cam_cfg in list(cfg["cameras"].items()):
        if not isinstance(cam_cfg, dict):
            cfg["cameras"][cam_name] = {}
            cam_cfg = cfg["cameras"][cam_name]

        # 1. Clean forbidden keys
        if "live" in cam_cfg:
            del cam_cfg["live"]

        # 2. Guarantee ffmpeg.inputs block
        if "ffmpeg" not in cam_cfg or not isinstance(cam_cfg["ffmpeg"], dict):
            cam_cfg["ffmpeg"] = {}
        if "inputs" not in cam_cfg["ffmpeg"] or not isinstance(cam_cfg["ffmpeg"]["inputs"], list) or len(cam_cfg["ffmpeg"]["inputs"]) == 0:
            cam_cfg["ffmpeg"]["inputs"] = [
                {
                    "path": f"rtsp://127.0.0.1:8554/{cam_name}",
                    "input_args": "preset-rtsp-restream",
                    "roles": ["detect", "record"]
                }
            ]

        # 3. Guarantee detect block
        if "detect" not in cam_cfg or not isinstance(cam_cfg["detect"], dict):
            cam_cfg["detect"] = {
                "enabled": True,
                "width": 1280,
                "height": 720,
                "fps": 5
            }
        else:
            if "width" not in cam_cfg["detect"]:
                cam_cfg["detect"]["width"] = 1280
            if "height" not in cam_cfg["detect"]:
                cam_cfg["detect"]["height"] = 720
            if "fps" not in cam_cfg["detect"]:
                cam_cfg["detect"]["fps"] = 5

        # 4. Guarantee record block syntax
        if "record" in cam_cfg:
            if isinstance(cam_cfg["record"], dict):
                if "retain_days" in cam_cfg["record"]:
                    del cam_cfg["record"]["retain_days"]
                if "events" in cam_cfg["record"] and isinstance(cam_cfg["record"]["events"], dict):
                    if "retain" in cam_cfg["record"]["events"] and isinstance(cam_cfg["record"]["events"]["retain"], (int, float)):
                        del cam_cfg["record"]["events"]["retain"]

    return cfg

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

    if not isinstance(cfg, dict):
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

    if "cameras" not in cfg or not isinstance(cfg["cameras"], dict):
        cfg["cameras"] = {}
    if cam_name not in cfg["cameras"] or not isinstance(cfg["cameras"][cam_name], dict):
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
            }
        }
    else:
        if "detect" in cfg["cameras"][cam_name] and isinstance(cfg["cameras"][cam_name]["detect"], dict):
            cfg["cameras"][cam_name]["detect"]["enabled"] = bool(cam.enabled)
        if "live" in cfg["cameras"][cam_name]:
            del cfg["cameras"][cam_name]["live"]

    cfg = sanitize_frigate_config(cfg)
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

    if os.path.exists(config_path):
        try:
            with open(config_path, "r", encoding="utf-8") as f:
                cfg = yaml.safe_load(f) or {}
        except Exception:
            pass

    if not cfg:
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                resp = await client.get(f"{settings.FRIGATE_API_URL}/api/config/raw")
                if resp.status_code == 200:
                    cfg = yaml.safe_load(resp.text) or {}
        except Exception:
            pass

    if not isinstance(cfg, dict):
        cfg = {}

    changed = False
    if "go2rtc" in cfg and isinstance(cfg["go2rtc"], dict) and "streams" in cfg["go2rtc"] and isinstance(cfg["go2rtc"]["streams"], dict):
        for k in list(cfg["go2rtc"]["streams"].keys()):
            if k == cam_name or k == f"{cam_name}_sub":
                del cfg["go2rtc"]["streams"][k]
                changed = True

    if "cameras" in cfg and isinstance(cfg["cameras"], dict):
        for k in list(cfg["cameras"].keys()):
            if k == cam_name:
                del cfg["cameras"][k]
                changed = True

    cfg = sanitize_frigate_config(cfg)
    updated_yaml = yaml.dump(cfg, default_flow_style=False, allow_unicode=True, sort_keys=False)

    if os.path.exists(os.path.dirname(config_path)) or os.path.exists(config_path):
        try:
            with open(config_path, "w", encoding="utf-8") as f:
                f.write(updated_yaml)
        except Exception as e:
            logger.warning(f"Failed to write config file after camera deletion: {e}")

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            await client.post(
                f"{settings.FRIGATE_API_URL}/api/config/save?restart=1",
                content=updated_yaml,
                headers={"Content-Type": "text/plain"}
            )
    except Exception as e:
        logger.warning(f"Failed to post updated config to Frigate API: {e}")


@router.delete("/{camera_id}")
async def delete_camera(camera_id: str, request: Request, db: AsyncSession = Depends(get_db)):
    cam = None
    if camera_id.isdigit():
        stmt = select(Camera).where(Camera.id == int(camera_id))
        res = await db.execute(stmt)
        cam = res.scalar_one_or_none()

    if not cam:
        stmt = select(Camera).where((Camera.name == camera_id) | (Camera.friendly_name == camera_id) | (Camera.ip_address == camera_id))
        res = await db.execute(stmt)
        cam = res.scalar_one_or_none()

    cam_name = cam.name if cam else camera_id
    if cam:
        await db.delete(cam)
        await db.commit()

    # Always ensure Frigate removes the camera definition and any associated IP slug
    try:
        await remove_camera_from_frigate(cam_name)
        if cam and cam.ip_address:
            ip_slug = f"cam_{cam.ip_address.replace('.', '_')}"
            if ip_slug != cam_name:
                await remove_camera_from_frigate(ip_slug)
    except Exception as e:
        logger.warning(f"Error removing camera from Frigate: {e}")

    await audit_service.log(
        action="CAMERA_DELETED",
        module="CAMERA",
        severity="WARNING",
        details=f"Câmera {cam_name} removida do Sentinela e Frigate.",
        client_ip=request.client.host if request.client else "unknown"
    )
    return {"status": "deleted", "id": camera_id, "camera_name": cam_name}


class FrigateZonesPayload(BaseModel):
    zones: Optional[Dict[str, Any]] = None
    motion_mask: Optional[str] = None
    object_masks: Optional[Dict[str, str]] = None
    raw_items: Optional[List[Dict[str, Any]]] = None

def get_frigate_config_path() -> str:
    import os
    if os.path.exists("/config/config.yml"):
        return "/config/config.yml"
    elif os.path.exists("./frigate/config/config.yml"):
        return "./frigate/config/config.yml"
    return "/config/config.yml"

def parse_frigate_coordinates(raw_coords: Any, width: int = 1280, height: int = 720) -> List[Dict[str, float]]:
    """
    Parses various Frigate coordinate representations into normalized {x: 0..1, y: 0..1} points.
    Supports comma-separated strings, space-separated pairs, list of ints/floats, or list of strings.
    """
    nums: List[float] = []
    if isinstance(raw_coords, str):
        clean = raw_coords.replace(" ", ",").replace("\n", ",").replace("\t", ",")
        parts = [p.strip() for p in clean.split(",") if p.strip()]
        for p in parts:
            try:
                nums.append(float(p))
            except ValueError:
                pass
    elif isinstance(raw_coords, list):
        for item in raw_coords:
            if isinstance(item, (int, float)):
                nums.append(float(item))
            elif isinstance(item, str):
                parts = [p.strip() for p in item.replace(" ", ",").split(",") if p.strip()]
                for p in parts:
                    try:
                        nums.append(float(p))
                    except ValueError:
                        pass

    w = max(width, 1)
    h = max(height, 1)
    points: List[Dict[str, float]] = []

    # Check if numbers are already normalized (0..1)
    already_normalized = len(nums) >= 4 and all(0.0 <= n <= 1.0 for n in nums)

    for i in range(0, len(nums) - 1, 2):
        px = nums[i]
        py = nums[i + 1]
        nx = px if already_normalized else (px / w)
        ny = py if already_normalized else (py / h)
        points.append({
            "x": round(max(0.0, min(1.0, nx)), 4),
            "y": round(max(0.0, min(1.0, ny)), 4)
        })

    return points

ZONE_PALETTE = ["#06b6d4", "#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ec4899"]

@router.get("/{camera_id}/frigate-zones")
async def get_frigate_camera_zones(camera_id: str, db: AsyncSession = Depends(get_db)):
    import os
    import yaml
    import json
    import httpx
    from app.core.config import settings

    cam_name = camera_id if not camera_id.isdigit() else "camera_principal"
    
    # Try finding camera by ID if digit
    if camera_id.isdigit():
        c_stmt = select(Camera).where(Camera.id == int(camera_id))
        c_res = await db.execute(c_stmt)
        cam_row = c_res.scalar_one_or_none()
        if cam_row and cam_row.name:
            cam_name = cam_row.name

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

    cameras_cfg = cfg.get("cameras", {}) if isinstance(cfg, dict) else {}
    cam_data = cameras_cfg.get(cam_name, {}) if isinstance(cameras_cfg, dict) else {}

    detect_w = cam_data.get("detect", {}).get("width", 1280) if isinstance(cam_data.get("detect"), dict) else 1280
    detect_h = cam_data.get("detect", {}).get("height", 720) if isinstance(cam_data.get("detect"), dict) else 720

    raw_zones = cam_data.get("zones", {}) if isinstance(cam_data, dict) else {}
    motion_mask = cam_data.get("motion", {}).get("mask", "") if isinstance(cam_data.get("motion"), dict) else ""
    if isinstance(motion_mask, list):
        motion_mask = " ".join(motion_mask)

    object_masks = {}
    obj_filters = cam_data.get("objects", {}).get("filters", {}) if isinstance(cam_data.get("objects"), dict) else {}
    if isinstance(obj_filters, dict):
        for label, f_data in obj_filters.items():
            if isinstance(f_data, dict) and "mask" in f_data:
                object_masks[label] = f_data["mask"]

    # Build parsed items list for visual canvas editor
    parsed_items: List[Dict[str, Any]] = []

    # Parse Frigate Zones
    if isinstance(raw_zones, dict):
        for idx, (z_slug, z_info) in enumerate(raw_zones.items()):
            coords = z_info.get("coordinates") if isinstance(z_info, dict) else z_info
            if coords:
                pts = parse_frigate_coordinates(coords, detect_w, detect_h)
                if pts:
                    parsed_items.append({
                        "id": f"zone_{z_slug}",
                        "name": z_slug.replace("_", " ").title(),
                        "slug": z_slug,
                        "type": "zone",
                        "color": ZONE_PALETTE[idx % len(ZONE_PALETTE)],
                        "points": pts,
                        "objects": z_info.get("objects", ["person", "car", "motorcycle"]) if isinstance(z_info, dict) else ["person", "car", "motorcycle"]
                    })

    # Parse Motion Masks
    if motion_mask:
        m_pts = parse_frigate_coordinates(motion_mask, detect_w, detect_h)
        if m_pts:
            parsed_items.append({
                "id": f"mask_{cam_name}",
                "name": "Máscara de Movimento",
                "slug": "motion_mask",
                "type": "mask",
                "color": "#f43f5e",
                "points": m_pts
            })

    # Parse Object Masks
    for obj_name, mask_str in object_masks.items():
        o_pts = parse_frigate_coordinates(mask_str, detect_w, detect_h)
        if o_pts:
            parsed_items.append({
                "id": f"objmask_{obj_name}",
                "name": f"Máscara ({obj_name})",
                "slug": f"filter_{obj_name}",
                "type": "object_mask",
                "target_object": obj_name,
                "color": "#f59e0b",
                "points": o_pts
            })

    # Fallback to Sentinela DB if Frigate had no zones defined
    if not parsed_items:
        stmt = select(Camera).where((Camera.name == cam_name) | (Camera.ip_address == cam_name))
        res_c = await db.execute(stmt)
        db_cam = res_c.scalar_one_or_none()
        if db_cam and db_cam.zones:
            try:
                db_items = json.loads(db_cam.zones)
                if isinstance(db_items, list):
                    parsed_items = db_items
            except Exception:
                pass

    return {
        "camera": cam_name,
        "detect_resolution": {"width": detect_w, "height": detect_h},
        "zones": raw_zones,
        "motion_mask": motion_mask,
        "object_masks": object_masks,
        "parsed_items": parsed_items
    }

@router.post("/{camera_id}/frigate-zones")
async def save_frigate_camera_zones(camera_id: str, payload: FrigateZonesPayload, db: AsyncSession = Depends(get_db)):
    import os
    import yaml
    import json
    import httpx
    from app.core.config import settings

    cam_name = camera_id if not camera_id.isdigit() else "camera_principal"

    if camera_id.isdigit():
        c_stmt = select(Camera).where(Camera.id == int(camera_id))
        c_res = await db.execute(c_stmt)
        cam_row = c_res.scalar_one_or_none()
        if cam_row and cam_row.name:
            cam_name = cam_row.name

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

    if not isinstance(cfg, dict):
        cfg = {}

    if "cameras" not in cfg or not isinstance(cfg["cameras"], dict):
        cfg["cameras"] = {}
    if cam_name not in cfg["cameras"] or not isinstance(cfg["cameras"][cam_name], dict):
        cfg["cameras"][cam_name] = {}

    cam_data = cfg["cameras"][cam_name]

    # Clean forbidden keys
    if "live" in cam_data:
        del cam_data["live"]

    detect_w = cam_data.get("detect", {}).get("width", 1280) if isinstance(cam_data.get("detect"), dict) else 1280
    detect_h = cam_data.get("detect", {}).get("height", 720) if isinstance(cam_data.get("detect"), dict) else 720

    # Auto-convert raw_items if sent directly from Frontend
    if payload.raw_items is not None and payload.zones is None:
        converted_zones: Dict[str, Any] = {}
        motion_masks_list: List[str] = []
        obj_masks_map: Dict[str, str] = {}

        for idx, item in enumerate(payload.raw_items):
            pts = item.get("points", [])
            if len(pts) >= 3:
                coord_str = ",".join(f"{round(p.get('x', 0) * detect_w)},{round(p.get('y', 0) * detect_h)}" for p in pts)
                i_type = item.get("type", "zone")
                
                if i_type == "zone":
                    z_slug = item.get("slug") or item.get("name", f"zona_{idx + 1}").lower().replace(" ", "_").replace("-", "_")
                    converted_zones[z_slug] = {
                        "coordinates": coord_str,
                        "objects": item.get("objects", ["person", "car", "motorcycle"])
                    }
                elif i_type == "mask":
                    motion_masks_list.append(coord_str)
                elif i_type == "object_mask":
                    target_obj = item.get("target_object") or "person"
                    obj_masks_map[target_obj] = coord_str

        payload.zones = converted_zones
        if motion_masks_list:
            payload.motion_mask = motion_masks_list[0] if len(motion_masks_list) == 1 else " ".join(motion_masks_list)
        if obj_masks_map:
            payload.object_masks = obj_masks_map

    # 1. Update Zones
    if payload.zones is not None:
        cam_data["zones"] = payload.zones

    # 2. Update Motion Mask
    if payload.motion_mask is not None:
        if "motion" not in cam_data or not isinstance(cam_data["motion"], dict):
            cam_data["motion"] = {}
        if payload.motion_mask.strip():
            cam_data["motion"]["mask"] = payload.motion_mask.strip()
        elif "mask" in cam_data["motion"]:
            del cam_data["motion"]["mask"]

    # 3. Update Object Masks
    if payload.object_masks is not None:
        if "objects" not in cam_data or not isinstance(cam_data["objects"], dict):
            cam_data["objects"] = {}
        if "filters" not in cam_data["objects"] or not isinstance(cam_data["objects"]["filters"], dict):
            cam_data["objects"]["filters"] = {}
        for label, mask_val in payload.object_masks.items():
            if mask_val.strip():
                if label not in cam_data["objects"]["filters"] or not isinstance(cam_data["objects"]["filters"][label], dict):
                    cam_data["objects"]["filters"][label] = {}
                cam_data["objects"]["filters"][label]["mask"] = mask_val.strip()

    cfg = sanitize_frigate_config(cfg)
    updated_yaml = yaml.dump(cfg, default_flow_style=False, allow_unicode=True, sort_keys=False)

    saved_via_api = False
    # Try pushing directly to Frigate API (with automatic reload)
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

    # 4. Update SQLite DB for 100% synchronization
    try:
        stmt = select(Camera).where((Camera.name == cam_name) | (Camera.ip_address == cam_name))
        res_c = await db.execute(stmt)
        db_cam = res_c.scalar_one_or_none()
        if db_cam:
            if payload.raw_items:
                db_cam.zones = json.dumps(payload.raw_items)
            elif payload.zones:
                # Store simplified zones representation in DB
                db_cam.zones = json.dumps(payload.zones)
            await db.commit()
    except Exception as e:
        logger.error(f"Error syncing zones to SQLite DB: {e}")

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
        "message": "Zonas e Máscaras sincronizadas com sucesso no Frigate e no Sentinela!"
    }





