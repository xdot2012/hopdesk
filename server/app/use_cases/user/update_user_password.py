from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.cache_database import invalidate_user_profile_cache
from app.core.hash import HashService
from app.models.user.user import User


async def update_user_password(
    user_id: UUID,
    db: Session,
    hasher: HashService,
    old_password: str,
    new_password: str,
) -> tuple[User | None, str | None]:
    user = db.execute(select(User).where(User.id == user_id)).scalars().first()

    if not user:
        return None, "not_found"

    if not hasher.validate_hash(old_password, user.password):
        return None, "wrong_password"

    user.password = hasher.create_hash(new_password)

    db.add(user)
    db.commit()
    db.refresh(user)

    await invalidate_user_profile_cache(user_id)

    return user, None
