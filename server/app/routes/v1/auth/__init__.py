"""Auth routes grouped by use case: session, sign up, password recovery, confirm email."""

from fastapi import APIRouter

from .session import router as session_router
from .sign_up import router as sign_up_router
from .password_recovery import router as password_recovery_router
from .confirm_email import router as confirm_email_router

router = APIRouter(prefix="/v1/auth", tags=["Auth"])

router.include_router(session_router)
router.include_router(sign_up_router)
router.include_router(password_recovery_router)
router.include_router(confirm_email_router)
