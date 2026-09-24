import datetime
from typing import Optional
from uuid import UUID

from pydantic import EmailStr, Field

from app.schemas.v1.base import RequestBaseModel, ResponseBaseModel


class SectorResponse(ResponseBaseModel):
    id: UUID
    name: str
    color: str
    created_at: datetime.datetime


class CreateSectorRequest(RequestBaseModel):
    name: str = Field(min_length=2, max_length=200)
    color: Optional[str] = Field(default=None, min_length=4, max_length=7)


class UpdateSectorRequest(RequestBaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=200)
    color: Optional[str] = Field(default=None, min_length=4, max_length=7)


class UserSectorResponse(ResponseBaseModel):
    id: UUID
    user_id: UUID
    user_email: Optional[EmailStr] = None
    user_name: Optional[str] = None
    user_avatar_url: Optional[str] = None
    sector_id: Optional[UUID] = None
    sector_name: Optional[str] = None
    sector_color: Optional[str] = None
    is_sector_manager: bool = False


class AddUserSectorRequest(RequestBaseModel):
    user_id: UUID
    sector_id: Optional[UUID] = None


class UpdateUserSectorRequest(RequestBaseModel):
    sector_id: Optional[UUID] = None
    is_sector_manager: Optional[bool] = None
