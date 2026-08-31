from fastapi import APIRouter, Depends, HTTPException, Body
from pydantic import BaseModel
from typing import Optional, Dict, Any
from app.services.telegram_vault import telegram_vault_service
from app.services.pip_gateway import pip_gateway_service
from app.services.frigate_bridge import frigate_bridge
from app.core.config import settings

from app.db.session import get_db
from app.db.models import Camera, PairedDevice
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

router = APIRouter(prefix="/settings", tags=["Settings"])

class TelegramConfigUpdate(BaseModel):
    bot_token: str
    chat_id: str
    clip_duration_seconds: Optional[int] = 15
    snapshot_resolution: Optional[str] = "1080p"
    video_quality: Optional[str] = "balanced"
    include_audio: Optional[bool] = True
    send_mode: Optional[str] = "both"

class PauseAlertsRequest(BaseModel):
    minutes: int = 60

class DNDConfigUpdate(BaseModel):
    enabled: bool
    start_hour: int
    end_hour: int

class ZoneUpdate(BaseModel):
    camera_name: str
    zone_name: str
    coordinates: str # e.g. "0,720,1280,720,1280,100,0,100"

@router.get("/")
async def get_settings(db: AsyncSession = Depends(get_db)):
    from app.db.models import SystemSetting
    stmt = select(SystemSetting)
    res = await db.execute(stmt)
    all_settings = {s.key: s.value for s in res.scalars().all()}

    saved_token = all_settings.get("telegram_bot_token") or telegram_vault_service.bot_token or ""
    saved_chat_id = all_settings.get("telegram_chat_id") or telegram_vault_service.chat_id or ""
    clip_dur = int(all_settings.get("telegram_clip_duration_seconds", "15"))
    snap_res = all_settings.get("telegram_snapshot_resolution", "1080p")
    vid_qual = all_settings.get("telegram_video_quality", "balanced")
    inc_audio = all_settings.get("telegram_include_audio", "true").lower() == "true"
    send_md = all_settings.get("telegram_send_mode", "both")

    # Sync back to in-memory vault
    if saved_token:
        telegram_vault_service.bot_token = saved_token
        settings.TELEGRAM_BOT_TOKEN = saved_token
    if saved_chat_id:
        telegram_vault_service.chat_id = saved_chat_id
        settings.TELEGRAM_CHAT_ID = saved_chat_id

    dnd_enabled_val = all_settings.get("dnd_enabled", "false").lower() == "true"
    dnd_start_val = int(all_settings.get("dnd_start_hour", "23"))
    dnd_end_val = int(all_settings.get("dnd_end_hour", "6"))

    pip_gateway_service._dnd_enabled = dnd_enabled_val
    pip_gateway_service._dnd_start_hour = dnd_start_val
    pip_gateway_service._dnd_end_hour = dnd_end_val

    return {
        "telegram_configured": bool(saved_token and saved_chat_id),
        "bot_token": saved_token,
        "chat_id": saved_chat_id,
        "telegram_chat_id": saved_chat_id,
        "clip_duration_seconds": clip_dur,
        "snapshot_resolution": snap_res,
        "video_quality": vid_qual,
        "include_audio": inc_audio,
        "send_mode": send_md,
        "alerts_paused": telegram_vault_service.is_paused(),
        "frigate_url": settings.FRIGATE_API_URL,
        "mqtt_broker": f"{settings.MQTT_BROKER}:{settings.MQTT_PORT}",
        "dnd_enabled": dnd_enabled_val,
        "dnd_start_hour": dnd_start_val,
        "dnd_end_hour": dnd_end_val
    }

from app.services.audit_service import audit_service
from fastapi import Request

@router.post("/telegram")
async def update_telegram_config(config: TelegramConfigUpdate, request: Request, db: AsyncSession = Depends(get_db)):
    clean_token = config.bot_token.strip()
    clean_chat_id = config.chat_id.strip()
    clip_dur = str(config.clip_duration_seconds or 15)
    snap_res = str(config.snapshot_resolution or "1080p")
    vid_qual = str(config.video_quality or "balanced")
    inc_audio = "true" if config.include_audio else "false"
    send_md = str(config.send_mode or "both")

    settings.TELEGRAM_BOT_TOKEN = clean_token
    settings.TELEGRAM_CHAT_ID = clean_chat_id
    telegram_vault_service.bot_token = clean_token
    telegram_vault_service.chat_id = clean_chat_id

    # Persist all Telegram parameters to SQLite SystemSetting table
    from app.db.models import SystemSetting
    updates = [
        ("telegram_bot_token", clean_token),
        ("telegram_chat_id", clean_chat_id),
        ("telegram_clip_duration_seconds", clip_dur),
        ("telegram_snapshot_resolution", snap_res),
        ("telegram_video_quality", vid_qual),
        ("telegram_include_audio", inc_audio),
        ("telegram_send_mode", send_md)
    ]
    for k, v in updates:
        stmt = select(SystemSetting).where(SystemSetting.key == k)
        res = await db.execute(stmt)
        setting_obj = res.scalar_one_or_none()
        if setting_obj:
            setting_obj.value = v
        else:
            db.add(SystemSetting(key=k, value=v))
    await db.commit()

    # Restart interactive polling task with new credentials
    if clean_token and clean_chat_id:
        telegram_vault_service.start_polling_task()

    await audit_service.log(
        action="TELEGRAM_CONFIG_SAVED",
        module="TELEGRAM",
        severity="SUCCESS",
        details=f"Parâmetros de mídia do Telegram salvos (Duração: {clip_dur}s, Resolução: {snap_res}, Qualidade: {vid_qual}, Áudio: {inc_audio}, Modo: {send_md}).",
        client_ip=request.client.host if request.client else "unknown"
    )

    return {
        "status": "updated",
        "configured": telegram_vault_service.is_configured,
        "bot_token": clean_token,
        "chat_id": clean_chat_id,
        "clip_duration_seconds": int(clip_dur),
        "snapshot_resolution": snap_res,
        "video_quality": vid_qual,
        "include_audio": config.include_audio,
        "send_mode": send_md
    }


class TelegramTestPayload(BaseModel):
    bot_token: Optional[str] = None
    chat_id: Optional[str] = None

@router.post("/telegram/test")
async def test_telegram_alert(request: Request, payload: Optional[TelegramTestPayload] = None):
    client_ip = request.client.host if request.client else "unknown"
    if payload and payload.bot_token and payload.chat_id:
        # Temporary test with provided values
        orig_token = telegram_vault_service.bot_token
        orig_chat = telegram_vault_service.chat_id
        telegram_vault_service.bot_token = payload.bot_token.strip()
        telegram_vault_service.chat_id = payload.chat_id.strip()
        res = await telegram_vault_service.test_connection()
        if res.get("status") != "success":
            telegram_vault_service.bot_token = orig_token
            telegram_vault_service.chat_id = orig_chat
        
        await audit_service.log(
            action="TELEGRAM_TEST_DISPATCHED",
            module="TELEGRAM",
            severity="SUCCESS" if res.get("status") == "success" else "WARNING",
            details=f"Teste de conexão do Telegram: {res.get('message')}",
            client_ip=client_ip
        )
        return res
        
    res = await telegram_vault_service.test_connection()
    await audit_service.log(
        action="TELEGRAM_TEST_DISPATCHED",
        module="TELEGRAM",
        severity="SUCCESS" if res.get("status") == "success" else "WARNING",
        details=f"Teste de conexão do Telegram: {res.get('message')}",
        client_ip=client_ip
    )
    return res


@router.post("/telegram/test-photo")
async def test_telegram_photo(request: Request):
    client_ip = request.client.host if request.client else "unknown"
    if not telegram_vault_service.is_configured:
        await telegram_vault_service.load_credentials_from_db()
    if not telegram_vault_service.is_configured:
        raise HTTPException(status_code=400, detail="Telegram não configurado.")

    snapshot_bytes = await frigate_bridge.get_live_snapshot("camera_principal")
    if not snapshot_bytes:
        raise HTTPException(status_code=500, detail="Não foi possível capturar a foto ao vivo da câmera no Frigate.")

    ok = await telegram_vault_service.send_alert_photo(
        image_bytes=snapshot_bytes,
        camera_name="camera_principal",
        label="person",
        zone="Entrada Principal",
        score=0.97,
        friendly_name="Câmera de Teste",
        ignore_pause=True
    )

    await audit_service.log(
        action="TELEGRAM_PHOTO_TEST",
        module="TELEGRAM",
        severity="SUCCESS" if ok else "WARNING",
        details="Teste de envio de Foto/Snapshot disparado para o Telegram.",
        client_ip=client_ip
    )

    if ok:
        return {"status": "success", "message": "📸 Foto de teste enviada com sucesso para o Telegram!"}
    else:
        raise HTTPException(status_code=500, detail="Falha ao enviar foto para o Telegram.")


class TelegramVideoTestPayload(BaseModel):
    duration_seconds: Optional[int] = 15
    resolution: Optional[str] = "1080p"
    video_quality: Optional[str] = "balanced"
    include_audio: Optional[bool] = True

@router.post("/telegram/test-video")
async def test_telegram_video(request: Request, payload: Optional[TelegramVideoTestPayload] = None, db: AsyncSession = Depends(get_db)):
    from app.db.models import SystemSetting
    
    client_ip = request.client.host if request.client else "unknown"
    if not telegram_vault_service.is_configured:
        await telegram_vault_service.load_credentials_from_db()
    if not telegram_vault_service.is_configured:
        raise HTTPException(status_code=400, detail="Telegram não configurado no Sentinela.")

    # 1. Determine parameters from Payload or DB
    stmt = select(SystemSetting)
    res = await db.execute(stmt)
    db_settings = {s.key: s.value for s in res.scalars().all()}

    duration_s = (payload.duration_seconds if payload and payload.duration_seconds else None) or int(db_settings.get("telegram_clip_duration_seconds", "15"))
    resolution = (payload.resolution if payload and payload.resolution else None) or db_settings.get("telegram_snapshot_resolution", "1080p")
    video_qual = (payload.video_quality if payload and payload.video_quality else None) or db_settings.get("telegram_video_quality", "balanced")
    inc_audio = (payload.include_audio if payload and payload.include_audio is not None else None)
    if inc_audio is None:
        inc_audio = db_settings.get("telegram_include_audio", "true").lower() == "true"

    # 2. Record live video using FrigateBridgeService
    video_bytes = await frigate_bridge.record_live_video(
        camera_name="camera_principal",
        duration_s=duration_s,
        resolution=resolution,
        video_quality=video_qual,
        include_audio=inc_audio
    )

    if not video_bytes:
        raise HTTPException(status_code=500, detail="Não foi possível capturar nem gerar o vídeo MP4.")

    ok = await telegram_vault_service.send_alert_video(
        video_bytes=video_bytes,
        camera_name="camera_principal",
        label="person",
        duration_s=float(duration_s),
        score=0.98,
        friendly_name="Câmera Ao Vivo",
        ignore_pause=True
    )

    await audit_service.log(
        action="TELEGRAM_LIVE_VIDEO_TEST",
        module="TELEGRAM",
        severity="SUCCESS" if ok else "WARNING",
        details=f"Vídeo de teste ao vivo gravado e disparado ({duration_s}s, {resolution}, {video_qual}).",
        client_ip=client_ip
    )

    if ok:
        return {
            "status": "success",
            "message": f"🎥 Vídeo gravado ao vivo ({duration_s}s, {resolution}) entregue com sucesso no Telegram!"
        }
    else:
        raise HTTPException(status_code=500, detail="Falha ao entregar o vídeo no chat do Telegram. Verifique se o Bot Token e Chat ID estão corretos.")


@router.post("/telegram/test-logs")
async def test_telegram_logs(request: Request):
    client_ip = request.client.host if request.client else "unknown"
    if not telegram_vault_service.is_configured:
        await telegram_vault_service.load_credentials_from_db()
    if not telegram_vault_service.is_configured:
        raise HTTPException(status_code=400, detail="Telegram não configurado.")

    logs = await audit_service.get_logs(limit=10)
    lines = ["📋 <b>SENTINELA — AUDITORIA DE LOGS RECENTES</b>\n━━━━━━━━━━━━━━━━━━━━"]
    for l in logs[:8]:
        sev = l.severity
        icon = "✅" if sev == "SUCCESS" else "⚠️" if sev == "WARNING" else "🚨" if sev == "ERROR" else "ℹ️"
        lines.append(f"{icon} <code>[{l.created_at[:19]}]</code> [{l.module}] <b>{l.action}</b>: {l.details}")
    lines.append("━━━━━━━━━━━━━━━━━━━━\n🔒 <i>Sentinela Frigate Pro System</i>")

    text = "\n".join(lines)
    ok = await telegram_vault_service.send_message(text)

    await audit_service.log(
        action="TELEGRAM_LOGS_TEST",
        module="TELEGRAM",
        severity="SUCCESS" if ok else "WARNING",
        details="Relatório de logs enviado para o Telegram.",
        client_ip=client_ip
    )

    if ok:
        return {"status": "success", "message": "📋 Relatório de logs enviado com sucesso para o Telegram!"}
    else:
        raise HTTPException(status_code=500, detail="Falha ao enviar logs para o Telegram.")


@router.post("/telegram/test-status")
async def test_telegram_status(request: Request):
    client_ip = request.client.host if request.client else "unknown"
    if not telegram_vault_service.is_configured:
        await telegram_vault_service.load_credentials_from_db()
    if not telegram_vault_service.is_configured:
        raise HTTPException(status_code=400, detail="Telegram não configurado.")

    status_text = await telegram_vault_service.get_system_status_text()
    ok = await telegram_vault_service.send_message(status_text)

    await audit_service.log(
        action="TELEGRAM_STATUS_TEST",
        module="TELEGRAM",
        severity="SUCCESS" if ok else "WARNING",
        details="Diagnóstico de telemetria enviado para o Telegram.",
        client_ip=client_ip
    )

    if ok:
        return {"status": "success", "message": "⚡ Diagnóstico de hardware enviado com sucesso para o Telegram!"}
    else:
        raise HTTPException(status_code=500, detail="Falha ao enviar diagnóstico para o Telegram.")





@router.get("/dnd")
async def get_dnd_settings(db: AsyncSession = Depends(get_db)):
    from app.db.models import SystemSetting
    stmt = select(SystemSetting)
    res = await db.execute(stmt)
    all_settings = {s.key: s.value for s in res.scalars().all()}

    dnd_enabled_val = all_settings.get("dnd_enabled", "false").lower() == "true"
    dnd_start_val = int(all_settings.get("dnd_start_hour", "23"))
    dnd_end_val = int(all_settings.get("dnd_end_hour", "6"))

    return {
        "enabled": dnd_enabled_val,
        "start_hour": dnd_start_val,
        "end_hour": dnd_end_val
    }

@router.post("/dnd")
async def update_dnd_settings(cfg: DNDConfigUpdate, db: AsyncSession = Depends(get_db)):
    pip_gateway_service._dnd_enabled = cfg.enabled
    pip_gateway_service._dnd_start_hour = cfg.start_hour
    pip_gateway_service._dnd_end_hour = cfg.end_hour

    from app.db.models import SystemSetting
    for k, v in [("dnd_enabled", str(cfg.enabled).lower()), ("dnd_start_hour", str(cfg.start_hour)), ("dnd_end_hour", str(cfg.end_hour))]:
        stmt = select(SystemSetting).where(SystemSetting.key == k)
        res = await db.execute(stmt)
        setting_obj = res.scalar_one_or_none()
        if setting_obj:
            setting_obj.value = v
        else:
            db.add(SystemSetting(key=k, value=v))
    await db.commit()

    return {"status": "updated", "dnd": cfg.model_dump()}


@router.post("/pause")
async def pause_alerts(req: PauseAlertsRequest):
    telegram_vault_service.pause_alerts(req.minutes)
    return {
        "status": "paused",
        "minutes": req.minutes,
        "until": telegram_vault_service.pause_until.isoformat() if telegram_vault_service.pause_until else None
    }

@router.post("/resume")
async def resume_alerts():
    telegram_vault_service.pause_until = None
    return {"status": "resumed"}

@router.get("/backup")
async def export_backup(db: AsyncSession = Depends(get_db)):
    cams_res = await db.execute(select(Camera))
    cams = cams_res.scalars().all()
    devs_res = await db.execute(select(PairedDevice))
    devs = devs_res.scalars().all()

    return {
        "version": "2.0-pro",
        "cameras": [
            {
                "name": c.name,
                "friendly_name": c.friendly_name,
                "rtsp_main": c.rtsp_main,
                "ip_address": c.ip_address,
                "enabled": c.enabled
            }
            for c in cams
        ],
        "devices": [
            {
                "identifier": d.device_identifier,
                "name": d.friendly_name,
                "type": d.device_type,
                "ip": d.ip_address
            }
            for d in devs
        ],
        "telegram_configured": telegram_vault_service.is_configured,
        "dnd_enabled": pip_gateway_service._dnd_enabled
    }

@router.get("/backup/db")
async def download_database_file():
    """Returns the sentinela.db SQLite binary file directly as a download."""
    import os
    from fastapi.responses import FileResponse
    db_paths = ["/app/data/sentinela.db", "./data/sentinela.db", "data/sentinela.db"]
    for p in db_paths:
        if os.path.exists(p):
            return FileResponse(
                path=p,
                filename="sentinela.db",
                media_type="application/x-sqlite3"
            )
    raise HTTPException(status_code=404, detail="Banco de dados sentinela.db não encontrado no servidor.")

@router.post("/backup/telegram")
async def dispatch_backup_to_telegram():
    """Dispatches the database sentinela.db directly to the configured Telegram chat."""
    import os
    import datetime
    db_paths = ["/app/data/sentinela.db", "./data/sentinela.db", "data/sentinela.db"]
    found_path = None
    for p in db_paths:
        if os.path.exists(p):
            found_path = p
            break
    if not found_path:
        raise HTTPException(status_code=404, detail="Banco de dados SQLite sentinela.db não encontrado.")

    with open(found_path, "rb") as f:
        content = f.read()

    now_tag = datetime.datetime.now().strftime("%Y%m%d_%H%M")
    filename = f"sentinela_backup_{now_tag}.db"
    caption = f"💾 *Backup do Banco de Dados Sentinela*\nArquivo: `{filename}` ({len(content) // 1024} KB)\nData: {datetime.datetime.now().strftime('%d/%m/%Y %H:%M:%S')}"
    
    success = await telegram_vault_service.send_document(content, filename=filename, caption=caption)
    if success:
        return {"status": "success", "message": "Backup enviado com sucesso para o seu Telegram!"}
    raise HTTPException(status_code=500, detail="Falha ao enviar documento para o Telegram. Verifique Token e Chat ID.")


