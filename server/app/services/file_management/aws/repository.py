import uuid
from typing import TYPE_CHECKING

from botocore.exceptions import ClientError

from app.services.file_management.entities import (
    ATTACHMENT_ALLOWED_CONTENT_TYPES,
    ATTACHMENT_FOLDER,
    AVATAR_ALLOWED_CONTENT_TYPES,
    AVATAR_FOLDER,
    AVATAR_OUTPUT_CONTENT_TYPE,
    AVATAR_OUTPUT_EXTENSION,
    KNOWLEDGE_BASE_INLINE_IMAGE_FOLDER,
    StoredAttachment,
    StoredFile,
    UploadFilePayload,
)
from app.services.file_management.processing import (
    process_avatar,
    safe_attachment_filename,
    validate_attachment_upload,
    validate_avatar_upload,
)

if TYPE_CHECKING:
    from botocore.client import BaseClient


class S3FileManagementRepository:
    def __init__(
        self,
        *,
        client: "BaseClient",
        bucket: str,
        public_base_url: str,
        key_prefix: str = "",
    ):
        self._client = client
        self._bucket = bucket
        self._public_base_url = public_base_url.rstrip("/")
        self._key_prefix = key_prefix.strip("/")

    def _object_key(self, file_key: str) -> str:
        normalized = file_key.replace("\\", "/").lstrip("/")
        if ".." in normalized.split("/"):
            raise ValueError("Caminho de arquivo inválido.")
        if self._key_prefix:
            return f"{self._key_prefix}/{normalized}"
        return normalized

    async def save(self, payload: UploadFilePayload) -> StoredFile:
        file_key = f"{payload['folder'].strip('/')}/{payload['filename']}"
        object_key = self._object_key(file_key)
        self._client.put_object(
            Bucket=self._bucket,
            Key=object_key,
            Body=payload["content"],
            ContentType=payload["content_type"],
        )
        return {
            "key": file_key,
            "url": self.get_public_url(file_key),
            "content_type": payload["content_type"],
            "size": len(payload["content"]),
        }

    async def delete(self, file_key: str) -> None:
        object_key = self._object_key(file_key)
        try:
            self._client.delete_object(Bucket=self._bucket, Key=object_key)
        except ClientError:
            return

    async def read(self, file_key: str) -> bytes | None:
        object_key = self._object_key(file_key)
        try:
            response = self._client.get_object(Bucket=self._bucket, Key=object_key)
        except ClientError as error:
            code = error.response.get("Error", {}).get("Code", "")
            if code in ("404", "NoSuchKey", "NotFound"):
                return None
            raise
        body = response["Body"].read()
        return body

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
