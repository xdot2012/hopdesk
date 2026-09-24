from .entities import StoredAttachment, StoredFile
from .protocol import FileManagementRepository


class FileManagementService:
    def __init__(self, repository: FileManagementRepository):
        self.repository = repository

    def get_public_url(self, file_key: str | None) -> str | None:
        if not file_key:
            return None
        return self.repository.get_public_url(file_key)

    async def upload_avatar(self, content: bytes, content_type: str) -> StoredFile:
        return await self.repository.upload_avatar(content, content_type)

    async def upload_knowledge_base_inline_image(
        self,
        content: bytes,
        content_type: str,
        *,
        article_id: str,
    ) -> StoredFile:
        return await self.repository.upload_knowledge_base_inline_image(
            content,
            content_type,
            article_id=article_id,
        )

    async def upload_ticket_attachment(
        self,
        content: bytes,
        content_type: str,
        original_filename: str,
    ) -> StoredAttachment:
        return await self.repository.upload_ticket_attachment(
            content, content_type, original_filename
        )

    async def delete(self, file_key: str) -> None:
        if file_key:
            await self.repository.delete(file_key)

    async def read(self, file_key: str) -> bytes | None:
        return await self.repository.read(file_key)
