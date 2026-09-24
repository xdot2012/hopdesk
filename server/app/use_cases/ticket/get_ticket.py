from uuid import UUID

from sqlalchemy.orm import Session

from app.core.roles import ROLE_CUSTOMER
from app.models.ticket.ticket import Ticket
from app.use_cases.ticket.list_tickets import _ticket_query
from app.use_cases.user_sector.manage_user_sectors import user_sector_can_access_ticket


async def get_ticket(ticket_id: UUID, user_id: UUID, role_name: str, db: Session) -> Ticket | None:
    result = db.execute(_ticket_query().where(Ticket.id == ticket_id))
    ticket = result.scalars().unique().first()
    if not ticket:
        return None

    if role_name == ROLE_CUSTOMER and not user_sector_can_access_ticket(user_id, ticket, db):
        return None

    return ticket
