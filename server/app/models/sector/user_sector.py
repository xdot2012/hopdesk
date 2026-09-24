from sqlalchemy import Boolean, Column, UniqueConstraint
from sqlalchemy.orm import relationship

from app.models.base import TimedBase, uuid_foreign_key


class UserSector(TimedBase):
    __tablename__ = "user_sector"
    __table_args__ = (
        UniqueConstraint("user_id", name="uq_user_sector_user_id"),
    )

    user_id = uuid_foreign_key("user.id", ondelete="CASCADE", index=True)
    sector_id = uuid_foreign_key("sector.id", ondelete="SET NULL", nullable=True, index=True)
    is_sector_manager = Column(Boolean, nullable=False, default=False)

    user = relationship("User")
    sector = relationship("Sector", back_populates="user_sectors")
