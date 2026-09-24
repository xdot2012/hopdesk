from contextlib import asynccontextmanager

import uvicorn
from app.core.cache import cache_service
from app.core.database import SessionLocal, test_database_connection
from app.core.errors.handlers import register_exception_handlers
from app.core.logs import get_logger
from app.core.middleware import configure_middleware
from app.core.startup import abort_startup, format_startup_error
from app.cron import start_cron_jobs
from app.routes.healthcheck import router as health_router
from app.routes.v1.auth import router as auth_router_v1
from app.routes.v1.files import router as files_router_v1
from app.routes.v1.instance import router as instance_router_v1
from app.routes.v1.knowledge_base import router as knowledge_base_router_v1
from app.routes.v1.user_sector import router as user_sector_router_v1
from app.routes.v1.sector import router as sector_router_v1
from app.routes.v1.sla import router as sla_router_v1
from app.routes.v1.ticket import router as ticket_router_v1
from app.routes.v1.user import router as user_router_v1
from app.services.monitor import start_monitor_service
from app.settings import Settings, get_settings
from app.use_cases.seed.seed_helpdesk_defaults import seed_helpdesk_defaults
from app.use_cases.seed.seed_tickets import seed_tickets
from fastapi import FastAPI
from fastapi_pagination import add_pagination


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger = get_logger()

    try:
        settings: Settings = get_settings()
        logger.info('Using environment %s', settings.environment.upper())

        await test_database_connection()
        await cache_service.test_connection()

        await cache_service.clear()
        logger.info('Cache cleared successfully')

        start_monitor_service(
            environment=settings.environment,
            use_sentry=settings.use_sentry,
            dsn=settings.sentry_dsn,
            profiles_sample=settings.monitor_profile_sample,
            traces_sample=settings.monitor_traces_sample_rate,
        )
        logger.info('Monitor service started (%s)', 'sentry' if settings.use_sentry else'mock')

        with SessionLocal() as db:
            seed_helpdesk_defaults(db)
            if settings.environment == "dev":
                seeded = seed_tickets(db)
                if seeded:
                    logger.info("Seeded %s test tickets", seeded)
            await start_cron_jobs(settings, db)
    except Exception as e:
        abort_startup(format_startup_error(e))

    yield


app = FastAPI(lifespan=lifespan)
add_pagination(app)

app.include_router(health_router)
app.include_router(auth_router_v1)
app.include_router(user_router_v1)
app.include_router(files_router_v1)
app.include_router(ticket_router_v1)
app.include_router(instance_router_v1)
app.include_router(sector_router_v1)
app.include_router(user_sector_router_v1)
app.include_router(sla_router_v1)
app.include_router(knowledge_base_router_v1)

register_exception_handlers(app)

configure_middleware(app)


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
