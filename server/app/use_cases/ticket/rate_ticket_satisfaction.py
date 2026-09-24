import datetime
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.roles import ROLE_CUSTOMER
from app.core.ticket_constants import (
    TICKET_STATUS_CLOSED,
    TICKET_STATUS_TESTING,
    normalize_ticket_status,
)
from app.core.ticket_events import ACTION_UPDATED, publish_ticket_changed
from app.models.ticket.ticket import Ticket
from app.use_cases.ticket.build_ticket_response import _touch_ticket_updated_at
from app.use_cases.ticket.get_ticket import get_ticket
from app.use_cases.ticket.ticket_views import mark_ticket_viewed

SATISFACTION_ELIGIBLE_STATUSES = (
    TICKET_STATUS_TESTING,
    TICKET_STATUS_CLOSED,
)
MAX_SATISFACTION_COMMENT_LENGTH = 1000


async def rate_ticket_satisfaction(
    *,
    ticket_id: UUID,
    user_id: UUID,
    role_name: str,
    rating: int,
    comment: str | None,
    db: Session,
) -> tuple[Ticket | None, str | None]:
    if role_name != ROLE_CUSTOMER:
        return None, "forbidden"

    if rating < 1 or rating > 5:
        return None, "invalid_rating"

    ticket = await get_ticket(ticket_id, user_id, role_name, db)
    if not ticket:
        return None, "not_found"

    if ticket.requester_user_id != user_id:
        return None, "forbidden"

    status = normalize_ticket_status(ticket.status)
    if status not in SATISFACTION_ELIGIBLE_STATUSES:
        return None, "not_eligible"

    if ticket.satisfaction_rating is not None:
        return None, "already_rated"

    normalized_comment = (comment or "").strip() or None
    if normalized_comment and len(normalized_comment) > MAX_SATISFACTION_COMMENT_LENGTH:
        return None, "comment_too_long"

    ticket.satisfaction_rating = rating
    ticket.satisfaction_comment = normalized_comment
    ticket.satisfaction_rated_at = datetime.datetime.now()
    _touch_ticket_updated_at(ticket)
    db.add(ticket)
    db.commit()

    publish_ticket_changed(
        ticket_id=ticket.id,
        action=ACTION_UPDATED,
        requester_user_id=ticket.requester_user_id,
        sector_id=ticket.sector_id,
        actor_user_id=user_id,
    )
    mark_ticket_viewed(ticket_id=ticket.id, user_id=user_id, db=db)
    return await get_ticket(ticket_id, user_id, role_name, db), None
