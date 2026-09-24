import datetime

from sqlalchemy import and_, or_, update
from sqlalchemy.orm import Session

from app.core.ticket_constants import (
    SLA_STATUS_DUE,
    SLA_STATUS_FAILED,
)
from app.core.ticket_events import ACTION_UPDATED, publish_ticket_changed
from app.models.ticket.ticket import Ticket


def refresh_overdue_slas(
    db: Session,
    *,
    now: datetime.datetime | None = None,
) -> int:
    now = now or datetime.datetime.now()

    stmt = (
        update(Ticket)
        .where(
            Ticket.sla_status == SLA_STATUS_DUE,
            Ticket.resolved_at.is_(None),
            or_(
                and_(
                    Ticket.first_responded_at.is_(None),
                    Ticket.response_due_at.is_not(None),
                    Ticket.response_due_at < now,
                ),
                and_(
                    Ticket.first_responded_at.is_not(None),
                    Ticket.resolution_due_at.is_not(None),
                    Ticket.resolution_due_at < now,
                ),
            ),
        )
        .values(
            sla_status=SLA_STATUS_FAILED,
            updated_at=now,
        )
        .returning(Ticket.id, Ticket.requester_user_id, Ticket.sector_id)
    )

    rows = db.execute(stmt).all()
    if rows:
        for ticket_id, requester_user_id, sector_id in rows:
            publish_ticket_changed(
                ticket_id=ticket_id,
                action=ACTION_UPDATED,
                requester_user_id=requester_user_id,
                sector_id=sector_id,
            )
    db.commit()
    return len(rows)
