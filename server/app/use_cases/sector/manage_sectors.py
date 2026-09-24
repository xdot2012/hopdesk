import re
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.sector.sector import Sector

SECTOR_COLOR_PALETTE = (
    "#2563EB",
    "#059669",
    "#D97706",
    "#DC2626",
    "#7C3AED",
    "#0891B2",
    "#DB2777",
    "#65A30D",
)

_HEX_COLOR_RE = re.compile(r"^#[0-9A-Fa-f]{6}$")


def normalize_sector_color(color: str | None) -> str | None:
    if color is None:
        return None
    cleaned = color.strip()
    if not cleaned:
        return None
    if not cleaned.startswith("#"):
        cleaned = f"#{cleaned}"
    if not _HEX_COLOR_RE.match(cleaned):
        return None
    return cleaned.upper()


def next_sector_color(db: Session) -> str:
    count = db.execute(select(func.count()).select_from(Sector)).scalar_one()
    return SECTOR_COLOR_PALETTE[int(count) % len(SECTOR_COLOR_PALETTE)]


def build_sector_response(sector: Sector) -> dict:
    return {
        "id": sector.id,
        "name": sector.name,
        "color": sector.color,
        "created_at": sector.created_at,
    }


async def list_sectors(db: Session) -> list[Sector]:
    result = db.execute(select(Sector).order_by(Sector.name))
    return list(result.scalars().all())


async def create_sector(
    name: str,
    db: Session,
    *,
    color: str | None = None,
) -> tuple[Sector | None, str | None]:
    cleaned = name.strip()
    existing = db.execute(
        select(Sector).where(func.lower(Sector.name) == cleaned.lower())
    ).scalars().first()
    if existing:
        return None, "sector_exists"

    resolved_color = normalize_sector_color(color)
    if color is not None and resolved_color is None:
        return None, "invalid_color"
    if resolved_color is None:
        resolved_color = next_sector_color(db)

    sector = Sector(name=cleaned, color=resolved_color)
    db.add(sector)
    db.commit()
    db.refresh(sector)
    return sector, None


async def update_sector(
    sector_id: UUID,
    db: Session,
    *,
    name: str | None = None,
    color: str | None = None,
) -> tuple[Sector | None, str | None]:
    sector = db.execute(select(Sector).where(Sector.id == sector_id)).scalars().first()
    if not sector:
        return None, "sector_not_found"

    if name is not None:
        cleaned = name.strip()
        existing = db.execute(
            select(Sector).where(
                func.lower(Sector.name) == cleaned.lower(),
                Sector.id != sector_id,
            )
        ).scalars().first()
        if existing:
            return None, "sector_exists"
        sector.name = cleaned

    if color is not None:
        resolved_color = normalize_sector_color(color)
        if resolved_color is None:
            return None, "invalid_color"
        sector.color = resolved_color

    db.commit()
    db.refresh(sector)
    return sector, None


async def delete_sector(sector_id: UUID, db: Session) -> str | None:
    sector = db.execute(select(Sector).where(Sector.id == sector_id)).scalars().first()
    if not sector:
        return "sector_not_found"

    db.delete(sector)
    db.commit()
    return None
