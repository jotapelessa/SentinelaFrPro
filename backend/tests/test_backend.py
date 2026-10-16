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

    # 1. Detect must be 800x448 @ 5fps when rtsp_sub is present (CPU < 15% thermal relief)
    assert cam_entry["detect"]["width"] == 800
    assert cam_entry["detect"]["height"] == 448
    assert cam_entry["detect"]["fps"] == 5

    # 2. Snapshots must be quality 100, height 1296, clean_copy True (Preservação 3MP nativo)
    assert cam_entry["snapshots"]["quality"] == 100
    assert cam_entry["snapshots"]["height"] == 1296
    assert cam_entry["snapshots"]["clean_copy"] is True
    assert cam_entry["snapshots"]["bounding_box"] is True

    # 3. Dual ffmpeg inputs: record on main 3MP, detect on sub 800x448
    assert len(cam_entry["ffmpeg"]["inputs"]) == 2
    inputs_by_role = {tuple(inp["roles"]): inp["path"] for inp in cam_entry["ffmpeg"]["inputs"]}
    assert inputs_by_role[("record",)] == "rtsp://127.0.0.1:8554/cam_192_168_1_196"
    assert inputs_by_role[("detect",)] == "rtsp://127.0.0.1:8554/cam_192_168_1_196_sub"

    # 4. SUB stream with timeout flag in go2rtc
    assert "timeout=60" in streams["cam_192_168_1_196_sub"][0]
    assert "live/0/SUB" in streams["cam_192_168_1_196_sub"][0]

    # 5. Zones scaled to 800x448 base
    garagem_coords = cam_entry["zones"]["garagem"]["coordinates"]
    # 0.5 * 800 = 400, 0.5 * 448 = 224
    assert "400,224" in garagem_coords
    assert "800,448" in garagem_coords


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
        },
        {
            "id": "1728000001.000000",
            "camera": "cam_192_168_1_196",
            "label": "car",
            "score": 95,
            "start_time": 1728000001.0,
            "end_time": 1728000016.0,
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
        assert len(results) == 2
        ev = results[0]
        assert ev["snapshot_url"] == "/api/events/1728000000.999999/snapshot.jpg"
        assert ev["snapshot_clean_url"] == "/api/events/1728000000.999999/snapshot.jpg?clean=1"
        assert ev["score"] == 88
        assert "timestamp" in ev
        assert results[1]["score"] == 95


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


def test_parse_frigate_coordinates_defaults_to_1280x720():
    from app.api.cameras import parse_frigate_coordinates

    # Points at 50% and 100% of 1280x720
    pts = parse_frigate_coordinates("640,360,1280,720")
    assert len(pts) == 2
    assert pts[0]["x"] == 0.5
    assert pts[0]["y"] == 0.5
    assert pts[1]["x"] == 1.0
    assert pts[1]["y"] == 1.0


@pytest.mark.asyncio
async def test_sync_camera_overwrites_existing_zones_with_720p_coordinates():
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

    # Must be updated to 1280x720 scaled coordinates: 0.1*1280=128, 0.2*720=144...
    updated_coords = captured_cfg["cameras"]["cam_192_168_1_196"]["zones"]["cx"]["coordinates"]
    assert "128,144" in updated_coords
    assert "640,432" in updated_coords

@pytest.mark.asyncio
async def test_frigate_bridge_get_live_snapshot_sources():
    from app.services.frigate_bridge import frigate_bridge
    from unittest.mock import patch, AsyncMock
    import httpx

    fake_jpeg = b"\xff\xd8\xff\xe0" + b"A" * 2000
    mock_resp = httpx.Response(200, content=fake_jpeg)

    with patch("httpx.AsyncClient.get", AsyncMock(return_value=mock_resp)) as mock_get:
        snap = await frigate_bridge.get_live_snapshot("cam_192_168_1_196")
        assert snap == fake_jpeg
        assert mock_get.called
        # Verify requested 3MP native query
        called_url = str(mock_get.call_args[0][0])
        assert "cam_192_168_1_196/latest.jpg?h=1296&quality=100" in called_url

@pytest.mark.asyncio
async def test_reconcile_cameras_with_frigate_restart_trigger():
    from app.api.cameras import reconcile_cameras_with_frigate
    from app.db.models import Camera
    from unittest.mock import patch, AsyncMock
    import httpx

    fake_cams = [
        Camera(name="cam_192_168_1_196", enabled=True, ip_address="192.168.1.196", rtsp_main="rtsp://..."),
        Camera(name="cam_192_168_1_47", enabled=True, ip_address="192.168.1.47", rtsp_main="rtsp://...")
    ]

    # Running Frigate config only has cam_192_168_1_196 (missing cam_192_168_1_47)
    frigate_running_cfg = {
        "cameras": {
            "cam_192_168_1_196": {"enabled": True}
        }
    }

    class FakeResult:
        def scalars(self):
            return self
        def all(self):
            return fake_cams

    mock_db = AsyncMock()
    mock_db.execute.return_value = FakeResult()

    mock_config_resp = httpx.Response(200, json=frigate_running_cfg)
    mock_restart_resp = httpx.Response(200, json={"status": "restarted"})

    post_calls = []
    async def mock_http_get(url, *args, **kwargs):
        if "/api/config" in str(url):
            return mock_config_resp
        return httpx.Response(200, json={})

    async def mock_http_post(url, *args, **kwargs):
        post_calls.append(str(url))
        if "/api/restart" in str(url):
            return mock_restart_resp
        return httpx.Response(200, json={})

    with patch("app.db.session.AsyncSessionLocal") as mock_session_ctx, \
         patch("app.api.cameras.sync_camera_to_frigate", AsyncMock()), \
         patch("httpx.AsyncClient.get", side_effect=mock_http_get), \
         patch("httpx.AsyncClient.post", side_effect=mock_http_post):
        
        mock_session_ctx.return_value.__aenter__.return_value = mock_db
        await reconcile_cameras_with_frigate()

        # Verify restart was triggered because cam_192_168_1_47 was missing
        assert any("/api/restart" in u for u in post_calls)


@pytest.mark.asyncio
async def test_mqtt_allow_video_if_already_processed_even_without_zone():
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
        "allowed_events": ["person"],
        "clip_duration_seconds": 15
    }

    # Simulate that the event previously generated a photo/alert
    test_evt_id = "evt_qualified_alert_123"
    mqtt_service._processed_events[test_evt_id] = True

    with patch.object(mqtt_service, "_get_camera_policy", AsyncMock(return_value=mock_policy)), \
         patch.object(mqtt_service, "_get_telegram_policy", AsyncMock(return_value=mock_tg)), \
         patch.object(mqtt_service, "_dispatch_telegram_video_with_retry", AsyncMock()) as mock_video:
        
        # Payload of event end with empty zones (e.g. object left the zone before end)
        payload = {
            "type": "end",
            "after": {
                "id": test_evt_id,
                "camera": "cam_test",
                "label": "person",
                "current_zones": [],
                "entered_zones": []
            }
        }
        await mqtt_service.handle_frigate_event(payload)
        # MUST dispatch video because event was already qualified
        mock_video.assert_called_once()


@pytest.mark.asyncio
async def test_telegram_send_alert_video_document_with_thumbnail():
    import httpx
    from unittest.mock import patch, AsyncMock
    from app.services.telegram_vault import telegram_vault_service

    telegram_vault_service.bot_token = "123456:FAKE_TOKEN"
    telegram_vault_service.chat_id = "-100123456789"

    mock_resp = httpx.Response(200, json={"ok": True, "result": {"message_id": 999}})
    
    posted_urls = []
    posted_files = {}

    async def mock_post(url, *args, **kwargs):
        posted_urls.append(str(url))
        if "files" in kwargs:
            posted_files.update(kwargs["files"])
        return mock_resp

    from PIL import Image
    import io

    # Generate a real 64x64 valid JPEG image
    img = Image.new("RGB", (64, 64), color=(0, 128, 255))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    valid_thumb = buf.getvalue()

    fake_video = b"\x00\x00\x00\x1cftypisom" + b"A" * 1024

    with patch("httpx.AsyncClient.post", side_effect=mock_post):
        success = await telegram_vault_service.send_alert_video(
            video_bytes=fake_video,
            camera_name="cam garagem",
            label="person",
            zone="entrada",
            duration_s=20.0,
            score=0.95,
            friendly_name="Garagem Principal",
            ignore_pause=True,
            as_document=True,
            thumbnail_bytes=valid_thumb
        )

        assert success is True
        assert any("sendDocument" in u for u in posted_urls)
        assert "document" in posted_files
        assert posted_files["document"][0] == "cam_garagem_person_3mp.mp4"
        assert "thumbnail" in posted_files
        assert posted_files["thumbnail"][0] == "thumb.jpg"


@pytest.mark.asyncio
async def test_telegram_send_alert_video_corrupted_thumbnail_fallback():
    import httpx
    from unittest.mock import patch
    from app.services.telegram_vault import telegram_vault_service

    telegram_vault_service.bot_token = "123456:FAKE_TOKEN"
    telegram_vault_service.chat_id = "-100123456789"

    mock_resp = httpx.Response(200, json={"ok": True, "result": {"message_id": 1000}})
    posted_files = {}

    async def mock_post(url, *args, **kwargs):
        if "files" in kwargs:
            posted_files.update(kwargs["files"])
        return mock_resp

    fake_video = b"\x00\x00\x00\x1cftypisom" + b"A" * 1024
    corrupted_thumb = b"CORRUPTED_BYTES_NOT_AN_IMAGE_12345678"

    with patch("httpx.AsyncClient.post", side_effect=mock_post):
        success = await telegram_vault_service.send_alert_video(
            video_bytes=fake_video,
            camera_name="cam_portao",
            label="person",
            duration_s=15.0,
            ignore_pause=True,
            as_document=True,
            thumbnail_bytes=corrupted_thumb
        )

        assert success is True
        assert "document" in posted_files
        # Thumbnail must be safely omitted when bytes are corrupted to avoid Telegram 400 Bad Request
        assert "thumbnail" not in posted_files


@pytest.mark.asyncio
async def test_fetch_thumbnail_bytes_with_custom_media_dir(tmp_path):
    from unittest.mock import patch
    from app.services.telegram_queue import telegram_video_queue
    from app.core.config import settings

    clips_dir = tmp_path / "clips"
    clips_dir.mkdir(parents=True)
    test_snap = clips_dir / "cam_test-evt_custom_dir_1.jpg"
    test_snap.write_bytes(b"\xff\xd8\xff\xe0" + b"A" * 1000)

    with patch.object(settings, "MEDIA_DIR", str(tmp_path)):
        thumb_bytes = await telegram_video_queue._fetch_thumbnail_bytes("cam_test", "evt_custom_dir_1")
        assert thumb_bytes is not None
        assert len(thumb_bytes) > 500


@pytest.mark.asyncio
async def test_get_event_thumbnail_endpoint():
    from unittest.mock import patch, AsyncMock
    from fastapi.testclient import TestClient
    from app.main import app
    from app.api.events import _THUMBNAIL_CACHE
    import httpx
    from PIL import Image
    import io

    # Create small valid JPEG
    img = Image.new("RGB", (175, 100), color=(255, 0, 0))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    fake_thumb = buf.getvalue()

    client = TestClient(app)
    _THUMBNAIL_CACHE.clear()

    mock_resp = httpx.Response(200, content=fake_thumb)

    with patch("httpx.AsyncClient.get", AsyncMock(return_value=mock_resp)) as mock_get:
        resp = client.get("/api/events/test_event_123/thumbnail.jpg")
        assert resp.status_code == 200
        assert resp.headers["content-type"] == "image/jpeg"
        assert resp.content == fake_thumb
        assert "test_event_123" in _THUMBNAIL_CACHE
        assert mock_get.call_count == 1

        # Second call must hit LRU cache without calling upstream Frigate
        resp2 = client.get("/api/events/test_event_123/thumbnail.jpg")
        assert resp2.status_code == 200
        assert resp2.content == fake_thumb
        assert mock_get.call_count == 1


@pytest.mark.asyncio
async def test_telegram_queue_remux_silent_audio_injection():
    from unittest.mock import patch, mock_open
    from app.services.telegram_queue import telegram_video_queue
    from app.services.frigate_bridge import frigate_bridge
    import subprocess

    captured_cmds = []

    def mock_run(cmd, *args, **kwargs):
        captured_cmds.append(cmd)
        return subprocess.CompletedProcess(args=cmd, returncode=0, stdout=b"", stderr=b"")

    fake_video = b"\x00\x00\x00\x1cftypisom" + b"V" * 6000

    m_open = mock_open(read_data=fake_video)

    with patch("subprocess.run", side_effect=mock_run), \
         patch("os.path.exists", return_value=True), \
         patch("os.path.getsize", return_value=10000), \
         patch("builtins.open", m_open):

        # 1. Without audio -> should inject anullsrc silent AAC track
        with patch.object(frigate_bridge, "_has_audio_stream", return_value=False):
            await telegram_video_queue._transcode_clean_video(fake_video)
            assert len(captured_cmds) >= 1
            cmd_no_audio = captured_cmds[0]
            assert "anullsrc=channel_layout=stereo:sample_rate=44100" in cmd_no_audio
            assert "-shortest" in cmd_no_audio

        # 2. With audio -> should NOT inject anullsrc
        captured_cmds.clear()
        with patch.object(frigate_bridge, "_has_audio_stream", return_value=True):
            await telegram_video_queue._transcode_clean_video(fake_video)
            assert len(captured_cmds) >= 1
            cmd_with_audio = captured_cmds[0]
            assert "anullsrc" not in cmd_with_audio
            assert "-shortest" not in cmd_with_audio


@pytest.mark.asyncio
async def test_mqtt_allow_video_if_recovered_from_sqlite():
    from unittest.mock import patch, AsyncMock
    from app.services.mqtt_service import mqtt_service
    from app.db.models import EventRecord

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
        "allowed_events": ["person"],
        "clip_duration_seconds": 15
    }

    test_evt_id = "evt_recovered_sqlite_999"
    # Ensure memory cache does NOT have it (simulating backend reboot between new and end)
    mqtt_service._processed_events.pop(test_evt_id, None)

    fake_db_event = EventRecord(
        frigate_event_id=test_evt_id,
        camera_name="cam_test",
        label="person",
        telegram_notified=True
    )

    class FakeResult:
        def scalar_one_or_none(self):
            return fake_db_event

    mock_db = AsyncMock()
    mock_db.execute.return_value = FakeResult()

    with patch.object(mqtt_service, "_get_camera_policy", AsyncMock(return_value=mock_policy)), \
         patch.object(mqtt_service, "_get_telegram_policy", AsyncMock(return_value=mock_tg)), \
         patch.object(mqtt_service, "_dispatch_telegram_video_with_retry", AsyncMock()) as mock_video, \
         patch("app.services.mqtt_service.AsyncSessionLocal") as mock_session_ctx:

        mock_session_ctx.return_value.__aenter__.return_value = mock_db

        payload = {
            "type": "end",
            "after": {
                "id": test_evt_id,
                "camera": "cam_test",
                "label": "person",
                "current_zones": [],
                "entered_zones": []
            }
        }
        await mqtt_service.handle_frigate_event(payload)
        import asyncio
        await asyncio.sleep(0.05)
        # Must have verified SQLite and dispatched video
        mock_video.assert_called_once()
        # Memory set must now track it
        assert mqtt_service._processed_events.get(test_evt_id) is True


@pytest.mark.asyncio
async def test_frigate_bridge_transcode_to_30fps_silent_audio():
    from unittest.mock import patch, mock_open
    from app.services.frigate_bridge import frigate_bridge
    import subprocess

    captured_cmds = []

    def mock_run(cmd, *args, **kwargs):
        captured_cmds.append(cmd)
        return subprocess.CompletedProcess(args=cmd, returncode=0, stdout=b"", stderr=b"")

    fake_video = b"\x00\x00\x00\x1cftypisom" + b"V" * 6000
    m_open = mock_open(read_data=fake_video)

    with patch("subprocess.run", side_effect=mock_run), \
         patch("os.path.exists", return_value=True), \
         patch("os.path.getsize", return_value=10000), \
         patch("builtins.open", m_open), \
         patch.object(frigate_bridge, "_probe_video_info", return_value={"fps": 25.0}), \
         patch.object(frigate_bridge, "has_video_stream", return_value=True):

        # 1. Without audio -> should inject anullsrc and -shortest
        with patch.object(frigate_bridge, "_has_audio_stream", return_value=False):
            await frigate_bridge.transcode_to_30fps(fake_video)
            assert len(captured_cmds) >= 1
            cmd = captured_cmds[0]
            assert "anullsrc=channel_layout=stereo:sample_rate=44100" in cmd
            assert "-shortest" in cmd

        # 2. With audio -> should NOT inject anullsrc
        captured_cmds.clear()
        with patch.object(frigate_bridge, "_has_audio_stream", return_value=True):
            await frigate_bridge.transcode_to_30fps(fake_video)
            assert len(captured_cmds) >= 1
            cmd = captured_cmds[0]
            assert "anullsrc" not in cmd
            assert "-shortest" not in cmd


@pytest.mark.asyncio
async def test_mqtt_suppress_video_if_already_sent_in_sqlite():
    from unittest.mock import patch, AsyncMock
    from app.services.mqtt_service import mqtt_service
    from app.db.models import EventRecord

    mock_policy = {
        "enabled": True,
        "notify_telegram": True,
        "notify_tv": True,
        "friendly_name": "Test Cam",
        "has_zones": False
    }
    mock_tg = {
        "send_mode": "both",
        "allowed_events": ["person"],
        "clip_duration_seconds": 15
    }

    test_evt_id = "evt_already_sent_999"
    # Ensure memory caches do NOT have it (simulating backend reboot)
    mqtt_service._processed_events.pop(test_evt_id, None)
    mqtt_service._processed_videos.pop(test_evt_id, None)

    fake_db_event = EventRecord(
        frigate_event_id=test_evt_id,
        camera_name="cam_test",
        label="person",
        telegram_notified=True,
        video_sent=True
    )

    class FakeResult:
        def scalar_one_or_none(self):
            return fake_db_event

    mock_db = AsyncMock()
    mock_db.execute.return_value = FakeResult()

    with patch.object(mqtt_service, "_get_camera_policy", AsyncMock(return_value=mock_policy)), \
         patch.object(mqtt_service, "_get_telegram_policy", AsyncMock(return_value=mock_tg)), \
         patch.object(mqtt_service, "_dispatch_telegram_video_with_retry", AsyncMock()) as mock_video, \
         patch("app.services.mqtt_service.AsyncSessionLocal") as mock_session_ctx:

        mock_session_ctx.return_value.__aenter__.return_value = mock_db

        payload = {
            "type": "end",
            "after": {
                "id": test_evt_id,
                "camera": "cam_test",
                "label": "person",
                "current_zones": []
            }
        }
        await mqtt_service.handle_frigate_event(payload)
        import asyncio
        await asyncio.sleep(0.05)
        # Must NOT dispatch video since video_sent is True in DB
        mock_video.assert_not_called()
        assert mqtt_service._processed_videos.get(test_evt_id) is True


@pytest.mark.asyncio
async def test_telegram_queue_fetch_thumbnail_checks_thumbnail_endpoint_first():
    from unittest.mock import patch, AsyncMock
    from app.services.telegram_queue import telegram_video_queue
    import httpx

    with patch("os.path.exists", return_value=False):
        # Frigate returns native 3.5 KB thumbnail
        mock_resp = httpx.Response(200, content=b"T" * 3500)
        with patch("httpx.AsyncClient.get", AsyncMock(return_value=mock_resp)) as mock_get:
            thumb = await telegram_video_queue._fetch_thumbnail_bytes("cam_test", "event_abc")
            assert thumb == b"T" * 3500
            assert mock_get.call_count == 1
            called_url = str(mock_get.call_args[0][0])
            assert "/api/events/event_abc/thumbnail.jpg" in called_url


@pytest.mark.asyncio
async def test_get_event_thumbnail_endpoint_accept_ranges_header():
    from unittest.mock import patch, AsyncMock
    from fastapi.testclient import TestClient
    from app.main import app
    from app.api.events import _THUMBNAIL_CACHE
    import httpx
    from PIL import Image
    import io

    img = Image.new("RGB", (175, 100), color=(0, 255, 0))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    fake_thumb = buf.getvalue()

    client = TestClient(app)
    _THUMBNAIL_CACHE.clear()

    mock_resp = httpx.Response(200, content=fake_thumb)

    with patch("httpx.AsyncClient.get", AsyncMock(return_value=mock_resp)):
        resp = client.get("/api/events/test_event_ranges/thumbnail.jpg")
        assert resp.status_code == 200
        assert resp.headers["accept-ranges"] == "bytes"
        assert resp.headers["cache-control"] == "public, max-age=604800, immutable"


@pytest.mark.asyncio
async def test_thermal_optimization_alternativa_b_1280x720_and_no_contrast_filter():
    from unittest.mock import patch, AsyncMock
    from app.api.cameras import sync_camera_to_frigate, sanitize_frigate_config
    from app.db.models import Camera

    # 1. Test sanitize_frigate_config enforces improve_contrast: false, threshold >= 22, contour_area >= 80,
    # and reconciles camera objects.track with zones and review labels
    raw_cfg = {
        "motion": {"improve_contrast": True, "threshold": 18, "contour_area": 20},
        "cameras": {
            "cam_test": {
                "motion": {"improve_contrast": True, "threshold": 15, "contour_area": 10},
                "zones": {
                    "z1": {"coordinates": "100,100,200,200", "objects": ["dog"]}
                },
                "review": {
                    "alerts": {"labels": ["person", "bus"]}
                }
            }
        }
    }
    sanitized = sanitize_frigate_config(raw_cfg)
    assert sanitized["motion"]["improve_contrast"] is False
    assert sanitized["motion"]["threshold"] == 22 # Elevated from 18 to anti-noise floor 22
    assert sanitized["motion"]["contour_area"] == 80 # Elevated from 20 to anti-noise floor 80
    cam_test_motion = sanitized["cameras"]["cam_test"]["motion"]
    assert cam_test_motion["improve_contrast"] is False
    assert cam_test_motion["threshold"] == 22 # Elevated from 15 to anti-noise floor 22
    assert cam_test_motion["contour_area"] == 80 # Elevated from 10 to anti-noise floor 80
    assert sanitized["cameras"]["cam_test"]["detect"]["width"] == 1280
    assert sanitized["cameras"]["cam_test"]["detect"]["height"] == 720
    # Both zone object 'dog' and review label 'bus' must be in objects.track
    cam_tracks = sanitized["cameras"]["cam_test"]["objects"]["track"]
    assert "dog" in cam_tracks
    assert "bus" in cam_tracks
    assert "person" in cam_tracks

    # 2. Test sync_camera_to_frigate decouples 3MP physical resolution from 1280x720 detect mesh
    cam = Camera(
        name="cam_thermal_test",
        friendly_name="Thermal Cam",
        rtsp_main="rtsp://admin:admin@192.168.1.196:554/live/0/MAIN",
        resolution="3mp",
        enabled=True
    )
    captured = {}
    async def mock_save(cfg, path):
        captured.update(cfg)
        return True

    with patch("app.api.cameras.get_frigate_config_path", return_value="/fake/cfg.yml"), \
         patch("app.api.cameras._save_yaml_config_atomic", side_effect=mock_save), \
         patch("httpx.AsyncClient.put", AsyncMock()):
        await sync_camera_to_frigate(cam)

    entry = captured["cameras"]["cam_thermal_test"]
    # Detect grid decoupled to 1280x720 (VAAPI hardware scale in VRAM)
    assert entry["detect"]["width"] == 1280
    assert entry["detect"]["height"] == 720
    assert entry["detect"]["fps"] == 5
    # Snapshots and recordings remain 3MP (2304x1296)
    assert entry["snapshots"]["height"] == 1296
    assert entry["snapshots"]["quality"] == 100
    # Motion filter improve_contrast is strictly False to eliminate eq=gamma=1.4 CPU penalty
    assert entry["motion"]["improve_contrast"] is False
    assert entry["motion"]["contour_area"] == 80
    assert entry["motion"]["threshold"] == 22


@pytest.mark.asyncio
async def test_get_device_permitted_cameras_allows_pending_status():
    from app.api.devices import get_device_permitted_cameras
    from app.db.models import PairedDevice, Camera
    from unittest.mock import AsyncMock, MagicMock

    # Mock DB session with a pending device and 2 enabled cameras
    mock_db = AsyncMock()
    dev = PairedDevice(
        device_identifier="dev_test_pending_123",
        friendly_name="TV Teste Pendente",
        permission_status="pending",
        allow_live_stream=False # Even if false in DB record when pending, pending devices must get enabled cameras
    )
    cam1 = Camera(name="cam_192_168_1_196", friendly_name="Camera Principal", enabled=True)
    cam2 = Camera(name="cam_192_168_1_47", friendly_name="Camera Secundaria", enabled=True)

    # First call is for PairedDevice, second call is for Cameras
    res_dev = MagicMock()
    res_dev.scalar_one_or_none.return_value = dev

    res_cams = MagicMock()
    res_cams.scalars.return_value.all.return_value = [cam1, cam2]

    mock_db.execute.side_effect = [res_dev, res_cams]

    cameras = await get_device_permitted_cameras("dev_test_pending_123", db=mock_db)
    assert len(cameras) == 2
    cam_names = [c["name"] for c in cameras]
    assert "cam_192_168_1_196" in cam_names
    assert "cam_192_168_1_47" in cam_names


@pytest.mark.asyncio
async def test_frigate_config_file_sub_detect_and_webrtc_listen():
    import yaml
    import os
    candidates = [
        "frigate/config/config.yml",
        "./frigate/config/config.yml",
        "../frigate/config/config.yml",
        "/config/config.yml",
        "/home/jotape/ServONVIF2/SentinelaFrPro/frigate/config/config.yml"
    ]
    cfg_path = next((p for p in candidates if os.path.exists(p)), None)
    if not cfg_path:
        pytest.skip("frigate config.yml not mounted in this container")

    with open(cfg_path, "r") as f:
        cfg = yaml.safe_load(f)

    # Check go2rtc webrtc listen
    assert cfg["go2rtc"]["webrtc"]["listen"] == ":8555"

    # Check cam_192_168_1_196 inputs and detect
    cam1 = cfg["cameras"]["cam_192_168_1_196"]
    inputs1 = {tuple(inp["roles"]): inp["path"] for inp in cam1["ffmpeg"]["inputs"]}
    assert ("record",) in inputs1
    assert ("detect",) in inputs1
    assert "sub" in inputs1[("detect",)].lower()
    assert cam1["detect"]["width"] == 800
    assert cam1["detect"]["height"] == 448

    # Check cam_192_168_1_47 inputs and detect
    cam2 = cfg["cameras"]["cam_192_168_1_47"]
    inputs2 = {tuple(inp["roles"]): inp["path"] for inp in cam2["ffmpeg"]["inputs"]}
    assert ("record",) in inputs2
    assert ("detect",) in inputs2
    assert "sub" in inputs2[("detect",)].lower()
    assert cam2["detect"]["width"] == 800
    assert cam2["detect"]["height"] == 448










