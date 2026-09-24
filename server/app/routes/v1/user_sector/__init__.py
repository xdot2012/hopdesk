from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends

from app.core.authz import require_roles
from app.core.errors import (
    NotCustomerException,
    SectorNotFoundException,
    UserNotFoundException,
    UserSectorExistsException,
    UserSectorNotFoundException,
)
from app.core.roles import ROLE_ADMIN
from app.dependencies import DatabaseDependency, FileManagementDependency, LocaleDependency
from app.schemas.v1.sector import (
    AddUserSectorRequest,
    UpdateUserSectorRequest,
    UserSectorResponse,
)
from app.use_cases.user_sector.manage_user_sectors import (
    add_user_sector,
    build_user_sector_response,
    delete_user_sector,
    list_user_sectors,
    update_user_sector,
)

router = APIRouter(prefix="/v1/user_sector", tags=["User Sector"])

AdminAuth = Annotated[dict, Depends(require_roles(ROLE_ADMIN))]


@router.get("/", response_model=list[UserSectorResponse])
async def list_user_sectors_endpoint(
    token: AdminAuth,
    db: DatabaseDependency,
    file_service: FileManagementDependency,
):
    rows = await list_user_sectors(db)
    return [build_user_sector_response(row, file_service) for row in rows]


@router.post("/", response_model=UserSectorResponse)
async def add_user_sector_endpoint(
    data: AddUserSectorRequest,
    token: AdminAuth,
    locale: LocaleDependency,
    db: DatabaseDependency,
    file_service: FileManagementDependency,
):
    user_sector, error = await add_user_sector(
        data.user_id, db, sector_id=data.sector_id
    )
    if error == "user_not_found":
        raise UserNotFoundException(locale)
    if error == "not_customer":
        raise NotCustomerException(locale)
    if error == "user_sector_exists":
        raise UserSectorExistsException(locale)
    if error == "sector_not_found":
        raise SectorNotFoundException(locale)
    return build_user_sector_response(user_sector, file_service)


@router.put("/{user_sector_id}", response_model=UserSectorResponse)
async def update_user_sector_endpoint(
    user_sector_id: UUID,
    data: UpdateUserSectorRequest,
    token: AdminAuth,
    locale: LocaleDependency,
    db: DatabaseDependency,
    file_service: FileManagementDependency,
):
    kwargs = {}
    payload = data.model_dump(exclude_unset=True)
    if "sector_id" in payload:
        kwargs["sector_id"] = payload["sector_id"]
    if "is_sector_manager" in payload:
        kwargs["is_sector_manager"] = payload["is_sector_manager"]

    user_sector, error = await update_user_sector(user_sector_id, db, **kwargs)
    if error == "user_sector_not_found":
        raise UserSectorNotFoundException(locale)
    if error == "sector_not_found":
        raise SectorNotFoundException(locale)
    return build_user_sector_response(user_sector, file_service)


@router.delete("/{user_sector_id}", status_code=204)
async def delete_user_sector_endpoint(
    user_sector_id: UUID,
    token: AdminAuth,
    locale: LocaleDependency,
    db: DatabaseDependency,
):
    error = await delete_user_sector(user_sector_id, db)
    if error == "user_sector_not_found":
        raise UserSectorNotFoundException(locale)
