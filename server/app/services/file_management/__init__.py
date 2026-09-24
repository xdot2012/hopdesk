from functools import lru_cache
from pathlib import Path

from app.settings import get_settings

from .aws import S3FileManagementRepository, build_s3_client
from .repository import LocalFileManagementRepository
from .service import FileManagementService


@lru_cache
def get_file_management_service() -> FileManagementService:
    settings = get_settings()
    backend = (settings.files_storage_backend or "local").strip().lower()

    if backend == "s3":
        if not settings.aws_s3_bucket:
            raise ValueError("AWS_S3_BUCKET is required when FILES_STORAGE_BACKEND=s3")
        repository = S3FileManagementRepository(
            client=build_s3_client(settings),
            bucket=settings.aws_s3_bucket,
            public_base_url=settings.files_public_base_url,
            key_prefix=settings.aws_s3_key_prefix,
        )
        return FileManagementService(repository)

    storage_root = Path(settings.files_storage_root)
    if not storage_root.is_absolute():
        storage_root = Path(__file__).resolve().parents[3] / storage_root

    repository = LocalFileManagementRepository(
        storage_root=str(storage_root),
        public_base_url=settings.files_public_base_url,
    )
    return FileManagementService(repository)
