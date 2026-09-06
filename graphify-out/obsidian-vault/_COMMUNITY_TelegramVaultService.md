---
type: community
cohesion: 0.13
members: 23
---

# TelegramVaultService

**Cohesion:** 0.13 - loosely connected
**Members:** 23 nodes

## Members
- [[dot-discover_onvif_devices()]] - code - backend/app/services/scanner_service.py
- [[dot-discover_smart_tvs()]] - code - backend/app/services/scanner_service.py
- [[dot-get_local_subnets()]] - code - backend/app/services/scanner_service.py
- [[dot-get_self_ips()]] - code - backend/app/services/scanner_service.py
- [[dot-identify_camera_profile()]] - code - backend/app/services/scanner_service.py
- [[dot-probe_onvif_device_info()]] - code - backend/app/services/scanner_service.py
- [[dot-run_full_scan()]] - code - backend/app/services/scanner_service.py
- [[dot-scan_port()]] - code - backend/app/services/scanner_service.py
- [[dot-scan_subnet_cctv_ports()]] - code - backend/app/services/scanner_service.py
- [[dot-verify_rtsp_stream()]] - code - backend/app/services/scanner_service.py
- [[Any_2]] - code
- [[Classifies camera hardware, identifying AITEK SEG6050BP (Guangdong Pineng…]] - rationale - backend/app/services/scanner_service.py
- [[Collects all IP addresses belonging to the host itself so they are not detected…]] - rationale - backend/app/services/scanner_service.py
- [[Concurrently scans CCTV ports with semaphore control, ONVIF SOAP inspection,…]] - rationale - backend/app/services/scanner_service.py
- [[Discovers all local subnets, prioritizing physical LAN interfaces.]] - rationale - backend/app/services/scanner_service.py
- [[Queries ONVIF SOAP GetDeviceInformation to retrieve real hardware metadata…]] - rationale - backend/app/services/scanner_service.py
- [[Runs comprehensive multi-probe scan discovering ONVIF and RTSP CCTV devices.]] - rationale - backend/app/services/scanner_service.py
- [[ScannerService]] - code - backend/app/services/scanner_service.py
- [[Scans the local network for Smart TVs (Google Cast, TCL, Samsung, LG, Android…]] - rationale - backend/app/services/scanner_service.py
- [[Sends authentic RTSP OPTIONS  DESCRIBE probes to verify real video stream…]] - rationale - backend/app/services/scanner_service.py
- [[Sends hybrid WS-Discovery UDP probes on port 3702 to all subnets (wildcard +…]] - rationale - backend/app/services/scanner_service.py
- [[Tries to connect to a specific port on an IP address.]] - rationale - backend/app/services/scanner_service.py
- [[scanner_service.py]] - code - backend/app/services/scanner_service.py

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/TelegramVaultService
SORT file.name ASC
```

## Connections to other communities
- 1 edge to [[_COMMUNITY_TvNetflixScreen.kt]]

## Top bridge nodes
- [[scanner_service.py]] - degree 2, connects to 1 community