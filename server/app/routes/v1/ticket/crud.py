from datetime import date
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Query
from fastapi.responses import StreamingResponse

from app.core.authz import ForbiddenException
from app.core.errors import (
    InvalidTicketEffortMinutesException,
    InvalidTicketPriorityException,
    InvalidTicketSatisfactionRatingException,
    InvalidTicketStatusException,
    InvalidTicketTransitionException,
    SectorNotFoundException,
    SlaNotFoundException,
    TicketAttachmentNotFoundException,
    TicketCloseDetailsRequiredException,
    TicketDescriptionInvalidException,
    TicketEffortMinutesRequiredException,
    TicketNotFoundException,
    TicketSatisfactionAlreadyRatedException,
    TicketSatisfactionCommentTooLongException,
    TicketSatisfactionNotEligibleException,
)
from app.core.roles import ROLE_ADMIN, ROLE_AGENT, ROLE_CUSTOMER
from app.core.ticket_events import iter_ticket_sse_frames
from app.dependencies import (
    DatabaseDependency,
    EmailDependency,
    FileManagementDependency,
    LocaleDependency,
)
from app.settings import SettingsDependency
from app.schemas.v1.ticket import (
    CreateTicketRequest,
    RateTicketSatisfactionRequest,
    TicketFilterUserPageResponse,
    TicketListPageResponse,
    TicketPriorityResponse,
    TicketResponse,
    UpdateTicketRequest,
)
from app.use_cases.ticket.build_ticket_response import (
    build_ticket_list_item,
    build_ticket_response,
)
from app.use_cases.ticket.create_ticket import create_ticket
from app.use_cases.ticket.get_ticket import get_ticket
from app.use_cases.ticket.get_ticket_stats import VALID_QUEUE_FINISHED_PERIODS
from app.use_cases.ticket.list_tickets import list_priorities, list_tickets
from app.use_cases.ticket.ticket_views import (
    get_ticket_last_viewed_map,
    mark_ticket_viewed,
)
from app.use_cases.ticket.update_ticket import (
    cancel_ticket_by_requester,
    update_ticket,
)
from app.use_cases.ticket.rate_ticket_satisfaction import rate_ticket_satisfaction
from app.use_cases.ticket.search_filter_users import (
    build_ticket_filter_user_option,
    search_assignee_options,
    search_mention_options,
    search_requester_options,
)

from .deps import AgentAuth, AnyAuth, CustomerAuth

router = APIRouter()


@router.get("/priorities", response_model=list[TicketPriorityResponse], tags=["Ticket - Priority"])
async def list_priorities_endpoint(
    token: AnyAuth,
    db: DatabaseDependency,
):
    priorities = await list_priorities(db)
    return [
        {
            "id": priority.id,
            "code": priority.code,
            "label": priority.label,
            "sort_order": priority.sort_order,
        }
        for priority in priorities
    ]


@router.get("/", response_model=TicketListPageResponse, tags=["Ticket - Ticket"])
async def list_tickets_endpoint(
    token: AnyAuth,
    db: DatabaseDependency,
    file_service: FileManagementDependency,
    status: str | None = Query(default=None),
    include_finished: bool = Query(default=False),
    include_closed: bool | None = Query(default=None),
    finished_only: bool = Query(default=False),
    finished_period: str | None = Query(default=None),
    number: int | None = Query(default=None, ge=1),
    external_id: str | None = Query(default=None, max_length=200),
    search: str | None = Query(default=None, max_length=200),
    created_from: date | None = Query(default=None),
    created_to: date | None = Query(default=None),
    finished_from: date | None = Query(default=None),
    finished_to: date | None = Query(default=None),
    assignee_user_id: UUID | None = Query(default=None),
    requester_user_id: UUID | None = Query(default=None),
    sector_id: UUID | None = Query(default=None),
    priority_code: str | None = Query(default=None, max_length=50),
    unassigned: bool = Query(default=False),
    sla_failed: bool = Query(default=False),
    awaiting_customer: bool = Query(default=False),
    scope: str | None = Query(default=None, pattern="^(mine|sector)$"),
    include_counts: bool = Query(default=False),
    page: int = Query(default=1, ge=1),
    size: int = Query(default=15, ge=1, le=100),
):
    period = (
        finished_period
        if finished_period == "all" or finished_period in VALID_QUEUE_FINISHED_PERIODS
        else None
    )
    result = await list_tickets(
        token["user_id"],
        token["role_name"],
        db,
        status=status,
        include_finished=include_finished,
        include_closed=include_closed,
        finished_only=finished_only,
        finished_period=period,
        number=number,
        external_id=external_id,
        search=search,
        created_from=created_from,
        created_to=created_to,
        finished_from=finished_from,
        finished_to=finished_to,
        assignee_user_id=assignee_user_id,
        requester_user_id=requester_user_id,
        sector_id=sector_id,
        priority_code=priority_code,
        unassigned=unassigned,
        sla_failed=sla_failed,
        awaiting_customer=awaiting_customer,
        scope=scope,
        include_counts=include_counts,
        page=page,
        size=size,
    )
    include_assignee = token["role_name"] != ROLE_CUSTOMER
    last_viewed_map = get_ticket_last_viewed_map(
        user_id=token["user_id"],
        ticket_ids=[ticket.id for ticket in result["items"]],
        db=db,
    )
    return {
        "items": [
            build_ticket_list_item(
                ticket,
                file_service,
                db=db,
                include_assignee=include_assignee,
                last_viewed_at=last_viewed_map.get(ticket.id),
            )
            for ticket in result["items"]
        ],
        "total": result["total"],
        "page": result["page"],
        "size": result["size"],
        "pages": result["pages"],
        "counts": result["counts"],
    }


@router.get(
    "/assignee_options",
    response_model=TicketFilterUserPageResponse,
    tags=["Ticket - Ticket"],
)
async def search_assignee_options_endpoint(
    token: AgentAuth,
    db: DatabaseDependency,
    search: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    size: int = Query(default=20, ge=1, le=50),
):
    result = await search_assignee_options(db, search=search, page=page, size=size)
    return {
        "items": [build_ticket_filter_user_option(user) for user in result["items"]],
        "total": result["total"],
        "page": result["page"],
        "size": result["size"],
        "pages": result["pages"],
    }


@router.get(
    "/requester_options",
    response_model=TicketFilterUserPageResponse,
    tags=["Ticket - Ticket"],
)
async def search_requester_options_endpoint(
    token: AgentAuth,
    db: DatabaseDependency,
    search: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    size: int = Query(default=20, ge=1, le=50),
):
    result = await search_requester_options(db, search=search, page=page, size=size)
    return {
        "items": [build_ticket_filter_user_option(user) for user in result["items"]],
        "total": result["total"],
        "page": result["page"],
        "size": result["size"],
        "pages": result["pages"],
    }


@router.get(
    "/mention_options",
    response_model=TicketFilterUserPageResponse,
    tags=["Ticket - Ticket"],
)
async def search_mention_options_endpoint(
    token: AnyAuth,
    db: DatabaseDependency,
    search: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    size: int = Query(default=20, ge=1, le=50),
):
    result = await search_mention_options(
        db,
        role_name=token["role_name"],
        search=search,
        page=page,
        size=size,
    )
    return {
        "items": [build_ticket_filter_user_option(user) for user in result["items"]],
        "total": result["total"],
        "page": result["page"],
        "size": result["size"],
        "pages": result["pages"],
    }


@router.post("/", response_model=TicketResponse, tags=["Ticket - Ticket"])
async def create_ticket_endpoint(
    data: CreateTicketRequest,
    token: CustomerAuth,
    locale: LocaleDependency,
    db: DatabaseDependency,
    file_service: FileManagementDependency,
    mail: EmailDependency,
    background_tasks: BackgroundTasks,
    settings: SettingsDependency,
):
    ticket, error = await create_ticket(
        subject=data.subject,
        description=data.description,
        external_id=data.external_id,
        attachments=[
            {
                "key": item.key,
                "original_filename": item.original_filename,
                "content_type": item.content_type,
                "size": item.size,
            }
            for item in data.attachments
        ],
        requester_user_id=token["user_id"],
        role_name=token["role_name"],
        db=db,
        file_service=file_service,
        priority_id=data.priority_id,
        sector_id=data.sector_id,
        mail=mail,
        background_tasks=background_tasks,
        client_base_url=settings.client_base_url,
    )
    if error == "forbidden":
        raise ForbiddenException(locale)
    if error == "invalid_priority":
        raise InvalidTicketPriorityException(locale)
    if error == "sector_not_found":
        raise SectorNotFoundException(locale)
    if error == "sla_not_found":
        raise SlaNotFoundException(locale)
    if error == "attachment_not_found":
        raise TicketAttachmentNotFoundException(locale)
    if error == "description_invalid":
        raise TicketDescriptionInvalidException(locale)
    return build_ticket_response(
        ticket,
        include_internal=False,
        file_service=file_service,
        db=db,
        include_assignee=False,
    )


@router.get("/events", tags=["Ticket - Events"])
async def ticket_events_endpoint(
    token: AnyAuth,
    db: DatabaseDependency,
):
    managed_sector_id = None
    if token["role_name"] == ROLE_CUSTOMER:
        from app.use_cases.user_sector.manage_user_sectors import (
            get_managed_user_sector,
        )

        membership = get_managed_user_sector(token["user_id"], db)
        managed_sector_id = membership.sector_id if membership else None

    return StreamingResponse(
        iter_ticket_sse_frames(
            token["user_id"],
            token["role_name"],
            managed_sector_id=managed_sector_id,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/{ticket_id}", response_model=TicketResponse, tags=["Ticket - Ticket"])
async def get_ticket_endpoint(
    ticket_id: UUID,
    token: AnyAuth,
    locale: LocaleDependency,
    db: DatabaseDependency,
    file_service: FileManagementDependency,
):
    ticket = await get_ticket(ticket_id, token["user_id"], token["role_name"], db)
    if not ticket:
        raise TicketNotFoundException(locale)
    include_internal = token["role_name"] in (ROLE_AGENT, ROLE_ADMIN)
    include_assignee = token["role_name"] != ROLE_CUSTOMER
    return build_ticket_response(
        ticket,
        include_internal=include_internal,
        file_service=file_service,
        db=db,
        include_assignee=include_assignee,
    )


@router.post("/{ticket_id}/view", status_code=204, tags=["Ticket - Ticket"])
async def mark_ticket_viewed_endpoint(
    ticket_id: UUID,
    token: AnyAuth,
    locale: LocaleDependency,
    db: DatabaseDependency,
):
    ticket = await get_ticket(ticket_id, token["user_id"], token["role_name"], db)
    if not ticket:
        raise TicketNotFoundException(locale)
    mark_ticket_viewed(ticket_id=ticket.id, user_id=token["user_id"], db=db)


@router.post(
    "/{ticket_id}/cancel",
    response_model=TicketResponse,
    tags=["Ticket - Ticket"],
)
async def cancel_ticket_endpoint(
    ticket_id: UUID,
    token: CustomerAuth,
    locale: LocaleDependency,
    db: DatabaseDependency,
    file_service: FileManagementDependency,
    mail: EmailDependency,
    background_tasks: BackgroundTasks,
    settings: SettingsDependency,
):
    ticket, error = await cancel_ticket_by_requester(
        ticket_id=ticket_id,
        user_id=token["user_id"],
        role_name=token["role_name"],
        db=db,
        mail=mail,
        background_tasks=background_tasks,
        client_base_url=settings.client_base_url,
    )
    if error == "forbidden":
        raise ForbiddenException(locale)
    if error == "not_found":
        raise TicketNotFoundException(locale)
    if error == "invalid_transition":
        raise InvalidTicketTransitionException(locale)
    return build_ticket_response(
        ticket,
        include_internal=False,
        file_service=file_service,
        db=db,
    )


@router.post(
    "/{ticket_id}/satisfaction",
    response_model=TicketResponse,
    tags=["Ticket - Ticket"],
)
async def rate_ticket_satisfaction_endpoint(
    ticket_id: UUID,
    data: RateTicketSatisfactionRequest,
    token: CustomerAuth,
    locale: LocaleDependency,
    db: DatabaseDependency,
    file_service: FileManagementDependency,
):
    ticket, error = await rate_ticket_satisfaction(
        ticket_id=ticket_id,
        user_id=token["user_id"],
        role_name=token["role_name"],
        rating=data.rating,
        comment=data.comment,
        db=db,
    )
    if error == "forbidden":
        raise ForbiddenException(locale)
    if error == "not_found":
        raise TicketNotFoundException(locale)
    if error == "invalid_rating":
        raise InvalidTicketSatisfactionRatingException(locale)
    if error == "not_eligible":
        raise TicketSatisfactionNotEligibleException(locale)
    if error == "already_rated":
        raise TicketSatisfactionAlreadyRatedException(locale)
    if error == "comment_too_long":
        raise TicketSatisfactionCommentTooLongException(locale)
    return build_ticket_response(
        ticket,
        include_internal=False,
        file_service=file_service,
        db=db,
    )


@router.patch("/{ticket_id}", response_model=TicketResponse, tags=["Ticket - Ticket"])
async def update_ticket_endpoint(
    ticket_id: UUID,
    data: UpdateTicketRequest,
    token: AgentAuth,
    locale: LocaleDependency,
    db: DatabaseDependency,
    file_service: FileManagementDependency,
    mail: EmailDependency,
    background_tasks: BackgroundTasks,
    settings: SettingsDependency,
):
    ticket, error = await update_ticket(
        ticket_id=ticket_id,
        user_id=token["user_id"],
        role_name=token["role_name"],
        db=db,
        status=data.status,
        priority_id=data.priority_id,
        assignee_user_id=data.assignee_user_id,
        cause=data.cause,
        solution=data.solution,
        solution_internal=data.solution_internal,
        effort_minutes=data.effort_minutes,
        mail=mail,
        background_tasks=background_tasks,
        client_base_url=settings.client_base_url,
    )
    if error == "forbidden":
        raise ForbiddenException(locale)
    if error == "not_found":
        raise TicketNotFoundException(locale)
    if error == "invalid_assignee":
        raise ForbiddenException(locale)
    if error == "invalid_status":
        raise InvalidTicketStatusException(locale)
    if error == "invalid_transition":
        raise InvalidTicketTransitionException(locale)
    if error == "invalid_priority":
        raise InvalidTicketPriorityException(locale)
    if error == "close_details_required":
        raise TicketCloseDetailsRequiredException(locale)
    if error == "effort_minutes_required":
        raise TicketEffortMinutesRequiredException(locale)
    if error == "invalid_effort_minutes":
        raise InvalidTicketEffortMinutesException(locale)
    return build_ticket_response(ticket, include_internal=True, file_service=file_service, db=db)


@router.post("/{ticket_id}/assign_me", response_model=TicketResponse, tags=["Ticket - Ticket"])
async def assign_me_endpoint(
    ticket_id: UUID,
    token: AgentAuth,
    locale: LocaleDependency,
    db: DatabaseDependency,
    file_service: FileManagementDependency,
    mail: EmailDependency,
    background_tasks: BackgroundTasks,
    settings: SettingsDependency,
):
    ticket, error = await update_ticket(
        ticket_id=ticket_id,
        user_id=token["user_id"],
        role_name=token["role_name"],
        db=db,
        assignee_user_id=token["user_id"],
        mail=mail,
        background_tasks=background_tasks,
        client_base_url=settings.client_base_url,
    )
    if error == "forbidden":
        raise ForbiddenException(locale)
    if error == "not_found":
        raise TicketNotFoundException(locale)
    return build_ticket_response(ticket, include_internal=True, file_service=file_service, db=db)
