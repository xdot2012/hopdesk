from sqlalchemy import Column, Index, String, func
from sqlalchemy.orm import relationship

from app.models.base import TimedBase


class Sector(TimedBase):
    __tablename__ = "sector"

    name = Column(String(200), nullable=False)
    color = Column(String(7), nullable=False, default="#2563EB")

    __table_args__ = (
        Index("uq_sector_name_lower", func.lower(name), unique=True),
    )

    user_sectors = relationship("UserSector", back_populates="sector")
    tickets = relationship("Ticket", back_populates="sector")
