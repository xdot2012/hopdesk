from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.core.roles import ALL_ROLES, ROLE_ADMIN, ROLE_CUSTOMER
from app.models.sector.user_sector import UserSector
from app.models.user.role import Role
from app.models.user.user import User


async def update_user_role(
    user_id: UUID,
    role_name: str,
    actor_user_id: UUID,
    db: Session,
) -> tuple[User | None, str | None]:
    if role_name not in ALL_ROLES:
        return None, "invalid_role"

    if user_id == actor_user_id:
        return None, "cannot_change_own_role"

    user = (
        db.execute(
            select(User).options(joinedload(User.role)).where(User.id == user_id)
        )
        .scalars()
        .unique()
        .first()
    )
    if not user:
        return None, "user_not_found"

    current_role = user.role.name if user.role else None
    if current_role == role_name:
        return user, None

    if current_role == ROLE_ADMIN and role_name != ROLE_ADMIN:
        admin_count = db.execute(
            select(func.count())
            .select_from(User)
            .join(Role, User.role_id == Role.id)
            .where(Role.name == ROLE_ADMIN)
        ).scalar_one()
        if admin_count <= 1:
            return None, "last_admin"

    role = db.execute(select(Role).where(Role.name == role_name)).scalars().first()
    if not role:
        return None, "role_not_found"

    user.role_id = role.id

    if role_name == ROLE_CUSTOMER:
        existing_membership = (
            db.execute(select(UserSector).where(UserSector.user_id == user_id))
            .scalars()
            .first()
        )
        if not existing_membership:
            db.add(UserSector(user_id=user_id))

    db.commit()

    refreshed = (
        db.execute(
            select(User).options(joinedload(User.role)).where(User.id == user_id)
        )
        .scalars()
        .unique()
        .first()
    )
    return refreshed, None
