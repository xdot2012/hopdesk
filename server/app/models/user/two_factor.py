from sqlalchemy import Column, String, DateTime, func
from sqlalchemy.dialects.postgresql import UUID

from app.models.base import Base

class TwoFactor(Base):
    __tablename__ = 'two_factor'

    user_id = Column(UUID(as_uuid=True), nullable=False)
    code = Column(String(length=6), primary_key=True)
    expires_at = Column(DateTime(timezone=False), nullable=False, index=True)
    created_at = Column(DateTime(timezone=False), nullable=False, server_default=func.now())
