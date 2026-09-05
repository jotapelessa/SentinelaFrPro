import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from app.core.config import settings

# In dev/local without container volume, fallback to local path if directory doesn't exist
db_url = settings.DATABASE_URL
if db_url.startswith("sqlite+aiosqlite:////app/data/") and not os.path.exists("/app/data"):
    os.makedirs("./data", exist_ok=True)
    db_url = "sqlite+aiosqlite:///./data/sentinela.db"

engine = create_async_engine(
    db_url,
    echo=settings.DEBUG,
    future=True
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

Base = declarative_base()

async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
        # SQLite automatic column migration for existing databases
        columns_to_add = [
            ("friendly_name", "VARCHAR(128)"),
            ("rtsp_sub", "VARCHAR(512)"),
            ("ip_address", "VARCHAR(64)"),
            ("onvif_port", "INTEGER DEFAULT 80"),
            ("enabled", "BOOLEAN DEFAULT 1"),
            ("zones", "TEXT"),
            ("objects_to_track", 'VARCHAR(256) DEFAULT \'["person", "car", "motorcycle", "dog"]\''),
            ("min_score", "FLOAT DEFAULT 0.70"),
            ("detect_fps", "INTEGER DEFAULT 5"),
            ("motion_threshold", "INTEGER DEFAULT 25"),
            ("record_mode", "VARCHAR(32) DEFAULT 'motion'"),
            ("record_retain_days", "INTEGER DEFAULT 14"),
            ("record_audio", "BOOLEAN DEFAULT 0"),
            ("stream_mode", "VARCHAR(32) DEFAULT 'mse'"),
            ("eco_fps", "INTEGER DEFAULT 10"),
            ("record_fps", "INTEGER DEFAULT 24"),
            ("notify_telegram", "BOOLEAN DEFAULT 1"),
            ("notify_tv", "BOOLEAN DEFAULT 1"),
            ("notify_audio", "BOOLEAN DEFAULT 1"),
            ("cooldown_seconds", "INTEGER DEFAULT 10")
        ]
        
        # SQLite automatic column migration for cameras
        for col_name, col_def in columns_to_add:
            try:
                from sqlalchemy import text
                await conn.execute(text(f"ALTER TABLE cameras ADD COLUMN {col_name} {col_def}"))
            except Exception:
                pass

        # SQLite automatic column migration for events (video_sent idempotency flag)
        try:
            from sqlalchemy import text
            await conn.execute(text("ALTER TABLE events ADD COLUMN video_sent BOOLEAN DEFAULT 0"))
        except Exception:
            pass

        # SQLite automatic column migration for paired_devices
        paired_columns = [
            ("allowed_cameras", "TEXT"),
            ("allowed_events", "TEXT"),
            ("allow_recordings", "BOOLEAN DEFAULT 1"),
            ("allow_live_stream", "BOOLEAN DEFAULT 1"),
            ("allow_pip_alerts", "BOOLEAN DEFAULT 1"),
            ("allow_restart_containers", "BOOLEAN DEFAULT 0"),
            ("allow_reboot_server", "BOOLEAN DEFAULT 0"),
            ("pip_default_size", "VARCHAR(32) DEFAULT 'medium'"),
            ("pip_duration_seconds", "INTEGER DEFAULT 10"),
            ("pip_position", "VARCHAR(32) DEFAULT 'TOP_RIGHT'"),
            ("tailscale_ip", "VARCHAR(64)"),
            ("is_master_admin", "BOOLEAN DEFAULT 0"),
            ("admin_unlocked_at", "DATETIME"),
            ("mac_address", "VARCHAR(64)"),
            ("connection_type", "VARCHAR(32) DEFAULT 'wifi'"),
            ("network_speed_mbps", "FLOAT"),
            ("app_version", "VARCHAR(32)"),
            ("device_model", "VARCHAR(64)"),
            ("recent_logs", "TEXT"),
            ("last_seen", "DATETIME")
        ]
        for col_name, col_def in paired_columns:
            try:
                from sqlalchemy import text
                await conn.execute(text(f"ALTER TABLE paired_devices ADD COLUMN {col_name} {col_def}"))
            except Exception:
                pass

