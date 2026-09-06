---
source_file: "backend/app/db/models.py"
type: "code"
community: "events.py"
location: "L5"
tags:
  - graphify/code
  - graphify/INFERRED
  - community/eventspy
---

# Camera

## Connections
- [[Base]] - `inherits` [EXTRACTED]
- [[MQTTService]] - `uses` [INFERRED]
- [[PiPGatewayService]] - `uses` [INFERRED]
- [[_resolve_active_test_camera()]] - `uses` [INFERRED]
- [[add_camera()]] - `uses` [INFERRED]
- [[cameras.py]] - `imports` [EXTRACTED]
- [[delete_camera()]] - `uses` [INFERRED]
- [[devices.py]] - `imports` [EXTRACTED]
- [[export_backup()]] - `uses` [INFERRED]
- [[get_camera_diagnostics()]] - `uses` [INFERRED]
- [[get_camera_stream_info()]] - `uses` [INFERRED]
- [[get_device_permitted_cameras()]] - `uses` [INFERRED]
- [[get_frigate_camera_zones()]] - `uses` [INFERRED]
- [[list_cameras()]] - `uses` [INFERRED]
- [[models.py]] - `contains` [EXTRACTED]
- [[mqtt_service.py]] - `imports` [EXTRACTED]
- [[pause_camera()]] - `uses` [INFERRED]
- [[pip_gateway.py]] - `imports` [EXTRACTED]
- [[resume_camera()]] - `uses` [INFERRED]
- [[save_frigate_camera_zones()]] - `uses` [INFERRED]
- [[settings.py]] - `imports` [EXTRACTED]
- [[sync_camera_to_frigate()]] - `uses` [INFERRED]
- [[sync_cameras_from_frigate()]] - `uses` [INFERRED]
- [[toggle_camera_fallback()]] - `uses` [INFERRED]
- [[toggle_camera_pause()]] - `uses` [INFERRED]
- [[update_camera()]] - `uses` [INFERRED]

#graphify/code #graphify/INFERRED #community/eventspy