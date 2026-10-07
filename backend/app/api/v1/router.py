"""Aggregate all v1 API routes."""

from fastapi import APIRouter

from app.api.v1 import health, tickets, users

router = APIRouter(prefix="/api/v1")

router.include_router(health.router)
router.include_router(tickets.router)
router.include_router(users.router)

