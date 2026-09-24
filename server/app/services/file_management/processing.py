"""Shared upload validation and image processing for file repositories."""

from __future__ import annotations

from io import BytesIO
from pathlib import Path

from PIL import Image, ImageOps

from .entities import (
    ATTACHMENT_ALLOWED_CONTENT_TYPES,
    ATTACHMENT_MAX_UPLOAD_BYTES,
    AVATAR_ALLOWED_CONTENT_TYPES,
    AVATAR_MAX_DIMENSION,
    AVATAR_MAX_UPLOAD_BYTES,
    AVATAR_OUTPUT_QUALITY,
)


def validate_avatar_upload(content: bytes, content_type: str) -> None:
    if content_type not in AVATAR_ALLOWED_CONTENT_TYPES:
        raise ValueError("files.invalid_image_type")

    if len(content) > AVATAR_MAX_UPLOAD_BYTES:
        raise ValueError("files.image_too_large")


def validate_attachment_upload(content: bytes, content_type: str) -> None:
    if content_type not in ATTACHMENT_ALLOWED_CONTENT_TYPES:
        raise ValueError("files.invalid_attachment_type")

    if len(content) > ATTACHMENT_MAX_UPLOAD_BYTES:
        raise ValueError("files.attachment_too_large")

    if not content:
        raise ValueError("files.invalid_attachment_content")


def process_avatar(content: bytes) -> bytes:
    try:
        with Image.open(BytesIO(content)) as image:
            image = ImageOps.exif_transpose(image)

            if image.mode in ("RGBA", "LA") or (
                image.mode == "P" and "transparency" in image.info
            ):
                image = image.convert("RGBA")
            else:
                image = image.convert("RGB")

            image.thumbnail(
                (AVATAR_MAX_DIMENSION, AVATAR_MAX_DIMENSION),
                Image.Resampling.LANCZOS,
            )

            buffer = BytesIO()
            image.save(
                buffer,
                format="WEBP",
                quality=AVATAR_OUTPUT_QUALITY,
                method=6,
            )
            return buffer.getvalue()
    except Exception as error:
        raise ValueError("files.invalid_image_content") from error


def safe_attachment_filename(original_filename: str, extension: str) -> str:
    safe_name = Path(original_filename or f"anexo.{extension}").name[:500]
    return safe_name or f"anexo.{extension}"
