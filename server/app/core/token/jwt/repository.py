import datetime
import uuid

from jose import jwt

from ..entities import AccessTokenData, TokenTypes, RefreshTokenData, ResetPasswordTokenData, EmailConfirmTokenData
from ..repository import AuthorizationRepository


class JwtRepository(AuthorizationRepository):
    TOKEN_DATE_FORMAT = "%Y/%m/%d %H:%M:%S"

    def __init__(self, secret_key: str, algorithm: str, token_type: str):
        self.secret_key = secret_key
        self.algorithm = algorithm
        self.token_type = token_type

    def create_token_key(self) -> str:
        return str(uuid.uuid4())

    def create_access_token(self, key: str, role: str, expiration_date: datetime.datetime) -> str:
        token_data = AccessTokenData(
            key=key,
            role=str(role) if role else None,
            exp=expiration_date.timestamp(),
        )
        return jwt.encode(dict(token_data), self.secret_key, algorithm=self.algorithm)

    def decrypt_access_token(self, token: str) -> AccessTokenData | None:
        payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
        token_data = AccessTokenData(**payload)
        if token_data.type != TokenTypes.ACCESS:
            raise Exception("Invalid Token Type")

        return token_data

    def create_refresh_token(self, key:str, expiration_date: datetime.datetime, created_at: datetime.datetime) -> str:
        token_data = RefreshTokenData(
            key=key,
            exp=expiration_date.timestamp(),
            created_at=created_at.timestamp()
        )
        return jwt.encode(dict(token_data), self.secret_key, algorithm=self.algorithm)

    def decrypt_refresh_token(self, refresh_token: str) -> RefreshTokenData | None:
        payload = jwt.decode(refresh_token, self.secret_key, algorithms=[self.algorithm])

        token_data = RefreshTokenData(**payload)

        if token_data.type != TokenTypes.REFRESH:
            raise Exception("Invalid Token Type")

        return token_data

    def create_password_reset_token(self, key: str, expiration_date: datetime.datetime) -> str:
        token_data = ResetPasswordTokenData(
            key=key,
            exp=expiration_date.timestamp(),
        )
        return jwt.encode(dict(token_data), self.secret_key, algorithm=self.algorithm)

    def decrypt_password_reset_code(self, code: str) -> ResetPasswordTokenData | None:
        payload = jwt.decode(code, self.secret_key, algorithms=[self.algorithm])
        token_data = ResetPasswordTokenData(**payload)

        if token_data.type != TokenTypes.RESET_PASSWORD:
            raise Exception("Invalid Token Type")

        return token_data

    def create_email_confirm_token(self, key: str, expiration_date: datetime.datetime) -> str:
        token_data = EmailConfirmTokenData(
            key=key,
            exp=expiration_date.timestamp(),
        )
        return jwt.encode(dict(token_data), self.secret_key, algorithm=self.algorithm)

    def decrypt_email_confirm_code(self, code: str) -> EmailConfirmTokenData | None:
        payload = jwt.decode(code, self.secret_key, algorithms=[self.algorithm])
        token_data = EmailConfirmTokenData(**payload)

        if token_data.type != TokenTypes.CONFIRM_EMAIL:
            raise Exception("Invalid Token Type")

        return token_data
