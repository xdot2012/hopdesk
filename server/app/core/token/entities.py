from pydantic import BaseModel


class TokenTypes:
    ACCESS = "AccessToken"
    REFRESH = "RefreshToken"
    RESET_PASSWORD = "ResetPassword"
    CONFIRM_EMAIL = "ConfirmEmail"


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str


class AccessTokenData(BaseModel):
    type: str = TokenTypes.ACCESS
    key: str
    exp: float
    role: str | None


class RefreshTokenData(BaseModel):
    type: str = TokenTypes.REFRESH
    exp: float
    created_at: float
    key: str


class ResetPasswordTokenData(BaseModel):
    type: str = TokenTypes.RESET_PASSWORD
    key: str
    exp: float


class EmailConfirmTokenData(BaseModel):
    type: str = TokenTypes.CONFIRM_EMAIL
    key: str
    exp: float
