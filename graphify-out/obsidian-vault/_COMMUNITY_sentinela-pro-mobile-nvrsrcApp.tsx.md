---
type: community
cohesion: 0.06
members: 43
---

# sentinela-pro-mobile-nvr/src/App.tsx

**Cohesion:** 0.06 - loosely connected
**Members:** 43 nodes

## Members
- [[dot-__init__()_5]] - code - backend/app/api/ws.py
- [[dot-__init__()_4]] - code - backend/app/services/frigate_bridge.py
- [[dot-_has_audio_stream()]] - code - backend/app/services/frigate_bridge.py
- [[dot-_probe_video_info()]] - code - backend/app/services/frigate_bridge.py
- [[dot-broadcast_json()]] - code - backend/app/api/ws.py
- [[dot-check_connectivity()]] - code - backend/app/services/frigate_bridge.py
- [[dot-connect()]] - code - backend/app/api/ws.py
- [[dot-disconnect()]] - code - backend/app/api/ws.py
- [[dot-get_connectivity_logs()]] - code - backend/app/services/frigate_bridge.py
- [[dot-get_live_snapshot()]] - code - backend/app/services/frigate_bridge.py
- [[dot-get_video_duration()]] - code - backend/app/services/frigate_bridge.py
- [[dot-has_video_stream()]] - code - backend/app/services/frigate_bridge.py
- [[dot-log_probe()]] - code - backend/app/services/frigate_bridge.py
- [[dot-record_live_video()]] - code - backend/app/services/frigate_bridge.py
- [[dot-transcode_to_30fps()]] - code - backend/app/services/frigate_bridge.py
- [[Accurately extracts real playback duration of video_bytes using ffprobe in ~2ms.]] - rationale - backend/app/services/frigate_bridge.py
- [[Any_6]] - code
- [[Background loop sending hardware telemetry every 5.0 seconds to connected UI…]] - rationale - backend/app/api/ws.py
- [[Captures a live video clip directly from the camera stream with constant 30…]] - rationale - backend/app/services/frigate_bridge.py
- [[Checks whether the file contains an audio stream.]] - rationale - backend/app/services/frigate_bridge.py
- [[FrigateBridgeService]] - code - backend/app/services/frigate_bridge.py
- [[Performs deep health check of all Frigate & go2rtc communication channels with…]] - rationale - backend/app/services/frigate_bridge.py
- [[Probes average frame rate, duration, width and height of a video file.]] - rationale - backend/app/services/frigate_bridge.py
- [[Publishes a mock Frigate security event to Mosquitto MQTT.]] - rationale - backend/app/mocks/mock_publisher.py
- [[Retrieves a live JPEG frame at nativemain-stream resolution using a multi-…]] - rationale - backend/app/services/frigate_bridge.py
- [[Robust H.264AAC constant-frame-rate preparation for Telegram & mobile…]] - rationale - backend/app/services/frigate_bridge.py
- [[Verifies with ffprobe that the MP4 contains at least one valid video stream and…]] - rationale - backend/app/services/frigate_bridge.py
- [[WebSocket]] - code
- [[WebSocketManager]] - code - backend/app/api/ws.py
- [[asyncio]] - code
- [[frigate_bridge.py]] - code - backend/app/services/frigate_bridge.py
- [[mock_publisher.py]] - code - backend/app/mocks/mock_publisher.py
- [[publish_simulated_event()]] - code - backend/app/mocks/mock_publisher.py
- [[telemetry_broadcast_loop()]] - code - backend/app/api/ws.py
- [[test_backend.py]] - code - backend/tests/test_backend.py
- [[test_pip_dnd_check()]] - code - backend/tests/test_backend.py
- [[test_scanner_subnets()]] - code - backend/tests/test_backend.py
- [[test_telemetry_service()]] - code - backend/tests/test_backend.py
- [[test_watermark_generation()]] - code - backend/tests/test_backend.py
- [[verify_system()]] - code - verify_system.py
- [[verify_system.py]] - code - verify_system.py
- [[websocket_endpoint()]] - code - backend/app/api/ws.py
- [[ws.py]] - code - backend/app/api/ws.py

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/sentinela-pro-mobile-nvr/src/Apptsx
SORT file.name ASC
```

## Connections to other communities
- 2 edges to [[_COMMUNITY_apitelemetry.py]]
- 1 edge to [[_COMMUNITY_OverlayService]]
- 1 edge to [[_COMMUNITY_events.py]]
- 1 edge to [[_COMMUNITY_compilerOptions_2]]
- 1 edge to [[_COMMUNITY_useSentinelaStore]]
- 1 edge to [[_COMMUNITY_MseCameraView]]

## Top bridge nodes
- [[asyncio]] - degree 15, connects to 6 communities
- [[ws.py]] - degree 5, connects to 1 community