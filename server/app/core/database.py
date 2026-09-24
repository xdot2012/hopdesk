from collections.abc import AsyncGenerator

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session

from app.settings import get_settings
from app.core.logs import get_logger
from app.core.startup import abort_startup, format_connection_error

settings = get_settings()
engine = create_engine(settings.get_database_url())
SessionLocal = sessionmaker(engine, expire_on_commit=False, autoflush=True)


async def get_database_session() -> AsyncGenerator[Session, None]:
    with SessionLocal() as session:
        yield session


async def test_database_connection() -> None:
    logger = get_logger()
    try:
        with engine.connect() as conn:
            conn.execute(text('SELECT 1'))
    except Exception as e:
        abort_startup(format_connection_error('database', e))

    logger.info('Database connection successful')
