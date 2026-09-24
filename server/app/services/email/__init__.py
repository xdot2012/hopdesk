from functools import lru_cache

from .service import EmailService
from .repository import FastAPIMAILEmailRepository
from app.settings import Settings, get_settings

@lru_cache
def get_email_service() -> EmailService:
    settings: Settings = get_settings()
    if settings.environment == "production":
        repository = FastAPIMAILEmailRepository(
            host=settings.email_host,
            port=settings.email_port,
            user=settings.email_user,
            password=settings.email_password,
            use_credentials=True,
            use_tls=True,
            use_ssl_tls=False,
            validate_certs=True,
            debug=False,
        )
    else:
        repository = FastAPIMAILEmailRepository(
            host=settings.email_host,
            port=settings.email_port,
            user=settings.email_user,
            password=settings.email_password,
        )

    return EmailService(repository)
