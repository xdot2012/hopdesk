from sqlalchemy import Column, String
from sqlalchemy.orm import relationship

from app.models.base import TimedBase


class Role(TimedBase):
    __tablename__ = "role"

    name = Column(String(100), unique=True, nullable=False)
    users = relationship("User", back_populates="role")
