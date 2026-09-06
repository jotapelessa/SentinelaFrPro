---
source_file: "backend/app/db/models.py"
type: "code"
community: "OverlayService"
location: "L53"
tags:
  - graphify/code
  - graphify/INFERRED
  - community/OverlayService
---

# PairedDevice

## Connections
- [[Base]] - `inherits` [EXTRACTED]
- [[PiPGatewayService]] - `uses` [INFERRED]
- [[check_devices_health()]] - `uses` [INFERRED]
- [[cleanup_all_devices()]] - `uses` [INFERRED]
- [[deduplicate_devices()]] - `uses` [INFERRED]
- [[delete_device()]] - `uses` [INFERRED]
- [[device_diagnostics()]] - `uses` [INFERRED]
- [[device_heartbeat()]] - `uses` [INFERRED]
- [[devices.py]] - `imports` [EXTRACTED]
- [[execute_batch_test()]] - `uses` [INFERRED]
- [[export_backup()]] - `uses` [INFERRED]
- [[get_device_permitted_cameras()]] - `uses` [INFERRED]
- [[get_device_policy()]] - `uses` [INFERRED]
- [[list_devices()]] - `uses` [INFERRED]
- [[models.py]] - `contains` [EXTRACTED]
- [[pip_gateway.py]] - `imports` [EXTRACTED]
- [[register_device()]] - `uses` [INFERRED]
- [[remote_reboot_server()]] - `uses` [INFERRED]
- [[remote_restart_container()]] - `uses` [INFERRED]
- [[settings.py]] - `imports` [EXTRACTED]
- [[toggle_device_master()]] - `uses` [INFERRED]
- [[toggle_device_pip()]] - `uses` [INFERRED]
- [[update_device_allowed_cameras()]] - `uses` [INFERRED]
- [[update_device_permissions()]] - `uses` [INFERRED]
- [[update_device_status()]] - `uses` [INFERRED]

#graphify/code #graphify/INFERRED #community/OverlayService