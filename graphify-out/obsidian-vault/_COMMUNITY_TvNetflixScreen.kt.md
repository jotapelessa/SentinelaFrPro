---
type: community
cohesion: 0.06
members: 66
---

# TvNetflixScreen.kt

**Cohesion:** 0.06 - loosely connected
**Members:** 66 nodes

## Members
- [[dot-__init__()]] - code - backend/app/services/mqtt_service.py
- [[dot-_dispatch_background_alert_tasks()]] - code - backend/app/services/mqtt_service.py
- [[dot-_dispatch_telegram_video_with_retry()]] - code - backend/app/services/mqtt_service.py
- [[dot-_get_telegram_policy()]] - code - backend/app/services/mqtt_service.py
- [[dot-_mark_processed()]] - code - backend/app/services/mqtt_service.py
- [[dot-broadcast_event()]] - code - backend/app/services/mqtt_service.py
- [[dot-get_mqtt_traffic()]] - code - backend/app/services/mqtt_service.py
- [[dot-handle_frigate_event()]] - code - backend/app/services/mqtt_service.py
- [[dot-log()]] - code - backend/app/services/audit_service.py
- [[dot-record_mqtt_traffic()]] - code - backend/app/services/mqtt_service.py
- [[dot-register_ws_callback()]] - code - backend/app/services/mqtt_service.py
- [[dot-start_listening()]] - code - backend/app/services/mqtt_service.py
- [[Any]] - code
- [[AsyncSession]] - code
- [[Asynchronously acquires the exact duration 30 FPS MP4 video with = 7s pre-…]] - rationale - backend/app/services/mqtt_service.py
- [[Asynchronously handles Telegram photo dispatch, DB logging, and Chromecast…]] - rationale - backend/app/services/mqtt_service.py
- [[AuditLog]] - code - backend/app/db/models.py
- [[AuditService]] - code - backend/app/services/audit_service.py
- [[Base]] - code
- [[BaseModel]] - code
- [[Camera]] - code - backend/app/db/models.py
- [[Connects to MQTT and runs consumer loop with automatic reconnection.]] - rationale - backend/app/services/mqtt_service.py
- [[Deep synchronization of historical events from Frigate NVR into Sentinela.]] - rationale - backend/app/api/events.py
- [[Deletes event and its media permanently from Frigate NVR and local SQLite cache.]] - rationale - backend/app/api/events.py
- [[Deletes events for a specific date (up to 50 per execution) with retained event…]] - rationale - backend/app/api/events.py
- [[Deletes multiple events in batch with strict concurrency throttling (max 5…]] - rationale - backend/app/api/events.py
- [[Dynamically loads live Telegram settings with 30s in-memory cache.]] - rationale - backend/app/services/mqtt_service.py
- [[EventBatchDeleteRequest]] - code - backend/app/api/events.py
- [[EventRecord]] - code - backend/app/db/models.py
- [[Fetches real historical events from Frigate NVR (single source of truth) with…]] - rationale - backend/app/api/events.py
- [[MQTTService]] - code - backend/app/services/mqtt_service.py
- [[Publishes a mock Frigate security event to Mosquitto MQTT.]] - rationale - backend/app/mocks/mock_publisher.py
- [[Records an audit log entry in SQLite asynchronously.]] - rationale - backend/app/services/audit_service.py
- [[Request]] - code
- [[Retrieves operational audit logs (system mutations, alerts, errors).]] - rationale - backend/app/api/events.py
- [[Returns real-time analytics summary directly from Frigate NVR.]] - rationale - backend/app/api/events.py
- [[Streams a universally compatible H.264 MP4 video clip with HTTP Range support.…]] - rationale - backend/app/api/events.py
- [[Toggles retain_indefinitely on Frigate NVR (prevents automatic 14-day purge).]] - rationale - backend/app/api/events.py
- [[asyncio]] - code
- [[audit_service.py]] - code - backend/app/services/audit_service.py
- [[clear_audit_trail()]] - code - backend/app/api/events.py
- [[delete]] - code
- [[delete_event()]] - code - backend/app/api/events.py
- [[delete_events_batch()]] - code - backend/app/api/events.py
- [[delete_events_by_date()]] - code - backend/app/api/events.py
- [[events.py]] - code - backend/app/api/events.py
- [[get]] - code
- [[get_audit_trail()]] - code - backend/app/api/events.py
- [[get_event_clip()]] - code - backend/app/api/events.py
- [[get_events_summary()]] - code - backend/app/api/events.py
- [[head]] - code
- [[list_events()]] - code - backend/app/api/events.py
- [[mock_publisher.py]] - code - backend/app/mocks/mock_publisher.py
- [[models.py]] - code - backend/app/db/models.py
- [[mqtt_service.py]] - code - backend/app/services/mqtt_service.py
- [[post]] - code
- [[publish_simulated_event()]] - code - backend/app/mocks/mock_publisher.py
- [[retain_event()]] - code - backend/app/api/events.py
- [[sync_events_from_frigate()]] - code - backend/app/api/events.py
- [[test_backend.py]] - code - backend/tests/test_backend.py
- [[test_pip_dnd_check()]] - code - backend/tests/test_backend.py
- [[test_scanner_subnets()]] - code - backend/tests/test_backend.py
- [[test_telemetry_service()]] - code - backend/tests/test_backend.py
- [[test_watermark_generation()]] - code - backend/tests/test_backend.py
- [[verify_system()]] - code - verify_system.py
- [[verify_system.py]] - code - verify_system.py

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/TvNetflixScreenkt
SORT file.name ASC
```

## Connections to other communities
- 8 edges to [[_COMMUNITY_settings.py]]
- 7 edges to [[_COMMUNITY_useSentinelaStore]]
- 3 edges to [[_COMMUNITY_dependencies_1]]
- 3 edges to [[_COMMUNITY_manifest.json]]
- 1 edge to [[_COMMUNITY_MseCameraView]]
- 1 edge to [[_COMMUNITY_appbuild.gradle.kts]]
- 1 edge to [[_COMMUNITY_Settings]]
- 1 edge to [[_COMMUNITY_compilerOptions_2]]
- 1 edge to [[_COMMUNITY_TelegramVaultService]]

## Top bridge nodes
- [[asyncio]] - degree 15, connects to 6 communities
- [[AuditLog]] - degree 12, connects to 3 communities
- [[Camera]] - degree 10, connects to 3 communities
- [[models.py]] - degree 5, connects to 2 communities
- [[Base]] - degree 5, connects to 2 communities