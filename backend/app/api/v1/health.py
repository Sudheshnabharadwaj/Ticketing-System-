"""Health check API endpoints."""

import logging
import time
from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Health"])


async def check_database_health(db: AsyncSession) -> tuple[bool, dict]:
    """Execute test query against database and return (is_healthy, payload)."""
    try:
        t0 = time.perf_counter()
        result = await db.execute(text("SELECT 1, CURRENT_TIMESTAMP"))
        row = result.fetchone()
        latency_ms = round((time.perf_counter() - t0) * 1000, 2)

        server_time = row[1]
        timestamp_str = server_time.isoformat() if hasattr(server_time, "isoformat") else str(server_time)

        return True, {
            "status": "healthy",
            "database": "connected",
            "timestamp": timestamp_str,
            "latency_ms": latency_ms,
        }
    except Exception as exc:
        logger.error("Database health check failed: %s", exc)
        return False, {
            "status": "unhealthy",
            "database": "disconnected",
            "error": str(exc),
        }


@router.get("/health", summary="Liveness probe")
async def health() -> dict[str, str]:
    """Returns 200 immediately — used by load balancers as a liveness probe."""
    return {"status": "ok"}


@router.get("/ready", summary="Readiness probe")
async def ready(db: AsyncSession = Depends(get_db)) -> dict[str, str]:
    """Checks DB connectivity — used as a readiness probe before serving traffic."""
    await db.execute(text("SELECT 1"))
    return {"status": "ready"}


@router.get("/health/db", summary="Database connectivity health check")
async def health_db(db: AsyncSession = Depends(get_db)):
    """
    Checks PostgreSQL / Supabase connection:
    - Status 200: { "status": "healthy", "database": "connected", "timestamp": "<server_time>" }
    - Status 500: { "status": "unhealthy", "database": "disconnected", "error": "<error_message>" }
    """
    is_healthy, payload = await check_database_health(db)
    return JSONResponse(status_code=200 if is_healthy else 500, content=payload)
