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

    async def load_credentials_from_db(self):
        """Loads Bot Token and Chat ID from database if available, or seeds defaults."""
        try:
            from app.db.session import AsyncSessionLocal
            from app.db.models import SystemSetting
            from sqlalchemy import select
            async with AsyncSessionLocal() as session:
                stmt = select(SystemSetting).where(SystemSetting.key.in_(["telegram_bot_token", "telegram_chat_id"]))
                res = await session.execute(stmt)
                settings_list = res.scalars().all()
                found_token = False
                found_chat = False
                for s in settings_list:
                    if s.key == "telegram_bot_token" and s.value:
                        self.bot_token = s.value
                        settings.TELEGRAM_BOT_TOKEN = s.value
                        found_token = True
                    elif s.key == "telegram_chat_id" and s.value:
                        self.chat_id = s.value
                        settings.TELEGRAM_CHAT_ID = s.value
                        found_chat = True

                # If not present in DB, seed from settings defaults
                if not found_token and settings.TELEGRAM_BOT_TOKEN:
                    self.bot_token = settings.TELEGRAM_BOT_TOKEN
                    session.add(SystemSetting(key="telegram_bot_token", value=settings.TELEGRAM_BOT_TOKEN))
                if not found_chat and settings.TELEGRAM_CHAT_ID:
                    self.chat_id = settings.TELEGRAM_CHAT_ID
                    session.add(SystemSetting(key="telegram_chat_id", value=settings.TELEGRAM_CHAT_ID))
                await session.commit()

                if self.is_configured:
                    logger.info("✅ Credenciais do Telegram carregadas e ativas no Sentinela.")
        except Exception as e:
            logger.warning(f"Não foi possível carregar credenciais do Telegram do banco: {e}")


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

    def format_event_message(
        self,
        camera_name: str,
        friendly_name: Optional[str] = None,
        label: str = "person",
        score: float = 0.0,
        duration_s: float = 0.0,
        size_bytes: int = 0,
        is_video: bool = False
    ) -> str:
        now = datetime.datetime.now()
        
        label_map = {
            "person": "Pessoa",
            "car": "Carro",
            "motorcycle": "Motocicleta",
            "bus": "Ônibus",
            "truck": "Caminhão",
            "dog": "Cachorro",
            "cat": "Gato",
            "bicycle": "Bicicleta",
            "motion": "Movimento"
        }
        label_pt = label_map.get(label.lower(), label.capitalize())
        
        weekdays = ["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado", "Domingo"]
        weekday_str = weekdays[now.weekday()]
        
        date_str = now.strftime("%d/%m/%Y")
        time_str = now.strftime("%H:%M:%S")
        
        hour = now.hour
        if 5 <= hour < 12:
            periodo = "manha"
        elif 12 <= hour < 18:
            periodo = "tarde"
        elif 18 <= hour < 24:
            periodo = "noite"
        else:
            periodo = "madrugada"
            
        months = ["janeiro", "fevereiro", "marco", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"]
        mes_nome = months[now.month - 1]
        
        cam_display = friendly_name or camera_name
        cam_slug = camera_name.lower().replace(" ", "_").replace("-", "_")
        
        size_mb = size_bytes / (1024 * 1024) if size_bytes > 0 else 0.0
        size_str = f"{size_mb:.2f} MB" if size_mb > 0 else "0.85 MB"
        
        dur_str = f"{duration_s:.1f}s" if duration_s > 0 else "15.0s"
        score_pct = round(score * 100, 1) if score > 0 else 85.0
        
        header_type = "🎥 𝗩𝗜́𝗗𝗘𝗢 𝗗𝗘 𝗘𝗩𝗘𝗡𝗧𝗢" if is_video else "🚨 𝗙𝗢𝗧𝗢 𝗗𝗘 𝗘𝗩𝗘𝗡𝗧𝗢"
        
        dia_num = now.strftime("%d")
        mes_num = now.strftime("%m")
        ano_num = now.strftime("%Y")
        d_tag = f"d{dia_num}_{mes_num}_{ano_num}"
        full_date_tag = f"{dia_num}_{mes_num}_{ano_num}"
        mes_ano = f"{mes_nome[:3]}{ano_num}"
        dia_sem_tag = weekday_str.lower().split("-")[0].replace("á", "a").replace("ç", "c").replace("é", "e")
        
        tags = [
            f"#{ano_num}",
            f"#{full_date_tag}",
            f"#{mes_ano}",
            f"#{mes_nome}",
            f"#{mes_nome}{ano_num}",
            f"#ano{ano_num}",
            f"#{cam_slug}",
            f"#{d_tag}",
            f"#dia{dia_num}",
            f"#h{hour:02d}",
            f"#mes{mes_num}",
            f"#{label.lower()}",
            f"#{dia_sem_tag}",
            "#seguranca",
            "#sentinela",
            f"#{periodo}",
            "#video_mp4" if is_video else "#foto_jpg"
        ]
        
        seen = set()
        unique_tags = []
        for t in tags:
            if t not in seen:
                seen.add(t)
                unique_tags.append(t)
                
        tags_str = " ".join(unique_tags)

        return (
            f"{header_type} • 𝗦𝗲𝗻𝘁𝗶𝗻𝗲𝗹𝗮 𝗙𝗿𝗶𝗴𝗮𝘁𝗲 𝗣𝗿𝗼\n"
            f"━━━━━━━━━━━━━━━━━━━━\n"
            f"📍 𝗟𝗼𝗰𝗮𝗹: {cam_display} ({camera_name})\n"
            f"⏱ 𝗗𝗮𝘁𝗮/𝗛𝗼𝗿𝗮: {date_str} às {time_str} ({weekday_str})\n"
            f"📊 𝗜𝗻𝘁𝗲𝗻𝘀𝗶𝗱𝗮𝗱𝗲: {score_pct}% de precisão ({label_pt})\n"
            f"⏳ 𝗗𝘂𝗿𝗮𝗰̧𝗮̃𝗼: {dur_str}\n"
            f"📁 𝗧𝗮𝗺𝗮𝗻𝗵𝗼: {size_str}\n"
            f"━━━━━━━━━━━━━━━━━━━━\n"
            f"🏷️ 𝗕𝘂𝘀𝗰𝗮 𝗜𝗻𝘀𝘁𝗮𝗻𝘁𝗮̂𝗻𝗲𝗮 (𝗧𝗲𝗹𝗲𝗴𝗿𝗮𝗺 𝗗𝗿𝗶𝘃𝗲):\n"
            f"{tags_str}"
        )

    async def send_alert_photo(
        self,
        image_bytes: bytes,
        camera_name: str,
        label: str,
        zone: Optional[str] = None,
        score: float = 0.0,
        friendly_name: Optional[str] = None
    ) -> bool:
        """Dispatches watermarked snapshot to Telegram using the classic template."""
        if not self.is_configured:
            await self.load_credentials_from_db()

        if not self.is_configured:
            logger.warning("Telegram Bot not configured (bot_token/chat_id missing), skipping alert.")
            return False

        if self.is_paused():
            logger.info("Telegram alerts currently paused.")
            return False

        watermarked = self.apply_watermark(image_bytes, camera_name, label, zone)
        caption = self.format_event_message(
            camera_name=camera_name,
            friendly_name=friendly_name,
            label=label,
            score=score,
            duration_s=0.0,
            size_bytes=len(image_bytes),
            is_video=False
        )

        url = f"https://api.telegram.org/bot{self.bot_token}/sendPhoto"
        try:
            logger.info(f"📤 Enviando foto de alerta para o Telegram ({self.chat_id})...")
            async with httpx.AsyncClient(timeout=10.0) as client:
                files = {"photo": ("snapshot.jpg", watermarked, "image/jpeg")}
                data = {"chat_id": self.chat_id, "caption": caption}
                resp = await client.post(url, data=data, files=files)
                if resp.status_code == 200:
                    logger.info("✅ Foto de alerta entregue com sucesso ao Telegram!")
                    return True
                else:
                    logger.error(f"❌ Telegram sendPhoto falhou (HTTP {resp.status_code}): {resp.text}")
                    return False
        except Exception as e:
            logger.error(f"❌ Erro de rede ao enviar foto para o Telegram: {e}")
            return False

    async def send_alert_video(
        self,
        video_bytes: bytes,
        camera_name: str,
        label: str,
        duration_s: float = 0.0,
        score: float = 0.0,
        friendly_name: Optional[str] = None
    ) -> bool:
        """Dispatches MP4 clip to Telegram using the classic template."""
        if not self.is_configured:
            await self.load_credentials_from_db()

        if not self.is_configured or self.is_paused():
            return False

        url = f"https://api.telegram.org/bot{self.bot_token}/sendVideo"
        caption = self.format_event_message(
            camera_name=camera_name,
            friendly_name=friendly_name,
            label=label,
            score=score,
            duration_s=duration_s,
            size_bytes=len(video_bytes),
            is_video=True
        )
        try:
            logger.info(f"📤 Enviando vídeo MP4 de alerta para o Telegram ({self.chat_id})...")
            async with httpx.AsyncClient(timeout=45.0) as client:
                files = {"video": ("event.mp4", video_bytes, "video/mp4")}
                data = {"chat_id": self.chat_id, "caption": caption}
                resp = await client.post(url, data=data, files=files)
                if resp.status_code == 200:
                    logger.info("✅ Vídeo MP4 entregue com sucesso ao Telegram!")
                    return True
                else:
                    logger.error(f"❌ Telegram sendVideo falhou (HTTP {resp.status_code}): {resp.text}")
                    return False
        except Exception as e:
            logger.error(f"❌ Erro de rede ao enviar vídeo para o Telegram: {e}")
            return False



    async def get_system_status_text(self) -> str:
        """Formats real-time telemetry into a rich Telegram status message."""
        telem = telemetry_service.get_telemetry_snapshot()
        cpu = telem["cpu"]
        ram = telem["ram"]
        disk = telem["disk"]
        net = telem["network"]

        pause_status = f"⏸️ <b>Alertas:</b> Pausados até {self.pause_until.strftime('%H:%M')}" if self.is_paused() else "🟢 <b>Alertas:</b> Ativos"

        return (
            f"🛡️ <b>SENTINELA FRIGATE PRO — STATUS</b>\n\n"
            f"🔥 <b>CPU:</b> <code>{cpu['usage_percent']}%</code> ({cpu['count']} Cores)\n"
            f"🌡️ <b>Temperatura:</b> <code>{cpu['temperature_celsius']}°C</code>\n"
            f"🧠 <b>RAM:</b> <code>{ram['used_mb']} MB</code> / <code>{ram['total_mb']} MB</code> (<code>{ram['percent']}%</code>)\n"
            f"💾 <b>SSD NVMe:</b> <code>{disk['free_gb']} GB livres</code> / <code>{disk['total_gb']} GB</code>\n"
            f"⚡ <b>Rede:</b> RX <code>{net['rx_kbs']} KB/s</code> | TX <code>{net['tx_kbs']} KB/s</code>\n\n"
            f"{pause_status}"
        )

    async def test_connection(self) -> Dict[str, Any]:
        """Validates bot credentials with Telegram API and sends a confirmation test message."""
        if not self.is_configured:
            await self.load_credentials_from_db()
        if not self.is_configured:
            return {"status": "error", "message": "Bot Token ou Chat ID não preenchidos. Salve as credenciais primeiro."}

        # 1. Verify Bot Token with getMe
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                me_resp = await client.get(f"https://api.telegram.org/bot{self.bot_token}/getMe")
                if me_resp.status_code != 200:
                    return {"status": "error", "message": f"Token inválido (Telegram retornou HTTP {me_resp.status_code})."}
                bot_info = me_resp.json().get("result", {})
                bot_name = bot_info.get("first_name", "Bot")
                bot_user = bot_info.get("username", "bot")
        except Exception as e:
            return {"status": "error", "message": f"Erro ao contatar servidores do Telegram: {e}"}

        # 2. Send Test Message to Chat ID
        now_str = datetime.datetime.now().strftime("%d/%m/%Y às %H:%M:%S")
        test_msg = (
            "🛡️ <b>SENTINELA FRIGATE PRO — TESTE DE CONEXÃO</b>\n"
            "━━━━━━━━━━━━━━━━━━━━\n"
            f"✅ <b>Conexão bem-sucedida com o Telegram!</b>\n"
            f"🤖 <b>Robô:</b> @{bot_user} ({bot_name})\n"
            f"⏱️ <b>Data/Hora:</b> <code>{now_str}</code>\n"
            "━━━━━━━━━━━━━━━━━━━━\n"
            "⚡ <b>Vigilância ativa: você receberá fotos e vídeos de intrusão aqui.</b>"
        )
        
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                send_resp = await client.post(
                    f"https://api.telegram.org/bot{self.bot_token}/sendMessage",
                    json={"chat_id": self.chat_id, "text": test_msg, "parse_mode": "HTML"}
                )
                if send_resp.status_code == 200:
                    logger.info(f"✅ Mensagem de teste enviada com sucesso para o Telegram ({self.chat_id})")
                    return {
                        "status": "success",
                        "message": f"Conectado com sucesso ao robô @{bot_user}! Mensagem de teste entregue.",
                        "bot_username": bot_user
                    }
                else:
                    err_desc = send_resp.json().get("description", send_resp.text)
                    logger.error(f"❌ Telegram sendMessage falhou: {err_desc}")
                    return {
                        "status": "error",
                        "message": f"Erro do Telegram: {err_desc} (Dica: envie /start para @{bot_user} primeiro se for chat privado)."
                    }
        except Exception as e:
            return {"status": "error", "message": f"Falha de rede ao enviar mensagem de teste: {e}"}

    async def send_message(self, text: str, parse_mode: str = "HTML") -> bool:
        """Sends a text message to the configured Telegram chat."""
        if not self.is_configured:
            await self.load_credentials_from_db()
        if not self.is_configured:
            return False
        url = f"https://api.telegram.org/bot{self.bot_token}/sendMessage"
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(url, json={"chat_id": self.chat_id, "text": text, "parse_mode": parse_mode})
                return resp.status_code == 200
        except Exception as e:
            logger.error(f"Erro ao enviar mensagem para Telegram: {e}")
            return False


    async def send_document(self, doc_bytes: bytes, filename: str, caption: str = "") -> bool:
        """Sends a document (e.g. database backup) to Telegram."""
        if not self.is_configured:
            await self.load_credentials_from_db()
        if not self.is_configured:
            return False
        url = f"https://api.telegram.org/bot{self.bot_token}/sendDocument"
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                files = {"document": (filename, doc_bytes, "application/octet-stream")}
                data = {"chat_id": self.chat_id, "caption": caption}
                resp = await client.post(url, data=data, files=files)
                return resp.status_code == 200
        except Exception as e:
            logger.error(f"Erro ao enviar documento para Telegram: {e}")
            return False

    async def handle_command(self, raw_text: str):
        """Processes interactive bot commands received via Telegram chat."""
        import os
        parts = raw_text.strip().split()
        if not parts:
            return
        cmd = parts[0].lower().split("@")[0] # strip bot username if present
        args = parts[1:]

        logger.info(f"🤖 Telegram Bot comando recebido: '{cmd}' com args: {args}")

        if cmd in ["/start", "/ajuda", "/help"]:
            help_text = (
                "🛡️ <b>SENTINELA FRIGATE PRO — COMANDOS DO BOT</b>\n"
                "━━━━━━━━━━━━━━━━━━━━\n\n"
                "📸 <code>/snapshot</code> — Captura e envia foto ao vivo da Câmera Principal\n"
                "📸 <code>/snapshot [camera]</code> — Captura foto de uma câmera específica\n"
                "📊 <code>/status</code> — Telemetria do hardware (CPU, Temp, RAM, SSD)\n"
                "⏸️ <code>/pausar [minutos]</code> — Suspende alertas (ex: <code>/pausar 60</code>)\n"
                "▶️ <code>/retomar</code> — Reativa envio de alertas imediatamente\n"
                "💾 <code>/backup</code> — Envia o arquivo do banco de dados <code>sentinela.db</code>\n"
                "❓ <code>/ajuda</code> — Exibe este menu de ajuda\n"
                "━━━━━━━━━━━━━━━━━━━━\n"
                "⚡ <b>Vigilância ativa: sistema operacional 24/7.</b>"
            )
            await self.send_message(help_text)

        elif cmd == "/status":
            status_text = await self.get_system_status_text()
            await self.send_message(status_text)

        elif cmd == "/snapshot":
            cam_name = args[0] if args else "camera_principal"
            url = f"{settings.FRIGATE_API_URL}/api/{cam_name}/latest.jpg"
            try:
                async with httpx.AsyncClient(timeout=8.0) as client:
                    resp = await client.get(url)
                    if resp.status_code == 200 and resp.content:
                        watermarked = self.apply_watermark(resp.content, cam_name, "SNAPSHOT MANUAL")
                        now_str = datetime.datetime.now().strftime("%d/%m/%Y às %H:%M:%S")
                        caption = (
                            f"📸 𝗦𝗡𝗔𝗣𝗦𝗛𝗢𝗧 𝗔𝗢 𝗩𝗜𝗩𝗢 • 𝗦𝗲𝗻𝘁𝗶𝗻𝗲𝗹𝗮 𝗙𝗿𝗶𝗴𝗮𝘁𝗲 𝗣𝗿𝗼\n"
                            f"━━━━━━━━━━━━━━━━━━━━\n"
                            f"📍 Câmera: {cam_name}\n"
                            f"⏱ Solicitado em: {now_str}\n"
                            f"━━━━━━━━━━━━━━━━━━━━"
                        )
                        url_photo = f"https://api.telegram.org/bot{self.bot_token}/sendPhoto"
                        async with httpx.AsyncClient(timeout=15.0) as photo_client:
                            files = {"photo": ("snapshot.jpg", watermarked, "image/jpeg")}
                            data = {"chat_id": self.chat_id, "caption": caption}
                            await photo_client.post(url_photo, data=data, files=files)
                    else:
                        await self.send_message(f"⚠️ Não foi possível obter frame da câmera <code>{cam_name}</code> (HTTP {resp.status_code}).")
            except Exception as e:
                await self.send_message(f"⚠️ Erro ao capturar snapshot de <code>{cam_name}</code>: {e}")

        elif cmd == "/pausar":
            mins = 60
            if args and args[0].isdigit():
                mins = int(args[0])
            self.pause_alerts(mins)
            until_str = self.pause_until.strftime("%H:%M:%S")
            await self.send_message(f"⏸️ <b>Alertas Suspensos!</b>\nNotificações pausadas por <b>{mins} minutos</b> (até às <code>{until_str}</code>).\n\nEnvie <code>/retomar</code> para reativar antes do prazo.")

        elif cmd == "/retomar":
            self.pause_until = None
            await self.send_message("▶️ <b>Alertas Reativados!</b>\nO Sentinela voltou a enviar notificações de movimento normalmente.")

        elif cmd == "/backup":
            db_paths = ["/app/data/sentinela.db", "./data/sentinela.db", "data/sentinela.db"]
            found_path = None
            for p in db_paths:
                if os.path.exists(p):
                    found_path = p
                    break
            
            if found_path:
                try:
                    with open(found_path, "rb") as f:
                        content = f.read()
                    now_tag = datetime.datetime.now().strftime("%Y%m%d_%H%M")
                    filename = f"sentinela_backup_{now_tag}.db"
                    caption = f"💾 <b>Backup do Banco de Dados Sentinela</b>\nArquivo: <code>{filename}</code> ({len(content) // 1024} KB)\nData: {datetime.datetime.now().strftime('%d/%m/%Y %H:%M:%S')}"
                    sent = await self.send_document(content, filename=filename, caption=caption)
                    if not sent:
                        await self.send_message("⚠️ Falha no envio do arquivo de backup.")
                except Exception as e:
                    await self.send_message(f"⚠️ Erro ao ler banco de dados para backup: {e}")
            else:
                await self.send_message("⚠️ Arquivo de banco de dados SQLite <code>sentinela.db</code> não encontrado no servidor.")

        else:
            await self.send_message(f"❓ Comando <code>{cmd}</code> não reconhecido. Digite <code>/ajuda</code> para ver as opções disponíveis.")

    async def start_polling(self):
        """Continuous lightweight long-polling loop for Telegram Bot updates."""
        import asyncio
        self.update_offset = 0
        logger.info("🤖 Iniciando loop de escuta de comandos do Telegram Bot...")

        while True:
            try:
                if not self.is_configured:
                    await self.load_credentials_from_db()

                if not self.is_configured:
                    await asyncio.sleep(5)
                    continue

                url = f"https://api.telegram.org/bot{self.bot_token}/getUpdates"
                params = {
                    "offset": self.update_offset,
                    "timeout": 25,
                    "allowed_updates": ["message"]
                }

                async with httpx.AsyncClient(timeout=35.0) as client:
                    resp = await client.get(url, params=params)
                    if resp.status_code == 200:
                        data = resp.json()
                        if data.get("ok"):
                            updates = data.get("result", [])
                            for upd in updates:
                                self.update_offset = upd["update_id"] + 1
                                msg = upd.get("message", {})
                                from_chat = str(msg.get("chat", {}).get("id", ""))
                                text = msg.get("text", "").strip()

                                # Security check: only respond to authorized chat_id
                                if text and (from_chat == str(self.chat_id) or str(self.chat_id) in from_chat):
                                    await self.handle_command(text)
                                elif text and text.startswith("/"):
                                    logger.warning(f"⚠️ Comando do Telegram rejeitado de chat não autorizado: {from_chat}")
                    elif resp.status_code in [401, 404]:
                        logger.warning(f"⚠️ Telegram Bot Token inválido (HTTP {resp.status_code}). Aguardando atualização...")
                        await asyncio.sleep(15)
                    else:
                        await asyncio.sleep(3)

            except asyncio.CancelledError:
                logger.info("Encerrando polling do Telegram Bot...")
                break
            except Exception as e:
                logger.debug(f"Aviso no polling do Telegram (normal em timeout): {e}")
                await asyncio.sleep(3)

    def start_polling_task(self):
        """Spawns or restarts the background polling task."""
        import asyncio
        if hasattr(self, "_polling_task") and self._polling_task and not self._polling_task.done():
            self._polling_task.cancel()
        self._polling_task = asyncio.create_task(self.start_polling())
        return self._polling_task

telegram_vault_service = TelegramVaultService()

