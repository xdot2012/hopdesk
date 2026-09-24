from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.cache_database import invalidate_user_profile_cache
from app.models.user.user import User

SUPPORTED_LOCALES = {"pt-BR", "en"}


async def update_user_preferences(
    user_id: UUID,
    db: Session,
    locale: str,
) -> tuple[User | None, str | None]:
    if locale not in SUPPORTED_LOCALES:
        return None, "invalid_locale"

    user = db.execute(select(User).where(User.id == user_id)).scalars().first()

    if not user:
        return None, "not_found"

    user.locale = locale

    db.add(user)
    db.commit()
    db.refresh(user)

    await invalidate_user_profile_cache(user_id)

    return user, None
