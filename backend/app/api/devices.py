from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import asyncio
import json
import datetime
from app.db.session import get_db
from app.db.models import PairedDevice, Camera, AuditLog
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
    device_type: str = "android_tv" # android_tv, smartphone, tablet, web, kiosk
    ip_address: Optional[str] = None
    tailscale_ip: Optional[str] = None
    permission_status: str = "allowed"
    allowed_cameras: Optional[List[str]] = None
    allowed_events: Optional[List[str]] = None
    allow_recordings: bool = True
    allow_live_stream: bool = True
    allow_pip_alerts: bool = True
    allow_restart_containers: bool = False
    allow_reboot_server: bool = False
    pip_default_size: str = "medium"
    pip_duration_seconds: int = 10

class DeviceHeartbeat(BaseModel):
    device_identifier: str
    friendly_name: str
    device_type: str = "android_tv"
    ip_address: Optional[str] = None
    tailscale_ip: Optional[str] = None
    mac_address: Optional[str] = None
    connection_type: Optional[str] = None # wifi, ethernet, 4g, 5g
    network_speed_mbps: Optional[float] = None
    app_version: Optional[str] = None
    device_model: Optional[str] = None
    diagnostic_logs: Optional[List[str]] = None

class DeviceAllowedCamerasUpdate(BaseModel):
    allowed_cameras: List[str]

class DeviceStatusUpdate(BaseModel):
    permission_status: str # allowed, blocked, paused

class DevicePermissionsUpdate(BaseModel):
    friendly_name: Optional[str] = None
    permission_status: Optional[str] = "allowed"
    allowed_cameras: Optional[List[str]] = None
    allowed_events: Optional[List[str]] = None
    allow_recordings: bool = True
    allow_live_stream: bool = True
    allow_pip_alerts: bool = True
    allow_restart_containers: bool = False
    allow_reboot_server: bool = False
    pip_default_size: str = "medium"
    pip_duration_seconds: int = 10

class RestartContainerRequest(BaseModel):
    service_name: str = "sentinela_frigate" # all, sentinela_frigate, sentinela_backend, sentinela_frontend, sentinela_nginx, sentinela_mosquitto

class TestPiPRequest(BaseModel):
    camera_name: str = "camera_principal"
    label: str = "person"

class TestSingleDeviceRequest(BaseModel):
    camera_name: str = "camera_principal"

@router.get("/")
async def list_devices(db: AsyncSession = Depends(get_db)):
    stmt = select(PairedDevice)
    result = await db.execute(stmt)
    devices = result.scalars().all()
    out = []
    for d in devices:
        cams = []
        if d.allowed_cameras:
            try:
                cams = json.loads(d.allowed_cameras)
            except Exception:
                cams = []
        events = []
        if d.allowed_events:
            try:
                events = json.loads(d.allowed_events)
            except Exception:
                events = []
        recent_logs = []
        if d.recent_logs:
            try:
                recent_logs = json.loads(d.recent_logs)
            except Exception:
                recent_logs = []
        out.append({
            "id": d.id,
            "device_identifier": d.device_identifier,
            "friendly_name": d.friendly_name,
            "device_type": d.device_type,
            "ip_address": d.ip_address,
            "tailscale_ip": d.tailscale_ip,
            "mac_address": d.mac_address,
            "connection_type": d.connection_type or "wifi",
            "network_speed_mbps": d.network_speed_mbps,
            "app_version": d.app_version,
            "device_model": d.device_model,
            "recent_logs": recent_logs,
            "permission_status": d.permission_status,
            "allowed_cameras": cams,
            "allowed_events": events,
            "allow_recordings": d.allow_recordings if d.allow_recordings is not None else True,
            "allow_live_stream": d.allow_live_stream if d.allow_live_stream is not None else True,
            "allow_pip_alerts": d.allow_pip_alerts if d.allow_pip_alerts is not None else True,
            "allow_restart_containers": d.allow_restart_containers if d.allow_restart_containers is not None else False,
            "allow_reboot_server": d.allow_reboot_server if d.allow_reboot_server is not None else False,
            "pip_default_size": d.pip_default_size or "medium",
            "pip_duration_seconds": d.pip_duration_seconds or 10,
            "is_master_admin": bool(d.is_master_admin),
            "last_seen": d.last_seen.isoformat() if d.last_seen else None,
            "created_at": d.created_at.isoformat() if d.created_at else None
        })
    return out

@router.post("/heartbeat")
@router.post("/ping")
async def device_heartbeat(hb: DeviceHeartbeat, request: Request, db: AsyncSession = Depends(get_db)):
    """Automatic heartbeat & registration from Android TV and Smartphone apps."""
    client_ip = request.client.host if request.client else "127.0.0.1"
    stmt = select(PairedDevice).where(PairedDevice.device_identifier == hb.device_identifier)
    res = await db.execute(stmt)
    dev = res.scalar_one_or_none()

    logs_json = json.dumps(hb.diagnostic_logs) if hb.diagnostic_logs else None

    if dev:
        # Preserve custom friendly_name configured by the user in /screens
        if not dev.friendly_name:
            dev.friendly_name = hb.friendly_name
        dev.device_type = hb.device_type
        if hb.ip_address:
            dev.ip_address = hb.ip_address
        elif not dev.ip_address:
            dev.ip_address = client_ip
        if hb.tailscale_ip:
            dev.tailscale_ip = hb.tailscale_ip
        if hb.mac_address:
            dev.mac_address = hb.mac_address
        if hb.connection_type:
            dev.connection_type = hb.connection_type
        if hb.network_speed_mbps is not None:
            dev.network_speed_mbps = hb.network_speed_mbps
        if hb.app_version:
            dev.app_version = hb.app_version
        if hb.device_model:
            dev.device_model = hb.device_model
        if logs_json:
            dev.recent_logs = logs_json
        dev.last_seen = datetime.datetime.utcnow()
        await db.commit()
    else:
        dev = PairedDevice(
            device_identifier=hb.device_identifier,
            friendly_name=hb.friendly_name,
            device_type=hb.device_type,
            ip_address=hb.ip_address or client_ip,
            tailscale_ip=hb.tailscale_ip,
            mac_address=hb.mac_address,
            connection_type=hb.connection_type or "wifi",
            network_speed_mbps=hb.network_speed_mbps,
            app_version=hb.app_version,
            device_model=hb.device_model,
            recent_logs=logs_json,
            permission_status="allowed",
            last_seen=datetime.datetime.utcnow()
        )
        db.add(dev)
        await db.commit()
        await db.refresh(dev)
        await audit_service.log(
            action="DEVICE_AUTO_REGISTERED",
            module="PIP",
            severity="SUCCESS",
            details=f"Dispositivo registrado automaticamente: {dev.friendly_name} ({dev.device_type})",
            client_ip=client_ip
        )

    allowed = []
    if dev.allowed_cameras:
        try:
            allowed = json.loads(dev.allowed_cameras)
        except Exception:
            allowed = []

    events = []
    if dev.allowed_events:
        try:
            events = json.loads(dev.allowed_events)
        except Exception:
            events = ["person", "car", "motorcycle", "dog", "cat", "bus"]

    return {
        "status": "online",
        "device_identifier": dev.device_identifier,
        "friendly_name": dev.friendly_name,
        "permission_status": dev.permission_status,
        "allowed_cameras": allowed,
        "allowed_events": events,
        "allow_live_stream": dev.allow_live_stream if dev.allow_live_stream is not None else True,
        "allow_recordings": dev.allow_recordings if dev.allow_recordings is not None else True,
        "allow_pip_alerts": dev.allow_pip_alerts if dev.allow_pip_alerts is not None else True,
        "allow_restart_containers": dev.allow_restart_containers if dev.allow_restart_containers is not None else False,
        "allow_reboot_server": dev.allow_reboot_server if dev.allow_reboot_server is not None else False,
        "pip_default_size": dev.pip_default_size or "medium",
        "pip_duration_seconds": dev.pip_duration_seconds or 10,
        "is_master_admin": bool(dev.is_master_admin),
        "last_seen": dev.last_seen.isoformat() if dev.last_seen else None
    }

@router.get("/by-id/{device_identifier}/cameras")
async def get_device_permitted_cameras(device_identifier: str, db: AsyncSession = Depends(get_db)):
    """Returns the list of cameras permitted for a specific screen/device."""
    stmt = select(PairedDevice).where(PairedDevice.device_identifier == device_identifier)
    res = await db.execute(stmt)
    dev = res.scalar_one_or_none()

    # If device is explicitly blocked, return empty list
    if dev and dev.permission_status == "blocked":
        return []

    # If live stream is disabled for this device, return empty list
    if dev and dev.allow_live_stream is False:
        return []

    # Get all enabled cameras
    cam_stmt = select(Camera).where(Camera.enabled == True)
    cam_res = await db.execute(cam_stmt)
    all_cams = cam_res.scalars().all()

    # If DB has no cameras, fallback to default camera_principal
    if not all_cams:
        return [{"name": "camera_principal", "friendly_name": "Câmera Principal", "enabled": True}]

    if not dev or not dev.allowed_cameras:
        # If no specific camera restriction, return all enabled cameras
        return [{"name": c.name, "friendly_name": c.friendly_name or c.name, "enabled": c.enabled} for c in all_cams]

    try:
        allowed_list = json.loads(dev.allowed_cameras)
        if allowed_list is None or len(allowed_list) == 0:
            return [{"name": c.name, "friendly_name": c.friendly_name or c.name, "enabled": c.enabled} for c in all_cams]
        filtered = [
            {"name": c.name, "friendly_name": c.friendly_name or c.name, "enabled": c.enabled}
            for c in all_cams if c.name in allowed_list
        ]
        return filtered
    except Exception:
        return [{"name": c.name, "friendly_name": c.friendly_name or c.name, "enabled": c.enabled} for c in all_cams]

@router.get("/by-id/{device_identifier}/policy")
async def get_device_policy(device_identifier: str, db: AsyncSession = Depends(get_db)):
    """Returns the full granular policy and permissions for a specific device."""
    stmt = select(PairedDevice).where(PairedDevice.device_identifier == device_identifier)
    res = await db.execute(stmt)
    dev = res.scalar_one_or_none()

    if not dev:
        return {
            "device_identifier": device_identifier,
            "permission_status": "allowed",
            "allow_live_stream": True,
            "allow_recordings": True,
            "allow_pip_alerts": True,
            "allowed_cameras": [],
            "allowed_events": ["person", "car", "motorcycle", "dog", "cat", "bus"],
            "pip_default_size": "medium",
            "pip_duration_seconds": 10
        }

    cams = []
    if dev.allowed_cameras:
        try:
            cams = json.loads(dev.allowed_cameras)
        except Exception:
            cams = []

    events = []
    if dev.allowed_events:
        try:
            events = json.loads(dev.allowed_events)
        except Exception:
            events = ["person", "car", "motorcycle", "dog", "cat", "bus"]

    return {
        "device_identifier": dev.device_identifier,
        "friendly_name": dev.friendly_name,
        "permission_status": dev.permission_status,
        "allow_live_stream": dev.allow_live_stream if dev.allow_live_stream is not None else True,
        "allow_recordings": dev.allow_recordings if dev.allow_recordings is not None else True,
        "allow_pip_alerts": dev.allow_pip_alerts if dev.allow_pip_alerts is not None else True,
        "allow_restart_containers": dev.allow_restart_containers if dev.allow_restart_containers is not None else False,
        "allow_reboot_server": dev.allow_reboot_server if dev.allow_reboot_server is not None else False,
        "allowed_cameras": cams,
        "allowed_events": events,
        "pip_default_size": dev.pip_default_size or "medium",
        "pip_duration_seconds": dev.pip_duration_seconds or 10
    }

@router.patch("/{device_id}/cameras")
async def update_device_allowed_cameras(device_id: int, payload: DeviceAllowedCamerasUpdate, request: Request, db: AsyncSession = Depends(get_db)):
    stmt = select(PairedDevice).where(PairedDevice.id == device_id)
    res = await db.execute(stmt)
    dev = res.scalar_one_or_none()
    if not dev:
        raise HTTPException(status_code=404, detail="Device not found")
    dev.allowed_cameras = json.dumps(payload.allowed_cameras)
    await db.commit()
    await audit_service.log(
        action="DEVICE_CAMERAS_UPDATED",
        module="PIP",
        severity="INFO",
        details=f"Câmeras autorizadas atualizadas para {dev.friendly_name}: {payload.allowed_cameras}",
        client_ip=request.client.host if request.client else "unknown"
    )
    return {"status": "success", "allowed_cameras": payload.allowed_cameras}

@router.get("/health")
async def check_devices_health(db: AsyncSession = Depends(get_db)):
    """
    Checks real-time online/reachable status for all paired screens.
    Optimized O(1) in-memory evaluation for Android APKs via heartbeat (< 60s)
    with non-blocking network socket fallback for standalone Cast devices.
    """
    stmt = select(PairedDevice)
    result = await db.execute(stmt)
    devices = result.scalars().all()
    now = datetime.datetime.utcnow()

    async def check_one(d: PairedDevice):
        ip = d.tailscale_ip if d.tailscale_ip else d.ip_address
        is_recent_heartbeat = False
        if d.last_seen:
            diff_seconds = (now - d.last_seen).total_seconds()
            if diff_seconds < 60:
                is_recent_heartbeat = True

        is_online = is_recent_heartbeat
        # For Cast hardware or if heartbeat is older than 60s, verify network port
        if not is_online and ip and d.device_type in ["chromecast", "google_tv", "tcl"]:
            is_online = await pip_gateway_service.check_device_online(ip)

        return {
            "id": d.id,
            "name": d.friendly_name,
            "ip": ip,
            "online": is_online,
            "last_seen": d.last_seen.isoformat() if d.last_seen else None
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

@router.put("/{device_id}/permissions")
async def update_device_permissions(
    device_id: int,
    perms: DevicePermissionsUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Updates complete granular permissions for a paired screen/device."""
    stmt = select(PairedDevice).where(PairedDevice.id == device_id)
    res = await db.execute(stmt)
    dev = res.scalar_one_or_none()
    if not dev:
        raise HTTPException(status_code=404, detail="Dispositivo não encontrado")

    if perms.friendly_name is not None:
        dev.friendly_name = perms.friendly_name
    if perms.permission_status is not None:
        dev.permission_status = perms.permission_status
    if perms.allowed_cameras is not None:
        dev.allowed_cameras = json.dumps(perms.allowed_cameras)
    if perms.allowed_events is not None:
        dev.allowed_events = json.dumps(perms.allowed_events)
    
    dev.allow_recordings = perms.allow_recordings
    dev.allow_live_stream = perms.allow_live_stream
    dev.allow_pip_alerts = perms.allow_pip_alerts
    dev.allow_restart_containers = perms.allow_restart_containers
    dev.allow_reboot_server = perms.allow_reboot_server
    dev.pip_default_size = perms.pip_default_size
    dev.pip_duration_seconds = perms.pip_duration_seconds

    await db.commit()
    try:
        from app.api.ws import ws_manager
        await ws_manager.broadcast_json({
            "type": "DEVICE_CONFIG_UPDATED",
            "device_identifier": dev.device_identifier,
            "friendly_name": dev.friendly_name,
            "pip_default_size": dev.pip_default_size,
            "pip_duration_seconds": dev.pip_duration_seconds,
            "allow_pip_alerts": dev.allow_pip_alerts
        })
    except Exception as e:
        logger.debug(f"Failed to broadcast device config update: {e}")

    await audit_service.log(
        action="DEVICE_PERMISSIONS_UPDATED",
        module="PIP",
        severity="SUCCESS",
        details=f"Permissões granulares atualizadas para '{dev.friendly_name}' (Status: {dev.permission_status}, Câmeras: {dev.allowed_cameras}, Gravações: {dev.allow_recordings}, PiP: {dev.allow_pip_alerts}, Reiniciar Docker: {dev.allow_restart_containers}, Reboot Host: {dev.allow_reboot_server})",
        client_ip=request.client.host if request.client else "unknown"
    )
    return {
        "status": "updated",
        "id": dev.id,
        "friendly_name": dev.friendly_name,
        "permission_status": dev.permission_status,
        "allowed_cameras": perms.allowed_cameras,
        "allowed_events": perms.allowed_events,
        "allow_recordings": dev.allow_recordings,
        "allow_live_stream": dev.allow_live_stream,
        "allow_pip_alerts": dev.allow_pip_alerts,
        "allow_restart_containers": dev.allow_restart_containers,
        "allow_reboot_server": dev.allow_reboot_server,
        "pip_default_size": dev.pip_default_size,
        "pip_duration_seconds": dev.pip_duration_seconds
    }

@router.post("/by-id/{device_identifier}/restart-containers")
async def remote_restart_container(
    device_identifier: str,
    req: RestartContainerRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(PairedDevice).where(PairedDevice.device_identifier == device_identifier)
    res = await db.execute(stmt)
    dev = res.scalar_one_or_none()
    if not dev or dev.permission_status == "blocked" or not dev.allow_restart_containers:
        raise HTTPException(
            status_code=403,
            detail="Dispositivo não autorizado a reiniciar contêineres. Habilite a permissão em http://sentinela.local/screens."
        )

    allowed_services = ["all", "sentinela_frigate", "sentinela_backend", "sentinela_frontend", "sentinela_nginx", "sentinela_mosquitto"]
    target = req.service_name if req.service_name in allowed_services else "sentinela_frigate"
    
    cmd = f"docker restart {target}" if target != "all" else "docker restart sentinela_frigate sentinela_frontend sentinela_backend"
    proc = await asyncio.create_subprocess_shell(cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE)
    stdout, stderr = await proc.communicate()
    
    await audit_service.log(
        action="REMOTE_CONTAINER_RESTART",
        module="SYSTEM",
        severity="WARNING",
        details=f"Dispositivo {dev.friendly_name} ({dev.device_identifier}) reiniciou contêiner {target}.",
        client_ip=request.client.host if request.client else "unknown"
    )
    return {"status": "success", "target": target, "returncode": proc.returncode}

@router.post("/by-id/{device_identifier}/reboot-server")
async def remote_reboot_server(
    device_identifier: str,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(PairedDevice).where(PairedDevice.device_identifier == device_identifier)
    res = await db.execute(stmt)
    dev = res.scalar_one_or_none()
    if not dev or dev.permission_status == "blocked" or not dev.allow_reboot_server:
        raise HTTPException(
            status_code=403,
            detail="Dispositivo não autorizado a reiniciar o servidor Ubuntu. Habilite a permissão em http://sentinela.local/screens."
        )

    await audit_service.log(
        action="REMOTE_SERVER_REBOOT",
        module="SYSTEM",
        severity="WARNING",
        details=f"Dispositivo {dev.friendly_name} ({dev.device_identifier}) solicitou reinicialização do Servidor Ubuntu!",
        client_ip=request.client.host if request.client else "unknown"
    )
    
    async def _do_reboot():
        await asyncio.sleep(2)
        try:
            p = await asyncio.create_subprocess_shell("sudo /sbin/reboot || /sbin/reboot || sudo reboot || reboot")
            await p.communicate()
        except Exception:
            pass

    asyncio.create_task(_do_reboot())
    return {"status": "success", "message": "Comando de reinicialização enviado ao servidor Ubuntu."}

@router.put("/{device_id}/status")
async def update_device_status(device_id: int, update: DeviceStatusUpdate, request: Request, db: AsyncSession = Depends(get_db)):
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

@router.delete("/all/cleanup")
async def cleanup_all_devices(request: Request, db: AsyncSession = Depends(get_db)):
    """Removes all paired devices so fresh real devices can register via heartbeat."""
    stmt = select(PairedDevice)
    res = await db.execute(stmt)
    all_devs = res.scalars().all()
    count = len(all_devs)
    for d in all_devs:
        await db.delete(d)
    await db.commit()
    await audit_service.log(
        action="DEVICES_CLEANUP",
        module="PIP",
        severity="WARNING",
        details=f"Limpeza geral de telas: {count} dispositivo(s) removido(s).",
        client_ip=request.client.host if request.client else "unknown"
    )
    return {"status": "cleaned", "count": count}

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

@router.get("/{device_id}/diagnostics")
async def device_diagnostics(device_id: int, db: AsyncSession = Depends(get_db)):
    from app.db.models import AuditLog
    stmt = select(PairedDevice).where(PairedDevice.id == device_id)
    res = await db.execute(stmt)
    dev = res.scalar_one_or_none()
    if not dev:
        raise HTTPException(status_code=404, detail="Device not found")
        
    target_ip = dev.tailscale_ip if dev.tailscale_ip else dev.ip_address
    
    # 1. Ping Test
    ping_cmd = f"ping -c 3 -W 1 {target_ip}"
    proc = await asyncio.create_subprocess_shell(
        ping_cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE
    )
    stdout, stderr = await proc.communicate()
    ping_output = stdout.decode('utf-8', errors='ignore')
    
    import re
    packet_loss_match = re.search(r'(\d+)% packet loss', ping_output)
    avg_latency_match = re.search(r'min/avg/max/mdev = [\d\.]+/(.*?)/[\d\.]+/', ping_output)
    if not avg_latency_match:
        # Fallback for macOS ping output
        avg_latency_match = re.search(r'min/avg/max/stddev = [\d\.]+/(.*?)/[\d\.]+/', ping_output)
    
    packet_loss = f"{packet_loss_match.group(1)}%" if packet_loss_match else "100%"
    avg_latency = f"{avg_latency_match.group(1)} ms" if avg_latency_match else "N/A"
    
    # 2. Port Scan
    ports_to_check = {8009: "Google Cast", 7986: "PiP REST", 5463: "PiP REST Alt"}
    open_ports = []
    
    async def check_port(port, name):
        try:
            fut = asyncio.open_connection(target_ip, port)
            reader, writer = await asyncio.wait_for(fut, timeout=0.5)
            writer.close()
            await writer.wait_closed()
            open_ports.append(f"{port} ({name})")
        except Exception:
            pass
            
    await asyncio.gather(*[check_port(p, n) for p, n in ports_to_check.items()])
    
    # 3. Statistics
    import datetime
    yesterday = datetime.datetime.utcnow() - datetime.timedelta(days=1)
    audit_stmt = select(AuditLog).where(
        AuditLog.action == "PIP_TEST_SUCCESS",
        AuditLog.timestamp >= yesterday,
        AuditLog.details.like(f"%{dev.friendly_name}%")
    )
    audit_res = await db.execute(audit_stmt)
    pip_count = len(audit_res.scalars().all())
    
    raw_lines = ping_output.strip().split('\n')
    
    return {
        "device_id": dev.id,
        "name": dev.friendly_name,
        "target_ip": target_ip,
        "ping_raw": raw_lines[-2:] if len(raw_lines) >= 2 else raw_lines,
        "packet_loss": packet_loss,
        "latency": avg_latency,
        "open_ports": open_ports if open_ports else ["Nenhuma porta PiP/Cast detectada aberta"],
        "stats": {
            "pips_sent_24h": pip_count,
            "status": dev.permission_status
        }
    }


class BatchTestRequest(BaseModel):
    target_device_ids: Optional[List[str]] = None  # null for all
    device_type: Optional[str] = None  # "android_tv", "smartphone" or null
    test_type: str = "pip_alert"  # "pip_alert", "ping_speed", "simulated_detection"
    camera_name: str = "camera_principal"
    label: str = "TESTE MASTER EM LOTE"
    duration_seconds: int = 10


@router.post("/{device_identifier}/toggle-master")
async def toggle_device_master(device_identifier: str, request: Request, db: AsyncSession = Depends(get_db)):
    """Toggles Master Admin rights for a smartphone device."""
    from app.api.ws import ws_manager
    stmt = select(PairedDevice).where(PairedDevice.device_identifier == device_identifier)
    res = await db.execute(stmt)
    dev = res.scalar_one_or_none()
    if not dev:
        raise HTTPException(status_code=404, detail="Dispositivo não encontrado")

    new_state = not bool(dev.is_master_admin)
    dev.is_master_admin = new_state
    dev.admin_unlocked_at = datetime.datetime.utcnow() if new_state else None
    await db.commit()

    # Broadcast real-time permission update via WebSocket
    await ws_manager.broadcast_json({
        "type": "DEVICE_MASTER_CHANGED",
        "device_identifier": device_identifier,
        "is_master_admin": new_state
    })

    client_ip = request.client.host if request.client else "unknown"
    await audit_service.log(
        action="DEVICE_MASTER_TOGGLED",
        module="SECURITY",
        severity="WARNING" if new_state else "INFO",
        details=f"Permissões Master {'CONCEDIDAS a' if new_state else 'REVOGADAS de'} {dev.friendly_name} ({dev.device_type})",
        client_ip=client_ip
    )
    return {"status": "success", "is_master_admin": new_state, "device_identifier": device_identifier}


@router.post("/batch-test")
async def execute_batch_test(req: BatchTestRequest, request: Request, db: AsyncSession = Depends(get_db)):
    """Executes batch tests across multiple or all devices simultaneously."""
    from app.api.ws import ws_manager
    stmt = select(PairedDevice).where(PairedDevice.permission_status == "allowed")
    if req.target_device_ids and len(req.target_device_ids) > 0:
        stmt = stmt.where(PairedDevice.device_identifier.in_(req.target_device_ids))
    elif req.device_type:
        stmt = stmt.where(PairedDevice.device_type == req.device_type)

    res = await db.execute(stmt)
    devices = res.scalars().all()

    results = []
    # 1. Global WebSocket broadcast for connected Android TV overlays and Smartphones
    if req.test_type in ("pip", "pip_alert"):
        await ws_manager.broadcast_json({
            "type": "pip_alert",
            "camera": req.camera_name,
            "label": req.label,
            "duration": req.duration_seconds,
            "target_identifier": "",
            "timestamp": datetime.datetime.utcnow().isoformat()
        })
        # 2. Also dispatch to Google Cast / REST PiP for TV endpoints
        snap_url = f"http://127.0.0.1:5000/api/{req.camera_name}/latest.jpg?h=720"
        stream_url = f"http://127.0.0.1:8554/{req.camera_name}"
        await pip_gateway_service.dispatch_pip_alert(
            camera_name=req.camera_name,
            label=req.label,
            snapshot_url=snap_url,
            stream_url=stream_url,
            duration_seconds=req.duration_seconds
        )
        for dev in devices:
            results.append({"device": dev.friendly_name, "id": dev.device_identifier, "status": "pip_dispatched"})
    elif req.test_type == "simulated_detection":
        await ws_manager.broadcast_json({
            "type": "FRIGATE_EVENT",
            "camera": req.camera_name,
            "label": req.label,
            "top_score": 0.96,
            "active": True,
            "timestamp": datetime.datetime.utcnow().isoformat()
        })
        for dev in devices:
            results.append({"device": dev.friendly_name, "id": dev.device_identifier, "status": "detection_simulated"})
    else:
        for dev in devices:
            results.append({"device": dev.friendly_name, "id": dev.device_identifier, "status": "ping_ready"})

    client_ip = request.client.host if request.client else "unknown"
    await audit_service.log(
        action="BATCH_TEST_EXECUTED",
        module="PIP",
        severity="INFO",
        details=f"Teste em lote '{req.test_type}' disparado para {len(results)} dispositivo(s).",
        client_ip=client_ip
    )
    return {"status": "success", "test_type": req.test_type, "total": len(results), "results": results}


