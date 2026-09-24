"""Authorize downloads for GET /v1/files/{file_key}."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.roles import AGENT_ROLES, ROLE_CUSTOMER
from app.models.ticket.ticket_attachment import TicketAttachment
from app.services.file_management.entities import (
    ATTACHMENT_FOLDER,
    AVATAR_FOLDER,
    KNOWLEDGE_BASE_INLINE_IMAGE_FOLDER,
)
from app.use_cases.knowledge_base.manage_knowledge_base import get_article
from app.use_cases.ticket.get_ticket import get_ticket


def _normalize_key(file_key: str) -> str:
    return file_key.replace("\\", "/").lstrip("/")


def _parse_kb_article_id(normalized_key: str) -> UUID | None:
    """New keys: knowledge-base/images/{article_id}/{filename}."""
    prefix = f"{KNOWLEDGE_BASE_INLINE_IMAGE_FOLDER}/"
    if not normalized_key.startswith(prefix):
        return None
    remainder = normalized_key[len(prefix) :]
    parts = remainder.split("/")
    if len(parts) < 2:
        return None
    try:
        return UUID(parts[0])
    except ValueError:
        return None


async def authorize_file_download(
    *,
    file_key: str,
    user_id: UUID,
    role_name: str,
    db: Session,
) -> str | None:
    """Return None if allowed, otherwise 'not_found' or 'forbidden'."""
    normalized = _normalize_key(file_key)
    if not normalized or ".." in normalized.split("/"):
        return "not_found"

    if normalized.startswith(f"{AVATAR_FOLDER}/"):
        return None

    if normalized.startswith(f"{ATTACHMENT_FOLDER}/"):
        attachment = db.execute(
            select(TicketAttachment).where(TicketAttachment.file_key == normalized)
        ).scalars().first()
        if not attachment:
            # Upload pré-vínculo (criar chamado / mensagem): exige autenticação.
            return None
        ticket = await get_ticket(attachment.ticket_id, user_id, role_name, db)
        if not ticket:
            return "forbidden"
        return None

    if normalized.startswith(f"{KNOWLEDGE_BASE_INLINE_IMAGE_FOLDER}/"):
        article_id = _parse_kb_article_id(normalized)
        if article_id is None:
            # Keys legadas sem article_id: só staff.
            if role_name not in AGENT_ROLES:
                return "forbidden"
            return None

        published_only = role_name == ROLE_CUSTOMER
        article = await get_article(
            article_id,
            db,
            role_name=role_name,
            published_only=published_only,
        )
        if not article:
            return "forbidden"
        return None

    return "not_found"
