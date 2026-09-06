---
type: community
cohesion: 0.07
members: 55
---

# useSentinelaStore

**Cohesion:** 0.07 - loosely connected
**Members:** 55 nodes

## Members
- [[dot-__init__()_1]] - code - backend/app/services/mqtt_service.py
- [[dot-__init__()]] - code - backend/app/services/telegram_vault.py
- [[dot-_dispatch_background_alert_tasks()]] - code - backend/app/services/mqtt_service.py
- [[dot-_dispatch_telegram_video_with_retry()]] - code - backend/app/services/mqtt_service.py
- [[dot-_get_telegram_policy()]] - code - backend/app/services/mqtt_service.py
- [[dot-_mark_processed()]] - code - backend/app/services/mqtt_service.py
- [[dot-apply_watermark()]] - code - backend/app/services/telegram_vault.py
- [[dot-broadcast_event()]] - code - backend/app/services/mqtt_service.py
- [[dot-format_event_message()]] - code - backend/app/services/telegram_vault.py
- [[dot-get_audit_logs()]] - code - backend/app/services/telegram_vault.py
- [[dot-get_mqtt_traffic()]] - code - backend/app/services/mqtt_service.py
- [[dot-get_system_status_text()]] - code - backend/app/services/telegram_vault.py
- [[dot-handle_command()]] - code - backend/app/services/telegram_vault.py
- [[dot-handle_frigate_event()]] - code - backend/app/services/mqtt_service.py
- [[dot-is_configured()]] - code - backend/app/services/telegram_vault.py
- [[dot-is_paused()]] - code - backend/app/services/telegram_vault.py
- [[dot-load_credentials_from_db()]] - code - backend/app/services/telegram_vault.py
- [[dot-pause_alerts()]] - code - backend/app/services/telegram_vault.py
- [[dot-record_audit()]] - code - backend/app/services/telegram_vault.py
- [[dot-record_mqtt_traffic()]] - code - backend/app/services/mqtt_service.py
- [[dot-register_ws_callback()]] - code - backend/app/services/mqtt_service.py
- [[dot-send_alert_photo()]] - code - backend/app/services/telegram_vault.py
- [[dot-send_alert_video()]] - code - backend/app/services/telegram_vault.py
- [[dot-send_document()]] - code - backend/app/services/telegram_vault.py
- [[dot-send_message()]] - code - backend/app/services/telegram_vault.py
- [[dot-start_listening()]] - code - backend/app/services/mqtt_service.py
- [[dot-start_polling()]] - code - backend/app/services/telegram_vault.py
- [[dot-start_polling_task()]] - code - backend/app/services/telegram_vault.py
- [[dot-test_connection()]] - code - backend/app/services/telegram_vault.py
- [[Any_2]] - code
- [[Any_1]] - code
- [[Appends an event to the in-memory Telegram audit trail.]] - rationale - backend/app/services/telegram_vault.py
- [[Applies a professional HUD watermark on the snapshot with dynamic scaling for…]] - rationale - backend/app/services/telegram_vault.py
- [[Asynchronously acquires the exact duration 30 FPS MP4 video with = 7s pre-…]] - rationale - backend/app/services/mqtt_service.py
- [[Asynchronously handles Telegram photo dispatch, DB logging, and Chromecast…]] - rationale - backend/app/services/mqtt_service.py
- [[Base]] - code
- [[Connects to MQTT and runs consumer loop with automatic reconnection.]] - rationale - backend/app/services/mqtt_service.py
- [[Continuous lightweight long-polling loop for Telegram Bot updates.]] - rationale - backend/app/services/telegram_vault.py
- [[Dispatches MP4 clip to Telegram using the classic template.]] - rationale - backend/app/services/telegram_vault.py
- [[Dispatches watermarked snapshot to Telegram using the classic template.]] - rationale - backend/app/services/telegram_vault.py
- [[Dynamically loads live Telegram settings with 30s in-memory cache.]] - rationale - backend/app/services/mqtt_service.py
- [[EventRecord]] - code - backend/app/db/models.py
- [[Formats real-time telemetry into a rich Telegram status message.]] - rationale - backend/app/services/telegram_vault.py
- [[Loads Bot Token and Chat ID from database if available, or seeds defaults.]] - rationale - backend/app/services/telegram_vault.py
- [[MQTTService]] - code - backend/app/services/mqtt_service.py
- [[Processes interactive bot commands received via Telegram chat.]] - rationale - backend/app/services/telegram_vault.py
- [[Sends a document (e.g. database backup) to Telegram.]] - rationale - backend/app/services/telegram_vault.py
- [[Sends a text message to the configured Telegram chat.]] - rationale - backend/app/services/telegram_vault.py
- [[Spawns or reuses the background polling task. Credentials are read in-place by…]] - rationale - backend/app/services/telegram_vault.py
- [[SystemSetting]] - code - backend/app/db/models.py
- [[TelegramVaultService]] - code - backend/app/services/telegram_vault.py
- [[Validates bot credentials with Telegram API and sends a confirmation test…]] - rationale - backend/app/services/telegram_vault.py
- [[models.py]] - code - backend/app/db/models.py
- [[mqtt_service.py]] - code - backend/app/services/mqtt_service.py
- [[telegram_vault.py]] - code - backend/app/services/telegram_vault.py

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/useSentinelaStore
SORT file.name ASC
```

## Connections to other communities
- 8 edges to [[_COMMUNITY_asyncio]]
- 7 edges to [[_COMMUNITY_events.py]]
- 4 edges to [[_COMMUNITY_cameras.py]]
- 2 edges to [[_COMMUNITY_OverlayService]]
- 1 edge to [[_COMMUNITY_sentinela-pro-mobile-nvrsrcApp.tsx]]

## Top bridge nodes
- [[models.py]] - degree 5, connects to 3 communities
- [[Base]] - degree 5, connects to 3 communities
- [[EventRecord]] - degree 12, connects to 2 communities
- [[mqtt_service.py]] - degree 5, connects to 2 communities
- [[MQTTService]] - degree 15, connects to 1 community