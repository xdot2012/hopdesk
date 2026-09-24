import datetime
from typing import Annotated

from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from uuid import UUID
from starlette import status

from .entities import RefreshTokenData, AccessTokenData
from .service import TokenService
from .jwt.repository import JwtRepository
from app.settings import Settings, get_settings
from app.core.encoding import decrypt_text

TOKEN_URL = "/sign_in"
REFRESH_URL = "/refresh"


def get_token_service(settings: Settings = Depends(get_settings)) -> TokenService:
    return TokenService(JwtRepository(
        secret_key=settings.secret_key,
        algorithm=settings.algorithm,
        token_type=settings.token_type)
    )


oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f'{"/v1/user"}/{TOKEN_URL}')


async def get_refresh_token(refresh_token: Annotated[str, Depends(oauth2_scheme)],
                            token_service: Annotated[TokenService, Depends(get_token_service)]) -> RefreshTokenData:

    refresh_token_data = token_service.decrypt_refresh_token(refresh_token)

    return refresh_token_data


async def get_user_token(token: Annotated[str, Depends(oauth2_scheme)], authorization_service: Annotated[TokenService, Depends(get_token_service)]) -> AccessTokenData:

    token_data = authorization_service.decrypt_access_token(token)

    return token_data


async def validate_user_token(token=Depends(get_user_token), settings: Settings = Depends(get_settings)):
    token_expiration = datetime.datetime.fromtimestamp(token.exp)

    if token_expiration <= datetime.datetime.now():
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="token.expired", headers={"WWW-Authenticate": "Bearer"})

    user_id = UUID(decrypt_text(token.key, settings.encryption_key))

    return {
        "user_id": user_id,
        "role": token.role
    }


