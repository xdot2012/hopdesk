from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models.user.user import User


async def get_user_by_id(user_id: UUID, db: Session):
    result = db.execute(
        select(User).options(joinedload(User.role)).where(User.id == user_id)
    )
    return result.scalars().unique().first()
