"""Sign up use case: user registration and confirmation email."""

import datetime

from fastapi import APIRouter, BackgroundTasks

from app.core.errors import (
    AvatarNotFoundException,
    EmailAlreadyExistsException,
    SectorNotFoundException,
)
from app.dependencies import (
    DatabaseDependency,
    EmailDependency,
    FileManagementDependency,
    HasherDependency,
    LocaleDependency,
    TokenServiceDependency,
)
from app.schemas.v1.auth import SignUpRequest, UserCreateResponse
from app.settings import SettingsDependency
from app.use_cases.user import create_user
from app.use_cases.user.build_user_response import build_user_response

from app.use_cases.auth import (
    get_user_by_email,
    send_confirmation_code_by_email,
)
router = APIRouter(tags=["Auth - Sign Up"])


@router.post("/sign_up", response_model=UserCreateResponse)
async def sign_up(
    user_data: SignUpRequest,
    locale: LocaleDependency,
    db: DatabaseDependency,
    hasher: HasherDependency,
    mail: EmailDependency,
    background_tasks: BackgroundTasks,
    settings: SettingsDependency,
    token_service: TokenServiceDependency,
    file_service: FileManagementDependency,
):
    if await get_user_by_email(user_data.email.strip().lower(), db):
        raise EmailAlreadyExistsException(locale)

    try:
        user = await create_user(
            email=user_data.email,
            password=user_data.password,
            name=user_data.name,
            avatar_key=user_data.avatar_key,
            hasher=hasher,
            db=db,
            file_service=file_service,
            sector_id=user_data.sector_id,
        )
    except ValueError as exc:
        if str(exc) == "sector.not_found":
            raise SectorNotFoundException(locale)
        raise AvatarNotFoundException(locale)

    await send_confirmation_code_by_email(
        base_url=settings.client_base_url,
        system_name=settings.system_name,
        email=user.email,
        expiration_date=datetime.datetime.now()
        + datetime.timedelta(seconds=settings.email_confirm_expiration),
        encryption_key=settings.encryption_key,
        token_service=token_service,
        mail=mail,
        background_tasks=background_tasks,
    )

    return build_user_response(user, file_service)
