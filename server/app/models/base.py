import uuid
from typing import Any
from uuid import uuid4

from sqlalchemy import Column, DateTime, ForeignKey, String, Uuid, func
from sqlalchemy.orm import DeclarativeBase, Mapped, MappedColumn, mapped_column


class Base(DeclarativeBase):
    pass


def uuid_foreign_key(
    target: str,
    *,
    name: str | None = None,
    ondelete: str = 'RESTRICT',
    primary_key: bool = False,
    nullable: bool = False,
    unique: bool = False,
    index: bool = False,
    default: Any | None = None,
) -> MappedColumn[uuid.UUID]:
    kwargs: dict[str, Any] = {'nullable': nullable}
    if primary_key:
        kwargs['primary_key'] = True
    if unique:
        kwargs['unique'] = True
    if index:
        kwargs['index'] = True
    if default is not None:
        kwargs['default'] = default
    if name is not None:
        return mapped_column(name, Uuid, ForeignKey(target, ondelete=ondelete), **kwargs)
    return mapped_column(Uuid, ForeignKey(target, ondelete=ondelete), **kwargs)


def string_foreign_key(
    target: str,
    length: int,
    *,
    ondelete: str = 'RESTRICT',
    primary_key: bool = False,
    nullable: bool = False,
    unique: bool = False,
    index: bool = False,
    default: Any | None = None,
) -> MappedColumn[str]:
    kwargs: dict[str, Any] = {'nullable': nullable}
    if primary_key:
        kwargs['primary_key'] = True
    if unique:
        kwargs['unique'] = True
    if index:
        kwargs['index'] = True
    if default is not None:
        kwargs['default'] = default
    return mapped_column(String(length), ForeignKey(target, ondelete=ondelete), **kwargs)


class UUIDBase(Base):
    __abstract__ = True
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, index=True, default=uuid4, sort_order=-1)


class TimedBase(UUIDBase):
    __abstract__ = True

    created_at = Column(DateTime(timezone=False), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=False), nullable=False, server_default=func.now(), onupdate=func.now())


class AuditedBase(TimedBase):
    __abstract__ = True

    created_by_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    updated_by_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
