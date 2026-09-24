import datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.core.hash import HashService
from app.core.token import TokenService
from app.core.encoding import encrypt_text
from app.models.user.user import User
from app.models.user.session import Session as AuthSession


async def get_user_by_email(email: str, db: Session):
    result = db.execute(
        select(User).options(joinedload(User.role)).where(User.email == email)
    )
    user = result.scalars().unique().first()

    return user


async def authenticate_user(email: str, password: str, db: Session, hasher: HashService):
    user = await get_user_by_email(email, db)

    if user is None:
        return

    if not hasher.validate_hash(password, user.password):
        return


    return user


async def get_user_session(user_id: UUID, db: Session):
    result = db.execute(select(AuthSession).where(AuthSession.user_id == user_id))
    return result.scalars().first()


async def create_auth_session(user_id: UUID, created_at: datetime, expires_at: datetime, user_agent: str, client_ip: str,
                              is_blocked: bool, db: Session):
    auth_session = AuthSession(
        user_id=user_id,
        created_at=created_at,
        expires_at=expires_at,
        user_agent=user_agent,
        client_ip=client_ip,
        is_blocked=is_blocked,
    )

    db.add(auth_session)
    db.commit()
    return auth_session


async def update_auth_session(user_id: UUID, created_at: datetime, expires_at: datetime, user_agent: str, client_ip: str,
                              is_blocked: bool, db: Session):
    result = db.execute(select(AuthSession).where(AuthSession.user_id == user_id))
    auth_session = result.scalars().first()

    auth_session.created_at=created_at
    auth_session.expires_at=expires_at
    auth_session.user_agent=user_agent
    auth_session.client_ip=client_ip
    auth_session.is_blocked=is_blocked

    db.add(auth_session)
    db.commit()
    return auth_session


def create_token_response(user_id: UUID, user_role: str, encryption_key: str, token_service: TokenService, token_type: str,
                                created_at: datetime, access_token_expiration: datetime, refresh_token_expiration: datetime):
    key = encrypt_text(str(user_id), encryption_key)
    access_token = token_service.create_access_token(
        key=key,
        role=user_role,
        expiration_date=access_token_expiration
    )

    refresh_token = token_service.create_refresh_token(
        key=key,
        expiration_date=refresh_token_expiration,
        created_at=created_at,
    )

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": token_type
    }


async def reset_user_password(user_id: UUID, new_password: str, hasher: HashService, db: Session):
    result = db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()

    user.password = hasher.create_hash(new_password)
    db.add(user)

    result = db.execute(select(AuthSession).where(AuthSession.user_id == user_id))
    auth_session = result.scalars().first()

    if not auth_session:
        return user

    auth_session.expires_at = datetime.datetime.now()

    db.add(auth_session)
    db.commit()
    return user