---
type: community
cohesion: 0.20
members: 16
---

# api/telemetry.py

**Cohesion:** 0.20 - loosely connected
**Members:** 16 nodes

## Members
- [[Compiles a complete diagnostic report (.txt) of all services for one-click…]] - rationale - backend/app/api/telemetry.py
- [[Detailed hardware diagnostics for Intel Jasper Lake N5105  VAAPI.]] - rationale - backend/app/api/telemetry.py
- [[Fetches real-time log lines for the requested service or container.]] - rationale - backend/app/api/telemetry.py
- [[Returns deep connectivity status with Frigate NVR REST API, MQTT bus, go2rtc…]] - rationale - backend/app/api/telemetry.py
- [[Returns real-time hardware telemetry, per-core CPU, RAM breakdown, NVMe…]] - rationale - backend/app/api/telemetry.py
- [[Returns the most recent lines from the in-memory ring buffer.]] - rationale - backend/app/core/logging_handler.py
- [[apitelemetry.py]] - code - backend/app/api/telemetry.py
- [[download_diagnostic_logs()]] - code - backend/app/api/telemetry.py
- [[fetch_docker_container_logs()]] - code - backend/app/api/telemetry.py
- [[get_2]] - code
- [[get_backend_logs()]] - code - backend/app/core/logging_handler.py
- [[get_detailed_stats()]] - code - backend/app/api/telemetry.py
- [[get_frigate_deep_status()]] - code - backend/app/api/telemetry.py
- [[get_service_logs()]] - code - backend/app/api/telemetry.py
- [[get_system_diagnostics()]] - code - backend/app/api/telemetry.py
- [[get_telemetry()]] - code - backend/app/api/telemetry.py

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/api/telemetrypy
SORT file.name ASC
```

## Connections to other communities
- 2 edges to [[_COMMUNITY_run_server_benchmark]]
- 2 edges to [[_COMMUNITY_Tasks Integração Frigate NVR 0.17 & go2rtc]]
- 2 edges to [[_COMMUNITY_FastAPI]]
- 1 edge to [[_COMMUNITY_events.py]]
- 1 edge to [[_COMMUNITY_MemoryRingBufferHandler]]

## Top bridge nodes
- [[apitelemetry.py]] - degree 14, connects to 4 communities
- [[get_2]] - degree 7, connects to 1 community
- [[get_backend_logs()]] - degree 5, connects to 1 community