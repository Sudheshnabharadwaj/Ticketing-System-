"""Users API endpoints."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import CurrentUser, require_role
from app.db.session import get_db
from app.schemas.user import UserListResponse, UserResponse, UserUpdate
from app.services import user_service

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me", response_model=UserResponse, summary="Get current user profile")
async def get_me(
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    """Upsert the calling user in the database and return their profile."""
    user = await user_service.get_or_create_user(db, current_user)
    return UserResponse.model_validate(user)


@router.patch("/me", response_model=UserResponse, summary="Update current user profile")
async def update_me(
    data: UserUpdate,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    user = await user_service.get_or_create_user(db, current_user)
    updated = await user_service.update_user(db, user.id, data)
    return UserResponse.model_validate(updated)


@router.get(
    "/",
    response_model=UserListResponse,
    summary="List all users (admin only)",
    dependencies=[Depends(require_role("admin"))],
)
async def list_users(
    skip: int = 0,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
) -> UserListResponse:
    users, total = await user_service.list_users(db, skip=skip, limit=limit)
    return UserListResponse(
        items=[UserResponse.model_validate(u) for u in users],
        total=total,
        page=skip // limit + 1,
        size=limit,
    )


@router.get(
    "/{user_id}",
    response_model=UserResponse,
    summary="Get user by ID (admin only)",
    dependencies=[Depends(require_role("admin"))],
)
async def get_user(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    user = await user_service.get_user_by_id(db, user_id)
    return UserResponse.model_validate(user)
