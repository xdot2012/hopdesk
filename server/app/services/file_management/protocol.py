from typing import Protocol

from .entities import StoredAttachment, StoredFile, UploadFilePayload


class FileManagementRepository(Protocol):
    async def save(self, payload: UploadFilePayload) -> StoredFile: ...

    async def delete(self, file_key: str) -> None: ...

    async def read(self, file_key: str) -> bytes | None: ...

    def get_public_url(self, file_key: str) -> str: ...

    async def upload_avatar(self, content: bytes, content_type: str) -> StoredFile: ...

    async def upload_knowledge_base_inline_image(
        self,
        content: bytes,
        content_type: str,
        *,
        article_id: str,
    ) -> StoredFile: ...

    async def upload_ticket_attachment(
        self,
        content: bytes,
        content_type: str,
        original_filename: str,
    ) -> StoredAttachment: ...
