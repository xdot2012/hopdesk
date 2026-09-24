from functools import lru_cache
from typing import Annotated

from fastapi import Depends
from pydantic_settings import BaseSettings, SettingsConfigDict

MINUTES_5 = 300
MINUTES_30 = 1800
HOUR_1 = 3600
DAYS_1 = 86400
DAYS_30 = 2592000


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file='.env')

    system_name: str
    system_email: str
    system_default_password: str
    environment: str = 'dev'
    secret_key: str
    encryption_key: str
    algorithm: str = "HS26"
    token_type: str = "Bearer"
    access_token_expiration: int = MINUTES_5
    refresh_token_expiration: int = HOUR_1
    session_expiration: int = DAYS_1
    keep_me_connected_session_expiration: int = DAYS_30
    reset_password_expiration: int = MINUTES_30
    expose_reset_password_token: bool = False
    email_confirm_expiration: int = MINUTES_30
    expose_email_confirm_token: bool = False
    require_email_confirmation: bool = True
    require_two_factor: bool = True

    db_driver: str
    db_name: str
    db_user: str = ""
    db_password: str = ""
    db_host: str = ""
    db_port: int | None = None

    use_redis: bool = False
    cache_host: str = ""
    cache_port: int | None = None

    email_user: str = "tests@tests.com"
    email_password: str = "tests"
    email_host: str = "localhost"
    email_port: int = 1025

    use_sentry: bool = False
    sentry_dsn: str = ""
    monitor_profile_sample: float = 1
    monitor_traces_sample_rate: float = 1

    client_base_url: str = "http://localhost:5173"

    files_storage_root: str = "uploads"
    files_public_base_url: str = "http://localhost:8000/v1/files"

    files_storage_backend: str = "local"
    aws_s3_bucket: str = ""
    aws_s3_region: str = "us-east-1"
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    aws_s3_endpoint_url: str = ""
    aws_s3_key_prefix: str = ""

    def get_database_url(self):
        return "{driver}://{user}:{password}@{host}:{port}/{database_name}".format(
            driver=self.db_driver,
            user=self.db_user,
            password=self.db_password,
            host=self.db_host,
            port=self.db_port,
            database_name=self.db_name
        )


@lru_cache()
def get_settings() -> Settings:
    return Settings()


SettingsDependency = Annotated[Settings, Depends(get_settings)]
