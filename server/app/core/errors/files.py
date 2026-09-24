from fastapi import HTTPException
from starlette import status

from app.core.errors.exceptions import FieldValidationException
from app.core.i18n import translate


class FileNotFoundException(HTTPException):
    def __init__(self, locale: str) -> None:
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=translate("files.not_found", locale),
        )


class InvalidImageTypeException(FieldValidationException):
    def __init__(self, locale: str) -> None:
        super().__init__(
            field="file",
            error_type="invalid_type",
            message=translate("files.invalid_image_type", locale),
        )


class ImageTooLargeException(FieldValidationException):
    def __init__(self, locale: str) -> None:
        super().__init__(
            field="file",
            error_type="too_large",
            message=translate("files.image_too_large", locale),
        )


class InvalidImageContentException(FieldValidationException):
    def __init__(self, locale: str) -> None:
        super().__init__(
            field="file",
            error_type="invalid_content",
            message=translate("files.invalid_image_content", locale),
        )


class InvalidAttachmentTypeException(FieldValidationException):
    def __init__(self, locale: str) -> None:
        super().__init__(
            field="file",
            error_type="invalid_type",
            message=translate("files.invalid_attachment_type", locale),
        )


class AttachmentTooLargeException(FieldValidationException):
    def __init__(self, locale: str) -> None:
        super().__init__(
            field="file",
            error_type="too_large",
            message=translate("files.attachment_too_large", locale),
        )


class InvalidAttachmentContentException(FieldValidationException):
    def __init__(self, locale: str) -> None:
        super().__init__(
            field="file",
            error_type="invalid_content",
            message=translate("files.invalid_attachment_content", locale),
        )


FILE_UPLOAD_ERRORS = {
    "files.not_found": FileNotFoundException,
    "files.invalid_image_type": InvalidImageTypeException,
    "files.image_too_large": ImageTooLargeException,
    "files.invalid_image_content": InvalidImageContentException,
    "files.invalid_attachment_type": InvalidAttachmentTypeException,
    "files.attachment_too_large": AttachmentTooLargeException,
    "files.invalid_attachment_content": InvalidAttachmentContentException,
}
