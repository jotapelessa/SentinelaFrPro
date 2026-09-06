---
type: community
cohesion: 0.21
members: 12
---

# FastAPI

**Cohesion:** 0.21 - loosely connected
**Members:** 12 nodes

## Members
- [[FastAPI]] - code
- [[Request_2]] - code
- [[audit_http_requests()]] - code - backend/app/main.py
- [[get_3]] - code
- [[get_db()]] - code - backend/app/db/session.py
- [[health_check()]] - code - backend/app/main.py
- [[init_db()]] - code - backend/app/db/session.py
- [[lifespan()]] - code - backend/app/main.py
- [[main.py]] - code - backend/app/main.py
- [[middleware]] - code
- [[root()]] - code - backend/app/main.py
- [[session.py]] - code - backend/app/db/session.py

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/FastAPI
SORT file.name ASC
```

## Connections to other communities
- 3 edges to [[_COMMUNITY_events.py]]
- 2 edges to [[_COMMUNITY_cameras.py]]
- 2 edges to [[_COMMUNITY_devices.py]]
- 2 edges to [[_COMMUNITY_settings.py]]
- 2 edges to [[_COMMUNITY_apitelemetry.py]]
- 1 edge to [[_COMMUNITY_MemoryRingBufferHandler]]
- 1 edge to [[_COMMUNITY_trigger_network_scan]]
- 1 edge to [[_COMMUNITY_ws.py]]

## Top bridge nodes
- [[FastAPI]] - degree 9, connects to 7 communities
- [[get_db()]] - degree 6, connects to 5 communities
- [[main.py]] - degree 8, connects to 2 communities