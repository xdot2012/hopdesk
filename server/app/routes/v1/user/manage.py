"""Admin user management: list users and update roles."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends

from app.core.authz import require_roles
from app.core.errors import (
    CannotChangeOwnRoleException,
    InvalidUserRoleException,
    LastAdminException,
    RoleNotFoundException,
    UserNotFoundException,
)
from app.core.roles import ROLE_ADMIN
from app.dependencies import DatabaseDependency, FileManagementDependency, LocaleDependency
from app.schemas.v1.user import ManagedUserResponse, UpdateUserRoleRequest
from app.use_cases.user.list_managed_users import (
    build_managed_user_response,
    list_managed_users,
)
from app.use_cases.user.update_user_role import update_user_role

router = APIRouter(tags=["User - Manage"])

AdminAuth = Annotated[dict, Depends(require_roles(ROLE_ADMIN))]


@router.get("/", response_model=list[ManagedUserResponse])
async def list_users_endpoint(
    token: AdminAuth,
    db: DatabaseDependency,
    file_service: FileManagementDependency,
):
    users = await list_managed_users(db)
    return [build_managed_user_response(user, file_service) for user in users]


@router.put("/{user_id}/role", response_model=ManagedUserResponse)
async def update_user_role_endpoint(
    user_id: UUID,
    data: UpdateUserRoleRequest,
    token: AdminAuth,
    locale: LocaleDependency,
    db: DatabaseDependency,
    file_service: FileManagementDependency,
):
    user, error = await update_user_role(
        user_id=user_id,
        role_name=data.role,
        actor_user_id=token["user_id"],
        db=db,
    )
    if error == "user_not_found":
        raise UserNotFoundException(locale)
    if error == "cannot_change_own_role":
        raise CannotChangeOwnRoleException(locale)
    if error == "last_admin":
        raise LastAdminException(locale)
    if error == "invalid_role":
        raise InvalidUserRoleException(locale)
    if error == "role_not_found":
        raise RoleNotFoundException(locale)
    if not user:
        raise UserNotFoundException(locale)
    return build_managed_user_response(user, file_service)
