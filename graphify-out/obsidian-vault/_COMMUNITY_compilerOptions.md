---
type: community
cohesion: 0.10
members: 33
---

# compilerOptions

**Cohesion:** 0.10 - loosely connected
**Members:** 33 nodes

## Members
- [[dot-__init__()_1]] - code - backend/app/services/telegram_vault.py
- [[dot-apply_watermark()]] - code - backend/app/services/telegram_vault.py
- [[dot-format_event_message()]] - code - backend/app/services/telegram_vault.py
- [[dot-get_audit_logs()]] - code - backend/app/services/telegram_vault.py
- [[dot-get_system_status_text()]] - code - backend/app/services/telegram_vault.py
- [[dot-handle_command()]] - code - backend/app/services/telegram_vault.py
- [[dot-is_configured()]] - code - backend/app/services/telegram_vault.py
- [[dot-is_paused()]] - code - backend/app/services/telegram_vault.py
- [[dot-load_credentials_from_db()]] - code - backend/app/services/telegram_vault.py
- [[dot-pause_alerts()]] - code - backend/app/services/telegram_vault.py
- [[dot-record_audit()]] - code - backend/app/services/telegram_vault.py
- [[dot-send_alert_photo()]] - code - backend/app/services/telegram_vault.py
- [[dot-send_alert_video()]] - code - backend/app/services/telegram_vault.py
- [[dot-send_document()]] - code - backend/app/services/telegram_vault.py
- [[dot-send_message()]] - code - backend/app/services/telegram_vault.py
- [[dot-start_polling()]] - code - backend/app/services/telegram_vault.py
- [[dot-start_polling_task()]] - code - backend/app/services/telegram_vault.py
- [[dot-test_connection()]] - code - backend/app/services/telegram_vault.py
- [[Any_1]] - code
- [[Appends an event to the in-memory Telegram audit trail.]] - rationale - backend/app/services/telegram_vault.py
- [[Applies a professional HUD watermark on the snapshot with dynamic scaling for…]] - rationale - backend/app/services/telegram_vault.py
- [[Continuous lightweight long-polling loop for Telegram Bot updates.]] - rationale - backend/app/services/telegram_vault.py
- [[Dispatches MP4 clip to Telegram using the classic template.]] - rationale - backend/app/services/telegram_vault.py
- [[Dispatches watermarked snapshot to Telegram using the classic template.]] - rationale - backend/app/services/telegram_vault.py
- [[Formats real-time telemetry into a rich Telegram status message.]] - rationale - backend/app/services/telegram_vault.py
- [[Loads Bot Token and Chat ID from database if available, or seeds defaults.]] - rationale - backend/app/services/telegram_vault.py
- [[Processes interactive bot commands received via Telegram chat.]] - rationale - backend/app/services/telegram_vault.py
- [[Sends a document (e.g. database backup) to Telegram.]] - rationale - backend/app/services/telegram_vault.py
- [[Sends a text message to the configured Telegram chat.]] - rationale - backend/app/services/telegram_vault.py
- [[Spawns or reuses the background polling task. Credentials are read in-place by…]] - rationale - backend/app/services/telegram_vault.py
- [[TelegramVaultService]] - code - backend/app/services/telegram_vault.py
- [[Validates bot credentials with Telegram API and sends a confirmation test…]] - rationale - backend/app/services/telegram_vault.py
- [[telegram_vault.py]] - code - backend/app/services/telegram_vault.py

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/compilerOptions
SORT file.name ASC
```

## Connections to other communities
- 3 edges to [[_COMMUNITY_settings.py]]

## Top bridge nodes
- [[TelegramVaultService]] - degree 20, connects to 1 community
- [[dot-load_credentials_from_db()]] - degree 9, connects to 1 community
- [[telegram_vault.py]] - degree 2, connects to 1 community