from abc import abstractmethod
import datetime

from .entities import AccessTokenData, RefreshTokenData, ResetPasswordTokenData, EmailConfirmTokenData, TokenTypes


class AuthorizationRepository:
    @abstractmethod
    def create_token_key(self) -> str:
        raise NotImplementedError()

    @abstractmethod
    def create_access_token(self, key: str, role: str, expiration_date: datetime.datetime) -> str:
        raise NotImplementedError()

    @abstractmethod
    def create_refresh_token(self, key:str, expiration_date: datetime.datetime, created_at: datetime.datetime) -> str:
        raise NotImplementedError()

    @abstractmethod
    def decrypt_access_token(self, token: str) -> AccessTokenData | None:
        raise NotImplementedError()

    @abstractmethod
    def decrypt_refresh_token(self, refresh_token: str) -> RefreshTokenData | None:
        raise NotImplementedError()

    @abstractmethod
    def create_password_reset_token(self, key: str, expiration_date: datetime.datetime) -> str:
        raise NotImplementedError()

    @abstractmethod
    def decrypt_password_reset_code(self, code: str) -> ResetPasswordTokenData | None:
        raise NotImplementedError()

    @abstractmethod
    def create_email_confirm_token(self, key: str, expiration_date: datetime.datetime) -> str:
        raise NotImplementedError()

    @abstractmethod
    def decrypt_email_confirm_code(self, code: str) -> EmailConfirmTokenData | None:
        raise NotImplementedError()
