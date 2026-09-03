from fastapi import APIRouter, Body
from app.services.telemetry import telemetry_service
from app.services.telegram_vault import telegram_vault_service
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

router = APIRouter(prefix="/telemetry", tags=["Telemetry"])

class BenchmarkPayload(BaseModel):
    benchmark_type: str # '1080p', '2k', '4k', 'detection', 'image_hud'

@router.get("")
@router.get("/")
async def get_telemetry():
    snapshot = telemetry_service.get_telemetry_snapshot()
    snapshot["telegram"] = {
        "configured": telegram_vault_service.is_configured,
        "paused": telegram_vault_service.is_paused()
    }
    return snapshot

@router.get("/frigate-status")
async def get_frigate_deep_status():
    """Returns deep connectivity status with Frigate NVR REST API, MQTT bus, go2rtc streams and active detectors."""
    from app.services.frigate_bridge import frigate_bridge
    return await frigate_bridge.check_connectivity()

@router.get("/stats-detailed")

async def get_detailed_stats():
    """Returns real-time hardware telemetry, per-core CPU, RAM breakdown, NVMe partitions and Top Ubuntu processes."""
    return telemetry_service.get_detailed_stats()

@router.post("/benchmark")
async def run_server_benchmark(payload: BenchmarkPayload):
    """Runs on-demand stress & performance benchmarks for 1080p, 2K, 4K, IA detection and image processing."""
    res = telemetry_service.run_benchmark(payload.benchmark_type)
    return res


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

async def fetch_docker_container_logs(container_name: str, lines: int = 150) -> Optional[List[str]]:
    import os
    if not os.path.exists("/var/run/docker.sock"):
        return None
    try:
        import httpx
        transport = httpx.AsyncHTTPTransport(uds="/var/run/docker.sock")
        async with httpx.AsyncClient(transport=transport, timeout=3.0) as client:
            url = f"http://localhost/v1.41/containers/{container_name}/logs?stdout=1&stderr=1&tail={lines}&timestamps=1"
            res = await client.get(url)
            if res.status_code == 200:
                raw_bytes = res.content
                clean_lines = []
                for line in raw_bytes.decode('utf-8', errors='ignore').splitlines():
                    if len(line) > 8 and ord(line[0]) in (1, 2) and line[1:4] == '\x00\x00\x00':
                        clean_lines.append(line[8:])
                    else:
                        clean_lines.append(line)
                return clean_lines[-lines:] if clean_lines else ["(Container sem logs recentes no momento)"]
    except Exception:
        pass
    return None

@router.get("/logs")
async def get_service_logs(service: str = "backend", lines: int = 150):
    """Fetches real-time log lines for the requested service or container."""
    import httpx
    from app.core.config import settings
    from app.core.logging_handler import get_backend_logs

    # Map friendly service names to docker container names
    container_map = {
        "backend": "sentinela_backend",
        "frigate": "sentinela_frigate",
        "frontend": "sentinela_frontend",
        "nginx": "sentinela_nginx",
        "mosquitto": "sentinela_mosquitto"
    }

    if service in container_map:
        docker_logs = await fetch_docker_container_logs(container_map[service], lines)
        if docker_logs is not None and len(docker_logs) > 0:
            return {"service": service, "logs": docker_logs, "source": "docker_engine"}

    if service == "backend":
        raw_logs = get_backend_logs(lines)
        return {"service": "backend", "logs": raw_logs, "source": "memory_buffer"}

    if service == "frigate":
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                res = await client.get(f"{settings.FRIGATE_API_URL}/api/logs/frigate")
                if res.status_code == 200:
                    raw_lines = res.text.splitlines()[-lines:]
                    return {"service": "frigate", "logs": raw_lines, "source": "frigate_api"}
        except Exception as e:
            return {"service": "frigate", "logs": [f"⚠️ Erro ao consultar logs do Frigate API: {e}"]}

    if service == "go2rtc":
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                res = await client.get(f"{settings.FRIGATE_API_URL}/api/logs/go2rtc")
                if res.status_code == 200:
                    raw_lines = res.text.splitlines()[-lines:]
                    return {"service": "go2rtc", "logs": raw_lines, "source": "go2rtc_api"}
                res2 = await client.get(f"{settings.GO2RTC_API_URL}/api/logs")
                if res2.status_code == 200:
                    raw_lines = res2.text.splitlines()[-lines:]
                    return {"service": "go2rtc", "logs": raw_lines, "source": "go2rtc_api"}
        except Exception as e:
            return {"service": "go2rtc", "logs": [f"⚠️ Erro ao consultar logs do go2rtc: {e}"]}

    if service == "tailscale":
        import asyncio
        try:
            proc = await asyncio.create_subprocess_shell(
                "tailscale status",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, _ = await proc.communicate()
            status_lines = stdout.decode('utf-8', errors='ignore').splitlines()
            return {
                "service": "tailscale",
                "logs": [
                    "🔒 [TAILSCALE FUNNEL] Status da Conexão:",
                    *status_lines,
                    "🌐 Domínio Público HTTPS: https://sentinela.tail47a54f.ts.net (Porta 8088)"
                ]
            }
        except Exception as e:
            return {
                "service": "tailscale",
                "logs": [
                    f"🔒 [TAILSCALE] Domínio Funnel: https://sentinela.tail47a54f.ts.net",
                    f"🔒 [TAILSCALE] IP do Servidor Ubuntu: 100.93.129.91",
                    f"🔒 [TAILSCALE] Proxy Ativo: Porta 443 (SSL) -> 8088 (Nginx Local)"
                ]
            }

    if service == "system":
        import os
        import platform
        import psutil
        import datetime
        lines_list = [
            f"🖥️ [SISTEMA UBUNTU] Host: {platform.node()} ({platform.system()} {platform.release()})",
            f"⏱️ [UPTIME] Boot: {datetime.datetime.fromtimestamp(psutil.boot_time()).strftime('%Y-%m-%d %H:%M:%S')}",
            f"🧠 [CPU] {psutil.cpu_count(logical=True)} Cores | Uso Total: {psutil.cpu_percent()}%",
            f"🌡️ [TEMPERATURA] {telemetry_service.get_telemetry_snapshot()['cpu']['temperature_celsius']}°C",
            f"💾 [MEMÓRIA RAM] Usada: {psutil.virtual_memory().used // (1024*1024)} MB / Total: {psutil.virtual_memory().total // (1024*1024)} MB ({psutil.virtual_memory().percent}%)",
            f"💿 [DISCO SSD NVMe] Usado: {psutil.disk_usage('/').used // (1024*1024*1024)} GB / Total: {psutil.disk_usage('/').total // (1024*1024*1024)} GB ({psutil.disk_usage('/').percent}%)",
            f"⚡ [GPU VAAPI DRI] {'Ativo (/dev/dri/renderD128)' if os.path.exists('/dev/dri/renderD128') else 'Não detectado'}"
        ]
        return {"service": "system", "logs": lines_list, "source": "ubuntu_kernel"}

    if service == "mqtt_traffic":
        from app.services.mqtt_service import mqtt_service
        traffic = mqtt_service.get_mqtt_traffic(lines)
        if not traffic:
            return {"service": "mqtt_traffic", "logs": ["📡 Nenhum pacote MQTT registrado no buffer recente."], "source": "mqtt_bus"}
        formatted = [
            f"[{t['timestamp']}] {t['topic']} -> {t['data']}" for t in traffic
        ]
        return {"service": "mqtt_traffic", "logs": formatted, "source": "mqtt_bus"}

    if service == "telegram_audit":
        audit = telegram_vault_service.get_audit_logs(lines)
        if not audit:
            return {"service": "telegram_audit", "logs": ["📤 Nenhuma notificação do Telegram enviada recentemente."], "source": "telegram_vault"}
        formatted = [
            f"[{a['timestamp']}] {'✅' if a['success'] else '❌'} {a['action']} -> {a['details']}" + (f" (Erro: {a['error']})" if a.get("error") else "")
            for a in audit
        ]
        return {"service": "telegram_audit", "logs": formatted, "source": "telegram_vault"}

    if service == "pip_audit":
        from app.services.pip_gateway import pip_gateway_service
        pip_logs = pip_gateway_service.get_dispatch_history(lines)
        if not pip_logs:
            return {"service": "pip_audit", "logs": ["📺 Nenhum alerta PiP disparado recentemente."], "source": "pip_gateway"}
        formatted = [
            f"[{p.get('timestamp', '--')}] {p.get('camera')} ({p.get('label')}) -> {p.get('devices_count', 0)} dispositivo(s) notificado(s)"
            for p in pip_logs
        ]
        return {"service": "pip_audit", "logs": formatted, "source": "pip_gateway"}

    return {"service": service, "logs": get_backend_logs(lines)}

@router.get("/logs/download")
async def download_diagnostic_logs():
    """Compiles a complete diagnostic report (.txt) of all services for one-click troubleshooting."""
    import datetime
    import httpx
    from fastapi.responses import Response
    from app.core.config import settings
    from app.core.logging_handler import get_backend_logs

    now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    now_file = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")

    diag_data = await get_system_diagnostics()

    # Collect backend logs
    backend_logs = "\n".join(get_backend_logs(300))

    # Collect frigate logs
    frigate_logs = "Indisponível"
    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            res = await client.get(f"{settings.FRIGATE_API_URL}/api/logs/frigate")
            if res.status_code == 200:
                frigate_logs = res.text
    except Exception as e:
        frigate_logs = f"Erro: {e}"

    # Collect go2rtc logs
    go2rtc_logs = "Indisponível"
    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            res = await client.get(f"{settings.FRIGATE_API_URL}/api/logs/go2rtc")
            if res.status_code == 200:
                go2rtc_logs = res.text
    except Exception as e:
        go2rtc_logs = f"Erro: {e}"

    report = f"""================================================================================
🛡️ SENTINELA FRIGATE PRO — RELATÓRIO DE DIAGNÓSTICO & LOGS UNIFICADOS
Gerado em: {now_str}
Versão: {settings.VERSION}
================================================================================

[1] HARDWARE & PLATAFORMA:
- Plataforma: {diag_data.get('hardware', {}).get('platform')}
- GPU / Driver: {diag_data.get('hardware', {}).get('gpu')}
- Aceleração VAAPI (/dev/dri/renderD128): {'SIM' if diag_data.get('hardware', {}).get('vaapi_dri') else 'NÃO'}
- CPU Usage: {diag_data.get('telemetry', {}).get('cpu', {}).get('usage_percent')}%
- CPU Temp: {diag_data.get('telemetry', {}).get('cpu', {}).get('temperature_celsius')}°C
- RAM Utilizada: {diag_data.get('telemetry', {}).get('ram', {}).get('used_mb')}MB / {diag_data.get('telemetry', {}).get('ram', {}).get('total_mb')}MB ({diag_data.get('telemetry', {}).get('ram', {}).get('percent')}%)
- SSD NVMe Livre: {diag_data.get('telemetry', {}).get('disk', {}).get('free_gb')}GB / {diag_data.get('telemetry', {}).get('disk', {}).get('total_gb')}GB

[2] STATUS DOS MICROSERVIÇOS:
- Frigate NVR: {'ONLINE (' + str(diag_data.get('services', {}).get('frigate', {}).get('version')) + ')' if diag_data.get('services', {}).get('frigate', {}).get('online') else 'OFFLINE'}
- go2rtc WebRTC: {'ONLINE' if diag_data.get('services', {}).get('go2rtc', {}).get('online') else 'OFFLINE'}
- MQTT Broker: {diag_data.get('services', {}).get('mosquitto', {}).get('status')} ({diag_data.get('services', {}).get('mosquitto', {}).get('broker')})
- Telegram Vault: {'CONFIGURADO' if diag_data.get('services', {}).get('telegram', {}).get('configured') else 'NÃO CONFIGURADO'} (Pausado: {'SIM' if diag_data.get('services', {}).get('telegram', {}).get('paused') else 'NÃO'})

================================================================================
[3] LOGS DO SENTINELA ORCHESTRATOR (BACKEND FASTAPI / MQTT / TELEGRAM):
================================================================================
{backend_logs}

================================================================================
[4] LOGS DO FRIGATE NVR (DETECTION & FFMPEG ENGINE):
================================================================================
{frigate_logs}

================================================================================
[5] LOGS DO GO2RTC (WEBRTC & RTSP STREAMING):
================================================================================
{go2rtc_logs}

================================================================================
FIM DO RELATÓRIO DE DIAGNÓSTICO
================================================================================
"""

    return Response(
        content=report,
        media_type="text/plain; charset=utf-8",
        headers={"Content-Disposition": f"attachment; filename=sentinela_diagnostico_{now_file}.txt"}
    )

from fastapi import Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.db.session import get_db
from app.db.models import AuditLog

@router.get("/audit")
async def get_audit_logs(
    module: str = Query("ALL", description="Filter by area: ALL, CAMERA, TELEGRAM, PIP, FRIGATE, SYSTEM"),
    severity: str = Query("ALL", description="Filter by severity: ALL, INFO, WARNING, ERROR, SUCCESS"),
    search: str = Query("", description="Search term"),
    limit: int = Query(200, description="Max logs to return"),
    db: AsyncSession = Depends(get_db)
):
    """Returns application audit logs with newest events at the top (DESC order)."""
    stmt = select(AuditLog)
    
    if module != "ALL":
        stmt = stmt.where(AuditLog.module == module.upper())
    if severity != "ALL":
        stmt = stmt.where(AuditLog.severity == severity.upper())
    if search:
        search_pattern = f"%{search}%"
        stmt = stmt.where(AuditLog.details.ilike(search_pattern) | AuditLog.action.ilike(search_pattern))
        
    stmt = stmt.order_by(desc(AuditLog.created_at)).limit(limit)
    res = await db.execute(stmt)
    items = res.scalars().all()
    
    return {
        "total": len(items),
        "logs": [
            {
                "id": log.id,
                "action": log.action,
                "module": log.module,
                "severity": log.severity,
                "details": log.details,
                "client_ip": log.client_ip or "127.0.0.1",
                "created_at": log.created_at.strftime("%d/%m/%Y, %H:%M:%S") if log.created_at else ""
            }
            for log in items
        ]
    }



