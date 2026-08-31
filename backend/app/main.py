import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.db.session import init_db
from app.api import cameras, events, telemetry, scanner, devices, settings as settings_api, ws
from app.services.mqtt_service import mqtt_service

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
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
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
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

# Register API Routers
app.include_router(telemetry.router, prefix="/api")
app.include_router(cameras.router, prefix="/api")
app.include_router(events.router, prefix="/api")
app.include_router(scanner.router, prefix="/api")
app.include_router(devices.router, prefix="/api")
app.include_router(settings_api.router, prefix="/api")
app.include_router(ws.router)

@app.get("/")
async def root():
    return {
        "system": "Sentinela Frigate Pro Orchestrator",
        "status": "online",
        "version": settings.VERSION
    }
