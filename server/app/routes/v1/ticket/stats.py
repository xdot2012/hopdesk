from datetime import date
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query
from starlette import status

from app.dependencies import DatabaseDependency
from app.schemas.v1.ticket import TicketStatsResponse
from app.use_cases.ticket.get_ticket_stats import get_ticket_stats, resolve_stats_window

from .deps import AgentAuth

router = APIRouter(tags=["Ticket - Stats"])


def _parse_stats_window(
    period: str,
    date_from: date | None,
    date_to: date | None,
):
    window, error = resolve_stats_window(period, date_from=date_from, date_to=date_to)
    if error or window is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error or "Período inválido.",
        )
    return window


@router.get("/stats", response_model=TicketStatsResponse)
async def get_ticket_stats_endpoint(
    token: AgentAuth,
    db: DatabaseDependency,
    period: Annotated[str, Query()] = "last_15_days",
    date_from: Annotated[date | None, Query(alias="from")] = None,
    date_to: Annotated[date | None, Query(alias="to")] = None,
    sector_id: Annotated[UUID | None, Query()] = None,
):
    window = _parse_stats_window(period, date_from, date_to)
    return await get_ticket_stats(
        db,
        window=window,
        sector_id=sector_id,
    )
