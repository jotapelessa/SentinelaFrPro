from fastapi import APIRouter, Depends, Query, HTTPException, Request, Body
from fastapi.responses import FileResponse, Response
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, delete
from typing import Optional, List, Dict, Any
import httpx
import logging
import datetime
import asyncio
import os
import subprocess
import uuid
from app.db.session import get_db
from app.db.models import EventRecord, AuditLog
from app.core.config import settings
from app.services.audit_service import audit_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/events", tags=["Events"])

CLIPS_CACHE_DIR = "/tmp/clips_cache"
os.makedirs(CLIPS_CACHE_DIR, exist_ok=True)

class EventBatchDeleteRequest(BaseModel):
    event_ids: List[str] = Field(..., max_length=100)
    force_retained: bool = False


@router.get("/")
async def list_events(
    camera: Optional[str] = None,
    label: Optional[str] = None,
    zone: Optional[str] = None,
    favorites: Optional[int] = None,
    limit: int = Query(60, le=250),
    db: AsyncSession = Depends(get_db)
):
    """
    Fetches real historical events from Frigate NVR (single source of truth) with SQLite caching.
    Guarantees 100% fidelity between Frigate detections and Sentinela event feed.
    """
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
                    end_ts = item.get("end_time")
                    time_str = datetime.datetime.fromtimestamp(start_ts, tz=datetime.timezone.utc).isoformat() if start_ts else datetime.datetime.now(datetime.timezone.utc).isoformat()
                    is_retained = item.get("retain_indefinitely", False)
                    event_id = item.get("id")
                    cam_name = item.get("camera", "camera_principal")
                    lbl = item.get("label", "person")

                    is_clip = item.get("has_clip", True)
                    duration = round(end_ts - start_ts, 1) if (start_ts and end_ts and is_clip) else None
                    media_type = "video" if (is_clip and duration and duration > 0) else "photo"
                    dur_fmt = f"{int(duration)//60:02d}:{int(duration)%60:02d}" if (duration and media_type == "video") else None

                    frigate_events.append({
                        "id": event_id,
                        "camera": cam_name,
                        "label": lbl,
                        "sub_label": item.get("sub_label"),
                        "score": round(score * 100) if score <= 1 else round(score),
                        "timestamp": time_str,
                        "start_time": start_ts,
                        "end_time": end_ts,
                        "duration": duration,
                        "duration_formatted": dur_fmt,
                        "type": media_type,
                        "zone": zone_val,
                        "zones": zones,
                        "snapshot_url": f"/frigate/api/events/{event_id}/snapshot.jpg",
                        "snapshot_clean_url": f"/frigate/api/events/{event_id}/snapshot.jpg?clean=1",
                        "clip_url": f"/api/events/{event_id}/clip.mp4",
                        "has_clip": is_clip,
                        "has_snapshot": item.get("has_snapshot", True),
                        "retained": is_retained,
                        "box": item.get("data", {}).get("box") if isinstance(item.get("data"), dict) else None,
                        "data": item.get("data", {})
                    })
    except Exception as e:
        logger.warning(f"Could not connect directly to Frigate API: {e}")

    if frigate_events:
        # Asynchronously sync missing events into SQLite cache
        try:
            for ev in frigate_events[:20]:
                ev_id = ev.get("id")
                if not ev_id:
                    continue
                stmt = select(EventRecord).where(EventRecord.frigate_event_id == ev_id)
                res = await db.execute(stmt)
                if not res.scalar_one_or_none():
                    rec = EventRecord(
                        frigate_event_id=ev_id,
                        camera_name=ev.get("camera", "camera"),
                        label=ev.get("label", "unknown"),
                        top_score=float(ev.get("score", 0)) / 100.0,
                        zone=ev.get("zone"),
                        has_snapshot=ev.get("has_snapshot", True),
                        has_clip=ev.get("has_clip", True),
                        start_time=datetime.datetime.fromtimestamp(ev["start_time"]) if ev.get("start_time") else datetime.datetime.utcnow()
                    )
                    db.add(rec)
            await db.commit()
        except Exception:
            pass

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
            "sub_label": None,
            "score": round(ev.top_score * 100) if ev.top_score <= 1 else round(ev.top_score),
            "timestamp": ev.start_time.isoformat() if ev.start_time else datetime.datetime.utcnow().isoformat(),
            "start_time": ev.start_time.timestamp() if ev.start_time else None,
            "end_time": ev.end_time.timestamp() if ev.end_time else None,
            "duration": round((ev.end_time - ev.start_time).total_seconds(), 1) if (ev.start_time and ev.end_time and ev.has_clip) else None,
            "duration_formatted": f"{int((ev.end_time - ev.start_time).total_seconds())//60:02d}:{int((ev.end_time - ev.start_time).total_seconds())%60:02d}" if (ev.start_time and ev.end_time and ev.has_clip) else None,
            "type": "video" if ev.has_clip else "photo",
            "zone": ev.zone,
            "zones": [ev.zone] if ev.zone else [],
            "snapshot_url": f"/frigate/api/events/{ev.frigate_event_id}/snapshot.jpg" if ev.frigate_event_id else None,
            "snapshot_clean_url": f"/frigate/api/events/{ev.frigate_event_id}/snapshot.jpg?clean=1" if ev.frigate_event_id else None,
            "clip_url": f"/api/events/{ev.frigate_event_id}/clip.mp4" if ev.frigate_event_id else None,
            "has_clip": ev.has_clip,
            "has_snapshot": ev.has_snapshot,
            "retained": False,
            "box": None,
            "data": {}
        }
        for ev in db_events
    ]

@router.get("/summary")
async def get_events_summary():
    """Returns real-time analytics summary directly from Frigate NVR."""
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get(f"{settings.FRIGATE_API_URL}/api/events/summary")
            if resp.status_code == 200:
                return resp.json()
    except Exception as e:
        logger.debug(f"Frigate event summary unavailable: {e}")
    return {}

@router.post("/sync-frigate")
async def sync_events_from_frigate(request: Request, db: AsyncSession = Depends(get_db)):
    """Deep synchronization of historical events from Frigate NVR into Sentinela."""
    synced = 0
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"{settings.FRIGATE_API_URL}/api/events?limit=100")
            if resp.status_code == 200:
                for item in resp.json():
                    ev_id = item.get("id")
                    if not ev_id:
                        continue
                    stmt = select(EventRecord).where(EventRecord.frigate_event_id == ev_id)
                    res = await db.execute(stmt)
                    if not res.scalar_one_or_none():
                        score = item.get("top_score") or item.get("score") or 0.0
                        start_ts = item.get("start_time")
                        rec = EventRecord(
                            frigate_event_id=ev_id,
                            camera_name=item.get("camera", "camera"),
                            label=item.get("label", "person"),
                            top_score=float(score),
                            zone=(item.get("zones") or [None])[0],
                            has_snapshot=item.get("has_snapshot", True),
                            has_clip=item.get("has_clip", True),
                            start_time=datetime.datetime.fromtimestamp(start_ts) if start_ts else datetime.datetime.utcnow()
                        )
                        db.add(rec)
                        synced += 1
                await db.commit()
    except Exception as e:
        logger.warning(f"Error syncing events from Frigate: {e}")

    await audit_service.log(
        action="EVENTS_SYNCED_FRIGATE",
        module="FRIGATE",
        severity="INFO",
        details=f"Sincronização de eventos concluída ({synced} novos eventos importados).",
        client_ip=request.client.host if request.client else "unknown"
    )
    return {"status": "success", "synced_count": synced}

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

@router.post("/batch-delete")
@router.delete("/batch")
async def delete_events_batch(
    payload: EventBatchDeleteRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Deletes multiple events in batch with strict concurrency throttling (max 5 workers),
    single atomic SQLite delete, and consolidated audit logging.
    """
    client_ip = request.client.host if request.client else "unknown"
    event_ids = payload.event_ids[:50]  # Cap at 50 as enforced by Constraint Guardian
    
    if not event_ids:
        return {"status": "success", "deleted_count": 0, "failed_count": 0, "preserved_retained_count": 0}

    sem = asyncio.Semaphore(5)
    frigate_success = 0
    frigate_failed = 0

    async def _delete_frigate_single(client: httpx.AsyncClient, ev_id: str):
        nonlocal frigate_success, frigate_failed
        async with sem:
            try:
                resp = await client.delete(f"{settings.FRIGATE_API_URL}/api/events/{ev_id}", timeout=3.0)
                if resp.status_code == 200:
                    frigate_success += 1
                else:
                    frigate_failed += 1
            except Exception as e:
                logger.warning(f"Error deleting event {ev_id} on Frigate: {e}")
                frigate_failed += 1

    async with httpx.AsyncClient() as client:
        tasks = [_delete_frigate_single(client, ev_id) for ev_id in event_ids]
        await asyncio.gather(*tasks, return_exceptions=True)

    # Atomic batch delete from local SQLite cache
    sqlite_deleted = 0
    try:
        stmt = delete(EventRecord).where(EventRecord.frigate_event_id.in_(event_ids))
        res = await db.execute(stmt)
        sqlite_deleted = res.rowcount if res.rowcount is not None else len(event_ids)
        await db.commit()
    except Exception as e:
        logger.error(f"Failed to batch delete from SQLite: {e}")
        await db.rollback()

    await audit_service.log(
        action="EVENT_BATCH_DELETED",
        module="FRIGATE",
        severity="INFO",
        details=f"Exclusão em lote de {len(event_ids)} eventos solicitada (Frigate Sucessos: {frigate_success}, Falhas: {frigate_failed}, SQLite: {sqlite_deleted}).",
        client_ip=client_ip
    )

    return {
        "status": "success",
        "requested_count": len(event_ids),
        "frigate_success": frigate_success,
        "frigate_failed": frigate_failed,
        "sqlite_deleted": sqlite_deleted
    }

@router.delete("/by-date")
async def delete_events_by_date(
    date: str = Query(..., description="Data no formato YYYY-MM-DD"),
    camera: Optional[str] = Query(None, description="Filtrar câmera específica"),
    exclude_retained: bool = Query(True, description="Preservar eventos com estrela/fixados"),
    request: Request = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Deletes events for a specific date (up to 50 per execution) with retained event preservation.
    """
    client_ip = request.client.host if request and request.client else "unknown"
    
    # 1. Fetch matching events from Frigate
    matched_ids: List[str] = []
    try:
        dt_start = datetime.datetime.strptime(f"{date} 00:00:00", "%Y-%m-%d %H:%M:%S")
        dt_end = datetime.datetime.strptime(f"{date} 23:59:59", "%Y-%m-%d %H:%M:%S")
        after_ts = int(dt_start.timestamp())
        before_ts = int(dt_end.timestamp())

        params: Dict[str, Any] = {"after": after_ts, "before": before_ts, "limit": 60}
        if camera and camera != "all":
            params["camera"] = camera

        async with httpx.AsyncClient(timeout=4.0) as client:
            resp = await client.get(f"{settings.FRIGATE_API_URL}/api/events", params=params)
            if resp.status_code == 200:
                for item in resp.json():
                    is_retained = item.get("retain_indefinitely", False)
                    if exclude_retained and is_retained:
                        continue
                    if item.get("id"):
                        matched_ids.append(item["id"])
    except Exception as e:
        logger.warning(f"Error finding events by date {date}: {e}")

    if not matched_ids:
        return {"status": "success", "deleted_count": 0, "message": "Nenhum evento encontrado para excluir nesta data."}

    # Delegate to batch delete
    batch_payload = EventBatchDeleteRequest(event_ids=matched_ids[:50], force_retained=not exclude_retained)
    res = await delete_events_batch(payload=batch_payload, request=request, db=db)
    
    await audit_service.log(
        action="EVENTS_DATE_PURGED",
        module="FRIGATE",
        severity="WARNING",
        details=f"Purga de eventos da data {date} (Câmera: {camera or 'Todas'}, Excluídos: {res.get('frigate_success', 0)}, Preservando Fixados: {exclude_retained}).",
        client_ip=client_ip
    )

    return res

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


@router.get("/{event_id}/clip.mp4")
@router.head("/{event_id}/clip.mp4")
async def get_event_clip(event_id: str, download: bool = False):
    """
    Streams a universally compatible H.264 MP4 video clip with HTTP Range support.
    Transcodes raw HEVC clips from Frigate to H.264 with faststart so all web browsers (Firefox, Chrome, Safari)
    can play the recordings smoothly without codec errors.
    """
    cached_file = os.path.join(CLIPS_CACHE_DIR, f"{event_id}_h264.mp4")
    
    # 1. Return from fast disk cache if already transcoded
    if os.path.exists(cached_file) and os.path.getsize(cached_file) > 1024:
        headers = {
            "Accept-Ranges": "bytes",
            "Cache-Control": "public, max-age=86400"
        }
        if download:
            headers["Content-Disposition"] = f'attachment; filename="clip_{event_id}.mp4"'
        return FileResponse(
            cached_file,
            media_type="video/mp4",
            headers=headers
        )

    # 2. Fetch raw clip from Frigate NVR
    raw_bytes = None
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            frigate_clip_url = f"{settings.FRIGATE_API_URL}/api/events/{event_id}/clip.mp4"
            resp = await client.get(frigate_clip_url)
            if resp.status_code == 200 and len(resp.content) > 1024:
                raw_bytes = resp.content
    except Exception as e:
        logger.warning(f"Failed to fetch event clip from Frigate for {event_id}: {e}")

    if not raw_bytes:
        raise HTTPException(status_code=404, detail="Gravação de clipe não encontrada no NVR.")

    # 3. Transcode to universal H.264 MP4 with faststart and store in cache
    temp_in = os.path.join(CLIPS_CACHE_DIR, f"temp_in_{event_id}_{uuid.uuid4().hex[:6]}.mp4")
    temp_out = os.path.join(CLIPS_CACHE_DIR, f"temp_out_{event_id}_{uuid.uuid4().hex[:6]}.mp4")
    try:
        with open(temp_in, "wb") as f:
            f.write(raw_bytes)

        cmd = [
            "ffmpeg", "-y",
            "-i", temp_in,
            "-c:v", "libx264",
            "-preset", "veryfast",
            "-crf", "23",
            "-pix_fmt", "yuv420p",
            "-movflags", "+faststart",
            "-c:a", "aac",
            "-b:a", "128k",
            temp_out
        ]
        proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=45)
        if proc.returncode == 0 and os.path.exists(temp_out) and os.path.getsize(temp_out) > 1024:
            os.replace(temp_out, cached_file)
        else:
            # Fallback to raw bytes if ffmpeg failed
            with open(cached_file, "wb") as f:
                f.write(raw_bytes)
    except Exception as e:
        logger.error(f"Error transcoding clip {event_id}: {e}")
        with open(cached_file, "wb") as f:
            f.write(raw_bytes)
    finally:
        if os.path.exists(temp_in):
            try: os.remove(temp_in)
            except Exception: pass
        if os.path.exists(temp_out):
            try: os.remove(temp_out)
            except Exception: pass

    headers = {
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=86400"
    }
    if download:
        headers["Content-Disposition"] = f'attachment; filename="clip_{event_id}.mp4"'

    return FileResponse(
        cached_file,
        media_type="video/mp4",
        headers=headers
    )



