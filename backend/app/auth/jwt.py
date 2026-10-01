"""JWT validation against Keycloak JWKS endpoint."""

from typing import Any, cast

import httpx
from jose import JWTError, jwt

from app.config import get_settings
from app.core.exceptions import UnauthorizedError
from app.core.logging import get_logger

logger = get_logger(__name__)
settings = get_settings()

# Module-level JWKS cache (refreshed on decode failure)
_jwks_cache: dict[str, Any] | None = None


async def _fetch_jwks() -> dict[str, Any]:
    """Fetch and cache the JWKS from Keycloak."""
    global _jwks_cache
    async with httpx.AsyncClient() as client:
        response = await client.get(settings.keycloak_jwks_url, timeout=10.0)
        response.raise_for_status()
        _jwks_cache = response.json()
        return _jwks_cache


async def decode_token(token: str) -> dict[str, Any]:
    """Decode and validate a Keycloak-issued JWT.

    Fetches JWKS on the first call and retries once on key-not-found errors
    (handles Keycloak key rotation gracefully).
    """
    global _jwks_cache

    if _jwks_cache is None:
        await _fetch_jwks()

    try:
        payload = _decode_with_jwks(token, _jwks_cache)  # type: ignore[arg-type]
    except JWTError:
        # Attempt a JWKS refresh (key rotation)
        logger.info("JWT decode failed — refreshing JWKS")
        await _fetch_jwks()
        try:
            payload = _decode_with_jwks(token, _jwks_cache)  # type: ignore[arg-type]
        except JWTError as exc:
            logger.warning("JWT validation failed", error=str(exc))
            raise UnauthorizedError("Invalid or expired token") from exc

    return payload


def _decode_with_jwks(token: str, jwks: dict[str, Any]) -> dict[str, Any]:
    """Decode token using the provided JWKS key set."""
    return cast(
        dict[str, Any],
        jwt.decode(
            token,
            jwks,
            algorithms=["RS256"],
            audience=settings.keycloak_client_id,
            issuer=settings.keycloak_issuer,
            options={"verify_exp": True},
        ),
    )
