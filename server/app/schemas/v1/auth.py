import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field
from .base import ResponseBaseModel, RequestBaseModel, PasswordField


class SignUpRequest(RequestBaseModel):
    email: str
    password: str = PasswordField
    name: str | None = Field(default=None, min_length=2, max_length=100)
    avatar_key: str | None = Field(default=None, max_length=500)
    role: str = "staff"
    sector_id: UUID


class SignInRequest(RequestBaseModel):
    email: str
    password: str = PasswordField
    two_factor_code: str | None = None
    keep_connected: bool


class PasswordRecoveryRequest(BaseModel):
    email: EmailStr


class PasswordResetRequest(BaseModel):
    password: str = PasswordField


class TokenResponse(ResponseBaseModel):
    access_token: str
    refresh_token: str
    token_type: str



class SignInResponse(ResponseBaseModel):
    two_factor_required: bool
    token: Optional[TokenResponse]


class ValidationResponse(BaseModel):
    isValid: bool


class UserCreateResponse(ResponseBaseModel):
    id: UUID
    email: EmailStr
    name: str | None = None
    avatar_url: str | None = None
    created_at: datetime.datetime
    email_confirmed: bool


class ResendTwoFactorRequest(RequestBaseModel):
    email: str
    password: str = PasswordField
