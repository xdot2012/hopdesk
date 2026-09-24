import datetime
from typing import Literal, Optional, List
from uuid import UUID

from pydantic import EmailStr, Field

from app.schemas.v1.notification import NotificationResponse
from app.schemas.v1.base import ResponseBaseModel, RequestBaseModel, PasswordField

UserRoleName = Literal["customer", "agent", "admin"]


class GetUserProfileResponse(ResponseBaseModel):
    id: UUID
    email: EmailStr
    name: Optional[str] = None
    avatar_url: Optional[str] = None
    avatar_key: Optional[str] = None
    locale: str
    email_confirmed: bool
    created_at: datetime.datetime
    role: Optional[str] = None
    permissions: List[str]
    is_sector_manager: bool = False
    sector_id: Optional[UUID] = None
    sector_name: Optional[str] = None
    sector_color: Optional[str] = None
    managed_sector_id: Optional[UUID] = None
    managed_sector_name: Optional[str] = None
    managed_sector_color: Optional[str] = None
    notifications: List[NotificationResponse]


class MarkNotificationsReadRequest(RequestBaseModel):
    notification_ids: List[UUID] = Field(min_length=1)


class UpdatePreferencesRequest(RequestBaseModel):
    locale: str = Field(min_length=2, max_length=10)


class UpdatePreferencesResponse(ResponseBaseModel):
    locale: str


class UpdateUserResponse(ResponseBaseModel):
    email: EmailStr
    name: Optional[str] = None
    avatar_url: Optional[str] = None
    created_at: datetime.datetime
    email_confirmed: bool


class UpdateProfileRequest(RequestBaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    avatar_key: Optional[str] = Field(default=None, max_length=500)


class UpdatePasswordRequest(RequestBaseModel):
    old_password: str = PasswordField
    new_password: str = PasswordField


class UploadAvatarResponse(ResponseBaseModel):
    key: str
    url: str


class ManagedUserResponse(ResponseBaseModel):
    id: UUID
    email: EmailStr
    name: Optional[str] = None
    avatar_url: Optional[str] = None
    role: Optional[str] = None


class UpdateUserRoleRequest(RequestBaseModel):
    role: UserRoleName
