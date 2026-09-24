from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models.user.user import User
from app.services.file_management.service import FileManagementService
from app.use_cases.user.build_user_response import build_user_avatar_url


def build_managed_user_response(
    user: User,
    file_service: FileManagementService,
) -> dict:
    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "avatar_url": build_user_avatar_url(user, file_service),
        "role": user.role.name if user.role else None,
    }


async def list_managed_users(db: Session) -> list[User]:
    result = db.execute(
        select(User)
        .options(joinedload(User.role))
        .order_by(User.name.nulls_last(), User.email)
    )
    return list(result.scalars().unique().all())
