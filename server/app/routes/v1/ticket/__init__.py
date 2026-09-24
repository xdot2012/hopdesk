"""Ticket routes grouped by use case: stats, messages/attachments, CRUD."""

from fastapi import APIRouter

from .crud import router as crud_router
from .messages import router as messages_router
from .stats import router as stats_router

router = APIRouter(prefix="/v1/ticket", tags=["Ticket"])

# Literal paths (/stats, /attachments, /priorities, …) before /{ticket_id}.
# Attachments live on messages_router; include it before crud's /{ticket_id}.
router.include_router(stats_router)
router.include_router(messages_router)
router.include_router(crud_router)
