from __future__ import annotations

from functools import lru_cache

from pydantic import AnyHttpUrl, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_env: str = "local"
    log_level: str = "INFO"
    frontend_url: str = "http://localhost:3000"
    backend_url: str = "http://localhost:8000"
    database_url: str = (
        "postgresql+psycopg://companybrain:companybrain@localhost:5432/companybrain"
    )
    database_migration_url: str = (
        "postgresql+psycopg://companybrain:companybrain@localhost:5432/companybrain"
    )
    redis_url: str = "redis://localhost:6379/0"
    supabase_url: str | None = None
    supabase_service_role_key: str | None = None
    supabase_jwt_secret: str | None = None
    supabase_jwks_url: AnyHttpUrl | None = None
    auth_audience: str = "authenticated"
    app_version: str = Field(default="0.1.0")


@lru_cache
def get_settings() -> Settings:
    return Settings()
