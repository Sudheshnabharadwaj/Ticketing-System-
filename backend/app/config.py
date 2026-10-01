"""Application configuration via Pydantic Settings (environment-driven)."""

from functools import lru_cache
from typing import Literal

from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── App ──────────────────────────────────────────────────────────────────
    app_env: Literal["development", "staging", "production"] = "development"
    app_secret_key: str = "change-me-in-production-32-chars!!"
    debug: bool = False
    allowed_origins: list[str] | str = ["http://localhost:3000"]

    @field_validator("allowed_origins", mode="before")
    @classmethod
    def parse_origins(cls, v: object) -> list[str]:
        if isinstance(v, str):
            v = v.strip()
            if v.startswith("[") and v.endswith("]"):
                import json
                try:
                    parsed = json.loads(v)
                    if isinstance(parsed, list):
                        return [str(o).strip() for o in parsed]
                except Exception:
                    pass
            return [o.strip() for o in v.split(",") if o.strip()]
        if isinstance(v, (list, tuple)):
            return [str(o).strip() for o in v]
        return [str(v)]

    # ── Database ─────────────────────────────────────────────────────────────
    database_url: str = (
        "postgresql+asyncpg://platform:platform_secret@localhost:5433/platform_db"
    )

    # ── Redis ─────────────────────────────────────────────────────────────────
    redis_url: str = "redis://localhost:6379/0"
    celery_broker_url: str = "redis://localhost:6379/1"
    celery_result_backend: str = "redis://localhost:6379/2"

    # ── Keycloak ──────────────────────────────────────────────────────────────
    keycloak_url: AnyHttpUrl = "http://localhost:8080"  # type: ignore[assignment]
    keycloak_realm: str = "platform"
    keycloak_client_id: str = "backend-api"
    keycloak_client_secret: str = "change-me"

    @property
    def keycloak_jwks_url(self) -> str:
        return (
            f"{self.keycloak_url}/realms/{self.keycloak_realm}"
            "/protocol/openid-connect/certs"
        )

    @property
    def keycloak_issuer(self) -> str:
        return f"{self.keycloak_url}/realms/{self.keycloak_realm}"

    # ── S3 / MinIO ────────────────────────────────────────────────────────────
    s3_endpoint_url: str = "http://localhost:9000"
    s3_access_key: str = "minioadmin"
    s3_secret_key: str = "minioadmin"
    s3_bucket_name: str = "platform-files"
    s3_region: str = "us-east-1"

    # ── Sentry ────────────────────────────────────────────────────────────────
    sentry_dsn: str = ""


@lru_cache
def get_settings() -> Settings:
    """Return a cached singleton Settings instance."""
    return Settings()
