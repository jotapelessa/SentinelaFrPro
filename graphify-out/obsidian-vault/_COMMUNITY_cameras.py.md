---
type: community
cohesion: 0.10
members: 48
---

# cameras.py

**Cohesion:** 0.10 - loosely connected
**Members:** 48 nodes

## Members
- [[Aggregates real-time Frigate stats, go2rtc stream health, filtered…]] - rationale - backend/app/api/cameras.py
- [[Any_6]] - code
- [[AsyncSession_2]] - code
- [[BaseModel_4]] - code
- [[Camera_2]] - code
- [[CameraCreate]] - code - backend/app/api/cameras.py
- [[CameraUpdate]] - code - backend/app/api/cameras.py
- [[Deep synchronization Reads all active cameras from Frigate NVR API and creates…]] - rationale - backend/app/api/cameras.py
- [[Explicitly pauses camera and disables ffmpeg in Frigate.]] - rationale - backend/app/api/cameras.py
- [[Explicitly resumes camera and starts ffmpeg in Frigate.]] - rationale - backend/app/api/cameras.py
- [[FrigateZonesPayload]] - code - backend/app/api/cameras.py
- [[Infers the low-bandwidth  IA detection sub-stream from the main RTSP URL to…]] - rationale - backend/app/api/cameras.py
- [[Parses various Frigate coordinate representations into normalized {x 0..1, y…]] - rationale - backend/app/api/cameras.py
- [[Probes an RTSP stream via ffprobe and returns codec, resolution and frame rate.]] - rationale - backend/app/api/cameras.py
- [[Probes the camera's main and sub RTSP streams and returns their codec,…]] - rationale - backend/app/api/cameras.py
- [[Request_3]] - code
- [[RtspTestPayload]] - code - backend/app/api/cameras.py
- [[Sanitizes Frigate 0.17 configuration to strictly satisfy Pydantic models.…]] - rationale - backend/app/api/cameras.py
- [[Tests TCP connectivity to the camera's RTSP endpoint with predictive port…]] - rationale - backend/app/api/cameras.py
- [[Toggles camera activity state (Pause  Resume  Standby). When paused…]] - rationale - backend/app/api/cameras.py
- [[Toggles virtual SMPTE test pattern stream vs real RTSP stream in Frigate…]] - rationale - backend/app/api/cameras.py
- [[Unified Camera Provider Returns all cameras with sub-3ms response time through…]] - rationale - backend/app/api/cameras.py
- [[_probe_rtsp_stream_info()]] - code - backend/app/api/cameras.py
- [[add_camera()]] - code - backend/app/api/cameras.py
- [[cameras.py]] - code - backend/app/api/cameras.py
- [[delete_2]] - code
- [[delete_camera()]] - code - backend/app/api/cameras.py
- [[get_4]] - code
- [[get_camera_diagnostics()]] - code - backend/app/api/cameras.py
- [[get_camera_stream_info()]] - code - backend/app/api/cameras.py
- [[get_frigate_camera_zones()]] - code - backend/app/api/cameras.py
- [[get_frigate_config_path()]] - code - backend/app/api/cameras.py
- [[infer_substream_url()]] - code - backend/app/api/cameras.py
- [[list_cameras()]] - code - backend/app/api/cameras.py
- [[parse_frigate_coordinates()]] - code - backend/app/api/cameras.py
- [[patch_1]] - code
- [[pause_camera()]] - code - backend/app/api/cameras.py
- [[post_4]] - code
- [[remove_camera_from_frigate()]] - code - backend/app/api/cameras.py
- [[resume_camera()]] - code - backend/app/api/cameras.py
- [[sanitize_frigate_config()]] - code - backend/app/api/cameras.py
- [[save_frigate_camera_zones()]] - code - backend/app/api/cameras.py
- [[sync_camera_to_frigate()]] - code - backend/app/api/cameras.py
- [[sync_cameras_from_frigate()]] - code - backend/app/api/cameras.py
- [[test_rtsp_connection()]] - code - backend/app/api/cameras.py
- [[toggle_camera_fallback()]] - code - backend/app/api/cameras.py
- [[toggle_camera_pause()]] - code - backend/app/api/cameras.py
- [[update_camera()]] - code - backend/app/api/cameras.py

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/cameraspy
SORT file.name ASC
```

## Connections to other communities
- 1 edge to [[_COMMUNITY_manifest.json]]

## Top bridge nodes
- [[cameras.py]] - degree 26, connects to 1 community