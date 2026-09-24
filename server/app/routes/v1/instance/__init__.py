from typing import Annotated

from fastapi import APIRouter, Depends

from app.core.authz import require_roles
from app.core.errors import InstanceInvalidTimezoneException
from app.core.roles import ROLE_ADMIN, ROLE_AGENT
from app.dependencies import DatabaseDependency, LocaleDependency
from app.schemas.v1.instance import InstanceSettingsResponse, UpdateInstanceSettingsRequest
from app.use_cases.instance.manage_instance import (
    build_instance_response,
    get_or_create_instance_settings,
    update_instance_settings,
)

router = APIRouter(prefix="/v1/instance", tags=["Instance"])

StaffAuth = Annotated[dict, Depends(require_roles(ROLE_AGENT, ROLE_ADMIN))]
AdminAuth = Annotated[dict, Depends(require_roles(ROLE_ADMIN))]


@router.get("/", response_model=InstanceSettingsResponse)
async def get_instance_endpoint(
    token: StaffAuth,
    db: DatabaseDependency,
):
    settings = get_or_create_instance_settings(db)
    db.commit()
    return build_instance_response(settings)


@router.put("/", response_model=InstanceSettingsResponse)
async def update_instance_endpoint(
    data: UpdateInstanceSettingsRequest,
    token: AdminAuth,
    locale: LocaleDependency,
    db: DatabaseDependency,
):
    settings, error = update_instance_settings(
        data.timezone,
        db,
        ticket_email_on_created=data.ticket_email_on_created,
        ticket_email_on_public_message=data.ticket_email_on_public_message,
        ticket_email_on_status_change=data.ticket_email_on_status_change,
        ticket_email_on_assignment=data.ticket_email_on_assignment,
    )
    if error == "invalid_timezone":
        raise InstanceInvalidTimezoneException(locale)
    return build_instance_response(settings)
