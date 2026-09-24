"""Seed de chamados a partir de dados sintéticos (CSV de demonstração)."""

from __future__ import annotations

import csv
import datetime
import random
import re
from pathlib import Path
from uuid import uuid4

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.hash import get_hash_service
from app.core.roles import ROLE_AGENT, ROLE_CUSTOMER
from app.core.slugify import slugify
from app.core.ticket_constants import (
    MESSAGE_VISIBILITY_PUBLIC,
    SLA_STATUS_FULFILLED,
    TICKET_STATUS_CLOSED,
    TICKET_STATUS_OPEN,
)
from app.models.sector.user_sector import UserSector
from app.models.sector.sector import Sector
from app.models.ticket.ticket import Ticket
from app.models.ticket.ticket_message import TicketMessage
from app.models.ticket.ticket_priority import TicketPriority
from app.models.user.role import Role
from app.models.user.user import User
from app.settings import get_settings
from app.use_cases.sla.apply_sla import (
    apply_sla_on_create,
)

CSV_PATH = Path(__file__).resolve().parent / "data" / "bug_tracking.csv"

SEED_SECTORS: tuple[tuple[str, str], ...] = (
    ("Tecnologia", "#2563EB"),
    ("Comercial", "#059669"),
    ("Experiência do Cliente", "#D97706"),
    ("Operações", "#7C3AED"),
    ("Financeiro", "#DC2626"),
)

SEED_RANDOM = random.Random(42)

ASSIGNEE_EMAILS: dict[str, str] = {
    "Agent Alpha": "agent.alpha@hopdesk.seed",
    "Agent Beta": "agent.beta@hopdesk.seed",
    "Agent Gamma": "agent.gamma@hopdesk.seed",
    "Agent Delta": "agent.delta@hopdesk.seed",
}

PRIORITY_MAP: dict[str, str] = {
    "none": "medium",
    "normal": "medium",
    "low": "low",
    "high": "high",
    "urgent": "urgent",
}

REPORT_TYPE_LABELS: dict[str, str] = {
    "🚨 Problema": "Problema",
    "💡 Sugestão": "Sugestão",
    "🎨 Refinamento de Interface(s)": "Refinamento de interface",
}


def _parse_clickup_date(value: str) -> datetime.datetime | None:
    if not value or not value.strip():
        return None
    cleaned = re.sub(r"^\w+,\s*", "", value.strip())
    cleaned = re.sub(r"(\d+)(st|nd|rd|th)", r"\1", cleaned)
    cleaned = re.sub(r"\s[-+]\d{2}:\d{2}$", "", cleaned)
    for fmt in ("%B %d, %Y, %I:%M:%S %p", "%B %d %Y, %I:%M:%S %p"):
        try:
            return datetime.datetime.strptime(cleaned.strip(), fmt)
        except ValueError:
            continue
    return None


def _parse_assignees(raw: str) -> list[str]:
    if not raw or raw.strip() == "[]":
        return []
    return [part.strip() for part in re.findall(r"\[([^\]]+)\]", raw) for part in part.split(",")]


def _extract_page_url(raw: str) -> str:
    if not raw or not raw.strip():
        return "https://example.com"
    match = re.search(r"https?://[^\s]+", raw.strip())
    if match:
        return match.group(0)[:2000]
    return "https://example.com"


def _normalize_email(raw: str) -> tuple[str, str | None]:
    value = (raw or "").strip()
    if not value:
        return "anonimo@hopdesk.seed", None

    fixed = value.lower().replace(",", ".").replace(" ", "")
    if "@" in fixed and re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", fixed):
        return fixed[:50], None

    slug = slugify(
        value,
        separator=".",
        fallback="usuario",
        max_length=30,
        ascii_only=True,
    )
    return f"{slug}@hopdesk.seed"[:50], value[:100]


def _build_description(report_type: str, task_id: str) -> str:
    label = REPORT_TYPE_LABELS.get(report_type.strip(), report_type.strip() or "Problema")
    return f"Tipo: {label}\nOrigem seed: {task_id}"


def _get_or_create_role(db: Session, role_name: str) -> Role:
    role = db.execute(select(Role).where(Role.name == role_name)).scalars().first()
    if role:
        return role
    role = Role(id=uuid4(), name=role_name)
    db.add(role)
    db.flush()
    return role


def _get_or_create_user(
    db: Session,
    *,
    email: str,
    name: str | None,
    role: Role,
    password_hash: str,
) -> User:
    normalized_email = email.strip().lower()[:50]
    user = db.execute(select(User).where(User.email == normalized_email)).scalars().first()
    if user:
        if name and not user.name:
            user.name = name[:100]
            db.add(user)
        return user

    user = User(
        id=uuid4(),
        email=normalized_email,
        name=(name or normalized_email.split("@")[0])[:100],
        password=password_hash,
        role_id=role.id,
        email_confirmed=True,
    )
    db.add(user)
    db.flush()
    return user


def _ensure_seed_sectors(db: Session) -> list[Sector]:
    sectors: list[Sector] = []
    for name, color in SEED_SECTORS:
        sector = db.execute(
            select(Sector).where(func.lower(Sector.name) == name.lower())
        ).scalars().first()
        if not sector:
            sector = Sector(id=uuid4(), name=name, color=color)
            db.add(sector)
            db.flush()
        sectors.append(sector)
    return sectors


def _pick_sector(sectors: list[Sector]) -> Sector:
    return SEED_RANDOM.choice(sectors)


def _ensure_user_sector(db: Session, user_id, sector_id) -> None:
    existing = db.execute(
        select(UserSector).where(UserSector.user_id == user_id)
    ).scalars().first()
    if existing:
        if not existing.sector_id:
            existing.sector_id = sector_id
            db.add(existing)
        return

    db.add(UserSector(id=uuid4(), user_id=user_id, sector_id=sector_id))


def _load_priorities(db: Session) -> dict[str, TicketPriority]:
    rows = db.execute(select(TicketPriority)).scalars().all()
    return {priority.code: priority for priority in rows}


def seed_tickets(db: Session) -> int:
    """Insere chamados de teste a partir do CSV. Retorna quantidade criada (0 se já existir)."""
    if not CSV_PATH.is_file():
        return 0

    existing_count = db.execute(select(func.count()).select_from(Ticket)).scalar_one()
    if existing_count:
        return 0

    rows = list(csv.DictReader(CSV_PATH.open(encoding="utf-8")))
    if not rows:
        return 0

    settings = get_settings()
    password_hash = get_hash_service().create_hash(settings.system_default_password)
    customer_role = _get_or_create_role(db, ROLE_CUSTOMER)
    agent_role = _get_or_create_role(db, ROLE_AGENT)
    sectors = _ensure_seed_sectors(db)
    priorities = _load_priorities(db)
    default_priority = priorities.get("medium") or next(iter(priorities.values()), None)
    if not default_priority:
        return 0

    requester_cache: dict[str, User] = {}
    assignee_cache: dict[str, User] = {}

    for display_name, email in ASSIGNEE_EMAILS.items():
        assignee_cache[display_name] = _get_or_create_user(
            db,
            email=email,
            name=display_name,
            role=agent_role,
            password_hash=password_hash,
        )

    ticket_number = 1
    created = 0

    for row in rows:
        task_id = (row.get("Task ID") or "").strip()
        subject = (row.get("Task Name") or "Chamado sem título").strip()[:300]
        report_type = (row.get("Report Type (drop down)") or "").strip()
        email_raw = (row.get("Email (short text)") or "").strip()
        priority_code = PRIORITY_MAP.get((row.get("Priority") or "none").strip().lower(), "medium")
        created_at = _parse_clickup_date(row.get("Date Created") or "") or datetime.datetime.now()
        closed_at = _parse_clickup_date(row.get("Date Closed") or "")
        updated_at = _parse_clickup_date(row.get("Date Updated") or "") or created_at
        page_url = _extract_page_url(row.get("Related Links (url)") or "")
        latest_comment = (row.get("Latest Comment") or "").strip()

        requester_email, requester_name = _normalize_email(email_raw)
        if requester_email not in requester_cache:
            requester_sector = _pick_sector(sectors)
            requester_cache[requester_email] = _get_or_create_user(
                db,
                email=requester_email,
                name=requester_name,
                role=customer_role,
                password_hash=password_hash,
            )
            _ensure_user_sector(db, requester_cache[requester_email].id, requester_sector.id)
        requester = requester_cache[requester_email]
        ticket_sector = _pick_sector(sectors)

        assignee_names = _parse_assignees(row.get("Assignee") or "")
        assignee = assignee_cache.get(assignee_names[0]) if assignee_names else None

        priority = priorities.get(priority_code) or default_priority
        status = TICKET_STATUS_CLOSED if closed_at else TICKET_STATUS_OPEN

        ticket = Ticket(
            id=uuid4(),
            number=ticket_number,
            subject=subject,
            description=_build_description(report_type, task_id),
            page_url=page_url,
            external_id=task_id or None,
            status=status,
            priority_id=priority.id,
            sector_id=ticket_sector.id,
            requester_user_id=requester.id,
            assignee_user_id=assignee.id if assignee else None,
            created_at=created_at,
            updated_at=updated_at,
            resolved_at=closed_at,
            first_responded_at=updated_at if latest_comment and assignee else None,
            effort_minutes=(
                random.choice([15, 30, 45, 60, 90, 120, 180])
                if status == TICKET_STATUS_CLOSED
                else None
            ),
        )
        apply_sla_on_create(ticket, db, now=created_at)
        if status == TICKET_STATUS_CLOSED:
            ticket.sla_status = SLA_STATUS_FULFILLED

        db.add(ticket)
        db.flush()

        if latest_comment:
            author = assignee or requester
            db.add(
                TicketMessage(
                    id=uuid4(),
                    ticket_id=ticket.id,
                    author_user_id=author.id,
                    visibility=MESSAGE_VISIBILITY_PUBLIC,
                    body=latest_comment[:10000],
                    created_at=updated_at,
                    updated_at=updated_at,
                )
            )

        ticket_number += 1
        created += 1

    db.commit()
    return created
