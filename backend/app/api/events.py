from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from typing import Optional, List, Dict, Any
import httpx
import logging
import datetime
from app.db.session import get_db
from app.db.models import EventRecord
from app.core.config import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/events", tags=["Events"])

@router.get("/")
async def list_events(
    camera: Optional[str] = None,
    label: Optional[str] = None,
    limit: int = Query(50, le=200),
    db: AsyncSession = Depends(get_db)
):
    """Fetches real historical events from Frigate NVR (single source of truth) with SQLite fallback."""
    frigate_events: List[Dict[str, Any]] = []
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            params = {"limit": limit}
            if camera:
                params["camera"] = camera
            if label:
                params["label"] = label
            resp = await client.get(f"{settings.FRIGATE_API_URL}/api/events", params=params)
            if resp.status_code == 200:
                for item in resp.json():
                    zones = item.get("zones") or []
                    zone_val = zones[0] if zones else None
                    score = item.get("top_score") or item.get("score") or 0.0
                    start_ts = item.get("start_time")
                    time_str = datetime.datetime.fromtimestamp(start_ts).isoformat() if start_ts else datetime.datetime.utcnow().isoformat()

                    frigate_events.append({
                        "id": item.get("id"),
                        "camera": item.get("camera", "camera_principal"),
                        "label": item.get("label", "person"),
                        "score": round(score * 100) if score <= 1 else round(score),
                        "timestamp": time_str,
                        "zone": zone_val,
                        "snapshot_url": f"/frigate/api/events/{item.get('id')}/snapshot.jpg",
                        "clip_url": f"/frigate/api/events/{item.get('id')}/clip.mp4",
                        "has_clip": item.get("has_clip", True)
                    })
    except Exception as e:
        logger.warning(f"Could not connect directly to Frigate API: {e}")

    if frigate_events:
        return frigate_events

    # Fallback to local SQLite cache if Frigate is unreachable
    stmt = select(EventRecord).order_by(desc(EventRecord.id)).limit(limit)
    if camera:
        stmt = stmt.where(EventRecord.camera_name == camera)
    if label:
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
            "snapshot_url": f"/frigate/api/events/{ev.frigate_event_id}/snapshot.jpg" if ev.frigate_event_id else None,
            "clip_url": f"/frigate/api/events/{ev.frigate_event_id}/clip.mp4" if ev.frigate_event_id else None,
            "has_clip": ev.has_clip
        }
        for ev in db_events
    ]

