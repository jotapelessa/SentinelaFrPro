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
            ("record_mode", "VARCHAR(32) DEFAULT 'motion'"),
            ("record_retain_days", "INTEGER DEFAULT 14"),
            ("record_audio", "BOOLEAN DEFAULT 0"),
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

        # SQLite automatic column migration for paired_devices
        paired_columns = [
            ("allowed_cameras", "TEXT"),
            ("tailscale_ip", "VARCHAR(64)"),
            ("last_seen", "DATETIME")
        ]
        for col_name, col_def in paired_columns:
            try:
                from sqlalchemy import text
                await conn.execute(text(f"ALTER TABLE paired_devices ADD COLUMN {col_name} {col_def}"))
            except Exception:
                pass

