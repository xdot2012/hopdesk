import datetime
from uuid import UUID

from app.schemas.v1.base import ResponseBaseModel


class NotificationResponse(ResponseBaseModel):
    id: UUID
    title: str
    text: str
    link: str | None
    created_at: datetime.datetime