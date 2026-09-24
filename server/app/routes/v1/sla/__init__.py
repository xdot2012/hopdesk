"""SLA = Service Level Agreement (acordo de nível de serviço)."""

from typing import Annotated

from fastapi import APIRouter, Depends

from app.core.authz import require_roles
from app.core.errors import (
    SlaInvalidTimezoneException,
    SlaNotFoundException,
)
from app.core.roles import ROLE_ADMIN, ROLE_AGENT, ROLE_CUSTOMER
from app.dependencies import DatabaseDependency, LocaleDependency
from app.schemas.v1.sla import (
    SlaPolicyResponse,
    UpdateSlaTargetsRequest,
)
from app.use_cases.sla.manage_sla import (
    build_sla_policy_response,
    get_default_sla,
    update_sla_targets,
)

router = APIRouter(prefix="/v1/sla", tags=["SLA (Service Level Agreement)"])

AnyAuth = Annotated[dict, Depends(require_roles(ROLE_CUSTOMER, ROLE_AGENT, ROLE_ADMIN))]
AdminAuth = Annotated[dict, Depends(require_roles(ROLE_ADMIN))]


@router.get("/", response_model=SlaPolicyResponse)
async def get_policy_endpoint(
    token: AnyAuth,
    locale: LocaleDependency,
    db: DatabaseDependency,
):
    policy = await get_default_sla(db)
    if not policy:
        raise SlaNotFoundException(locale)
    return build_sla_policy_response(policy)


@router.put("/", response_model=SlaPolicyResponse)
async def update_policy_endpoint(
    data: UpdateSlaTargetsRequest,
    token: AdminAuth,
    locale: LocaleDependency,
    db: DatabaseDependency,
):
    policy, error = await update_sla_targets(
        db,
        data.targets,
        timezone=data.timezone,
    )
    if error == "not_found":
        raise SlaNotFoundException(locale)
    if error == "invalid_timezone":
        raise SlaInvalidTimezoneException(locale)
    return build_sla_policy_response(policy)
