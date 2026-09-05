import yaml

path = "/home/jotape/ServONVIF2/SentinelaFrPro/frigate/config/config.yml"
with open(path, "r") as f:
    cfg = yaml.safe_load(f) or {}

# B: wallclock timestamps no input de RECORD da camera_principal (timestamps corrompidos)
cam = cfg.get("cameras", {}).get("camera_principal", {})
inputs = cam.get("ffmpeg", {}).get("inputs", [])
for inp in inputs:
    roles = inp.get("roles", []) or []
    if "record" in roles:
        inp["input_args"] = "-rtsp_transport tcp -re -fflags +genpts+discardcorrupt -use_wallclock_as_timestamps 1"

# C: cadastro da camera_secundaria (192.168.1.136)
cfg.setdefault("go2rtc", {}).setdefault("streams", {})["camera_secundaria"] = ["rtsp://192.168.1.136:8554/stream"]
cameras = cfg.setdefault("cameras", {})
cameras["camera_secundaria"] = {
    "enabled": True,
    "ffmpeg": {
        "inputs": [
            {"path": "rtsp://127.0.0.1:8554/camera_secundaria", "input_args": "preset-rtsp-restream", "roles": ["record"]},
            {"path": "rtsp://127.0.0.1:8554/camera_secundaria", "input_args": "preset-rtsp-restream", "roles": ["detect"]},
        ]
    },
    "detect": {"enabled": True, "width": 640, "height": 360, "fps": 5},
    "record": {
        "enabled": True,
        "continuous": {"days": 0},
        "motion": {"days": 3},
        "alerts": {"pre_capture": 10, "post_capture": 10, "retain": {"days": 14, "mode": "active_objects"}},
        "detections": {"pre_capture": 10, "post_capture": 10, "retain": {"days": 14, "mode": "active_objects"}},
    },
    "snapshots": {"enabled": True, "bounding_box": True},
    "review": {
        "alerts": {"labels": ["person", "car", "motorcycle", "bus", "dog", "cat", "bicycle"], "required_zones": []},
        "detections": {"labels": ["person", "car", "motorcycle", "bus", "dog", "cat", "bicycle"], "required_zones": []},
    },
}

with open(path, "w") as f:
    yaml.dump(cfg, f, default_flow_style=False, sort_keys=False, allow_unicode=True, width=1000)

print("APPLIED_B_C")
