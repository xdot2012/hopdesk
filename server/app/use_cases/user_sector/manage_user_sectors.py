from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.core.roles import ROLE_CUSTOMER
from app.models.sector.sector import Sector
from app.models.sector.user_sector import UserSector
from app.models.user.user import User
from app.services.file_management.service import FileManagementService
from app.use_cases.user.build_user_response import build_user_avatar_url


def _user_sector_load_options():
    return (
        joinedload(UserSector.user).joinedload(User.role),
        joinedload(UserSector.sector),
    )


def build_user_sector_response(
    user_sector: UserSector,
    file_service: FileManagementService,
) -> dict:
    return {
        "id": user_sector.id,
        "user_id": user_sector.user_id,
        "user_email": user_sector.user.email if user_sector.user else None,
        "user_name": user_sector.user.name if user_sector.user else None,
        "user_avatar_url": (
            build_user_avatar_url(user_sector.user, file_service) if user_sector.user else None
        ),
        "sector_id": user_sector.sector_id,
        "sector_name": user_sector.sector.name if user_sector.sector else None,
        "sector_color": user_sector.sector.color if user_sector.sector else None,
        "is_sector_manager": bool(user_sector.is_sector_manager),
    }


def get_user_sector(user_id: UUID, db: Session) -> UserSector | None:
    return (
        db.execute(
            select(UserSector)
            .where(UserSector.user_id == user_id)
            .order_by(UserSector.created_at.asc())
        )
        .scalars()
        .first()
    )


def get_managed_user_sector(user_id: UUID, db: Session) -> UserSector | None:
    return (
        db.execute(
            select(UserSector).where(
                UserSector.user_id == user_id,
                UserSector.is_sector_manager.is_(True),
                UserSector.sector_id.is_not(None),
            )
        )
        .scalars()
        .first()
    )


def user_sector_can_access_ticket(user_id: UUID, ticket, db: Session) -> bool:
    if ticket.requester_user_id == user_id:
        return True
    if not ticket.sector_id:
        return False
    membership = get_managed_user_sector(user_id, db)
    if not membership:
        return False
    return membership.sector_id == ticket.sector_id


async def list_user_sectors(db: Session) -> list[UserSector]:
    result = db.execute(
        select(UserSector)
        .options(*_user_sector_load_options())
        .order_by(UserSector.created_at.asc())
    )
    rows = list(result.scalars().unique().all())
    return [
        row
        for row in rows
        if row.user
        and row.user.role
        and row.user.role.name == ROLE_CUSTOMER
    ]


async def add_user_sector(
    user_id: UUID,
    db: Session,
    *,
    sector_id: UUID | None = None,
) -> tuple[UserSector | None, str | None]:
    user = db.execute(
        select(User).options(joinedload(User.role)).where(User.id == user_id)
    ).scalars().first()
    if not user:
        return None, "user_not_found"
    if not user.role or user.role.name != ROLE_CUSTOMER:
        return None, "not_customer"

    existing = db.execute(
        select(UserSector).where(UserSector.user_id == user_id)
    ).scalars().first()
    if existing:
        return None, "user_sector_exists"

    if sector_id is not None:
        sector = db.execute(
            select(Sector).where(Sector.id == sector_id)
        ).scalars().first()
        if not sector:
            return None, "sector_not_found"

    user_sector = UserSector(user_id=user_id, sector_id=sector_id)
    db.add(user_sector)
    db.commit()

    result = db.execute(
        select(UserSector)
        .options(*_user_sector_load_options())
        .where(UserSector.id == user_sector.id)
    )
    return result.scalars().unique().first(), None


async def update_user_sector(
    user_sector_id: UUID,
    db: Session,
    *,
    sector_id: UUID | None | object = ...,
    is_sector_manager: bool | None = None,
) -> tuple[UserSector | None, str | None]:
    from app.core.cache_database import invalidate_user_profile_cache

    user_sector = db.execute(
        select(UserSector).where(UserSector.id == user_sector_id)
    ).scalars().first()
    if not user_sector:
        return None, "user_sector_not_found"

    if sector_id is not ...:
        if sector_id is not None:
            sector = db.execute(
                select(Sector).where(Sector.id == sector_id)
            ).scalars().first()
            if not sector:
                return None, "sector_not_found"
        user_sector.sector_id = sector_id
        if sector_id is None:
            user_sector.is_sector_manager = False

    if is_sector_manager is not None:
        if is_sector_manager and not user_sector.sector_id:
            return None, "sector_not_found"
        user_sector.is_sector_manager = is_sector_manager

    db.commit()
    await invalidate_user_profile_cache(str(user_sector.user_id))

    result = db.execute(
        select(UserSector)
        .options(*_user_sector_load_options())
        .where(UserSector.id == user_sector_id)
    )
    return result.scalars().unique().first(), None


async def delete_user_sector(
    user_sector_id: UUID,
    db: Session,
) -> str | None:
    from app.core.cache_database import invalidate_user_profile_cache

    user_sector = db.execute(
        select(UserSector).where(UserSector.id == user_sector_id)
    ).scalars().first()
    if not user_sector:
        return "user_sector_not_found"

    user_id = user_sector.user_id
    db.delete(user_sector)
    db.commit()
    await invalidate_user_profile_cache(str(user_id))
    return None
