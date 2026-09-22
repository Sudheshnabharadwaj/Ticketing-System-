"""Pydantic v2 schemas for User."""

import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr


class UserBase(BaseModel):
    email: EmailStr
    full_name: str | None = None
    avatar_url: str | None = None


class UserCreate(UserBase):
    keycloak_id: str


class UserUpdate(BaseModel):
    full_name: str | None = None
    avatar_url: str | None = None
    is_active: bool | None = None


class UserResponse(UserBase):
    id: uuid.UUID
    keycloak_id: str
    is_active: bool
    is_superuser: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class UserListResponse(BaseModel):
    items: list[UserResponse]
    total: int
    page: int
    size: int
