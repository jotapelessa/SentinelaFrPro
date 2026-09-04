import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="allow")

    PROJECT_NAME: str = "SentinelaFrigate PRO"
    APP_TITLE: str = "Sentinela NVR"
    VERSION: str = "SentinelaPro.001.000.000.052"
    API_V1_STR: str = "/api"
    ENVIRONMENT: str = "production"
    DEBUG: bool = False
    
    # Server & CORS
    HOST: str = "0.0.0.0"
    PORT: int = 8080
    ALLOWED_ORIGINS: List[str] = ["*"]
    
    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:////app/data/sentinela.db"
    
    # MQTT Broker (Mosquitto)
    MQTT_BROKER: str = "mosquitto"
    MQTT_PORT: int = 1883
    MQTT_TOPIC_PREFIX: str = "frigate"
    MQTT_CLIENT_ID: str = "sentinela_orchestrator"
    
    # Frigate & go2rtc APIs
    FRIGATE_API_URL: str = "http://frigate:5000"
    GO2RTC_API_URL: str = "http://frigate:1984"
    MEDIA_DIR: str = "/media/frigate"
    
    # Telegram Cloud Vault
    TELEGRAM_BOT_TOKEN: str = "8857963953:AAFsPQ965S6IgoEaWPkTghMbf6Qv6YCWu0E"
    TELEGRAM_CHAT_ID: str = "-1003995215102"

    
    # Hardware & Performance
    TELEMETRY_INTERVAL_SECONDS: int = 3
    LOW_DISK_ALERT_GB: int = 15

settings = Settings()
