"""User routes grouped by use case: profile and admin management."""

from fastapi import APIRouter

from .manage import router as manage_router
from .profile import router as profile_router

router = APIRouter(prefix="/v1/user", tags=["User"])

router.include_router(profile_router)
router.include_router(manage_router)
