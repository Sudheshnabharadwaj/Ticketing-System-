"""FastAPI application factory."""

import sentry_sdk
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import router as v1_router
from app.config import get_settings
from app.core.exceptions import register_exception_handlers
from app.core.logging import configure_logging
from app.core.telemetry import configure_telemetry, instrument_app

settings = get_settings()

# ── Logging ──────────────────────────────────────────────────────────────────
configure_logging(debug=settings.debug)

# ── Sentry ───────────────────────────────────────────────────────────────────
if settings.sentry_dsn:
    sentry_sdk.init(
        dsn=settings.sentry_dsn,
        environment=settings.app_env,
        traces_sample_rate=0.2,
        profiles_sample_rate=0.1,
    )

# ── OpenTelemetry ────────────────────────────────────────────────────────────
configure_telemetry(debug=settings.debug)


def create_app() -> FastAPI:
    app = FastAPI(
        title="Platform API",
        version="0.1.0",
        description="Phase 1 backend API — FastAPI + PostgreSQL + Keycloak",
        docs_url="/docs" if settings.debug else None,
        redoc_url="/redoc" if settings.debug else None,
        openapi_url="/openapi.json" if settings.debug else None,
    )

    # ── CORS ─────────────────────────────────────────────────────────────────
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Exception handlers ───────────────────────────────────────────────────
    register_exception_handlers(app)

    # ── Root endpoint ────────────────────────────────────────────────────────
    @app.get("/", tags=["Root"])
    def root() -> dict[str, str]:
        """Root endpoint displaying API metadata and docs links."""
        return {
            "name": "Platform API",
            "version": "0.1.0",
            "status": "online",
            "docs": "/docs",
            "redoc": "/redoc",
            "health": "/api/v1/health",
        }

    # ── Routers ──────────────────────────────────────────────────────────────
    app.include_router(v1_router)

    # ── OpenTelemetry instrumentation ─────────────────────────────────────────
    instrument_app(app)

    return app


app = create_app()
