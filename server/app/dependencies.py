from typing import Annotated

from fastapi import Depends, Request
from sqlalchemy.orm import Session

from app.core.i18n import get_request_locale

from app.core.token import get_token_service, TokenService, validate_user_token, get_refresh_token, RefreshTokenData
from app.core.database import get_database_session
from app.core.hash import get_hash_service
from app.core.hash import HashService

from app.models.user.session import Session as AuthSession

from app.core.cache import CacheService, get_cache_service
from app.services.email import get_email_service, EmailService
from app.services.file_management import get_file_management_service, FileManagementService
from app.services.text_processor import get_text_processor_service, TextProcessorService

DatabaseDependency = Annotated[Session, Depends(get_database_session)]
CacheDependency = Annotated[CacheService, Depends(get_cache_service)]
HasherDependency = Annotated[HashService, Depends(get_hash_service)]
TokenServiceDependency = Annotated[TokenService, Depends(get_token_service)]
AuthTokenDependency = Annotated[AuthSession, Depends(validate_user_token)]
RefreshTokenDependency = Annotated[RefreshTokenData, Depends(get_refresh_token)]
EmailDependency = Annotated[EmailService, Depends(get_email_service)]
FileManagementDependency = Annotated[FileManagementService, Depends(get_file_management_service)]
TextProcessorDependency = Annotated[TextProcessorService, Depends(get_text_processor_service)]


def get_locale(request: Request) -> str:
    return get_request_locale(request)


LocaleDependency = Annotated[str, Depends(get_locale)]
