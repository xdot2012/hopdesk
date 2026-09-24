from typing import Optional
from .base import ResponseBaseModel


class MessageResponse(ResponseBaseModel):
    message: str
    code: Optional[str] = None