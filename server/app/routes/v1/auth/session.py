"""Session use case: sign in, refresh token, sign out."""

import datetime
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks
from starlette.requests import Request

from app.core.errors import (
    EmailNotConfirmedException,
    InvalidCredentialsException,
    InvalidRefreshTokenException,
    InvalidTokenException,
    SessionExpiredException,
    TwoFactorDisabledException,
    TwoFactorInvalidException,
    TwoFactorRateLimitedException,
    UserBlockedException,
)
from app.dependencies import (
    AuthTokenDependency,
    DatabaseDependency,
    HasherDependency,
    LocaleDependency,
    RefreshTokenDependency,
    TokenServiceDependency, EmailDependency,
)
from app.schemas.v1.auth import SignInRequest, SignInResponse, TokenResponse, ResendTwoFactorRequest
from app.settings import SettingsDependency
from app.core.encoding import decrypt_text
from app.use_cases.auth import (
    authenticate_user,
    create_auth_session,
    create_token_response,
    get_user_session,
    update_auth_session,
)
from app.use_cases.auth.two_factor import generate_two_factor, validate_two_factor, send_two_factor_code_email, \
    can_resend_two_factor_code
from app.use_cases.user import get_user_by_id
from app.core.token import TOKEN_URL

router = APIRouter(tags=["Auth - Session"])


def _role_name_for_user(user) -> str | None:
    if user is None:
        return None
    if getattr(user, "role", None) is not None:
        return user.role.name
    return str(user.role_id) if user.role_id else None



@router.post(TOKEN_URL, response_model=SignInResponse)
async def sign_in(
    request: Request,
    data: SignInRequest,
    locale: LocaleDependency,
    db: DatabaseDependency,
    hasher: HasherDependency,
    settings: SettingsDependency,
    token_service: TokenServiceDependency,
    email_service: EmailDependency,
    background_tasks: BackgroundTasks,
):
    email = data.email.strip().lower()
    user = await authenticate_user(email, data.password, db, hasher)
    if user is None:
        raise InvalidCredentialsException(locale)

    if settings.require_email_confirmation and not user.email_confirmed:
        raise EmailNotConfirmedException(locale)

    auth_session = await get_user_session(user.id, db)
    if auth_session and auth_session.is_blocked:
        raise UserBlockedException(locale)

    if settings.require_two_factor:
        if not data.two_factor_code:
            if can_resend_two_factor_code(user.id, db):
                two_factor_code = generate_two_factor(user.id, settings.access_token_expiration, db)
                send_two_factor_code_email(two_factor_code.code, user.email, email_service, background_tasks)

            return {
                "two_factor_required": True,
                "token": None,
            }

        if not validate_two_factor(user.id, data.two_factor_code, db):
            raise TwoFactorInvalidException(locale)

    created_at = datetime.datetime.now()
    if data.keep_connected:
        auth_session_expires_at = created_at + datetime.timedelta(
            seconds=settings.keep_me_connected_session_expiration
        )
        refresh_token_expires_at = created_at + datetime.timedelta(
            seconds=settings.keep_me_connected_session_expiration
        )
    else:
        auth_session_expires_at = created_at + datetime.timedelta(
            seconds=settings.session_expiration
        )
        refresh_token_expires_at = created_at + datetime.timedelta(
            seconds=settings.refresh_token_expiration
        )

    if auth_session is None:
        await create_auth_session(
            user_id=user.id,
            created_at=created_at,
            expires_at=auth_session_expires_at,
            user_agent=request.headers.get("user-agent", ""),
            client_ip=request.client.host,
            is_blocked=False,
            db=db,
        )
    else:
        await update_auth_session(
            user_id=user.id,
            created_at=created_at,
            expires_at=auth_session_expires_at,
            user_agent=request.headers.get("user-agent", ""),
            client_ip=request.client.host,
            is_blocked=False,
            db=db,
        )

    return {
        "two_factor_required": False,
        "token": create_token_response(
            user_id=user.id,
            user_role=_role_name_for_user(user),
            encryption_key=settings.encryption_key,
            token_service=token_service,
            token_type=settings.token_type,
            created_at=created_at,
            access_token_expiration=created_at
            + datetime.timedelta(seconds=settings.access_token_expiration),
            refresh_token_expiration=refresh_token_expires_at,
        )
    }


@router.post("/refresh", response_model=TokenResponse)
async def refresh_session(
    request: Request,
    locale: LocaleDependency,
    refresh_token_data: RefreshTokenDependency,
    db: DatabaseDependency,
    settings: SettingsDependency,
    token_service: TokenServiceDependency,
):
    user_id = UUID(decrypt_text(refresh_token_data.key, settings.encryption_key))
    auth_session = await get_user_session(user_id, db)

    if auth_session is None:
        raise InvalidRefreshTokenException(locale)
    if refresh_token_data.created_at < auth_session.created_at.timestamp():
        raise InvalidRefreshTokenException(locale)
    if auth_session.expires_at <= datetime.datetime.now():
        raise SessionExpiredException(locale)
    if auth_session.is_blocked:
        raise UserBlockedException(locale)

    user = await get_user_by_id(user_id, db)
    refreshed_at = datetime.datetime.now()

    await update_auth_session(
        user_id,
        created_at=refreshed_at,
        expires_at=auth_session.expires_at,
        user_agent=request.headers.get("user-agent", ""),
        client_ip=request.client.host,
        is_blocked=False,
        db=db,
    )

    refresh_expire = refreshed_at + datetime.timedelta(
        seconds=settings.refresh_token_expiration
    )
    if refresh_token_data.exp > refresh_expire.timestamp():
        refresh_expire = datetime.datetime.fromtimestamp(refresh_token_data.exp)

    return create_token_response(
        user_id=user_id,
        created_at=refreshed_at,
        encryption_key=settings.encryption_key,
        user_role=_role_name_for_user(user),
        access_token_expiration=refreshed_at + datetime.timedelta(seconds=settings.access_token_expiration),
        refresh_token_expiration=refresh_expire,
        token_type=settings.token_type,
        token_service=token_service,
    )


@router.post("/sign_out")
async def sign_out(
    token: AuthTokenDependency,
    locale: LocaleDependency,
    db: DatabaseDependency,
):
    user_id = token["user_id"]
    auth_session = await get_user_session(user_id, db)

    if auth_session is None:
        raise InvalidTokenException(locale)

    await update_auth_session(
        user_id,
        created_at=auth_session.created_at,
        expires_at=datetime.datetime.now(),
        user_agent=auth_session.user_agent,
        client_ip=auth_session.client_ip,
        is_blocked=False,
        db=db,
    )


@router.post("/two_factor")
async def resend_two_factor_code(
        _: Request,
        data: ResendTwoFactorRequest,
        locale: LocaleDependency,
        db: DatabaseDependency,
        hasher: HasherDependency,
        settings: SettingsDependency,
        email_service: EmailDependency,
        background_tasks: BackgroundTasks,
):
    email = data.email.strip().lower()
    user = await authenticate_user(email, data.password, db, hasher)
    if user is None:
        raise InvalidCredentialsException(locale)

    if settings.require_email_confirmation and not user.email_confirmed:
        raise EmailNotConfirmedException(locale)

    auth_session = await get_user_session(user.id, db)
    if auth_session and auth_session.is_blocked:
        raise UserBlockedException(locale)

    if not settings.require_two_factor:
        raise TwoFactorDisabledException(locale)

    if not can_resend_two_factor_code(user.id, db):
        raise TwoFactorRateLimitedException(locale)

    two_factor_code = generate_two_factor(user.id, settings.access_token_expiration, db)
    send_two_factor_code_email(two_factor_code.code, user.email, email_service, background_tasks)

    return {
        "two_factor_required": True,
        "token": None,
    }
