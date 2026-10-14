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

        # Payload of event end with unconfigured zone (e.g. rua)
        payload_unconfigured = {
            "type": "end",
            "after": {
                "id": "evt_test_unconfigured",
                "camera": "cam_test",
                "label": "person",
                "current_zones": ["rua"],
                "entered_zones": []
            }
        }
        await mqtt_service.handle_frigate_event(payload_unconfigured)
        mock_video.assert_not_called()


@pytest.mark.asyncio
async def test_mqtt_policy_ignores_motion_masks():
    from unittest.mock import patch, AsyncMock
    from app.services.mqtt_service import mqtt_service
    import json

    class DummyCam:
        enabled = True
        notify_tv = True
        notify_telegram = True
        friendly_name = "Cam Mask Only"
        zones = json.dumps([
            {"id": "mask_1", "name": "Mascara", "slug": "motion_mask", "type": "mask", "points": [{"x": 0.1, "y": 0.1}, {"x": 0.2, "y": 0.2}, {"x": 0.3, "y": 0.3}]}
        ])

    with patch("app.db.session.AsyncSessionLocal") as mock_session_cls:
        mock_session = AsyncMock()
        mock_session_cls.return_value.__aenter__.return_value = mock_session
        mock_result = AsyncMock()
        mock_result.scalar_one_or_none.return_value = DummyCam()
        mock_session.execute.return_value = mock_result

        # Invalidate cache
        mqtt_service._camera_policy_cache.clear()
        policy = await mqtt_service._get_camera_policy("test_cam_mask")
        assert policy["has_zones"] is False
        assert policy["configured_zones"] == []


@pytest.mark.asyncio
async def test_resolve_camera_ip_safety():
    from app.services.onvif_hardware import onvif_hardware_service

    # Generic loopback without camera_name must return None (never pick random camera)
    res_none = await onvif_hardware_service.resolve_camera_ip("127.0.0.1", None)
    assert res_none is None

    # Name containing IP
    res_name = await onvif_hardware_service.resolve_camera_ip(None, "cam_192_168_1_47")
    assert res_name == "192.168.1.47"

    # RTSP url containing IP
    res_rtsp = await onvif_hardware_service.resolve_camera_ip("rtsp://admin:pass@192.168.1.196:554/live")
    assert res_rtsp == "192.168.1.196"


@pytest.mark.asyncio
async def test_sync_camera_to_frigate_zones_mask_filtering():
    from unittest.mock import patch, AsyncMock
    from app.api.cameras import sync_camera_to_frigate
    from app.db.models import Camera
    import json

    cam = Camera(
        name="cam_192_168_1_196",
        friendly_name="Principal",
        rtsp_main="rtsp://admin:admin@192.168.1.196:554/live/0/MAIN",
        rtsp_sub="rtsp://admin:admin@192.168.1.196:554/live/0/SUB",
        enabled=True,
        zones=json.dumps([
            {
                "id": "zone_cx",
                "name": "Cx",
                "slug": "cx",
                "type": "zone",
                "points": [{"x": 0.1, "y": 0.2}, {"x": 0.3, "y": 0.4}, {"x": 0.5, "y": 0.6}]
            },
            {
                "id": "mask_test",
                "name": "Mascara",
                "slug": "motion_mask",
                "type": "mask",
                "points": [{"x": 0.7, "y": 0.8}, {"x": 0.8, "y": 0.9}, {"x": 0.9, "y": 0.9}]
            }
        ])
    )

    captured_cfg = {}
    async def mock_save(cfg, path):
        captured_cfg.update(cfg)
        return True

    with patch("app.api.cameras.get_frigate_config_path", return_value="/fake/nonexistent/config.yml"), \
         patch("app.api.cameras._save_yaml_config_atomic", side_effect=mock_save), \
         patch("httpx.AsyncClient.put", AsyncMock()):
        await sync_camera_to_frigate(cam)

    cam_entry = captured_cfg["cameras"]["cam_192_168_1_196"]
    # Only "cx" must be in required_zones, NOT "motion_mask"
    assert cam_entry["review"]["alerts"]["required_zones"] == ["cx"]
    assert cam_entry["review"]["detections"]["required_zones"] == ["cx"]
    # cam_entry["zones"] must be hydrated with cx
    assert "cx" in cam_entry["zones"]
    # motion mask must be set under motion.mask
    assert "mask" in cam_entry["motion"]


@pytest.mark.asyncio
async def test_sync_camera_3mp_unified_inputs_and_streams():
    from unittest.mock import patch, AsyncMock
    from app.api.cameras import sync_camera_to_frigate
    from app.db.models import Camera
    import json

    cam = Camera(
        name="cam_192_168_1_196",
        friendly_name="Principal 3MP",
        rtsp_main="rtsp://admin:admin@192.168.1.196:554/live/0/MAIN",
        rtsp_sub="rtsp://admin:admin@192.168.1.196:554/live/0/SUB",
        resolution="3mp",
        enabled=True,
        zones=json.dumps([
            {
                "id": "zone_garagem",
                "name": "Garagem",
                "slug": "garagem",
                "type": "zone",
                "points": [{"x": 0.5, "y": 0.5}, {"x": 1.0, "y": 1.0}, {"x": 0.5, "y": 1.0}]
            }
        ])
    )

    captured_cfg = {}
    async def mock_save(cfg, path):
        captured_cfg.update(cfg)
        return True

    with patch("app.api.cameras.get_frigate_config_path", return_value="/fake/nonexistent/config.yml"), \
         patch("app.api.cameras._save_yaml_config_atomic", side_effect=mock_save), \
         patch("httpx.AsyncClient.put", AsyncMock()):
        await sync_camera_to_frigate(cam)

    cam_entry = captured_cfg["cameras"]["cam_192_168_1_196"]
    streams = captured_cfg["go2rtc"]["streams"]

    # 1. Detect must be 2304x1296 @ 5fps
    assert cam_entry["detect"]["width"] == 2304
    assert cam_entry["detect"]["height"] == 1296
    assert cam_entry["detect"]["fps"] == 5

    # 2. Snapshots must be quality 100, height 1296, clean_copy True
    assert cam_entry["snapshots"]["quality"] == 100
    assert cam_entry["snapshots"]["height"] == 1296
    assert cam_entry["snapshots"]["clean_copy"] is True
    assert cam_entry["snapshots"]["bounding_box"] is True

    # 3. Single consolidated ffmpeg input with roles [record, detect]
    assert len(cam_entry["ffmpeg"]["inputs"]) == 1
    input_item = cam_entry["ffmpeg"]["inputs"][0]
    assert input_item["path"] == "rtsp://127.0.0.1:8554/cam_192_168_1_196"
    assert input_item["roles"] == ["record", "detect"]

    # 4. Zero-copy sub alias in go2rtc
    assert streams["cam_192_168_1_196_sub"] == ["ffmpeg:cam_192_168_1_196#video=copy"]

    # 5. Zones scaled to 2304x1296 base
    garagem_coords = cam_entry["zones"]["garagem"]["coordinates"]
    # 0.5 * 2304 = 1152, 0.5 * 1296 = 648
    assert "1152,648" in garagem_coords
    assert "2304,1296" in garagem_coords


@pytest.mark.asyncio
async def test_get_event_snapshot_webp_and_clean(tmp_path):
    import os
    from unittest.mock import patch, AsyncMock
    from app.api.events import get_event_snapshot
    from app.core.config import settings

    clips_dir = tmp_path / "clips"
    clips_dir.mkdir(parents=True)

    # 1. Clean WebP file
    clean_webp = clips_dir / "cam_test-1728000000.123456-clean.webp"
    clean_webp.write_bytes(b"RIFF....WEBP" + b"\x00" * 300)

    # 2. Standard JPEG file
    standard_jpg = clips_dir / "cam_test-1728000000.123456.jpg"
    standard_jpg.write_bytes(b"\xff\xd8\xff\xe0" + b"\x00" * 300)

    with patch.object(settings, "MEDIA_DIR", str(tmp_path)):
        # When clean=1: should serve clean.webp
        resp_clean = await get_event_snapshot("1728000000.123456", clean=1)
        assert resp_clean.media_type == "image/webp"

        # When clean=0: should serve standard .jpg
        resp_std = await get_event_snapshot("1728000000.123456", clean=0)
        assert resp_std.media_type == "image/jpeg"

    # 3. Fallback to Frigate proxy when file is not on disk
    with patch.object(settings, "MEDIA_DIR", str(tmp_path / "empty")), \
         patch("httpx.AsyncClient.get") as mock_get:
        mock_resp = AsyncMock()
        mock_resp.status_code = 200
        mock_resp.content = b"TEST_IMG_CONTENT"
        mock_resp.headers = {"content-type": "image/webp"}
        mock_get.return_value = mock_resp

        proxy_resp = await get_event_snapshot("9999999999.000000", clean=1)
        assert proxy_resp.media_type == "image/webp"
        assert proxy_resp.body == b"TEST_IMG_CONTENT"


@pytest.mark.asyncio
async def test_list_events_canonical_snapshot_urls():
    from unittest.mock import patch, AsyncMock, MagicMock
    from app.api.events import list_events

    mock_events_json = [
        {
            "id": "1728000000.999999",
            "camera": "cam_192_168_1_196",
            "label": "person",
            "top_score": 0.88,
            "start_time": 1728000000.0,
            "end_time": 1728000015.0,
            "has_clip": True,
            "has_snapshot": True,
            "zones": ["entrada"]
        }
    ]

    mock_db = AsyncMock()
    mock_db.add = MagicMock()
    mock_res = MagicMock()
    mock_res.scalar_one_or_none.return_value = None
    mock_db.execute = AsyncMock(return_value=mock_res)

    with patch("httpx.AsyncClient.get") as mock_get:
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = mock_events_json
        mock_get.return_value = mock_resp

        results = await list_events(limit=10, db=mock_db)
        assert len(results) == 1
        ev = results[0]
        assert ev["snapshot_url"] == "/api/events/1728000000.999999/snapshot.jpg"
        assert ev["snapshot_clean_url"] == "/api/events/1728000000.999999/snapshot.jpg?clean=1"


@pytest.mark.asyncio
async def test_get_event_snapshot_clean_flexible_param(tmp_path):
    from unittest.mock import patch
    from app.api.events import get_event_snapshot
    from app.core.config import settings

    clips_dir = tmp_path / "clips"
    clips_dir.mkdir(parents=True)

    clean_webp = clips_dir / "cam_test-1728000000.555555-clean.webp"
    clean_webp.write_bytes(b"RIFF....WEBP" + b"\x00" * 300)

    std_jpg = clips_dir / "cam_test-1728000000.555555.jpg"
    std_jpg.write_bytes(b"\xff\xd8\xff\xe0" + b"\x00" * 300)

    with patch.object(settings, "MEDIA_DIR", str(tmp_path)):
        # Passing clean="true" as string
        resp1 = await get_event_snapshot("1728000000.555555", clean="true")
        assert resp1.media_type == "image/webp"

        # Passing clean=True as bool
        resp2 = await get_event_snapshot("1728000000.555555", clean=True)
        assert resp2.media_type == "image/webp"

        # Passing clean="0" as string
        resp3 = await get_event_snapshot("1728000000.555555", clean="0")
        assert resp3.media_type == "image/jpeg"


def test_parse_frigate_coordinates_defaults_to_2304x1296():
    from app.api.cameras import parse_frigate_coordinates

    # Points at 50% and 100% of 2304x1296
    pts = parse_frigate_coordinates("1152,648,2304,1296")
    assert len(pts) == 2
    assert pts[0]["x"] == 0.5
    assert pts[0]["y"] == 0.5
    assert pts[1]["x"] == 1.0
    assert pts[1]["y"] == 1.0


@pytest.mark.asyncio
async def test_sync_camera_overwrites_existing_zones_with_3mp_coordinates():
    from unittest.mock import patch, AsyncMock
    from app.api.cameras import sync_camera_to_frigate
    from app.db.models import Camera
    import json

    # Pre-existing camera block with old 800x448 coordinates
    initial_cfg = {
        "cameras": {
            "cam_192_168_1_196": {
                "zones": {
                    "cx": {
                        "coordinates": "100,100,200,200",
                        "objects": ["person"]
                    }
                }
            }
        },
        "go2rtc": {"streams": {}}
    }

    cam = Camera(
        name="cam_192_168_1_196",
        friendly_name="Principal 3MP",
        rtsp_main="rtsp://admin:admin@192.168.1.196:554/live/0/MAIN",
        resolution="3mp",
        enabled=True,
        zones=json.dumps([
            {
                "id": "zone_cx",
                "name": "Cx",
                "slug": "cx",
                "type": "zone",
                "points": [{"x": 0.1, "y": 0.2}, {"x": 0.3, "y": 0.4}, {"x": 0.5, "y": 0.6}]
            }
        ])
    )

    captured_cfg = {}
    async def mock_save(cfg, path):
        captured_cfg.update(cfg)
        return True

    with patch("app.api.cameras.get_frigate_config_path", return_value="/fake/cfg.yml"), \
         patch("os.path.exists", return_value=True), \
         patch("builtins.open", patch("yaml.safe_load", return_value=initial_cfg)), \
         patch("app.api.cameras._save_yaml_config_atomic", side_effect=mock_save), \
         patch("httpx.AsyncClient.put", AsyncMock()):
        await sync_camera_to_frigate(cam)

    # Must be updated to 2304x1296 scaled coordinates: 0.1*2304=230, 0.2*1296=259...
    updated_coords = captured_cfg["cameras"]["cam_192_168_1_196"]["zones"]["cx"]["coordinates"]
    assert "230,259" in updated_coords
    assert "1152,778" in updated_coords




