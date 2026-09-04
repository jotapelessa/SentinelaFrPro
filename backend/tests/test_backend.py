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
