from typing import TypedDict


AVATAR_MAX_UPLOAD_BYTES = 5_242_880
AVATAR_MAX_DIMENSION = 512
AVATAR_OUTPUT_QUALITY = 85
AVATAR_OUTPUT_CONTENT_TYPE = "image/webp"
AVATAR_OUTPUT_EXTENSION = "webp"
AVATAR_FOLDER = "avatars"
KNOWLEDGE_BASE_INLINE_IMAGE_FOLDER = "knowledge-base/images"
AVATAR_ALLOWED_CONTENT_TYPES = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
}

ATTACHMENT_MAX_UPLOAD_BYTES = 52_428_800
ATTACHMENT_FOLDER = "ticket-attachments"
ATTACHMENT_ALLOWED_CONTENT_TYPES = {
    # images
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    # video
    "video/mp4": "mp4",
    "video/webm": "webm",
    "video/quicktime": "mov",
    # documents / files
    "application/pdf": "pdf",
    "text/plain": "txt",
    "application/msword": "doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/vnd.ms-excel": "xls",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
    "application/zip": "zip",
    "application/x-zip-compressed": "zip",
}


class UploadFilePayload(TypedDict):
    content: bytes
    filename: str
    content_type: str
    folder: str


class StoredFile(TypedDict):
    key: str
    url: str
    content_type: str
    size: int


class StoredAttachment(StoredFile):
    original_filename: str
