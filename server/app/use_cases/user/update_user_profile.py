from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.cache_database import invalidate_user_profile_cache
from app.models.user.user import User
from app.services.file_management.service import FileManagementService
from app.use_cases.auth.authenticate import get_user_by_email


async def update_user_profile(
    user_id: UUID,
    db: Session,
    file_service: FileManagementService,
    name: str,
    email: str,
    avatar_key: str | None = None,
) -> tuple[User | None, str | None, bool]:
    user = db.execute(select(User).where(User.id == user_id)).scalars().first()

    if not user:
        return None, "not_found", False

    user.name = name.strip() if name else None

    normalized_email = email.strip().lower()
    email_changed = normalized_email != user.email

    if email_changed:
        existing_user = await get_user_by_email(normalized_email, db)
        if existing_user and existing_user.id != user_id:
            return None, "email_already_exists", False

        user.email = normalized_email
        user.email_confirmed = False

    normalized_key = avatar_key or None

    if normalized_key and not await file_service.read(normalized_key):
        return None, "avatar_not_found", False

    if user.avatar_key and user.avatar_key != normalized_key:
        await file_service.delete(user.avatar_key)

    user.avatar_key = normalized_key

    db.add(user)
    db.commit()
    db.refresh(user)

    await invalidate_user_profile_cache(user_id)

    return user, None, email_changed
