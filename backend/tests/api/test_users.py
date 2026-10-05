"""Tests for user API endpoints (/api/v1/users)."""

import uuid
from typing import Any

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_get_me_unauthorized(client: AsyncClient) -> None:
    """Unauthenticated requests to /me should return 401 Unauthorized."""
    response = await client.get("/api/v1/users/me")
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "UNAUTHORIZED"


@pytest.mark.asyncio
async def test_get_me_creates_user(
    authenticated_client: AsyncClient,
    auth_user_payload: dict[str, Any],
) -> None:
    """First-time login /me creates user in DB and returns profile."""
    response = await authenticated_client.get("/api/v1/users/me")
    assert response.status_code == 200
    data = response.json()
    assert data["keycloak_id"] == auth_user_payload["sub"]
    assert data["email"] == auth_user_payload["email"]
    assert data["full_name"] == auth_user_payload["name"]
    assert data["avatar_url"] == auth_user_payload["picture"]
    assert "id" in data
    assert data["is_active"] is True


@pytest.mark.asyncio
async def test_get_me_returns_existing_user(
    authenticated_client: AsyncClient,
    auth_user_payload: dict[str, Any],
) -> None:
    """Subsequent requests should retrieve the existing user."""
    resp1 = await authenticated_client.get("/api/v1/users/me")
    resp2 = await authenticated_client.get("/api/v1/users/me")
    assert resp1.status_code == 200
    assert resp2.status_code == 200
    assert resp1.json()["id"] == resp2.json()["id"]


@pytest.mark.asyncio
async def test_update_me(
    authenticated_client: AsyncClient,
) -> None:
    """PATCH /me should update the current user's profile fields."""
    # Ensure user exists first
    await authenticated_client.get("/api/v1/users/me")

    update_payload = {
        "full_name": "Updated Name",
        "avatar_url": "https://example.com/new-avatar.png",
    }
    response = await authenticated_client.patch("/api/v1/users/me", json=update_payload)
    assert response.status_code == 200
    data = response.json()
    assert data["full_name"] == "Updated Name"
    assert data["avatar_url"] == "https://example.com/new-avatar.png"


@pytest.mark.asyncio
async def test_update_me_unauthorized(client: AsyncClient) -> None:
    """PATCH /me without token should return 401."""
    response = await client.patch("/api/v1/users/me", json={"full_name": "Hack"})
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_list_users_forbidden_for_regular_user(
    authenticated_client: AsyncClient,
) -> None:
    """Regular user cannot list all users (requires admin role)."""
    response = await authenticated_client.get("/api/v1/users/")
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "FORBIDDEN"


@pytest.mark.asyncio
async def test_list_users_unauthorized(client: AsyncClient) -> None:
    """Unauthenticated access to list users should return 401."""
    response = await client.get("/api/v1/users/")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_list_users_admin(
    admin_client: AsyncClient,
    authenticated_client: AsyncClient,
) -> None:
    """Admin user can list users and get paginated results."""
    # Seed a couple of users
    await authenticated_client.get("/api/v1/users/me")
    await admin_client.get("/api/v1/users/me")

    response = await admin_client.get("/api/v1/users/")
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert data["total"] >= 2
    assert len(data["items"]) >= 2
    assert data["page"] == 1
    assert data["size"] == 20


@pytest.mark.asyncio
async def test_get_user_by_id_admin_success(
    admin_client: AsyncClient,
    authenticated_client: AsyncClient,
) -> None:
    """Admin can get a user by their UUID."""
    user_resp = await authenticated_client.get("/api/v1/users/me")
    user_id = user_resp.json()["id"]

    response = await admin_client.get(f"/api/v1/users/{user_id}")
    assert response.status_code == 200
    assert response.json()["id"] == user_id
    assert response.json()["email"] == "user@platform.dev"


@pytest.mark.asyncio
async def test_get_user_by_id_not_found(
    admin_client: AsyncClient,
) -> None:
    """Admin getting a non-existent UUID should return 404."""
    random_uuid = str(uuid.uuid4())
    response = await admin_client.get(f"/api/v1/users/{random_uuid}")
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "NOT_FOUND"


@pytest.mark.asyncio
async def test_get_user_by_id_forbidden_for_regular_user(
    authenticated_client: AsyncClient,
) -> None:
    """Regular user cannot access get user by id endpoint."""
    random_uuid = str(uuid.uuid4())
    response = await authenticated_client.get(f"/api/v1/users/{random_uuid}")
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "FORBIDDEN"
