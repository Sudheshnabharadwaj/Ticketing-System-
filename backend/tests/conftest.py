"""pytest fixtures — test database and async test client."""

import os

os.environ["OTEL_SDK_DISABLED"] = "true"

from collections.abc import AsyncGenerator
from typing import Annotated, Any

import pytest
import pytest_asyncio
from fastapi import Security
from fastapi.security import HTTPAuthorizationCredentials
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.auth.dependencies import _bearer, get_token_payload
from app.core.exceptions import UnauthorizedError
from app.db.base import Base
from app.db.session import get_db
from app.main import app

# Default to in-memory SQLite for fast, standalone testing; fallback to env var for Postgres CI
TEST_DATABASE_URL = os.getenv(
    "TEST_DATABASE_URL", "sqlite+aiosqlite:///:memory:"
)

engine_kwargs: dict[str, Any] = {"echo": False}
if "sqlite" in TEST_DATABASE_URL:
    engine_kwargs["connect_args"] = {"check_same_thread": False}
    engine_kwargs["poolclass"] = StaticPool

test_engine = create_async_engine(TEST_DATABASE_URL, **engine_kwargs)
TestSessionLocal = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)


@pytest_asyncio.fixture(scope="session", autouse=True)
async def setup_test_db() -> AsyncGenerator[None, None]:
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    # Flush and shutdown OpenTelemetry provider before pytest closes stdout
    from opentelemetry import trace
    provider = trace.get_tracer_provider()
    if hasattr(provider, "shutdown"):
        provider.shutdown()


@pytest_asyncio.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    async with TestSessionLocal() as session:
        yield session
        await session.rollback()


@pytest.fixture
def auth_user_payload() -> dict[str, Any]:
    return {
        "sub": "kc-user-uuid-1111",
        "email": "user@platform.dev",
        "name": "Platform User",
        "picture": "https://example.com/user.png",
        "realm_access": {"roles": ["user"]},
    }


@pytest.fixture
def admin_user_payload() -> dict[str, Any]:
    return {
        "sub": "kc-admin-uuid-9999",
        "email": "admin@platform.dev",
        "name": "Admin User",
        "picture": "https://example.com/admin.png",
        "realm_access": {"roles": ["admin", "user"]},
    }


def _setup_overrides(
    db_session: AsyncSession,
    auth_user_payload: dict[str, Any],
    admin_user_payload: dict[str, Any],
) -> None:
    async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
        yield db_session

    async def override_get_token_payload(
        credentials: Annotated[HTTPAuthorizationCredentials | None, Security(_bearer)],
    ) -> dict[str, Any]:
        if credentials is None:
            raise UnauthorizedError("No authorization token provided")
        if credentials.credentials == "test-admin-token":
            return admin_user_payload
        return auth_user_payload

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_token_payload] = override_get_token_payload


@pytest_asyncio.fixture
async def client(
    db_session: AsyncSession,
    auth_user_payload: dict[str, Any],
    admin_user_payload: dict[str, Any],
) -> AsyncGenerator[AsyncClient, None]:
    """Unauthenticated test client."""
    _setup_overrides(db_session, auth_user_payload, admin_user_payload)

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def authenticated_client(
    db_session: AsyncSession,
    auth_user_payload: dict[str, Any],
    admin_user_payload: dict[str, Any],
) -> AsyncGenerator[AsyncClient, None]:
    """Client authenticated as a regular user."""
    _setup_overrides(db_session, auth_user_payload, admin_user_payload)

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
        headers={"Authorization": "Bearer test-user-token"},
    ) as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def admin_client(
    db_session: AsyncSession,
    auth_user_payload: dict[str, Any],
    admin_user_payload: dict[str, Any],
) -> AsyncGenerator[AsyncClient, None]:
    """Client authenticated as an admin user."""
    _setup_overrides(db_session, auth_user_payload, admin_user_payload)

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
        headers={"Authorization": "Bearer test-admin-token"},
    ) as ac:
        yield ac

    app.dependency_overrides.clear()
