import datetime

from fastapi import HTTPException
from jose import JWTError
from starlette import status

from .entities import AccessTokenData, RefreshTokenData, ResetPasswordTokenData, EmailConfirmTokenData
from .repository import AuthorizationRepository

error_responses = {
    'Signature has expired.': 'token.expired',
    'Not enough segments': 'token.invalid',
}

DEFAULT_TOKEN_ERROR = 'token.invalid'


def _token_error_detail(jwt_error: JWTError) -> str:
    return error_responses.get(str(jwt_error), DEFAULT_TOKEN_ERROR)


class TokenService:

    def __init__(self, authorization_repository: AuthorizationRepository):
        self.authorization_repository = authorization_repository

    def create_access_token(self, key: str, role: str, expiration_date: datetime.datetime) -> str:
        return self.authorization_repository.create_access_token(key=key, role=role, expiration_date=expiration_date)

    def create_refresh_token(self, key: str, expiration_date: datetime.datetime, created_at: datetime.datetime) -> str:
        return self.authorization_repository.create_refresh_token(key=key, expiration_date=expiration_date, created_at=created_at)

    def decrypt_access_token(self, token: str) -> AccessTokenData:
        try:
            token_data = self.authorization_repository.decrypt_access_token(token=token)

        except JWTError as jwt:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=_token_error_detail(jwt),
                headers={"WWW-Authenticate": "Bearer"},
            )

        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=e.__str__(),
                headers={"WWW-Authenticate": "Bearer"},
            )

        if token_data is None:
            raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Could not validate credentials",
                    headers={"WWW-Authenticate": "Bearer"},
                )

        return token_data

    def decrypt_refresh_token(self, refresh_token: str) -> RefreshTokenData:
        try:
            refresh_token_data = self.authorization_repository.decrypt_refresh_token(refresh_token=refresh_token)

        except JWTError as jwt:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=_token_error_detail(jwt),
                headers={"WWW-Authenticate": "Bearer"},
            )

        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=e.__str__(),
                headers={"WWW-Authenticate": "Bearer"},
            )

        if refresh_token_data is None:
            raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Could not validate credentials",
                    headers={"WWW-Authenticate": "Bearer"},
                )

        return refresh_token_data

    def create_password_reset_token(self, key: str, expiration_date: datetime.datetime) -> str:
        return self.authorization_repository.create_password_reset_token(key=key, expiration_date=expiration_date)

    def validate_password_reset_token(self, token: str) -> ResetPasswordTokenData:
        try:
            reset_token = self.authorization_repository.decrypt_password_reset_code(token)

        except JWTError as jwt:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=_token_error_detail(jwt),
                headers={"WWW-Authenticate": "Bearer"},
            )

        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=e.__str__(),
                headers={"WWW-Authenticate": "Bearer"},
            )

        if reset_token is None:
            raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Could not validate credentials",
                    headers={"WWW-Authenticate": "Bearer"},
                )

        return reset_token

    def create_email_confirm_token(self, key: str, expiration_date: datetime.datetime) -> str:
        return self.authorization_repository.create_email_confirm_token(key=key, expiration_date=expiration_date)

    def validate_email_confirm_token(self, token: str) -> EmailConfirmTokenData:
        try:
            email_confirm_token = self.authorization_repository.decrypt_email_confirm_code(token)

        except JWTError as jwt:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=_token_error_detail(jwt),
                headers={"WWW-Authenticate": "Bearer"},
            )

        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=e.__str__(),
                headers={"WWW-Authenticate": "Bearer"},
            )

        if email_confirm_token is None:
            raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Could not validate credentials",
                    headers={"WWW-Authenticate": "Bearer"},
                )

        return email_confirm_token
