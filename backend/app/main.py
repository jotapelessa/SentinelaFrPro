import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.db.session import init_db
from app.api import cameras, events, telemetry, scanner, devices, settings as settings_api, ws
from app.services.mqtt_service import mqtt_service

import time
from starlette.requests import Request
from starlette.responses import Response
from app.core.logging_handler import MemoryRingBufferHandler

# Setup logging
log_formatter = logging.Formatter("%(asctime)s [%(levelname)s] %(name)s: %(message)s")

root_logger = logging.getLogger()
root_logger.setLevel(logging.INFO)

# Console handler
console_handler = logging.StreamHandler()
console_handler.setFormatter(log_formatter)
root_logger.addHandler(console_handler)

# Memory ring buffer handler for UI log streaming
ring_handler = MemoryRingBufferHandler()
ring_handler.setFormatter(log_formatter)
root_logger.addHandler(ring_handler)

logger = logging.getLogger("sentinela")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🛡️ Sentinela Frigate Pro Orchestrator iniciando...")
    # Initialize Database
    await init_db()
    logger.info("Database SQLite assíncrono inicializado.")

    # Load Telegram Credentials from DB
    from app.services.telegram_vault import telegram_vault_service
    await telegram_vault_service.load_credentials_from_db()


    # Start Background MQTT Listener
    mqtt_task = asyncio.create_task(mqtt_service.start_listening())
    
    # Start Background Telemetry WebSocket loop
    telemetry_task = asyncio.create_task(ws.telemetry_broadcast_loop())

    # Start Background Telegram Bot Poller
    telegram_task = telegram_vault_service.start_polling_task()

    yield

    logger.info("Encerrando serviços Sentinela...")
    mqtt_task.cancel()
    telemetry_task.cancel()
    if telegram_task:
        telegram_task.cancel()
    try:
        await asyncio.gather(mqtt_task, telemetry_task, return_exceptions=True)
    except Exception:
        pass

app = FastAPI(
    title=settings.APP_TITLE,
    version="001.000.000.082",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def audit_http_requests(request: Request, call_next):
    start_t = time.perf_counter()
    try:
        response: Response = await call_next(request)
        duration_ms = (time.perf_counter() - start_t) * 1000
        client_ip = request.client.host if request.client else "unknown"
        path = request.url.path

        # Log detailed line, except high frequency polling (only log errors on polling)
        if not path.startswith("/api/telemetry") or response.status_code >= 400:
            logger.info(f"🌐 [HTTP] {request.method} {path} -> {response.status_code} ({duration_ms:.1f}ms) [{client_ip}]")
        return response
    except Exception as exc:
        duration_ms = (time.perf_counter() - start_t) * 1000
        client_ip = request.client.host if request.client else "unknown"
        logger.error(f"❌ [HTTP FAIL] {request.method} {request.url.path} ({duration_ms:.1f}ms) [{client_ip}] - Error: {exc}", exc_info=True)
        raise exc


# Register API Routers
app.include_router(telemetry.router, prefix="/api")
app.include_router(cameras.router, prefix="/api")
app.include_router(events.router, prefix="/api")
app.include_router(scanner.router, prefix="/api")
app.include_router(devices.router, prefix="/api")
app.include_router(settings_api.router, prefix="/api")
app.include_router(ws.router)

@app.get("/health")
@app.get("/api/health")
async def health_check():
    return {
        "status": "online",
        "system": settings.PROJECT_NAME,
        "version": settings.VERSION
    }

@app.get("/")
async def root():
    return {
        "system": "Sentinela Frigate Pro Orchestrator",
        "status": "online",
        "version": settings.VERSION
    }
