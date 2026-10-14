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
    from app.api.cameras import sanitize_frigate_config

    cfg = {
        "go2rtc": {
            "streams": {
                "cam_192_168_1_196": ["rtsp://192.168.1.196:554/live/0/MAIN"],
                "cam_192_168_1_196_main": "cam_192_168_1_196",
                "cam_192_168_1_196_720p": ["cam_192_168_1_196"],
                "camera_principal": ["cam_192_168_1_196"],
                "empty_alias": "",
                "whitespace_alias": "   ",
                "null_alias": None,
                "list_with_mixed": ["   ", "valid_target", "ffmpeg:cam_192_168_1_196#video=copy"]
            }
        }
    }
    sanitized = sanitize_frigate_config(cfg)
    streams = sanitized["go2rtc"]["streams"]
    assert streams["cam_192_168_1_196_main"] == ["ffmpeg:cam_192_168_1_196#video=copy"]
    assert streams["cam_192_168_1_196_720p"] == ["ffmpeg:cam_192_168_1_196#video=copy"]
    assert streams["camera_principal"] == ["ffmpeg:cam_192_168_1_196#video=copy"]
    assert streams["empty_alias"] == []
    assert streams["whitespace_alias"] == []
    assert streams["null_alias"] == []
    assert streams["list_with_mixed"] == ["ffmpeg:valid_target#video=copy", "ffmpeg:cam_192_168_1_196#video=copy"]

@pytest.mark.asyncio
async def test_telegram_send_alert_photo_document():
    from unittest.mock import patch, AsyncMock
    from PIL import Image
    import io

    img = Image.new("RGB", (320, 240), color=(10, 10, 10))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")

    telegram_vault_service.bot_token = "123456:TEST_TOKEN"
    telegram_vault_service.chat_id = "-100123456"

    with patch("httpx.AsyncClient.post") as mock_post:
        mock_resp = AsyncMock()
        mock_resp.status_code = 200
        mock_post.return_value = mock_resp

        ok = await telegram_vault_service.send_alert_photo(
            image_bytes=buf.getvalue(),
            camera_name="cam_192_168_1_196",
            label="person",
            as_document=True
        )
        assert ok is True
        call_args, call_kwargs = mock_post.call_args
        assert "sendDocument" in call_args[0]
        assert "document" in call_kwargs["files"]
        filename = call_kwargs["files"]["document"][0]
        assert filename == "cam_192_168_1_196_person_3mp.jpg"

@pytest.mark.asyncio
async def test_power_endpoints():
    import httpx
    from app.main import app

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        r1 = await client.post("/api/settings/power/restart-app")
        assert r1.status_code == 200
        assert r1.json()["status"] == "success"

        r2 = await client.post("/api/settings/power/reboot-server")
        assert r2.status_code == 200
        assert r2.json()["status"] == "success"

@pytest.mark.asyncio
async def test_extract_camera_ip():
    from app.api.cameras import extract_camera_ip
    assert extract_camera_ip("rtsp://admin:pass@192.168.1.196:554/live/0/MAIN") == "192.168.1.196"
    assert extract_camera_ip(name="cam_192_168_1_47") == "192.168.1.47"
    assert extract_camera_ip("rtsp://127.0.0.1:8554/live", "camera_principal") is None
    assert extract_camera_ip(None, None) is None

@pytest.mark.asyncio
async def test_sync_camera_time_utc_payload():
    from unittest.mock import patch, AsyncMock
    from app.services.onvif_hardware import onvif_hardware_service

    with patch("httpx.AsyncClient.post") as mock_post:
        mock_resp = AsyncMock()
        mock_resp.status_code = 200
        mock_post.return_value = mock_resp

        ok = await onvif_hardware_service.sync_camera_time("192.168.1.196", port=80)
        assert ok is True
        call_args, call_kwargs = mock_post.call_args
        content = call_kwargs.get("content", "")
        assert "<tt:TZ>CST+03:00</tt:TZ>" in content
        assert "<tds:UTCDateTime>" in content
        assert "http://192.168.1.196:80/onvif/device_service" in call_args[0]

@pytest.mark.asyncio
async def test_mqtt_skip_video_outside_zone():
    from unittest.mock import patch, AsyncMock
    from app.services.mqtt_service import mqtt_service

    # Policy with zones configured
    mock_policy = {
        "enabled": True,
        "notify_telegram": True,
        "notify_tv": True,
        "friendly_name": "Test Cam",
        "has_zones": True,
        "configured_zones": ["garagem"]
    }
    mock_tg = {
        "send_mode": "both",
        "allowed_events": ["person"]
    }

    with patch.object(mqtt_service, "_get_camera_policy", AsyncMock(return_value=mock_policy)), \
         patch.object(mqtt_service, "_get_telegram_policy", AsyncMock(return_value=mock_tg)), \
         patch.object(mqtt_service, "_dispatch_telegram_video_with_retry") as mock_video:
        
        # Payload of event end with empty zones
        payload = {
            "type": "end",
            "after": {
                "id": "evt_test_outside",
                "camera": "cam_test",
                "label": "person",
                "current_zones": [],
                "entered_zones": []
            }
        }
        await mqtt_service.handle_frigate_event(payload)
        # Should NOT dispatch video
        mock_video.assert_not_called()

