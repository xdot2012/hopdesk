"""User profile use case: get and update current user."""

import datetime

from fastapi import APIRouter, BackgroundTasks, File, UploadFile

from app.core.errors import (
    AvatarNotFoundException,
    EmailAlreadyExistsException,
    FILE_UPLOAD_ERRORS,
    InvalidImageTypeException,
    UnsupportedLocaleException,
    UserNotFoundException,
    WrongPasswordException,
)
from app.dependencies import (
    AuthTokenDependency,
    DatabaseDependency,
    EmailDependency,
    FileManagementDependency,
    HasherDependency,
    LocaleDependency,
    TokenServiceDependency,
)
from app.schemas.v1.user import (
    GetUserProfileResponse,
    MarkNotificationsReadRequest,
    UpdatePasswordRequest,
    UpdatePreferencesRequest,
    UpdatePreferencesResponse,
    UpdateProfileRequest,
    UpdateUserResponse,
    UploadAvatarResponse,
)
from app.services.file_management.entities import AVATAR_ALLOWED_CONTENT_TYPES
from app.settings import SettingsDependency
from app.use_cases.auth import send_confirmation_code_by_email
from app.use_cases.notification.finish_user_notifications import finish_user_notifications
from app.use_cases.user.build_user_response import build_profile_response, build_user_response
from app.use_cases.user.get_user_profile import get_user_profile
from app.use_cases.user.update_user_profile import update_user_profile
from app.use_cases.user.update_user_password import update_user_password
from app.use_cases.user.update_user_preferences import update_user_preferences

router = APIRouter(tags=["User - Profile"])


@router.post("/me/avatar", response_model=UploadAvatarResponse)
async def upload_avatar(
    locale: LocaleDependency,
    file_service: FileManagementDependency,
    file: UploadFile = File(...),
):
    content = await file.read()
    content_type = file.content_type or ""

    if content_type not in AVATAR_ALLOWED_CONTENT_TYPES:
        raise InvalidImageTypeException(locale)

    try:
        stored_file = await file_service.upload_avatar(content, content_type)
    except ValueError as error:
        exception_class = FILE_UPLOAD_ERRORS.get(str(error), InvalidImageTypeException)
        raise exception_class(locale) from error

    return stored_file


@router.get("/me", response_model=GetUserProfileResponse)
async def get_profile(
    token: AuthTokenDependency,
    locale: LocaleDependency,
    db: DatabaseDependency,
    file_service: FileManagementDependency,
):
    user = await get_user_profile(token["user_id"], db=db)
    if not user:
        raise UserNotFoundException(locale)
    return build_profile_response(user, file_service)


@router.post("/me/notifications/read", status_code=204)
async def mark_notifications_read(
    data: MarkNotificationsReadRequest,
    token: AuthTokenDependency,
    db: DatabaseDependency,
):
    await finish_user_notifications(
        token["user_id"],
        data.notification_ids,
        db,
    )


@router.put("/me", response_model=UpdateUserResponse)
async def update_profile(
    data: UpdateProfileRequest,
    token: AuthTokenDependency,
    locale: LocaleDependency,
    db: DatabaseDependency,
    file_service: FileManagementDependency,
    mail: EmailDependency,
    background_tasks: BackgroundTasks,
    settings: SettingsDependency,
    token_service: TokenServiceDependency,
):
    user, error, email_changed = await update_user_profile(
        user_id=token["user_id"],
        db=db,
        file_service=file_service,
        name=data.name,
        email=data.email,
        avatar_key=data.avatar_key,
    )

    if error == "avatar_not_found":
        raise AvatarNotFoundException(locale)

    if error == "email_already_exists":
        raise EmailAlreadyExistsException(locale)

    if not user:
        raise UserNotFoundException(locale)

    if email_changed:
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


@router.put("/me/password", response_model=UpdateUserResponse)
async def update_password(
    data: UpdatePasswordRequest,
    token: AuthTokenDependency,
    locale: LocaleDependency,
    db: DatabaseDependency,
    hasher: HasherDependency,
    file_service: FileManagementDependency,
):
    user, error = await update_user_password(
        user_id=token["user_id"],
        db=db,
        hasher=hasher,
        old_password=data.old_password,
        new_password=data.new_password,
    )

    if error == "wrong_password":
        raise WrongPasswordException(locale)

    if not user:
        raise UserNotFoundException(locale)

    return build_user_response(user, file_service)


@router.put("/me/preferences", response_model=UpdatePreferencesResponse)
async def update_preferences(
    data: UpdatePreferencesRequest,
    token: AuthTokenDependency,
    locale: LocaleDependency,
    db: DatabaseDependency,
):
    user, error = await update_user_preferences(
        user_id=token["user_id"],
        db=db,
        locale=data.locale,
    )

    if error == "invalid_locale":
        raise UnsupportedLocaleException(locale)

    if not user:
        raise UserNotFoundException(locale)

    return {"locale": user.locale}
