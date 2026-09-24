from html import escape
from uuid import UUID

from fastapi import BackgroundTasks
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.logs import get_logger
from app.core.roles import AGENT_ROLES, ROLE_ADMIN, ROLE_AGENT
from app.core.ticket_constants import TICKET_STATUS_LABELS, normalize_ticket_status
from app.models.ticket.ticket import Ticket
from app.models.user.role import Role
from app.models.user.user import User
from app.services.email import EmailService
from app.services.email.content import EmailContent
from app.use_cases.instance.manage_instance import get_or_create_instance_settings


def _ticket_url(client_base_url: str, ticket_id: UUID) -> str:
    base = (client_base_url or "").rstrip("/")
    return f"{base}/tickets/{ticket_id}"


def _status_label(status: str) -> str:
    normalized = normalize_ticket_status(status)
    return TICKET_STATUS_LABELS.get(normalized, normalized)


def _unique_emails(emails: list[str | None], *, exclude: set[str] | None = None) -> list[str]:
    skip = {e.strip().lower() for e in (exclude or set()) if e}
    seen: set[str] = set()
    result: list[str] = []
    for raw in emails:
        if not raw:
            continue
        email = raw.strip()
        key = email.lower()
        if not key or key in skip or key in seen:
            continue
        seen.add(key)
        result.append(email)
    return result


def _html_email(*, title: str, lines: list[str], url: str) -> str:
    body_lines = "".join(f"<p>{line}</p>" for line in lines)
    return f"""
        <html>
            <body>
                <h1>{escape(title)}</h1>
                {body_lines}
                <p><a href="{escape(url)}">Abrir chamado</a></p>
                <p>Ou copie e cole no navegador: {escape(url)}</p>
            </body>
        </html>
    """


def _schedule(
    *,
    to: list[str],
    subject: str,
    message: str,
    mail: EmailService,
    background_tasks: BackgroundTasks,
) -> None:
    if not to:
        return
    content = EmailContent(to=to, subject=subject, message=message)
    logger = get_logger()
    logger.debug(
        "Ticket email scheduled to: {to} subject: {subject}".format(
            to=", ".join(content.to),
            subject=content.subject,
        )
    )
    background_tasks.add_task(mail.send_email, content)


def _schedule_ticket_email(
    *,
    enabled: bool,
    recipients: list[str],
    subject: str,
    title: str,
    lines: list[str],
    ticket_id: UUID,
    client_base_url: str,
    mail: EmailService,
    background_tasks: BackgroundTasks,
) -> None:
    if not enabled:
        return
    url = _ticket_url(client_base_url, ticket_id)
    _schedule(
        to=recipients,
        subject=subject,
        message=_html_email(title=title, lines=lines, url=url),
        mail=mail,
        background_tasks=background_tasks,
    )


def _actor_exclude(actor: User | None) -> set[str]:
    email = _actor_email(actor)
    return {email} if email else set()


def _agent_emails(db: Session) -> list[str]:
    agents = db.execute(
        select(User)
        .join(Role, User.role_id == Role.id)
        .where(Role.name.in_(AGENT_ROLES))
    ).scalars().all()
    return _unique_emails([user.email for user in agents])


def _requester_email(ticket: Ticket) -> str | None:
    if ticket.requester and ticket.requester.email:
        return ticket.requester.email
    return None


def _assignee_email(ticket: Ticket) -> str | None:
    if ticket.assignee and ticket.assignee.email:
        return ticket.assignee.email
    return None


def _actor_email(actor: User | None) -> str | None:
    if actor and actor.email:
        return actor.email
    return None


def _actor_is_staff(actor: User | None, role_name: str | None) -> bool:
    if role_name in (ROLE_AGENT, ROLE_ADMIN):
        return True
    if actor and actor.role and actor.role.name in (ROLE_AGENT, ROLE_ADMIN):
        return True
    return False


async def schedule_ticket_created_email(
    *,
    ticket: Ticket,
    actor: User | None,
    client_base_url: str,
    db: Session,
    mail: EmailService,
    background_tasks: BackgroundTasks,
) -> None:
    settings = get_or_create_instance_settings(db)
    # Confirmation to requester always; agents exclude the actor if they overlap.
    exclude_agents = _actor_exclude(actor)
    recipients = _unique_emails(
        [_requester_email(ticket), *_unique_emails(_agent_emails(db), exclude=exclude_agents)]
    )
    _schedule_ticket_email(
        enabled=settings.ticket_email_on_created,
        recipients=recipients,
        subject=f"[HopDesk] Novo chamado #{ticket.number}: {ticket.subject}",
        title=f"Novo chamado #{ticket.number}",
        lines=[
            escape(ticket.subject),
            "Um novo chamado foi aberto e aguarda atendimento.",
        ],
        ticket_id=ticket.id,
        client_base_url=client_base_url,
        mail=mail,
        background_tasks=background_tasks,
    )


async def schedule_ticket_public_message_email(
    *,
    ticket: Ticket,
    actor: User | None,
    actor_role_name: str | None,
    client_base_url: str,
    db: Session,
    mail: EmailService,
    background_tasks: BackgroundTasks,
) -> None:
    settings = get_or_create_instance_settings(db)
    exclude = _actor_exclude(actor)

    if _actor_is_staff(actor, actor_role_name):
        recipients = _unique_emails([_requester_email(ticket)], exclude=exclude)
    else:
        assignee = _assignee_email(ticket)
        if assignee:
            recipients = _unique_emails([assignee], exclude=exclude)
        else:
            recipients = _unique_emails(_agent_emails(db), exclude=exclude)

    _schedule_ticket_email(
        enabled=settings.ticket_email_on_public_message,
        recipients=recipients,
        subject=f"[HopDesk] Nova mensagem no chamado #{ticket.number}",
        title=f"Nova mensagem no chamado #{ticket.number}",
        lines=[
            escape(ticket.subject),
            "Há uma nova mensagem pública neste chamado.",
        ],
        ticket_id=ticket.id,
        client_base_url=client_base_url,
        mail=mail,
        background_tasks=background_tasks,
    )


async def schedule_ticket_status_email(
    *,
    ticket: Ticket,
    actor: User | None,
    old_status: str,
    new_status: str,
    client_base_url: str,
    db: Session,
    mail: EmailService,
    background_tasks: BackgroundTasks,
) -> None:
    settings = get_or_create_instance_settings(db)
    recipients = _unique_emails(
        [_requester_email(ticket), _assignee_email(ticket)],
        exclude=_actor_exclude(actor),
    )
    old_label = _status_label(old_status)
    new_label = _status_label(new_status)
    _schedule_ticket_email(
        enabled=settings.ticket_email_on_status_change,
        recipients=recipients,
        subject=f"[HopDesk] Status do chamado #{ticket.number}: {new_label}",
        title=f"Status atualizado — chamado #{ticket.number}",
        lines=[
            escape(ticket.subject),
            f"Status alterado de <strong>{escape(old_label)}</strong> "
            f"para <strong>{escape(new_label)}</strong>.",
        ],
        ticket_id=ticket.id,
        client_base_url=client_base_url,
        mail=mail,
        background_tasks=background_tasks,
    )


async def schedule_ticket_assignment_email(
    *,
    ticket: Ticket,
    actor: User | None,
    client_base_url: str,
    db: Session,
    mail: EmailService,
    background_tasks: BackgroundTasks,
) -> None:
    settings = get_or_create_instance_settings(db)
    recipients = _unique_emails([_assignee_email(ticket)], exclude=_actor_exclude(actor))
    _schedule_ticket_email(
        enabled=settings.ticket_email_on_assignment,
        recipients=recipients,
        subject=f"[HopDesk] Chamado #{ticket.number} atribuído",
        title=f"Chamado #{ticket.number} atribuído",
        lines=[
            escape(ticket.subject),
            "Este chamado foi atribuído a você.",
        ],
        ticket_id=ticket.id,
        client_base_url=client_base_url,
        mail=mail,
        background_tasks=background_tasks,
    )
