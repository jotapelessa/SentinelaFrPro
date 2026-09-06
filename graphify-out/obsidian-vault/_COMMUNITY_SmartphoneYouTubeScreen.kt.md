---
type: community
cohesion: 0.24
members: 10
---

# SmartphoneYouTubeScreen.kt

**Cohesion:** 0.24 - loosely connected
**Members:** 10 nodes

## Members
- [[dot-__init__()_3]] - code - backend/app/api/ws.py
- [[dot-broadcast_json()]] - code - backend/app/api/ws.py
- [[dot-connect()]] - code - backend/app/api/ws.py
- [[dot-disconnect()]] - code - backend/app/api/ws.py
- [[Background loop sending hardware telemetry every 5.0 seconds to connected UI…]] - rationale - backend/app/api/ws.py
- [[WebSocket]] - code
- [[WebSocketManager]] - code - backend/app/api/ws.py
- [[telemetry_broadcast_loop()]] - code - backend/app/api/ws.py
- [[websocket_endpoint()]] - code - backend/app/api/ws.py
- [[ws.py]] - code - backend/app/api/ws.py

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/SmartphoneYouTubeScreenkt
SORT file.name ASC
```

## Connections to other communities
- 1 edge to [[_COMMUNITY_events.py]]
- 1 edge to [[_COMMUNITY_SeamlessCameraImage]]

## Top bridge nodes
- [[ws.py]] - degree 5, connects to 2 communities