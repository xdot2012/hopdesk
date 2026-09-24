from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.core.timezone import DEFAULT_TIMEZONE, normalize_timezone
from app.models.sla.policy import SlaPolicy
from app.models.sla.priority_target import SlaPriorityTarget
from app.models.ticket.ticket_priority import TicketPriority
from app.use_cases.instance.manage_instance import get_instance_timezone

DEFAULT_POLICY_TIMEZONE = DEFAULT_TIMEZONE


def build_sla_policy_response(policy: SlaPolicy) -> dict:
    return {
        "id": policy.id,
        "name": policy.name,
        "is_default": policy.is_default,
        "enabled": policy.enabled,
        "timezone": policy.timezone or DEFAULT_POLICY_TIMEZONE,
        "priority_targets": [
            {
                "id": target.id,
                "priority_id": target.priority_id,
                "priority_code": target.priority.code if target.priority else None,
                "priority_label": target.priority.label if target.priority else None,
                "first_response_minutes": target.first_response_minutes,
                "resolution_minutes": target.resolution_minutes,
            }
            for target in sorted(
                policy.priority_targets,
                key=lambda item: item.priority.sort_order if item.priority else 0,
            )
        ],
    }


def _policy_load_options():
    return (
        joinedload(SlaPolicy.priority_targets).joinedload(
            SlaPriorityTarget.priority
        ),
    )


def _ensure_sla_priority_targets(db: Session, policy: SlaPolicy) -> bool:
    from app.use_cases.seed.seed_helpdesk_defaults import PRIORITY_SEEDS

    existing_priority_ids = {target.priority_id for target in policy.priority_targets}
    added = False

    for code, _, _, first_response_minutes, resolution_minutes in PRIORITY_SEEDS:
        priority = db.execute(
            select(TicketPriority).where(TicketPriority.code == code)
        ).scalars().first()
        if not priority or priority.id in existing_priority_ids:
            continue
        db.add(
            SlaPriorityTarget(
                id=uuid4(),
                policy_id=policy.id,
                priority_id=priority.id,
                first_response_minutes=first_response_minutes,
                resolution_minutes=resolution_minutes,
            )
        )
        added = True

    if added:
        db.flush()
    return added


async def get_default_sla(
    db: Session,
) -> SlaPolicy | None:
    result = db.execute(
        select(SlaPolicy)
        .options(*_policy_load_options())
        .order_by(SlaPolicy.created_at.asc())
        .limit(1)
    )
    policy = result.scalars().unique().first()
    if policy and _ensure_sla_priority_targets(db, policy):
        db.commit()
        result = db.execute(
            select(SlaPolicy)
            .options(*_policy_load_options())
            .where(SlaPolicy.id == policy.id)
        )
        policy = result.scalars().unique().one()
    return policy


def create_default_sla(
    db: Session,
    *,
    name: str = "Padrão",
    commit: bool = False,
) -> SlaPolicy:
    from app.use_cases.seed.seed_helpdesk_defaults import PRIORITY_SEEDS

    existing = (
        db.execute(
            select(SlaPolicy)
            .options(*_policy_load_options())
            .limit(1)
        )
        .scalars()
        .unique()
        .first()
    )
    if existing:
        _ensure_sla_priority_targets(db, existing)
        if commit:
            db.commit()
            db.refresh(existing)
        return existing

    priorities: dict[str, TicketPriority] = {}
    for code, _, _, _, _ in PRIORITY_SEEDS:
        priority = db.execute(
            select(TicketPriority).where(TicketPriority.code == code)
        ).scalars().first()
        if priority:
            priorities[code] = priority

    policy = SlaPolicy(
        id=uuid4(),
        name=name,
        is_default=True,
        enabled=True,
        timezone=get_instance_timezone(db) or DEFAULT_POLICY_TIMEZONE,
    )
    db.add(policy)
    db.flush()

    for code, _, _, first_response_minutes, resolution_minutes in PRIORITY_SEEDS:
        priority = priorities.get(code)
        if not priority:
            continue
        db.add(
            SlaPriorityTarget(
                id=uuid4(),
                policy_id=policy.id,
                priority_id=priority.id,
                first_response_minutes=first_response_minutes,
                resolution_minutes=resolution_minutes,
            )
        )

    if commit:
        db.commit()
        db.refresh(policy)
    return policy


async def update_sla_targets(
    db: Session,
    targets: list,
    *,
    timezone: str | None = None,
) -> tuple[SlaPolicy | None, str | None]:
    policy = await get_default_sla(db)
    if not policy:
        return None, "not_found"

    if timezone is not None:
        cleaned = normalize_timezone(timezone)
        if cleaned is None:
            return None, "invalid_timezone"
        policy.timezone = cleaned
        db.add(policy)

    by_priority = {target.priority_id: target for target in policy.priority_targets}

    for item in targets:
        priority_id = item["priority_id"] if isinstance(item, dict) else item.priority_id
        first_response_minutes = (
            item["first_response_minutes"] if isinstance(item, dict) else item.first_response_minutes
        )
        resolution_minutes = (
            item["resolution_minutes"] if isinstance(item, dict) else item.resolution_minutes
        )

        priority = db.execute(
            select(TicketPriority).where(TicketPriority.id == priority_id)
        ).scalars().first()
        if not priority:
            continue

        existing = by_priority.get(priority_id)
        if existing:
            existing.first_response_minutes = first_response_minutes
            existing.resolution_minutes = resolution_minutes
            db.add(existing)
        else:
            db.add(
                SlaPriorityTarget(
                    policy_id=policy.id,
                    priority_id=priority_id,
                    first_response_minutes=first_response_minutes,
                    resolution_minutes=resolution_minutes,
                )
            )

    db.commit()
    return await get_default_sla(db), None


async def update_sla_targets_for_customer(
    customer_id,
    db: Session,
    targets: list,
) -> tuple[SlaPolicy | None, str | None]:
    return await update_sla_targets(db, targets)
