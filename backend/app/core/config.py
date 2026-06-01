"""Configuration loaded from environment variables."""
from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    env: Literal["development", "staging", "production"] = "development"
    log_level: str = "INFO"

    database_url: str = Field(..., alias="DATABASE_URL")

    jwt_secret: str = Field(..., min_length=32, alias="JWT_SECRET")
    jwt_alg: str = "HS256"
    jwt_access_ttl_min: int = 60
    jwt_refresh_ttl_days: int = 14

    # Single LLM provider: Google Gemini 2.5 Flash.
    gemini_api_key: str = Field(..., alias="GEMINI_API_KEY")

    chroma_path: str = "./chroma"

    cors_origins: str = "http://localhost:3000"

    s3_bucket: str | None = None
    s3_region: str | None = None
    aws_access_key_id: str | None = None
    aws_secret_access_key: str | None = None

    sentry_dsn: str | None = None

    @property
    def cors_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
