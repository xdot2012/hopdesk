"""Pytest harness: FastAPI + SQLite in-memory + minimal seed."""

from __future__ import annotations

from collections.abc import Generator
from contextlib import asynccontextmanager
from pathlib import Path
from uuid import uuid4

import pytest
from cryptography.fernet import Fernet
from fastapi import FastAPI
from fastapi_pagination import add_pagination
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool
from starlette.testclient import TestClient

import app.core.cache as cache_module
from app.core.cache.memory.repository import MemoryCacheRepository
from app.core.database import get_database_session
from app.core.errors.handlers import register_exception_handlers
from app.core.hash import get_hash_service
from app.core.middleware import configure_middleware
from app.core.roles import ROLE_ADMIN, ROLE_AGENT, ROLE_CUSTOMER
from app.models import Base
from app.models.sector.sector import Sector
from app.models.sector.user_sector import UserSector
from app.models.ticket.ticket_priority import TicketPriority
from app.models.user.role import Role
from app.models.user.user import User
from app.routes.healthcheck import router as health_router
from app.routes.v1.auth import router as auth_router_v1
from app.routes.v1.files import router as files_router_v1
from app.routes.v1.instance import router as instance_router_v1
from app.routes.v1.knowledge_base import router as knowledge_base_router_v1
from app.routes.v1.sector import router as sector_router_v1
from app.routes.v1.sla import router as sla_router_v1
from app.routes.v1.ticket import router as ticket_router_v1
from app.routes.v1.user import router as user_router_v1
from app.routes.v1.user_sector import router as user_sector_router_v1
from app.services.file_management import get_file_management_service
from app.services.file_management.repository import LocalFileManagementRepository
from app.services.file_management.service import FileManagementService
from app.settings import Settings, get_settings
from app.use_cases.seed.seed_helpdesk_defaults import seed_helpdesk_defaults


PASSWORD = "TestPass123!"
CUSTOMER_EMAIL = "customer@example.com"
AGENT_EMAIL = "agent@example.com"
ADMIN_EMAIL = "admin@example.com"


def _dedupe_sqlite_index_names() -> None:
    """SQLite requires unique index names; ORM can collide across tables."""
    seen: set[str] = set()
    for table in Base.metadata.tables.values():
        for index in list(table.indexes):
            name = index.name or f"ix_{table.name}_{id(index)}"
            if name in seen:
                index.name = f"{name}__{table.name}"
            seen.add(index.name or name)


def _build_test_settings(tmp_path: Path) -> Settings:
    return Settings(
        system_name="hopdesk-test",
        system_email="system@example.com",
        system_default_password=PASSWORD,
        environment="test",
        secret_key="test-secret-key-for-jwt-signing-only",
        encryption_key=Fernet.generate_key().decode(),
        algorithm="HS256",
        require_email_confirmation=False,
        require_two_factor=False,
        db_driver="sqlite",
        db_name=":memory:",
        use_redis=False,
        use_sentry=False,
        files_storage_root=str(tmp_path / "uploads"),
        files_public_base_url="http://testserver/v1/files",
        files_storage_backend="local",
        client_base_url="http://localhost:5173",
    )


def _create_app() -> FastAPI:
    @asynccontextmanager
    async def lifespan(_app: FastAPI):
        yield

    application = FastAPI(lifespan=lifespan)
    add_pagination(application)
    application.include_router(health_router)
    application.include_router(auth_router_v1)
    application.include_router(user_router_v1)
    application.include_router(files_router_v1)
    application.include_router(ticket_router_v1)
    application.include_router(instance_router_v1)
    application.include_router(sector_router_v1)
    application.include_router(user_sector_router_v1)
    application.include_router(sla_router_v1)
    application.include_router(knowledge_base_router_v1)
    register_exception_handlers(application)
    configure_middleware(application)
    return application


def _role_id(db: Session, role_name: str):
    return db.execute(select(Role).where(Role.name == role_name)).scalars().first().id


def _create_user(db: Session, *, email: str, role_name: str, name: str) -> User:
    hasher = get_hash_service()
    user = User(
        id=uuid4(),
        email=email,
        name=name,
        password=hasher.create_hash(PASSWORD),
        role_id=_role_id(db, role_name),
        email_confirmed=True,
    )
    db.add(user)
    db.flush()
    return user


@pytest.fixture()
def test_settings(tmp_path: Path) -> Settings:
    return _build_test_settings(tmp_path)


@pytest.fixture(autouse=True)
def memory_cache() -> None:
    """Swap Redis-bound singleton for in-memory repo (decorators capture the service)."""
    cache_module.cache_service.repository = MemoryCacheRepository()



@pytest.fixture()
def db_session(test_settings: Settings) -> Generator[Session, None, None]:
    _dedupe_sqlite_index_names()
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    SessionLocal = sessionmaker(bind=engine, expire_on_commit=False, autoflush=True)
    session = SessionLocal()
    try:
        seed_helpdesk_defaults(session)

        customer = _create_user(
            session, email=CUSTOMER_EMAIL, role_name=ROLE_CUSTOMER, name="Customer Test"
        )
        agent = _create_user(
            session, email=AGENT_EMAIL, role_name=ROLE_AGENT, name="Agent Test"
        )
        _create_user(session, email=ADMIN_EMAIL, role_name=ROLE_ADMIN, name="Admin Test")

        sector = Sector(id=uuid4(), name="Suporte", color="#0d9488")
        session.add(sector)
        session.flush()
        session.add(UserSector(user_id=customer.id, sector_id=sector.id))
        session.commit()

        session.info["customer_id"] = customer.id
        session.info["agent_id"] = agent.id
        session.info["sector_id"] = sector.id
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(engine)
        engine.dispose()


@pytest.fixture()
def file_service(test_settings: Settings) -> FileManagementService:
    root = Path(test_settings.files_storage_root)
    root.mkdir(parents=True, exist_ok=True)
    return FileManagementService(
        LocalFileManagementRepository(
            storage_root=str(root),
            public_base_url=test_settings.files_public_base_url,
        )
    )


@pytest.fixture()
def app(db_session: Session, test_settings: Settings, file_service: FileManagementService) -> FastAPI:
    application = _create_app()

    def override_db():
        yield db_session

    def override_settings():
        return test_settings

    def override_files():
        return file_service

    application.dependency_overrides[get_database_session] = override_db
    application.dependency_overrides[get_settings] = override_settings
    application.dependency_overrides[get_file_management_service] = override_files
    return application


@pytest.fixture()
def client(app: FastAPI) -> Generator[TestClient, None, None]:
    with TestClient(app) as test_client:
        yield test_client


def auth_headers(client: TestClient, email: str, password: str = PASSWORD) -> dict[str, str]:
    response = client.post(
        "/v1/auth/sign_in",
        json={"email": email, "password": password, "keepConnected": False},
    )
    assert response.status_code == 200, response.text
    token = response.json()["token"]
    return {"Authorization": f"{token['tokenType']} {token['accessToken']}"}


@pytest.fixture()
def customer_headers(client: TestClient) -> dict[str, str]:
    return auth_headers(client, CUSTOMER_EMAIL)


@pytest.fixture()
def agent_headers(client: TestClient) -> dict[str, str]:
    return auth_headers(client, AGENT_EMAIL)


@pytest.fixture()
def admin_headers(client: TestClient) -> dict[str, str]:
    return auth_headers(client, ADMIN_EMAIL)


@pytest.fixture()
def medium_priority_id(db_session: Session):
    priority = db_session.execute(
        select(TicketPriority).where(TicketPriority.code == "medium")
    ).scalars().first()
    assert priority is not None
    return priority.id
