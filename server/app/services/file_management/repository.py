import uuid
from pathlib import Path

from .entities import (
    StoredAttachment,
    StoredFile,
    UploadFilePayload,
    AVATAR_OUTPUT_EXTENSION,
    AVATAR_OUTPUT_CONTENT_TYPE,
    AVATAR_FOLDER,
    KNOWLEDGE_BASE_INLINE_IMAGE_FOLDER,
    AVATAR_ALLOWED_CONTENT_TYPES,
    ATTACHMENT_ALLOWED_CONTENT_TYPES,
    ATTACHMENT_FOLDER,
)
from .processing import (
    process_avatar,
    safe_attachment_filename,
    validate_attachment_upload,
    validate_avatar_upload,
)


class LocalFileManagementRepository:
    def __init__(self, storage_root: str, public_base_url: str):
        self._storage_root = Path(storage_root)
        self._public_base_url = public_base_url.rstrip("/")
        self._storage_root.mkdir(parents=True, exist_ok=True)

    def _resolve_path(self, file_key: str) -> Path:
        normalized_key = file_key.replace("\\", "/").lstrip("/")
        destination = (self._storage_root / normalized_key).resolve()
        root = self._storage_root.resolve()

        if not str(destination).startswith(str(root)):
            raise ValueError("Caminho de arquivo inválido.")

        return destination

    async def save(self, payload: UploadFilePayload) -> StoredFile:
        file_key = f"{payload['folder'].strip('/')}/{payload['filename']}"
        destination = self._resolve_path(file_key)
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_bytes(payload["content"])

        return {
            "key": file_key,
            "url": self.get_public_url(file_key),
            "content_type": payload["content_type"],
            "size": len(payload["content"]),
        }

    async def delete(self, file_key: str) -> None:
        destination = self._resolve_path(file_key)
        if destination.exists():
            destination.unlink()

            parent = destination.parent
            if parent != self._storage_root.resolve() and not any(parent.iterdir()):
                parent.rmdir()

    async def read(self, file_key: str) -> bytes | None:
        destination = self._resolve_path(file_key)
        if not destination.exists():
            return None
        return destination.read_bytes()

    def get_public_url(self, file_key: str) -> str:
        normalized_key = file_key.replace("\\", "/").lstrip("/")
        return f"{self._public_base_url}/{normalized_key}"

    async def upload_avatar(self, content: bytes, content_type: str) -> StoredFile:
        validate_avatar_upload(content, content_type)
        processed_content = process_avatar(content)
        filename = f"{uuid.uuid4()}.{AVATAR_OUTPUT_EXTENSION}"

        payload: UploadFilePayload = {
            "content": processed_content,
            "filename": filename,
            "content_type": AVATAR_OUTPUT_CONTENT_TYPE,
            "folder": AVATAR_FOLDER,
        }
        return await self.save(payload)

    async def upload_knowledge_base_inline_image(
        self,
        content: bytes,
        content_type: str,
        *,
        article_id: str,
    ) -> StoredFile:
        validate_avatar_upload(content, content_type)
        extension = AVATAR_ALLOWED_CONTENT_TYPES[content_type]
        filename = f"{uuid.uuid4()}.{extension}"

        payload: UploadFilePayload = {
            "content": content,
            "filename": filename,
            "content_type": content_type,
            "folder": f"{KNOWLEDGE_BASE_INLINE_IMAGE_FOLDER}/{article_id}",
        }
        return await self.save(payload)

    async def upload_ticket_attachment(
        self,
        content: bytes,
        content_type: str,
        original_filename: str,
    ) -> StoredAttachment:
        validate_attachment_upload(content, content_type)
        extension = ATTACHMENT_ALLOWED_CONTENT_TYPES[content_type]
        safe_name = safe_attachment_filename(original_filename, extension)
        filename = f"{uuid.uuid4()}.{extension}"

        payload: UploadFilePayload = {
            "content": content,
            "filename": filename,
            "content_type": content_type,
            "folder": ATTACHMENT_FOLDER,
        }
        stored = await self.save(payload)
        return {
            **stored,
            "original_filename": safe_name,
        }
