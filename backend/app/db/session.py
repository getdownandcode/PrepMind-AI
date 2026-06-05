"""Database session and base."""
from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.core.config import get_settings

_settings = get_settings()

kwargs = {
    "echo": False,
    "pool_pre_ping": True,
}
if not _settings.database_url.startswith("sqlite"):
    kwargs["pool_size"] = 5
    kwargs["max_overflow"] = 10

engine = create_async_engine(_settings.database_url, **kwargs)

SessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async with SessionLocal() as session:
        yield session
