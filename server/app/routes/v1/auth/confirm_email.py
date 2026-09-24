"""Confirm email use case: validate token and mark email as confirmed."""

from app.core.encoding import decode_base64, decrypt_text
from app.core.i18n import translate
from app.dependencies import (
    DatabaseDependency,
    EmailDependency,
    LocaleDependency,
    TokenServiceDependency,
)
from app.schemas.v1.message import MessageResponse
from app.settings import SettingsDependency
from app.use_cases.auth import (
    get_user_by_email,
    save_confirm_user_email,
    send_email_has_been_confirmed_email,
)
from fastapi import APIRouter, BackgroundTasks
from starlette.responses import JSONResponse

router = APIRouter(tags=["Auth - Confirm Email"])


@router.post("/confirm_email/{code}", response_model=MessageResponse)
async def confirm_email(
    code: str,
    locale: LocaleDependency,
    token_service: TokenServiceDependency,
    db: DatabaseDependency,
    mail: EmailDependency,
    background_tasks: BackgroundTasks,
    settings: SettingsDependency,
):
    token = decode_base64(code)
    token_data = token_service.validate_email_confirm_token(token)

    try:
        user_email = decrypt_text(
            token_data.key, encryption_key=settings.encryption_key
        )
    except Exception:
        return JSONResponse(
            status_code=400,
            content=MessageResponse(
                message=translate("auth.invalid_confirmation_code", locale),
            ),
        )

    user = await get_user_by_email(user_email, db)
    if user is None:
        return JSONResponse(
            status_code=400,
            content=MessageResponse(
                message=translate("auth.invalid_confirmation_code", locale),
            ),
        )

    if user.email_confirmed:
        return MessageResponse(
            message=translate("auth.email_already_confirmed", locale),
        )

    await save_confirm_user_email(user.id, db)
    await send_email_has_been_confirmed_email(user.email, mail, background_tasks)
    return MessageResponse(message=translate("auth.email_confirmed", locale))
