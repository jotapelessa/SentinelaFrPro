import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="allow")

    PROJECT_NAME: str = "Sentinela Frigate Core API"
    APP_TITLE: str = "Sentinela NVR Core"
    APP_NAME: str = "Sentinela NVR Core"
    VERSION: str = "001.000.000.159"
    APP_VERSION: str = "001.000.000.159"
    API_V1_STR: str = "/api"
    ENVIRONMENT: str = "production"
    DEBUG: bool = False

    # Server & CORS
    # SEC-002: origens restritas — jamais usar "*" em produção
    HOST: str = "0.0.0.0"
    PORT: int = 8080
    ALLOWED_ORIGINS: List[str] = [
        "http://sentinela.local",
        "http://sentinela.local:8088",
        "http://192.168.1.247:8088",
        "https://frigate.tail47a54f.ts.net",
        # Em dev local permite localhost
        "http://localhost:3000",
        "http://localhost:8088",
    ]

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:////app/data/sentinela.db"

    # MQTT Broker (Mosquitto)
    MQTT_BROKER: str = "mosquitto"
    MQTT_PORT: int = 1883
    MQTT_TOPIC_PREFIX: str = "frigate"
    MQTT_CLIENT_ID: str = "sentinela_orchestrator"
    # SEC-001: credenciais MQTT via env var (definir no docker-compose .env)
    MQTT_USER: str = ""
    MQTT_PASSWORD: str = ""

    # Frigate & go2rtc APIs
    FRIGATE_API_URL: str = "http://frigate:5000"
    GO2RTC_API_URL: str = "http://frigate:1984"
    MEDIA_DIR: str = "/media/frigate"

    # Telegram Cloud Vault (loaded from environment / .env)
    TELEGRAM_BOT_TOKEN: str = ""
    TELEGRAM_CHAT_ID: str = ""

    # Hardware & Performance
    TELEMETRY_INTERVAL_SECONDS: int = 3
    LOW_DISK_ALERT_GB: int = 15

settings = Settings()
