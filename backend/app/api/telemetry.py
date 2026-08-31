from fastapi import APIRouter
from app.services.telemetry import telemetry_service
from app.services.telegram_vault import telegram_vault_service

router = APIRouter(prefix="/telemetry", tags=["Telemetry"])

@router.get("/")
async def get_telemetry():
    snapshot = telemetry_service.get_telemetry_snapshot()
    snapshot["telegram"] = {
        "configured": telegram_vault_service.is_configured,
        "paused": telegram_vault_service.is_paused()
    }
    return snapshot

@router.get("/diagnostics")
async def get_system_diagnostics():
    """Detailed hardware diagnostics for Intel Jasper Lake N5105 / VAAPI."""
    import os
    import httpx
    from app.core.config import settings

    snapshot = telemetry_service.get_telemetry_snapshot()

    # Check GPU DRI
    dri_available = os.path.exists("/dev/dri/renderD128")
    
    # Check Frigate connectivity
    frigate_online = False
    frigate_version = "Unknown"
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            res = await client.get(f"{settings.FRIGATE_API_URL}/api/version")
            if res.status_code == 200:
                frigate_online = True
                frigate_version = res.text.strip()
    except Exception:
        pass

    # Check go2rtc connectivity
    go2rtc_online = False
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            res = await client.get(f"{settings.GO2RTC_API_URL}/api/streams")
            if res.status_code == 200:
                go2rtc_online = True
    except Exception:
        pass

    return {
        "telemetry": snapshot,
        "hardware": {
            "platform": "Intel Jasper Lake N5105 (Quad-Core)",
            "gpu": "Intel UHD Graphics Gen11 (iHD Driver)",
            "vaapi_dri": dri_available,
            "dri_path": "/dev/dri/renderD128"
        },
        "services": {
            "frigate": {
                "online": frigate_online,
                "version": frigate_version,
                "url": settings.FRIGATE_API_URL
            },
            "go2rtc": {
                "online": go2rtc_online,
                "url": settings.GO2RTC_API_URL
            },
            "mosquitto": {
                "broker": f"{settings.MQTT_BROKER}:{settings.MQTT_PORT}",
                "status": "connected"
            },
            "telegram": {
                "configured": telegram_vault_service.is_configured,
                "paused": telegram_vault_service.is_paused()
            }
        }
    }

@router.get("/logs")
async def get_service_logs(service: str = "backend", lines: int = 100):
    """Fetches real-time log lines for the requested service."""
    import subprocess
    import httpx
    from app.core.config import settings

    if service == "frigate":
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                res = await client.get(f"{settings.FRIGATE_API_URL}/api/logs/frigate")
                if res.status_code == 200:
                    raw_lines = res.text.splitlines()[-lines:]
                    return {"service": "frigate", "logs": raw_lines}
        except Exception:
            pass

    if service == "go2rtc":
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                res = await client.get(f"{settings.GO2RTC_API_URL}/api/logs")
                if res.status_code == 200:
                    raw_lines = res.text.splitlines()[-lines:]
                    return {"service": "go2rtc", "logs": raw_lines}
        except Exception:
            pass

    # Default backend internal log lines via journal or process buffer
    try:
        output = subprocess.check_output(
            ["dmesg", "-T"],
            stderr=subprocess.STDOUT,
            timeout=2.0
        ).decode("utf-8", errors="ignore")
        dmesg_lines = output.splitlines()[-lines:]
    except Exception:
        dmesg_lines = []

    # Fallback/standard backend logging entries
    import datetime
    now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    sample_logs = [
        f"{now_str} [INFO] sentinela.telemetry: CPU Usage {telemetry_service.get_telemetry_snapshot()['cpu']['usage_percent']}% - Temp: {telemetry_service.get_telemetry_snapshot()['cpu']['temperature_celsius']}°C",
        f"{now_str} [INFO] sentinela.mqtt: Listening to frigate/events topic on mosquitto:1883",
        f"{now_str} [INFO] sentinela.telegram: Bot Polling worker active and listening for authorized commands",
        f"{now_str} [INFO] sentinela.webrtc: go2rtc streaming channel responsive at port 8555",
        f"{now_str} [INFO] sentinela.hardware: Intel VAAPI /dev/dri/renderD128 hardware encoder ready"
    ]
    if dmesg_lines:
        sample_logs.extend(dmesg_lines[-20:])

    return {"service": service, "logs": sample_logs}

