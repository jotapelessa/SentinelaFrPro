---
type: community
cohesion: 0.10
members: 41
---

# asyncio

**Cohesion:** 0.10 - loosely connected
**Members:** 41 nodes

## Members
- [[AsyncSession_4]] - code
- [[BaseModel_5]] - code
- [[Cleans old non-retained recordings andor snapshots from Ubuntu Server SSD…]] - rationale - backend/app/api/settings.py
- [[DNDConfigUpdate]] - code - backend/app/api/settings.py
- [[Deletes Frigate clipssnapshots files older than cutoff (by mtime) under clips.]] - rationale - backend/app/api/settings.py
- [[Deletes Frigate recording segment folders older than cutoff under…]] - rationale - backend/app/api/settings.py
- [[Dispatches the database sentinela.db directly to the configured Telegram chat.]] - rationale - backend/app/api/settings.py
- [[PauseAlertsRequest]] - code - backend/app/api/settings.py
- [[Request_4]] - code
- [[Returns a directory tree size in bytes, cached for ttl_seconds to avoid heavy…]] - rationale - backend/app/api/settings.py
- [[Returns real-time Ubuntu Server NVMe SSD storage status, breakdown and…]] - rationale - backend/app/api/settings.py
- [[Returns the sentinela.db SQLite binary file directly as a download.]] - rationale - backend/app/api/settings.py
- [[StorageCleanRequest]] - code - backend/app/api/settings.py
- [[Sums the byte size of all files under a directory tree.]] - rationale - backend/app/api/settings.py
- [[TelegramConfigUpdate]] - code - backend/app/api/settings.py
- [[TelegramTestPayload]] - code - backend/app/api/settings.py
- [[TelegramVideoTestPayload]] - code - backend/app/api/settings.py
- [[ZoneUpdate]] - code - backend/app/api/settings.py
- [[_cached_dir_size()]] - code - backend/app/api/settings.py
- [[_dir_size_bytes()]] - code - backend/app/api/settings.py
- [[_purge_clips()]] - code - backend/app/api/settings.py
- [[_purge_recordings()]] - code - backend/app/api/settings.py
- [[clean_server_storage()]] - code - backend/app/api/settings.py
- [[dispatch_backup_to_telegram()]] - code - backend/app/api/settings.py
- [[download_database_file()]] - code - backend/app/api/settings.py
- [[export_backup()]] - code - backend/app/api/settings.py
- [[get_5]] - code
- [[get_dnd_settings()]] - code - backend/app/api/settings.py
- [[get_settings()]] - code - backend/app/api/settings.py
- [[get_storage_status()]] - code - backend/app/api/settings.py
- [[pause_alerts()]] - code - backend/app/api/settings.py
- [[post_5]] - code
- [[resume_alerts()]] - code - backend/app/api/settings.py
- [[settings.py]] - code - backend/app/api/settings.py
- [[test_telegram_alert()]] - code - backend/app/api/settings.py
- [[test_telegram_logs()]] - code - backend/app/api/settings.py
- [[test_telegram_photo()]] - code - backend/app/api/settings.py
- [[test_telegram_status()]] - code - backend/app/api/settings.py
- [[test_telegram_video()]] - code - backend/app/api/settings.py
- [[update_dnd_settings()]] - code - backend/app/api/settings.py
- [[update_telegram_config()]] - code - backend/app/api/settings.py

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/asyncio
SORT file.name ASC
```

## Connections to other communities
- 8 edges to [[_COMMUNITY_useSentinelaStore]]
- 2 edges to [[_COMMUNITY_OverlayService]]
- 2 edges to [[_COMMUNITY_cameras.py]]
- 2 edges to [[_COMMUNITY_apitelemetry.py]]

## Top bridge nodes
- [[settings.py]] - degree 33, connects to 4 communities
- [[export_backup()]] - degree 5, connects to 2 communities
- [[clean_server_storage()]] - degree 9, connects to 1 community
- [[test_telegram_video()]] - degree 6, connects to 1 community
- [[update_telegram_config()]] - degree 6, connects to 1 community