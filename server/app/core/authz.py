from fastapi import Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session
from starlette import status

from app.core.i18n import translate
from app.core.roles import ROLE_ADMIN, ROLE_AGENT, ROLE_CUSTOMER
from app.core.token import validate_user_token
from app.dependencies import DatabaseDependency, LocaleDependency
from app.models.user.role import Role


class ForbiddenException(HTTPException):
    def __init__(self, locale: str) -> None:
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=translate("auth.forbidden", locale),
        )


def get_role_name(token: dict, db: Session) -> str | None:
    role_value = token.get("role")
    if not role_value:
        return None

    role_name = str(role_value)
    known = {ROLE_CUSTOMER, ROLE_AGENT, ROLE_ADMIN}
    if role_name in known:
        return role_name

    result = db.execute(select(Role).where(Role.id == role_value))
    role = result.scalars().first()
    return role.name if role else None


def require_roles(*allowed_roles: str):
    async def dependency(
        locale: LocaleDependency,
        db: DatabaseDependency,
        token=Depends(validate_user_token),
    ):
        role_name = get_role_name(token, db)
        if role_name not in allowed_roles:
            raise ForbiddenException(locale)
        return {
            **token,
            "role_name": role_name,
        }

    return dependency
