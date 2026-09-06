---
type: community
cohesion: 0.13
members: 22
---

# FrigateBridgeService

**Cohesion:** 0.13 - loosely connected
**Members:** 22 nodes

## Members
- [[dot-__init__()_2]] - code - backend/app/services/frigate_bridge.py
- [[dot-_has_audio_stream()]] - code - backend/app/services/frigate_bridge.py
- [[dot-_probe_video_info()]] - code - backend/app/services/frigate_bridge.py
- [[dot-check_connectivity()]] - code - backend/app/services/frigate_bridge.py
- [[dot-get_connectivity_logs()]] - code - backend/app/services/frigate_bridge.py
- [[dot-get_live_snapshot()]] - code - backend/app/services/frigate_bridge.py
- [[dot-get_video_duration()]] - code - backend/app/services/frigate_bridge.py
- [[dot-has_video_stream()]] - code - backend/app/services/frigate_bridge.py
- [[dot-log_probe()]] - code - backend/app/services/frigate_bridge.py
- [[dot-record_live_video()]] - code - backend/app/services/frigate_bridge.py
- [[dot-transcode_to_30fps()]] - code - backend/app/services/frigate_bridge.py
- [[Accurately extracts real playback duration of video_bytes using ffprobe in ~2ms.]] - rationale - backend/app/services/frigate_bridge.py
- [[Any_3]] - code
- [[Captures a live video clip directly from the camera stream with constant 30…]] - rationale - backend/app/services/frigate_bridge.py
- [[Checks whether the file contains an audio stream.]] - rationale - backend/app/services/frigate_bridge.py
- [[FrigateBridgeService]] - code - backend/app/services/frigate_bridge.py
- [[Performs deep health check of all Frigate & go2rtc communication channels with…]] - rationale - backend/app/services/frigate_bridge.py
- [[Probes average frame rate, duration, width and height of a video file.]] - rationale - backend/app/services/frigate_bridge.py
- [[Retrieves a live JPEG frame at nativemain-stream resolution using a multi-…]] - rationale - backend/app/services/frigate_bridge.py
- [[Robust H.264AAC constant-frame-rate preparation for Telegram & mobile…]] - rationale - backend/app/services/frigate_bridge.py
- [[Verifies with ffprobe that the MP4 contains at least one valid video stream and…]] - rationale - backend/app/services/frigate_bridge.py
- [[frigate_bridge.py]] - code - backend/app/services/frigate_bridge.py

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/FrigateBridgeService
SORT file.name ASC
```

## Connections to other communities
- 1 edge to [[_COMMUNITY_events.py]]

## Top bridge nodes
- [[frigate_bridge.py]] - degree 2, connects to 1 community