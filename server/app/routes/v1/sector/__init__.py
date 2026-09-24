from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Response, status

from app.core.authz import require_roles
from app.core.errors import (
    SectorExistsException,
    SectorInvalidColorException,
    SectorNotFoundException,
)
from app.core.roles import ROLE_ADMIN, ROLE_AGENT, ROLE_CUSTOMER
from app.dependencies import DatabaseDependency, LocaleDependency
from app.schemas.v1.sector import CreateSectorRequest, SectorResponse, UpdateSectorRequest
from app.use_cases.sector.manage_sectors import (
    build_sector_response,
    create_sector,
    delete_sector,
    list_sectors,
    update_sector,
)

router = APIRouter(prefix="/v1/sector", tags=["Sector"])

StaffAuth = Annotated[dict, Depends(require_roles(ROLE_AGENT, ROLE_ADMIN))]
AdminAuth = Annotated[dict, Depends(require_roles(ROLE_ADMIN))]
AnyAuth = Annotated[
    dict, Depends(require_roles(ROLE_CUSTOMER, ROLE_AGENT, ROLE_ADMIN))
]


@router.get("/public", response_model=list[SectorResponse])
async def list_sectors_public_endpoint(
    db: DatabaseDependency,
):
    sectors = await list_sectors(db)
    return [build_sector_response(sector) for sector in sectors]


@router.get("/", response_model=list[SectorResponse])
async def list_sectors_endpoint(
    token: AnyAuth,
    db: DatabaseDependency,
):
    sectors = await list_sectors(db)
    return [build_sector_response(sector) for sector in sectors]


@router.post("/", response_model=SectorResponse)
async def create_sector_endpoint(
    data: CreateSectorRequest,
    token: AdminAuth,
    locale: LocaleDependency,
    db: DatabaseDependency,
):
    sector, error = await create_sector(data.name, db, color=data.color)
    if error == "sector_exists":
        raise SectorExistsException(locale)
    if error == "invalid_color":
        raise SectorInvalidColorException(locale)
    return build_sector_response(sector)


@router.put("/{sector_id}", response_model=SectorResponse)
async def update_sector_endpoint(
    sector_id: UUID,
    data: UpdateSectorRequest,
    token: AdminAuth,
    locale: LocaleDependency,
    db: DatabaseDependency,
):
    sector, error = await update_sector(
        sector_id,
        db,
        name=data.name,
        color=data.color,
    )
    if error == "sector_not_found":
        raise SectorNotFoundException(locale)
    if error == "sector_exists":
        raise SectorExistsException(locale)
    if error == "invalid_color":
        raise SectorInvalidColorException(locale)
    return build_sector_response(sector)


@router.delete("/{sector_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_sector_endpoint(
    sector_id: UUID,
    token: AdminAuth,
    locale: LocaleDependency,
    db: DatabaseDependency,
):
    error = await delete_sector(sector_id, db)
    if error == "sector_not_found":
        raise SectorNotFoundException(locale)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
