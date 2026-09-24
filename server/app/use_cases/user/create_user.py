from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.hash import HashService
from app.core.roles import ROLE_CUSTOMER
from app.models import UserNotification
from app.models.sector.sector import Sector
from app.models.sector.user_sector import UserSector
from app.models.user.role import Role
from app.models.user.user import User
from app.services.file_management.service import FileManagementService
from app.use_cases.user.create_first_login_notification import create_first_login_notifications


async def create_user(
    email: str,
    password: str,
    hasher: HashService,
    db: Session,
    file_service: FileManagementService,
    name: str | None = None,
    avatar_key: str | None = None,
    role_name: str = ROLE_CUSTOMER,
    sector_id: UUID | None = None,
):
    if avatar_key and not await file_service.read(avatar_key):
        raise ValueError("user.avatar_not_found")

    if sector_id is not None:
        sector = db.execute(select(Sector).where(Sector.id == sector_id)).scalars().first()
        if not sector:
            raise ValueError("sector.not_found")

    role = db.execute(select(Role).where(Role.name == role_name)).scalars().first()

    user = User(
        email=email.strip().lower(),
        name=name.strip() if name else None,
        avatar_key=avatar_key or None,
        password=hasher.create_hash(password),
        role_id=role.id if role else None,
    )
    db.add(user)
    db.flush()

    if role_name == ROLE_CUSTOMER and sector_id is not None:
        db.add(UserSector(user_id=user.id, sector_id=sector_id))

    notifications = await create_first_login_notifications(db, commit=False)

    for notification in notifications:
        db.add(UserNotification(
            notification=notification,
            user=user,
        ))

    db.commit()

    return user
