from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.core.database import get_database_session
from functools import lru_cache

from sqlalchemy import StaticPool, create_engine

from sqlalchemy.orm import Session
from app.settings import Settings, get_settings


@lru_cache()
def override_get_settings() -> Settings:
    return Settings(
        current_environment="TEST",
        db_driver="sqlite",
        db_name="test",
    )


def override_get_database_service():
    engine = create_engine(
        url="sqlite+async:///app/tests/db/test.db",
        options={
            "connect_args": {"check_same_thread": False},
            "poolclass": StaticPool,
        }
        )
    SessionLocal = sessionmaker(engine, expire_on_commit=False, autoflush=True)

    with SessionLocal() as session:
        yield session


app.dependency_overrides[get_settings] = override_get_settings
app.dependency_overrides[get_database_session] = override_get_database_service
