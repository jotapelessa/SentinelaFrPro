---
type: community
cohesion: 0.06
members: 48
---

# api/telemetry.py

**Cohesion:** 0.06 - loosely connected
**Members:** 48 nodes

## Members
- [[dot-emit()]] - code - backend/app/core/logging_handler.py
- [[AsyncSession_3]] - code
- [[BaseModel_3]] - code
- [[BaseModel_4]] - code
- [[BenchmarkPayload]] - code - backend/app/api/telemetry.py
- [[Captures all logging records in memory for real-time API streaming.]] - rationale - backend/app/core/logging_handler.py
- [[Compiles a complete diagnostic report (.txt) of all services for one-click…]] - rationale - backend/app/api/telemetry.py
- [[Detailed hardware diagnostics for Intel Jasper Lake N5105  VAAPI.]] - rationale - backend/app/api/telemetry.py
- [[FastAPI]] - code
- [[Fetches real-time log lines for the requested service or container.]] - rationale - backend/app/api/telemetry.py
- [[LogRecord]] - code
- [[MemoryRingBufferHandler]] - code - backend/app/core/logging_handler.py
- [[Request_3]] - code
- [[Returns application audit logs with newest events at the top (DESC order).]] - rationale - backend/app/api/telemetry.py
- [[Returns deep connectivity status with Frigate NVR REST API, MQTT bus, go2rtc…]] - rationale - backend/app/api/telemetry.py
- [[Returns real-time hardware telemetry, per-core CPU, RAM breakdown, NVMe…]] - rationale - backend/app/api/telemetry.py
- [[Returns the most recent lines from the in-memory ring buffer.]] - rationale - backend/app/core/logging_handler.py
- [[Runs on-demand stress & performance benchmarks for 1080p, 2K, 4K, IA detection…]] - rationale - backend/app/api/telemetry.py
- [[ScanPayload]] - code - backend/app/api/scanner.py
- [[Triggers concurrent ONVIF Discovery and verified CCTV port scanner.]] - rationale - backend/app/api/scanner.py
- [[apitelemetry.py]] - code - backend/app/api/telemetry.py
- [[audit_http_requests()]] - code - backend/app/main.py
- [[download_diagnostic_logs()]] - code - backend/app/api/telemetry.py
- [[fetch_docker_container_logs()]] - code - backend/app/api/telemetry.py
- [[get_3]] - code
- [[get_4]] - code
- [[get_audit_logs()]] - code - backend/app/api/telemetry.py
- [[get_backend_logs()]] - code - backend/app/core/logging_handler.py
- [[get_db()]] - code - backend/app/db/session.py
- [[get_detailed_stats()]] - code - backend/app/api/telemetry.py
- [[get_frigate_deep_status()]] - code - backend/app/api/telemetry.py
- [[get_service_logs()]] - code - backend/app/api/telemetry.py
- [[get_system_diagnostics()]] - code - backend/app/api/telemetry.py
- [[get_telemetry()]] - code - backend/app/api/telemetry.py
- [[health_check()]] - code - backend/app/main.py
- [[init_db()]] - code - backend/app/db/session.py
- [[lifespan()]] - code - backend/app/main.py
- [[logging_handler.py]] - code - backend/app/core/logging_handler.py
- [[main.py]] - code - backend/app/main.py
- [[mask_sensitive_data()]] - code - backend/app/core/logging_handler.py
- [[middleware]] - code
- [[post_3]] - code
- [[post_4]] - code
- [[root()]] - code - backend/app/main.py
- [[run_server_benchmark()]] - code - backend/app/api/telemetry.py
- [[scanner.py]] - code - backend/app/api/scanner.py
- [[session.py]] - code - backend/app/db/session.py
- [[trigger_network_scan()]] - code - backend/app/api/scanner.py

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/api/telemetrypy
SORT file.name ASC
```

## Connections to other communities
- 4 edges to [[_COMMUNITY_events.py]]
- 2 edges to [[_COMMUNITY_cameras.py]]
- 2 edges to [[_COMMUNITY_OverlayService]]
- 2 edges to [[_COMMUNITY_asyncio]]
- 2 edges to [[_COMMUNITY_sentinela-pro-mobile-nvrsrcApp.tsx]]

## Top bridge nodes
- [[FastAPI]] - degree 9, connects to 5 communities
- [[get_db()]] - degree 6, connects to 4 communities
- [[apitelemetry.py]] - degree 14, connects to 1 community
- [[main.py]] - degree 8, connects to 1 community
- [[get_audit_logs()]] - degree 5, connects to 1 community