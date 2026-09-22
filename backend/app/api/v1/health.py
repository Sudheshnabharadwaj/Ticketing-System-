"""Health check API endpoints."""

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db

router = APIRouter(tags=["Health"])


@router.get("/health", summary="Liveness probe")
async def health() -> dict[str, str]:
    """Returns 200 immediately — used by load balancers as a liveness probe."""
    return {"status": "ok"}


@router.get("/ready", summary="Readiness probe")
async def ready(db: AsyncSession = Depends(get_db)) -> dict[str, str]:
    """Checks DB connectivity — used as a readiness probe before serving traffic."""
    await db.execute(text("SELECT 1"))
    return {"status": "ready"}
