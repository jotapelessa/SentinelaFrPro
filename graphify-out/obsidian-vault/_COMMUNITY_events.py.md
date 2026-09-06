---
type: community
cohesion: 0.11
members: 33
---

# events.py

**Cohesion:** 0.11 - loosely connected
**Members:** 33 nodes

## Members
- [[dot-log()]] - code - backend/app/services/audit_service.py
- [[AsyncSession_1]] - code
- [[AuditLog]] - code - backend/app/db/models.py
- [[AuditService]] - code - backend/app/services/audit_service.py
- [[BaseModel_1]] - code
- [[Deep synchronization of historical events from Frigate NVR into Sentinela.]] - rationale - backend/app/api/events.py
- [[Deletes event and its media permanently from Frigate NVR and local SQLite cache.]] - rationale - backend/app/api/events.py
- [[Deletes events for a specific date (up to 50 per execution) with retained event…]] - rationale - backend/app/api/events.py
- [[Deletes multiple events in batch with strict concurrency throttling (max 5…]] - rationale - backend/app/api/events.py
- [[EventBatchDeleteRequest]] - code - backend/app/api/events.py
- [[Fetches real historical events from Frigate NVR (single source of truth) with…]] - rationale - backend/app/api/events.py
- [[Records an audit log entry in SQLite asynchronously.]] - rationale - backend/app/services/audit_service.py
- [[Request_1]] - code
- [[Retrieves operational audit logs (system mutations, alerts, errors).]] - rationale - backend/app/api/events.py
- [[Returns real-time analytics summary directly from Frigate NVR.]] - rationale - backend/app/api/events.py
- [[Streams a universally compatible H.264 MP4 video clip with HTTP Range support.…]] - rationale - backend/app/api/events.py
- [[Toggles retain_indefinitely on Frigate NVR (prevents automatic 14-day purge).]] - rationale - backend/app/api/events.py
- [[audit_service.py]] - code - backend/app/services/audit_service.py
- [[clear_audit_trail()]] - code - backend/app/api/events.py
- [[delete_1]] - code
- [[delete_event()]] - code - backend/app/api/events.py
- [[delete_events_batch()]] - code - backend/app/api/events.py
- [[delete_events_by_date()]] - code - backend/app/api/events.py
- [[events.py]] - code - backend/app/api/events.py
- [[get_1]] - code
- [[get_audit_trail()]] - code - backend/app/api/events.py
- [[get_event_clip()]] - code - backend/app/api/events.py
- [[get_events_summary()]] - code - backend/app/api/events.py
- [[head]] - code
- [[list_events()]] - code - backend/app/api/events.py
- [[post_1]] - code
- [[retain_event()]] - code - backend/app/api/events.py
- [[sync_events_from_frigate()]] - code - backend/app/api/events.py

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/eventspy
SORT file.name ASC
```

## Connections to other communities
- 7 edges to [[_COMMUNITY_useSentinelaStore]]
- 4 edges to [[_COMMUNITY_apitelemetry.py]]
- 2 edges to [[_COMMUNITY_cameras.py]]
- 2 edges to [[_COMMUNITY_OverlayService]]
- 1 edge to [[_COMMUNITY_sentinela-pro-mobile-nvrsrcApp.tsx]]

## Top bridge nodes
- [[AuditLog]] - degree 14, connects to 4 communities
- [[events.py]] - degree 16, connects to 3 communities
- [[delete_events_batch()]] - degree 9, connects to 1 community
- [[delete_event()]] - degree 6, connects to 1 community
- [[sync_events_from_frigate()]] - degree 6, connects to 1 community