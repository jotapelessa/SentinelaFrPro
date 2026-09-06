---
type: community
cohesion: 0.09
members: 57
---

# devices.py

**Cohesion:** 0.09 - loosely connected
**Members:** 57 nodes

## Members
- [[AsyncSession_1]] - code
- [[Automatic heartbeat & registration from Android TV and Smartphone apps.]] - rationale - backend/app/api/devices.py
- [[BaseModel_1]] - code
- [[BatchTestRequest]] - code - backend/app/api/devices.py
- [[Checks real-time onlinereachable status for all paired screens. Optimized O(1)…]] - rationale - backend/app/api/devices.py
- [[Consolidates duplicate devices with identical IP or Model, retaining the most…]] - rationale - backend/app/api/devices.py
- [[DeviceAllowedCamerasUpdate]] - code - backend/app/api/devices.py
- [[DeviceCreate]] - code - backend/app/api/devices.py
- [[DeviceHeartbeat]] - code - backend/app/api/devices.py
- [[DevicePermissionsUpdate]] - code - backend/app/api/devices.py
- [[DeviceStatusUpdate]] - code - backend/app/api/devices.py
- [[Executes batch tests across multiple or all devices simultaneously.]] - rationale - backend/app/api/devices.py
- [[MasterToggleRequest]] - code - backend/app/api/devices.py
- [[PairedDevice_1]] - code - backend/app/db/models.py
- [[PipAckRequest]] - code - backend/app/api/devices.py
- [[Quickly toggle PiP alerts state for a single device with 1-click.]] - rationale - backend/app/api/devices.py
- [[Receives physical execution confirmation from the Android TV overlay service.]] - rationale - backend/app/api/devices.py
- [[Removes all paired devices so fresh real devices can register via heartbeat.]] - rationale - backend/app/api/devices.py
- [[Request_1]] - code
- [[RestartContainerRequest]] - code - backend/app/api/devices.py
- [[Returns the full granular policy and permissions for a specific device.]] - rationale - backend/app/api/devices.py
- [[Returns the list of cameras permitted for a specific screendevice.]] - rationale - backend/app/api/devices.py
- [[Scans LAN subnet for Smart TVs and Chromecast devices.]] - rationale - backend/app/api/devices.py
- [[TestPiPRequest]] - code - backend/app/api/devices.py
- [[TestSingleDeviceRequest]] - code - backend/app/api/devices.py
- [[Toggles Master Admin rights for a smartphone device with debounce and…]] - rationale - backend/app/api/devices.py
- [[Triggers a broadcast PiP test to all active TVs.]] - rationale - backend/app/api/devices.py
- [[Triggers an interactive PiP test to this single TV with the selected camera.]] - rationale - backend/app/api/devices.py
- [[Updates complete granular permissions for a paired screendevice.]] - rationale - backend/app/api/devices.py
- [[check_devices_health()]] - code - backend/app/api/devices.py
- [[cleanup_all_devices()]] - code - backend/app/api/devices.py
- [[deduplicate_devices()]] - code - backend/app/api/devices.py
- [[delete_1]] - code
- [[delete_device()]] - code - backend/app/api/devices.py
- [[device_diagnostics()]] - code - backend/app/api/devices.py
- [[device_heartbeat()]] - code - backend/app/api/devices.py
- [[devices.py]] - code - backend/app/api/devices.py
- [[discover_tvs()]] - code - backend/app/api/devices.py
- [[execute_batch_test()]] - code - backend/app/api/devices.py
- [[get_1]] - code
- [[get_device_permitted_cameras()]] - code - backend/app/api/devices.py
- [[get_device_policy()]] - code - backend/app/api/devices.py
- [[list_devices()]] - code - backend/app/api/devices.py
- [[patch]] - code
- [[post_1]] - code
- [[put]] - code
- [[receive_pip_ack()]] - code - backend/app/api/devices.py
- [[register_device()]] - code - backend/app/api/devices.py
- [[remote_reboot_server()]] - code - backend/app/api/devices.py
- [[remote_restart_container()]] - code - backend/app/api/devices.py
- [[test_pip()]] - code - backend/app/api/devices.py
- [[test_single_device()]] - code - backend/app/api/devices.py
- [[toggle_device_master()]] - code - backend/app/api/devices.py
- [[toggle_device_pip()]] - code - backend/app/api/devices.py
- [[update_device_allowed_cameras()]] - code - backend/app/api/devices.py
- [[update_device_permissions()]] - code - backend/app/api/devices.py
- [[update_device_status()]] - code - backend/app/api/devices.py

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/devicespy
SORT file.name ASC
```

## Connections to other communities
- 8 edges to [[_COMMUNITY_SentinelaRepository]]
- 7 edges to [[_COMMUNITY_events.py]]
- 2 edges to [[_COMMUNITY_settings.py]]
- 2 edges to [[_COMMUNITY_asyncio]]
- 2 edges to [[_COMMUNITY_SeamlessCameraImage]]
- 1 edge to [[_COMMUNITY_OverlayService]]

## Top bridge nodes
- [[PairedDevice_1]] - degree 25, connects to 3 communities
- [[devices.py]] - degree 39, connects to 2 communities
- [[put]] - degree 11, connects to 2 communities
- [[get_device_permitted_cameras()]] - degree 6, connects to 1 community
- [[device_diagnostics()]] - degree 5, connects to 1 community