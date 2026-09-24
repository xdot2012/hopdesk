from functools import lru_cache

import boto3
from botocore.client import BaseClient

from app.settings import Settings, get_settings


@lru_cache
def get_s3_client() -> BaseClient:
    settings = get_settings()
    kwargs: dict = {
        "service_name": "s3",
        "region_name": settings.aws_s3_region or None,
    }
    if settings.aws_access_key_id and settings.aws_secret_access_key:
        kwargs["aws_access_key_id"] = settings.aws_access_key_id
        kwargs["aws_secret_access_key"] = settings.aws_secret_access_key
    if settings.aws_s3_endpoint_url:
        kwargs["endpoint_url"] = settings.aws_s3_endpoint_url
    return boto3.client(**kwargs)


def build_s3_client(settings: Settings) -> BaseClient:
    kwargs: dict = {
        "service_name": "s3",
        "region_name": settings.aws_s3_region or None,
    }
    if settings.aws_access_key_id and settings.aws_secret_access_key:
        kwargs["aws_access_key_id"] = settings.aws_access_key_id
        kwargs["aws_secret_access_key"] = settings.aws_secret_access_key
    if settings.aws_s3_endpoint_url:
        kwargs["endpoint_url"] = settings.aws_s3_endpoint_url
    return boto3.client(**kwargs)
