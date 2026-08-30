import io
import httpx
import logging
import datetime
from PIL import Image, ImageDraw, ImageFont
from typing import Optional, Dict, Any
from app.core.config import settings
from app.services.telemetry import telemetry_service

logger = logging.getLogger(__name__)

class TelegramVaultService:
    def __init__(self):
        self.bot_token = settings.TELEGRAM_BOT_TOKEN
        self.chat_id = settings.TELEGRAM_CHAT_ID
        self.pause_until: Optional[datetime.datetime] = None

    @property
    def is_configured(self) -> bool:
        return bool(self.bot_token and self.chat_id)

    def is_paused(self) -> bool:
        if not self.pause_until:
            return False
        if datetime.datetime.now() < self.pause_until:
            return True
        self.pause_until = None
        return False

    def pause_alerts(self, minutes: int):
        self.pause_until = datetime.datetime.now() + datetime.timedelta(minutes=minutes)

    def apply_watermark(self, image_bytes: bytes, camera_name: str, label: str, zone: Optional[str] = None) -> bytes:
        """Applies a professional HUD watermark on the snapshot."""
        try:
            image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            draw = ImageDraw.Draw(image)
            width, height = image.size

            # HUD banner background (semi-transparent dark bar at top)
            bar_height = max(int(height * 0.08), 36)
            draw.rectangle([(0, 0), (width, bar_height)], fill=(8, 13, 20))

            # HUD Accent line (Cyan)
            draw.line([(0, bar_height - 2), (width, bar_height - 2)], fill=(6, 182, 212), width=3)

            now_str = datetime.datetime.now().strftime("%d/%m/%Y %H:%M:%S")
            zone_str = f" | Zona: {zone}" if zone else ""
            hud_text = f"🛡️ SENTINELA | {camera_name.upper()} | OBJETO: {label.upper()}{zone_str} | {now_str}"

            # Draw text
            draw.text((15, int(bar_height * 0.25)), hud_text, fill=(255, 255, 255))

            out_buf = io.BytesIO()
            image.save(out_buf, format="JPEG", quality=90)
            return out_buf.getvalue()
        except Exception as e:
            logger.error(f"Error applying watermark: {e}")
            return image_bytes

    async def send_alert_photo(
        self,
        image_bytes: bytes,
        camera_name: str,
        label: str,
        zone: Optional[str] = None,
        score: float = 0.0
    ) -> bool:
        """Dispatches watermarked snapshot to Telegram."""
        if not self.is_configured:
            logger.debug("Telegram Bot not configured, skipping alert.")
            return False

        if self.is_paused():
            logger.info("Telegram alerts currently paused.")
            return False

        watermarked = self.apply_watermark(image_bytes, camera_name, label, zone)
        now_str = datetime.datetime.now().strftime("%H:%M:%S")
        zone_info = f"\n📍 *Zona:* `{zone}`" if zone else ""
        caption = (
            f"🚨 *ALERTA DE SEGURANÇA — SENTINELA*\n"
            f"📹 *Câmera:* `{camera_name}`\n"
            f"🎯 *Detectado:* `{label.upper()}` ({round(score * 100)}%){zone_info}\n"
            f"⏰ *Horário:* `{now_str}`"
        )

        url = f"https://api.telegram.org/bot{self.bot_token}/sendPhoto"
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                files = {"photo": ("snapshot.jpg", watermarked, "image/jpeg")}
                data = {"chat_id": self.chat_id, "caption": caption, "parse_mode": "Markdown"}
                resp = await client.post(url, data=data, files=files)
                return resp.status_code == 200
        except Exception as e:
            logger.error(f"Failed to send Telegram photo alert: {e}")
            return False

    async def send_alert_video(self, video_bytes: bytes, camera_name: str, label: str) -> bool:
        """Dispatches MP4 clip to Telegram."""
        if not self.is_configured or self.is_paused():
            return False

        url = f"https://api.telegram.org/bot{self.bot_token}/sendVideo"
        caption = f"🎬 *Clipe de Evento Concluído*\n📹 Câmera: `{camera_name}`\n🎯 Objeto: `{label.upper()}`"
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                files = {"video": ("event.mp4", video_bytes, "video/mp4")}
                data = {"chat_id": self.chat_id, "caption": caption, "parse_mode": "Markdown"}
                resp = await client.post(url, data=data, files=files)
                return resp.status_code == 200
        except Exception as e:
            logger.error(f"Failed to send Telegram video clip: {e}")
            return False

    async def get_system_status_text(self) -> str:
        """Formats real-time telemetry into a rich Telegram status message."""
        telem = telemetry_service.get_telemetry_snapshot()
        cpu = telem["cpu"]
        ram = telem["ram"]
        disk = telem["disk"]
        net = telem["network"]

        pause_status = f"⏸️ *Alertas:* Pausados até {self.pause_until.strftime('%H:%M')}" if self.is_paused() else "🟢 *Alertas:* Ativos"

        return (
            f"🛡️ *SENTINELA FRIGATE PRO — STATUS*\n\n"
            f"🔥 *CPU:* `{cpu['usage_percent']}%` ({cpu['count']} Cores)\n"
            f"🌡️ *Temperatura:* `{cpu['temperature_celsius']}°C`\n"
            f"🧠 *RAM:* `{ram['used_mb']} MB` / `{ram['total_mb']} MB` (`{ram['percent']}%`)\n"
            f"💾 *SSD NVMe:* `{disk['free_gb']} GB livres` / `{disk['total_gb']} GB`\n"
            f"⚡ *Rede:* RX `{net['rx_kbs']} KB/s` | TX `{net['tx_kbs']} KB/s`\n\n"
            f"{pause_status}"
        )

telegram_vault_service = TelegramVaultService()
