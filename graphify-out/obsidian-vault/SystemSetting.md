---
source_file: "backend/app/db/models.py"
type: "code"
community: "settings.py"
location: "L84"
tags:
  - graphify/code
  - graphify/INFERRED
  - community/settingspy
---

# SystemSetting

## Connections
- [[dot-load_credentials_from_db()]] - `calls` [EXTRACTED]
- [[Base]] - `inherits` [EXTRACTED]
- [[MQTTService]] - `uses` [INFERRED]
- [[TelegramVaultService]] - `uses` [INFERRED]
- [[get_dnd_settings()]] - `uses` [INFERRED]
- [[get_settings()]] - `uses` [INFERRED]
- [[models.py]] - `contains` [EXTRACTED]
- [[mqtt_service.py]] - `imports` [EXTRACTED]
- [[settings.py]] - `imports` [EXTRACTED]
- [[telegram_vault.py]] - `imports` [EXTRACTED]
- [[test_telegram_video()]] - `uses` [INFERRED]
- [[update_dnd_settings()]] - `uses` [INFERRED]
- [[update_telegram_config()]] - `uses` [INFERRED]

#graphify/code #graphify/INFERRED #community/settingspy