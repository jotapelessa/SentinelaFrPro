from fastapi import APIRouter, Depends, Query, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from typing import Optional, List, Dict, Any
import httpx
import logging
import datetime
from app.db.session import get_db
from app.db.models import EventRecord, AuditLog
from app.core.config import settings
from app.services.audit_service import audit_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/events", tags=["Events"])

@router.get("/")
async def list_events(
    camera: Optional[str] = None,
    label: Optional[str] = None,
    zone: Optional[str] = None,
    favorites: Optional[int] = None,
    limit: int = Query(50, le=200),
    db: AsyncSession = Depends(get_db)
):
    """Fetches real historical events from Frigate NVR (single source of truth) with SQLite fallback."""
    frigate_events: List[Dict[str, Any]] = []
    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            params: Dict[str, Any] = {"limit": limit}
            if camera and camera != "all":
                params["camera"] = camera
            if label and label != "all":
                params["label"] = label
            if zone and zone != "all":
                params["zone"] = zone
            if favorites is not None:
                params["favorites"] = favorites

            resp = await client.get(f"{settings.FRIGATE_API_URL}/api/events", params=params)
            if resp.status_code == 200:
                for item in resp.json():
                    zones = item.get("zones") or []
                    zone_val = zones[0] if zones else None
                    score = item.get("top_score") or item.get("score") or 0.0
                    start_ts = item.get("start_time")
                    time_str = datetime.datetime.fromtimestamp(start_ts).isoformat() if start_ts else datetime.datetime.utcnow().isoformat()
                    is_retained = item.get("retain_indefinitely", False)

                    frigate_events.append({
                        "id": item.get("id"),
                        "camera": item.get("camera", "camera_principal"),
                        "label": item.get("label", "person"),
                        "score": round(score * 100) if score <= 1 else round(score),
                        "timestamp": time_str,
                        "zone": zone_val,
                        "zones": zones,
                        "snapshot_url": f"/frigate/api/events/{item.get('id')}/snapshot.jpg",
                        "snapshot_clean_url": f"/frigate/api/events/{item.get('id')}/snapshot.jpg?clean=1",
                        "clip_url": f"/frigate/api/events/{item.get('id')}/clip.mp4",
                        "has_clip": item.get("has_clip", True),
                        "has_snapshot": item.get("has_snapshot", True),
                        "retained": is_retained,
                        "data": item.get("data", {})
                    })
    except Exception as e:
        logger.warning(f"Could not connect directly to Frigate API: {e}")

    if frigate_events:
        return frigate_events

    # Fallback to local SQLite cache if Frigate is unreachable
    stmt = select(EventRecord).order_by(desc(EventRecord.id)).limit(limit)
    if camera and camera != "all":
        stmt = stmt.where(EventRecord.camera_name == camera)
    if label and label != "all":
        stmt = stmt.where(EventRecord.label == label)
    
    result = await db.execute(stmt)
    db_events = result.scalars().all()
    return [
        {
            "id": ev.frigate_event_id or str(ev.id),
            "camera": ev.camera_name,
            "label": ev.label,
            "score": round(ev.top_score * 100) if ev.top_score <= 1 else round(ev.top_score),
            "timestamp": ev.start_time.isoformat() if ev.start_time else datetime.datetime.utcnow().isoformat(),
            "zone": ev.zone,
            "zones": [ev.zone] if ev.zone else [],
            "snapshot_url": f"/frigate/api/events/{ev.frigate_event_id}/snapshot.jpg" if ev.frigate_event_id else None,
            "snapshot_clean_url": f"/frigate/api/events/{ev.frigate_event_id}/snapshot.jpg?clean=1" if ev.frigate_event_id else None,
            "clip_url": f"/frigate/api/events/{ev.frigate_event_id}/clip.mp4" if ev.frigate_event_id else None,
            "has_clip": ev.has_clip,
            "has_snapshot": ev.has_snapshot,
            "retained": False,
            "data": {}
        }
        for ev in db_events
    ]

@router.post("/{event_id}/retain")
async def retain_event(event_id: str, request: Request):
    """Toggles retain_indefinitely on Frigate NVR (prevents automatic 14-day purge)."""
    client_ip = request.client.host if request.client else "unknown"
    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            resp = await client.post(f"{settings.FRIGATE_API_URL}/api/events/{event_id}/retain")
            if resp.status_code == 200:
                await audit_service.log(
                    action="EVENT_RETAIN_TOGGLED",
                    module="FRIGATE",
                    severity="SUCCESS",
                    details=f"Gravação do evento {event_id} fixada/desafixada no SSD NVMe.",
                    client_ip=client_ip
                )
                return {"status": "success", "event_id": event_id, "message": "Retenção atualizada no Frigate NVR."}
            raise HTTPException(status_code=resp.status_code, detail="Falha ao reter evento no Frigate.")
    except Exception as e:
        await audit_service.log(
            action="EVENT_RETAIN_FAILED",
            module="FRIGATE",
            severity="ERROR",
            details=f"Erro ao reter evento {event_id}: {e}",
            client_ip=client_ip
        )
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{event_id}")
async def delete_event(event_id: str, request: Request, db: AsyncSession = Depends(get_db)):
    """Deletes event and its media permanently from Frigate NVR and local SQLite cache."""
    client_ip = request.client.host if request.client else "unknown"
    frigate_deleted = False
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.delete(f"{settings.FRIGATE_API_URL}/api/events/{event_id}")
            if resp.status_code == 200:
                frigate_deleted = True
    except Exception as e:
        logger.warning(f"Could not delete from Frigate API: {e}")

    # Delete from local SQLite cache
    stmt = select(EventRecord).where(EventRecord.frigate_event_id == event_id)
    res = await db.execute(stmt)
    ev_record = res.scalar_one_or_none()
    if ev_record:
        await db.delete(ev_record)
        await db.commit()

    await audit_service.log(
        action="EVENT_DELETED",
        module="FRIGATE",
        severity="INFO",
        details=f"Evento {event_id} excluído (Frigate: {frigate_deleted}, SQLite: {bool(ev_record)}).",
        client_ip=client_ip
    )

    return {"status": "deleted", "event_id": event_id, "frigate_deleted": frigate_deleted}

@router.get("/audit/logs")
async def get_audit_trail(
    module: Optional[str] = None,
    severity: Optional[str] = None,
    limit: int = Query(100, le=500),
    db: AsyncSession = Depends(get_db)
):
    """Retrieves operational audit logs (system mutations, alerts, errors)."""
    stmt = select(AuditLog).order_by(desc(AuditLog.id)).limit(limit)
    if module and module != "ALL":
        stmt = stmt.where(AuditLog.module == module)
    if severity and severity != "ALL":
        stmt = stmt.where(AuditLog.severity == severity)

    res = await db.execute(stmt)
    logs = res.scalars().all()
    return [
        {
            "id": l.id,
            "action": l.action,
            "module": l.module,
            "severity": l.severity,
            "details": l.details,
            "client_ip": l.client_ip,
            "created_at": l.created_at.isoformat() if l.created_at else None
        }
        for l in logs
    ]

@router.delete("/audit/logs")
async def clear_audit_trail(request: Request, db: AsyncSession = Depends(get_db)):
    """Clears audit logs."""
    from sqlalchemy import delete
    await db.execute(delete(AuditLog))
    await db.commit()
    await audit_service.log(
        action="AUDIT_TRAIL_CLEARED",
        module="SYSTEM",
        severity="WARNING",
        details="Trilha de auditoria reiniciada pelo usuário.",
        client_ip=request.client.host if request.client else "unknown"
    )
    return {"status": "cleared", "message": "Logs de auditoria limpos com sucesso."}


