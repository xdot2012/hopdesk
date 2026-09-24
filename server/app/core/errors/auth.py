from fastapi import HTTPException
from starlette import status

from app.core.errors.exceptions import FieldValidationException
from app.core.i18n import translate


class InvalidCredentialsException(HTTPException):
    def __init__(self, locale: str) -> None:
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=translate("auth.invalid_credentials", locale),
        )


class EmailNotConfirmedException(HTTPException):
    def __init__(self, locale: str) -> None:
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=translate("auth.email_not_confirmed", locale),
        )


class UserBlockedException(HTTPException):
    def __init__(self, locale: str) -> None:
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=translate("auth.user_blocked", locale),
        )


class InvalidRefreshTokenException(HTTPException):
    def __init__(self, locale: str) -> None:
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=translate("auth.invalid_refresh_token", locale),
        )


class SessionExpiredException(HTTPException):
    def __init__(self, locale: str) -> None:
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=translate("auth.session_expired", locale),
        )


class InvalidTokenException(HTTPException):
    def __init__(self, locale: str) -> None:
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=translate("auth.invalid_token", locale),
        )


class TwoFactorDisabledException(HTTPException):
    def __init__(self, locale: str) -> None:
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=translate("auth.two_factor_disabled", locale),
        )


class TwoFactorRateLimitedException(HTTPException):
    def __init__(self, locale: str) -> None:
        super().__init__(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=translate("auth.two_factor_rate_limited", locale),
        )


class TwoFactorInvalidException(FieldValidationException):
    def __init__(self, locale: str) -> None:
        super().__init__(
            field="twoFactorCode",
            error_type="invalid",
            message=translate("auth.two_factor_invalid", locale),
        )
