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

class DeviceHeartbeat(BaseModel):
    device_identifier: str
    friendly_name: str
    device_type: str = "android_tv"
    ip_address: Optional[str] = None
    tailscale_ip: Optional[str] = None

class DeviceAllowedCamerasUpdate(BaseModel):
    allowed_cameras: List[str]

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
    devices = result.scalars().all()
    out = []
    for d in devices:
        cams = []
        if d.allowed_cameras:
            try:
                cams = json.loads(d.allowed_cameras)
            except Exception:
                cams = []
        out.append({
            "id": d.id,
            "device_identifier": d.device_identifier,
            "friendly_name": d.friendly_name,
            "device_type": d.device_type,
            "ip_address": d.ip_address,
            "tailscale_ip": d.tailscale_ip,
            "permission_status": d.permission_status,
            "allowed_cameras": cams,
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

    if dev:
        dev.friendly_name = hb.friendly_name
        dev.device_type = hb.device_type
        if hb.ip_address:
            dev.ip_address = hb.ip_address
        elif not dev.ip_address:
            dev.ip_address = client_ip
        if hb.tailscale_ip:
            dev.tailscale_ip = hb.tailscale_ip
        dev.last_seen = datetime.datetime.utcnow()
        await db.commit()
    else:
        dev = PairedDevice(
            device_identifier=hb.device_identifier,
            friendly_name=hb.friendly_name,
            device_type=hb.device_type,
            ip_address=hb.ip_address or client_ip,
            tailscale_ip=hb.tailscale_ip,
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

    return {
        "status": "online",
        "device_identifier": dev.device_identifier,
        "permission_status": dev.permission_status,
        "allowed_cameras": allowed,
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

    # Get all enabled cameras
    cam_stmt = select(Camera).where(Camera.enabled == True)
    cam_res = await db.execute(cam_stmt)
    all_cams = cam_res.scalars().all()

    if not dev or not dev.allowed_cameras:
        # If no specific camera restriction, return all enabled cameras
        return [{"name": c.name, "friendly_name": c.friendly_name or c.name, "enabled": c.enabled} for c in all_cams]

    try:
        allowed_list = json.loads(dev.allowed_cameras)
        if not allowed_list:
            return [{"name": c.name, "friendly_name": c.friendly_name or c.name, "enabled": c.enabled} for c in all_cams]
        return [
            {"name": c.name, "friendly_name": c.friendly_name or c.name, "enabled": c.enabled}
            for c in all_cams if c.name in allowed_list
        ]
    except Exception:
        return [{"name": c.name, "friendly_name": c.friendly_name or c.name, "enabled": c.enabled} for c in all_cams]

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

