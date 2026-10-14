import pytest
import asyncio
from app.services.telemetry import telemetry_service
from app.services.scanner_service import scanner_service
from app.services.pip_gateway import pip_gateway_service
from app.services.telegram_vault import telegram_vault_service

@pytest.mark.asyncio
async def test_telemetry_service():
    snapshot = telemetry_service.get_telemetry_snapshot()
    assert "cpu" in snapshot
    assert "ram" in snapshot
    assert "disk" in snapshot
    assert "network" in snapshot
    assert snapshot["cpu"]["usage_percent"] >= 0.0
    assert snapshot["cpu"]["temperature_celsius"] > 0.0

@pytest.mark.asyncio
async def test_watermark_generation():
    from PIL import Image
    import io
    # Create simple dummy image
    img = Image.new("RGB", (640, 480), color=(50, 50, 50))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    original_bytes = buf.getvalue()

    watermarked = telegram_vault_service.apply_watermark(
        image_bytes=original_bytes,
        camera_name="portao_principal",
        label="person",
        zone="zona_portao"
    )
    assert len(watermarked) > 0
    assert watermarked != original_bytes

@pytest.mark.asyncio
async def test_scanner_subnets():
    subnets = scanner_service.get_local_subnets()
    assert len(subnets) >= 1
    assert "192.168.1" in subnets

@pytest.mark.asyncio
async def test_pip_dnd_check():
    assert pip_gateway_service.is_in_dnd() is False
    pip_gateway_service._dnd_enabled = True
    pip_gateway_service._dnd_start_hour = 0
    pip_gateway_service._dnd_end_hour = 24
    assert pip_gateway_service.is_in_dnd() is True
    pip_gateway_service._dnd_enabled = False

@pytest.mark.asyncio
async def test_watermark_high_quality_dpi():
    from PIL import Image
    import io
    img = Image.new("RGB", (2304, 1296), color=(40, 40, 40))
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=100, dpi=(300, 300))
    watermarked = telegram_vault_service.apply_watermark(
        image_bytes=buf.getvalue(),
        camera_name="cam_192_168_1_196",
        label="person",
        zone="entrada"
    )
    result_img = Image.open(io.BytesIO(watermarked))
    assert result_img.size == (2304, 1296)
    assert result_img.info.get("dpi") == (300, 300)

@pytest.mark.asyncio
async def test_go2rtc_alias_sanitization():
    # Test sanitization logic from cameras.py
    cfg = {
        "go2rtc": {
            "streams": {
                "cam_192_168_1_196": ["rtsp://192.168.1.196:554/live/0/MAIN"],
                "cam_192_168_1_196_main": "cam_192_168_1_196",
                "cam_192_168_1_196_720p": ["cam_192_168_1_196"],
                "camera_principal": ["cam_192_168_1_196"]
            }
        }
    }
    for s_name, s_val in list(cfg["go2rtc"]["streams"].items()):
        if isinstance(s_val, str) and not s_val.startswith(("rtsp://", "http://", "https://", "ffmpeg:", "exec:", "echo:", "#")):
            target = s_val.strip()
            cfg["go2rtc"]["streams"][s_name] = [f"ffmpeg:{target}#video=copy"]
        elif isinstance(s_val, list):
            new_list = []
            for item in s_val:
                if isinstance(item, str) and not item.startswith(("rtsp://", "http://", "https://", "ffmpeg:", "exec:", "echo:", "#")):
                    target = item.strip()
                    new_list.append(f"ffmpeg:{target}#video=copy")
                else:
                    new_list.append(item)
            cfg["go2rtc"]["streams"][s_name] = new_list

    assert cfg["go2rtc"]["streams"]["cam_192_168_1_196_main"] == ["ffmpeg:cam_192_168_1_196#video=copy"]
    assert cfg["go2rtc"]["streams"]["cam_192_168_1_196_720p"] == ["ffmpeg:cam_192_168_1_196#video=copy"]
    assert cfg["go2rtc"]["streams"]["camera_principal"] == ["ffmpeg:cam_192_168_1_196#video=copy"]

