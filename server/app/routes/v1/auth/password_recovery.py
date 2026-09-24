"""Password recovery use case: request reset, validate code, reset password."""

import datetime

from fastapi import APIRouter, BackgroundTasks
from starlette.responses import JSONResponse

from app.core.encoding import decrypt_text, decode_base64
from app.core.i18n import translate
from app.dependencies import (
    DatabaseDependency,
    EmailDependency,
    HasherDependency,
    LocaleDependency,
    TokenServiceDependency,
)
from app.schemas.v1.auth import PasswordRecoveryRequest, PasswordResetRequest
from app.schemas.v1.auth import ValidationResponse
from app.schemas.v1.message import MessageResponse
from app.settings import SettingsDependency
from app.use_cases.auth import (
    get_user_by_email,
    send_reset_password_code_by_email,
    send_password_has_been_changed_by_email,
    reset_user_password,
)
from app.use_cases.user import (
    get_user_by_id,
)


router = APIRouter(tags=["Auth - Password Recovery"])


@router.post("/password_recovery", response_model=MessageResponse)
async def request_password_recovery(
    data: PasswordRecoveryRequest,
    locale: LocaleDependency,
    token_service: TokenServiceDependency,
    settings: SettingsDependency,
    db: DatabaseDependency,
    mail: EmailDependency,
    background_tasks: BackgroundTasks,
):
    email = data.email.strip()
    user = await get_user_by_email(email, db)
    message = translate("auth.password_recovery_sent", locale)

    if user is None:
        return MessageResponse(
            message=message,
            code="email.not_found"
            if settings.expose_reset_password_token
            else "email.sent",
        )

    code = await send_reset_password_code_by_email(
        base_url=settings.client_base_url,
        user_id=user.id,
        email=user.email,
        encryption_key=settings.encryption_key,
        expires_at=datetime.datetime.now()
        + datetime.timedelta(seconds=settings.reset_password_expiration),
        token_service=token_service,
        mail=mail,
        background_tasks=background_tasks,
    )

    return MessageResponse(
        message=message,
        code=code if settings.expose_reset_password_token else None,
    )


@router.get("/reset_password/{code}", response_model=ValidationResponse)
async def validate_reset_password_code(
    code: str,
    token_service: TokenServiceDependency,
    settings: SettingsDependency,
    db: DatabaseDependency,
):
    try:
        token = decode_base64(code)
        token_data = token_service.validate_password_reset_token(token)
        user_id = decrypt_text(
            token_data.key, encryption_key=settings.encryption_key
        )
    except Exception:
        return ValidationResponse(isValid=False)

    user = await get_user_by_id(user_id, db)
    if user is None:
        return ValidationResponse(isValid=False)

    return ValidationResponse(isValid=True)


@router.post("/reset_password/{code}", response_model=MessageResponse)
async def reset_password(
    code: str,
    data: PasswordResetRequest,
    locale: LocaleDependency,
    token_service: TokenServiceDependency,
    db: DatabaseDependency,
    hasher: HasherDependency,
    mail: EmailDependency,
    background_tasks: BackgroundTasks,
    settings: SettingsDependency,
):
    token = decode_base64(code)
    token_data = token_service.validate_password_reset_token(token)

    try:
        user_id = decrypt_text(
                token_data.key, encryption_key=settings.encryption_key
            )
    except Exception:
        return JSONResponse(
            status_code=400,
            content=MessageResponse(
                message=translate("auth.invalid_reset_code", locale),
            ),
        )

    user = await get_user_by_id(user_id, db)
    if user is None:
        return JSONResponse(
            status_code=400,
            content=MessageResponse(
                message=translate("auth.invalid_reset_code", locale),
            ),
        )

    await reset_user_password(user_id, data.password, hasher, db)
    await send_password_has_been_changed_by_email(
        user.email, mail, background_tasks
    )
    return MessageResponse(message=translate("auth.password_changed", locale))
