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
