from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from typing import Optional
from app.db.session import get_db
from app.db.models import EventRecord

router = APIRouter(prefix="/events", tags=["Events"])

@router.get("/")
async def list_events(
    camera: Optional[str] = None,
    label: Optional[str] = None,
    limit: int = Query(50, le=200),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(EventRecord).order_by(desc(EventRecord.id)).limit(limit)
    if camera:
        stmt = stmt.where(EventRecord.camera_name == camera)
    if label:
        stmt = stmt.where(EventRecord.label == label)
    
    result = await db.execute(stmt)
    events = result.scalars().all()
    return events
