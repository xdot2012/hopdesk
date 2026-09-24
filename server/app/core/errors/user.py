from fastapi import HTTPException
from starlette import status

from app.core.errors.exceptions import FieldValidationException
from app.core.i18n import translate


class UserNotFoundException(HTTPException):
    def __init__(self, locale: str) -> None:
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=translate("user.not_found", locale),
        )


class AvatarNotFoundException(FieldValidationException):
    def __init__(self, locale: str) -> None:
        super().__init__(
            field="avatarKey",
            error_type="not_found",
            message=translate("user.avatar_not_found", locale),
        )


class EmailAlreadyExistsException(FieldValidationException):
    def __init__(self, locale: str) -> None:
        super().__init__(
            field="email",
            error_type="already_exists",
            message=translate("user.email_already_exists", locale),
        )


class WrongPasswordException(FieldValidationException):
    def __init__(self, locale: str) -> None:
        super().__init__(
            field="oldPassword",
            error_type="invalid",
            message=translate("user.wrong_password", locale),
        )


class UnsupportedLocaleException(FieldValidationException):
    def __init__(self, locale: str) -> None:
        super().__init__(
            field="locale",
            error_type="invalid",
            message=translate("user.unsupported_locale", locale),
        )


class CannotChangeOwnRoleException(HTTPException):
    def __init__(self, locale: str) -> None:
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=translate("user.cannot_change_own_role", locale),
        )


class LastAdminException(HTTPException):
    def __init__(self, locale: str) -> None:
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=translate("user.last_admin", locale),
        )


class InvalidUserRoleException(FieldValidationException):
    def __init__(self, locale: str) -> None:
        super().__init__(
            field="role",
            error_type="invalid",
            message=translate("user.invalid_role", locale),
        )


class RoleNotFoundException(HTTPException):
    def __init__(self, locale: str) -> None:
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=translate("user.role_not_found", locale),
        )
