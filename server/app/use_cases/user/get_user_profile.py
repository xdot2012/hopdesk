import datetime

from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, select

from app.core.cache_database import USER_PROFILE_CACHE_PREFIX, cached_database_resource
from app.models import Notification, User, UserNotification
from app.models.sector.user_sector import UserSector


@cached_database_resource(resource_key=USER_PROFILE_CACHE_PREFIX)
async def get_user_profile(user_id: str, db: Session):
    result = db.execute(
        select(User)
        .options(joinedload(User.role))
        .where(User.id == user_id)
    )
    user = result.scalars().unique().first()
    if not user:
        return None

    membership = db.execute(
        select(UserSector)
        .options(joinedload(UserSector.sector))
        .where(UserSector.user_id == user_id)
        .limit(1)
    ).scalars().first()

    sector = membership.sector if membership else None
    is_sector_manager = bool(
        membership and membership.is_sector_manager and membership.sector_id
    )

    now = datetime.datetime.now()
    unread_rows = (
        db.execute(
            select(UserNotification)
            .options(joinedload(UserNotification.notification))
            .join(Notification, UserNotification.notification_id == Notification.id)
            .where(
                UserNotification.user_id == user_id,
                UserNotification.read_at.is_(None),
                or_(Notification.expires_at.is_(None), Notification.expires_at > now),
            )
            .order_by(Notification.created_at.desc())
        )
        .scalars()
        .unique()
        .all()
    )

    notifications = [
        {
            "id": row.notification.id,
            "title": row.notification.title,
            "text": row.notification.text,
            "link": row.notification.link,
            "created_at": row.notification.created_at,
        }
        for row in unread_rows
        if row.notification is not None
    ]

    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "avatar_key": user.avatar_key,
        "locale": user.locale,
        "email_confirmed": user.email_confirmed,
        "created_at": user.created_at,
        "role": user.role.name if user.role else None,
        "permissions": [],
        "is_sector_manager": is_sector_manager,
        "sector_id": membership.sector_id if membership else None,
        "sector_name": sector.name if sector else None,
        "sector_color": sector.color if sector else None,
        "managed_sector_id": membership.sector_id if is_sector_manager else None,
        "managed_sector_name": sector.name if is_sector_manager and sector else None,
        "managed_sector_color": sector.color if is_sector_manager and sector else None,
        "notifications": notifications,
    }
