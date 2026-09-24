from typing import Annotated

from fastapi import Depends

from app.core.authz import require_roles
from app.core.roles import ROLE_ADMIN, ROLE_AGENT, ROLE_CUSTOMER

AnyAuth = Annotated[dict, Depends(require_roles(ROLE_CUSTOMER, ROLE_AGENT, ROLE_ADMIN))]
CustomerAuth = Annotated[dict, Depends(require_roles(ROLE_CUSTOMER))]
AgentAuth = Annotated[dict, Depends(require_roles(ROLE_AGENT, ROLE_ADMIN))]
