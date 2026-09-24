from typing import List, Optional
from uuid import UUID

from pydantic import Field

from app.schemas.v1.base import RequestBaseModel, ResponseBaseModel


class SlaPriorityTargetResponse(ResponseBaseModel):
    id: UUID
    priority_id: UUID
    priority_code: Optional[str] = None
    priority_label: Optional[str] = None
    first_response_minutes: int
    resolution_minutes: int


class SlaPolicyResponse(ResponseBaseModel):
    id: UUID
    name: str
    is_default: bool
    enabled: bool
    timezone: str
    priority_targets: List[SlaPriorityTargetResponse] = []


class SlaTargetUpdateItem(RequestBaseModel):
    priority_id: UUID
    first_response_minutes: int = Field(ge=1)
    resolution_minutes: int = Field(ge=1)


class UpdateSlaTargetsRequest(RequestBaseModel):
    timezone: str = Field(min_length=1, max_length=64)
    targets: List[SlaTargetUpdateItem]
