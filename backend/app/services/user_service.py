"""User service — business logic layer."""

import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.core.logging import get_logger
from app.db.models.user import User
from app.schemas.user import UserCreate, UserUpdate

logger = get_logger(__name__)


async def get_user_by_id(db: AsyncSession, user_id: uuid.UUID) -> User:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise NotFoundError("User", user_id)
    return user


async def get_user_by_keycloak_id(db: AsyncSession, keycloak_id: str) -> User | None:
    result = await db.execute(
        select(User).where(User.keycloak_id == keycloak_id)
    )
    return result.scalar_one_or_none()


async def get_or_create_user(db: AsyncSession, token_payload: dict[str, Any]) -> User:
    """Upsert a user record from a decoded Keycloak token.

    Called on first login — syncs email, full name, and avatar from the JWT claims.
    """
    keycloak_id: str = token_payload["sub"]
    existing = await get_user_by_keycloak_id(db, keycloak_id)

    if existing:
        return existing

    user_data = UserCreate(
        keycloak_id=keycloak_id,
        email=token_payload.get("email", ""),
        full_name=token_payload.get("name"),
        avatar_url=token_payload.get("picture"),
    )
    user = User(**user_data.model_dump())
    db.add(user)
    await db.flush()
    logger.info("Created new user", keycloak_id=keycloak_id, email=user.email)
    return user


async def list_users(
    db: AsyncSession, *, skip: int = 0, limit: int = 20
) -> tuple[list[User], int]:
    count_result = await db.execute(select(User))
    total = len(count_result.scalars().all())

    result = await db.execute(select(User).offset(skip).limit(limit))
    users = list(result.scalars().all())
    return users, total


async def update_user(
    db: AsyncSession, user_id: uuid.UUID, data: UserUpdate
) -> User:
    user = await get_user_by_id(db, user_id)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(user, field, value)
    await db.flush()
    return user
