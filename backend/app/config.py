"""Application configuration via Pydantic Settings (environment-driven)."""

from functools import lru_cache
from typing import Literal

from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── App ──────────────────────────────────────────────────────────────────
    app_env: Literal["development", "staging", "production"] = "development"
    debug: bool = False
    app_secret_key: str = "change-me-in-production-32-chars!!"
    allowed_origins: list[str] | str = [
        "http://localhost:3000",
        "http://localhost:4173",
        "http://localhost:4174",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:4173",
        "http://127.0.0.1:4174",
        "https://hymajagarapu.github.io",
        "https://sudheshnabharadwaj.github.io",
    ]

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

    # ── Supabase ──────────────────────────────────────────────────────────────
    supabase_url: str = "https://fidilgpihfwfnwiugoxm.supabase.co"
    supabase_project_id: str = "fidilgpihfwfnwiugoxm"
    supabase_anon_key: str = ""
    supabase_publishable_key: str = ""
    supabase_service_role_key: str = ""
    supabase_access_token: str = ""

    # ── SMTP Settings ────────────────────────────────────────────────────────
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from_email: str = "k.ananthu@oklut.com"
    smtp_from_name: str = "Kotesh"
    smtp_tls: bool = True


@lru_cache
def get_settings() -> Settings:
    """Return a cached singleton Settings instance."""
    return Settings()
