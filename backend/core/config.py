from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # App
    APP_NAME: str = "Dataset Manager Pro"
    DEBUG: bool = False
    API_PREFIX: str = "/api/v1"

    # Wasabi / S3
    WASABI_ENDPOINT: str = "https://s3.wasabisys.com"
    WASABI_REGION: str = "us-east-1"
    WASABI_ACCESS_KEY_ID: str = ""
    WASABI_SECRET_ACCESS_KEY: str = ""
    WASABI_BUCKET: str = ""

    # Database (PostgreSQL)
    DATABASE_URL: str = "postgresql+asyncpg://postgres:password@localhost:5432/dataset_manager"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # Security
    SECRET_KEY: str = "change-me-in-production-use-a-strong-random-key"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24

    # Storage
    MAX_UPLOAD_SIZE_MB: int = 5120  # 5 GB
    PRESIGNED_URL_EXPIRY_SECONDS: int = 86400  # 24 hours
    MULTIPART_THRESHOLD_MB: int = 100
    MULTIPART_CHUNK_SIZE_MB: int = 50

    # Processing
    MAX_CONCURRENT_JOBS: int = 4
    DEFAULT_BATCH_SIZE: int = 64
    TMP_DIR: str = "/tmp/dataset_manager"

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
