from typing import Optional
from uuid import UUID

from pydantic import Field

from app.schemas.v1.base import RequestBaseModel, ResponseBaseModel


class InstanceSettingsResponse(ResponseBaseModel):
    id: UUID
    timezone: str
    ticket_email_on_created: bool = False
    ticket_email_on_public_message: bool = False
    ticket_email_on_status_change: bool = False
    ticket_email_on_assignment: bool = False


class UpdateInstanceSettingsRequest(RequestBaseModel):
    timezone: str = Field(min_length=1, max_length=64)
    ticket_email_on_created: Optional[bool] = None
    ticket_email_on_public_message: Optional[bool] = None
    ticket_email_on_status_change: Optional[bool] = None
    ticket_email_on_assignment: Optional[bool] = None
