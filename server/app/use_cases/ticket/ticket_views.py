import datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.ticket.ticket_view import TicketView


def mark_ticket_viewed(
    *,
    ticket_id: UUID,
    user_id: UUID,
    db: Session,
    viewed_at: datetime.datetime | None = None,
) -> None:
    now = viewed_at or datetime.datetime.now()
    view = db.execute(
        select(TicketView).where(
            TicketView.ticket_id == ticket_id,
            TicketView.user_id == user_id,
        )
    ).scalars().first()
    if view:
        view.last_viewed_at = now
        db.add(view)
    else:
        db.add(
            TicketView(
                ticket_id=ticket_id,
                user_id=user_id,
                last_viewed_at=now,
            )
        )
    db.commit()


def get_ticket_last_viewed_map(
    *,
    user_id: UUID,
    ticket_ids: list[UUID],
    db: Session,
) -> dict[UUID, datetime.datetime]:
    if not ticket_ids:
        return {}
    rows = db.execute(
        select(TicketView.ticket_id, TicketView.last_viewed_at).where(
            TicketView.user_id == user_id,
            TicketView.ticket_id.in_(ticket_ids),
        )
    ).all()
    return {ticket_id: last_viewed_at for ticket_id, last_viewed_at in rows}
