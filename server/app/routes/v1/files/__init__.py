"""Serve stored files for inline viewing (GET only; uploads live on owning resources)."""

from typing import Annotated

from fastapi import APIRouter, Depends
from fastapi.responses import Response

from app.core.authz import ForbiddenException, require_roles
from app.core.errors import FileNotFoundException
from app.core.roles import ROLE_ADMIN, ROLE_AGENT, ROLE_CUSTOMER
from app.dependencies import DatabaseDependency, FileManagementDependency, LocaleDependency
from app.services.file_management.entities import (
    ATTACHMENT_ALLOWED_CONTENT_TYPES,
    AVATAR_ALLOWED_CONTENT_TYPES,
)
from app.use_cases.files.authorize_file_download import authorize_file_download

router = APIRouter(prefix="/v1/files", tags=["Files"])

AnyAuth = Annotated[dict, Depends(require_roles(ROLE_CUSTOMER, ROLE_AGENT, ROLE_ADMIN))]

# Extension → media type for inline display (never force attachment download).
_CONTENT_TYPES_BY_EXTENSION = {
    extension: content_type
    for content_type, extension in {
        **AVATAR_ALLOWED_CONTENT_TYPES,
        **ATTACHMENT_ALLOWED_CONTENT_TYPES,
    }.items()
}
_CONTENT_TYPES_BY_EXTENSION["jpeg"] = "image/jpeg"


@router.get("/{file_key:path}")
async def download_file(
    file_key: str,
    token: AnyAuth,
    locale: LocaleDependency,
    db: DatabaseDependency,
    file_service: FileManagementDependency,
):
    error = await authorize_file_download(
        file_key=file_key,
        user_id=token["user_id"],
        role_name=token["role_name"],
        db=db,
    )
    if error == "forbidden":
        raise ForbiddenException(locale)
    if error == "not_found":
        raise FileNotFoundException(locale)

    content = await file_service.read(file_key)

    if content is None:
        raise FileNotFoundException(locale)

    extension = file_key.rsplit(".", 1)[-1].lower()
    media_type = _CONTENT_TYPES_BY_EXTENSION.get(extension, "application/octet-stream")

    return Response(
        content=content,
        media_type=media_type,
        headers={
            "Cache-Control": "private, max-age=3600",
            "Content-Disposition": "inline",
        },
    )
