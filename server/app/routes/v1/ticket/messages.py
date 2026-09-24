from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, File, UploadFile

from app.core.authz import ForbiddenException
from app.core.errors import (
    EmptyTicketMessageException,
    FILE_UPLOAD_ERRORS,
    InternalMessageNotAllowedException,
    InvalidAttachmentTypeException,
    TicketAttachmentNotFoundException,
    TicketMessageNotFoundException,
    TicketNotFoundException,
)
from app.core.roles import ROLE_ADMIN, ROLE_AGENT, ROLE_CUSTOMER
from app.dependencies import (
    DatabaseDependency,
    EmailDependency,
    FileManagementDependency,
    LocaleDependency,
)
from app.settings import SettingsDependency
from app.schemas.v1.ticket import (
    CreateTicketMessageRequest,
    TicketResponse,
    UpdateTicketMessageRequest,
    UploadTicketAttachmentResponse,
)
from app.services.file_management.entities import ATTACHMENT_ALLOWED_CONTENT_TYPES
from app.use_cases.ticket.build_ticket_response import build_ticket_response
from app.use_cases.ticket.ticket_messages import (
    create_ticket_message,
    delete_ticket_message,
    update_ticket_message,
)

from .deps import AnyAuth

router = APIRouter()


@router.post(
    "/attachments",
    response_model=UploadTicketAttachmentResponse,
    tags=["Ticket - Attachment"],
)
async def upload_ticket_attachment_endpoint(
    token: AnyAuth,
    locale: LocaleDependency,
    file_service: FileManagementDependency,
    file: UploadFile = File(...),
):
    content = await file.read()
    content_type = file.content_type or ""
    filename = file.filename or "anexo"

    if content_type not in ATTACHMENT_ALLOWED_CONTENT_TYPES:
        extension = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
        for mime, ext in ATTACHMENT_ALLOWED_CONTENT_TYPES.items():
            if ext == extension:
                content_type = mime
                break

    if content_type not in ATTACHMENT_ALLOWED_CONTENT_TYPES:
        raise InvalidAttachmentTypeException(locale)

    try:
        stored_file = await file_service.upload_ticket_attachment(
            content,
            content_type,
            filename,
        )
    except ValueError as error:
        exception_class = FILE_UPLOAD_ERRORS.get(str(error), InvalidAttachmentTypeException)
        raise exception_class(locale) from error

    return stored_file


@router.post("/{ticket_id}/messages", response_model=TicketResponse, tags=["Ticket - Message"])
async def create_message_endpoint(
    ticket_id: UUID,
    data: CreateTicketMessageRequest,
    token: AnyAuth,
    locale: LocaleDependency,
    db: DatabaseDependency,
    file_service: FileManagementDependency,
    mail: EmailDependency,
    background_tasks: BackgroundTasks,
    settings: SettingsDependency,
):
    ticket, error = await create_ticket_message(
        ticket_id=ticket_id,
        user_id=token["user_id"],
        role_name=token["role_name"],
        body=data.body,
        visibility=data.visibility,
        customer_pending=data.customer_pending,
        attachments=[
            {
                "key": item.key,
                "original_filename": item.original_filename,
                "content_type": item.content_type,
                "size": item.size,
            }
            for item in data.attachments
        ],
        db=db,
        file_service=file_service,
        mail=mail,
        background_tasks=background_tasks,
        client_base_url=settings.client_base_url,
    )
    if error == "not_found":
        raise TicketNotFoundException(locale)
    if error == "internal_not_allowed":
        raise InternalMessageNotAllowedException(locale)
    if error == "message_empty":
        raise EmptyTicketMessageException(locale)
    if error == "attachment_not_found":
        raise TicketAttachmentNotFoundException(locale)
    include_internal = token["role_name"] in (ROLE_AGENT, ROLE_ADMIN)
    include_assignee = token["role_name"] != ROLE_CUSTOMER
    return build_ticket_response(
        ticket,
        include_internal=include_internal,
        file_service=file_service,
        db=db,
        include_assignee=include_assignee,
    )


@router.patch(
    "/{ticket_id}/messages/{message_id}",
    response_model=TicketResponse,
    tags=["Ticket - Message"],
)
async def update_message_endpoint(
    ticket_id: UUID,
    message_id: UUID,
    data: UpdateTicketMessageRequest,
    token: AnyAuth,
    locale: LocaleDependency,
    db: DatabaseDependency,
    file_service: FileManagementDependency,
):
    ticket, error = await update_ticket_message(
        ticket_id=ticket_id,
        message_id=message_id,
        user_id=token["user_id"],
        role_name=token["role_name"],
        body=data.body,
        db=db,
    )
    if error == "forbidden":
        raise ForbiddenException(locale)
    if error == "not_found":
        raise TicketNotFoundException(locale)
    if error == "message_not_found":
        raise TicketMessageNotFoundException(locale)
    if error == "message_empty":
        raise EmptyTicketMessageException(locale)
    include_internal = token["role_name"] in (ROLE_AGENT, ROLE_ADMIN)
    include_assignee = token["role_name"] != ROLE_CUSTOMER
    return build_ticket_response(
        ticket,
        include_internal=include_internal,
        file_service=file_service,
        db=db,
        include_assignee=include_assignee,
    )


@router.delete(
    "/{ticket_id}/messages/{message_id}",
    response_model=TicketResponse,
    tags=["Ticket - Message"],
)
async def delete_message_endpoint(
    ticket_id: UUID,
    message_id: UUID,
    token: AnyAuth,
    locale: LocaleDependency,
    db: DatabaseDependency,
    file_service: FileManagementDependency,
):
    ticket, error = await delete_ticket_message(
        ticket_id=ticket_id,
        message_id=message_id,
        user_id=token["user_id"],
        role_name=token["role_name"],
        db=db,
    )
    if error == "forbidden":
        raise ForbiddenException(locale)
    if error == "not_found":
        raise TicketNotFoundException(locale)
    if error == "message_not_found":
        raise TicketMessageNotFoundException(locale)
    include_internal = token["role_name"] in (ROLE_AGENT, ROLE_ADMIN)
    include_assignee = token["role_name"] != ROLE_CUSTOMER
    return build_ticket_response(
        ticket,
        include_internal=include_internal,
        file_service=file_service,
        db=db,
        include_assignee=include_assignee,
    )
