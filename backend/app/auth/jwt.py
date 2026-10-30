"""JWT validation â€” supports backend-issued HS256 app tokens and Keycloak RS256 tokens."""

from datetime import datetime, timedelta, timezone
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

APP_TOKEN_ISSUER = "ticketing-backend"
APP_TOKEN_ALGORITHM = "HS256"


def create_app_token(
    user_id: str,
    email: str,
    role: str,
    name: str = "",
    expires_minutes: int = 60 * 24 * 7,  # 7 days persistent session
    department: str = "",
    team: str = "",
) -> str:
    """Issue a short-lived HS256 token signed with the app secret.

    This is the per-user credential the frontends obtain at login and send on
    backend API calls. It is signed server-side with APP_SECRET_KEY and never
    exposes the Supabase service-role key.
    """
    now = datetime.now(timezone.utc)
    payload: dict[str, Any] = {
        "sub": user_id,
        "email": email,
        "role": role,
        "name": name,
        "department": department,
        "team": team,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=expires_minutes)).timestamp()),
        "iss": APP_TOKEN_ISSUER,
        "typ": "app",
    }
    return cast(str, jwt.encode(payload, settings.app_secret_key, algorithm=APP_TOKEN_ALGORITHM))


def create_refresh_token(user_id: str, expires_days: int = 30) -> str:
    """Issue a long-lived refresh token.

    Refresh tokens are signed with the same secret but carry ``typ=refresh`` and
    are rejected by :func:`decode_token`, so they cannot be used as access
    tokens on protected endpoints.
    """
    now = datetime.now(timezone.utc)
    payload: dict[str, Any] = {
        "sub": user_id,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(days=expires_days)).timestamp()),
        "iss": APP_TOKEN_ISSUER,
        "typ": "refresh",
    }
    return cast(str, jwt.encode(payload, settings.app_secret_key, algorithm=APP_TOKEN_ALGORITHM))


def decode_refresh_token(token: str) -> dict[str, Any] | None:
    """Return the refresh-token payload, or ``None`` when invalid/expired."""
    try:
        payload = jwt.decode(
            token,
            settings.app_secret_key,
            algorithms=[APP_TOKEN_ALGORITHM],
            issuer=APP_TOKEN_ISSUER,
            options={"verify_exp": True},
        )
    except JWTError:
        return None
    if not isinstance(payload, dict) or payload.get("typ") != "refresh":
        return None
    return cast(dict[str, Any], payload)


def _try_decode_app_token(token: str) -> dict[str, Any] | None:
    """Return the decoded payload if the token is a valid backend app token.

    Refresh tokens deliberately carry a different ``typ`` and are not accepted
    here; otherwise a long-lived refresh token could be used as an access token.
    """
    try:
        payload = jwt.decode(
            token,
            settings.app_secret_key,
            algorithms=[APP_TOKEN_ALGORITHM],
            issuer=APP_TOKEN_ISSUER,
            options={"verify_exp": True},
        )
    except JWTError:
        return None
    if not isinstance(payload, dict) or payload.get("typ") != "app":
        return None
    return cast(dict[str, Any], payload)


async def _fetch_jwks() -> dict[str, Any]:
    """Fetch and cache the JWKS from Keycloak."""
    global _jwks_cache
    async with httpx.AsyncClient() as client:
        response = await client.get(settings.keycloak_jwks_url, timeout=10.0)
        response.raise_for_status()
        _jwks_cache = response.json()
        return _jwks_cache


def _is_app_token(token: str) -> bool:
    """Return whether the token claims to be issued by this backend.

    The check deliberately reads the unverified payload only to route the token
    to the correct validator. It is never used to authorize a request.
    """
    try:
        header = jwt.get_unverified_header(token)
        claims = jwt.get_unverified_claims(token)
    except JWTError:
        return False
    return (
        header.get("alg") == APP_TOKEN_ALGORITHM
        and isinstance(claims, dict)
        and claims.get("iss") == APP_TOKEN_ISSUER
    )


async def decode_token(token: str) -> dict[str, Any]:
    """Decode and validate a JWT.

    First tries a backend-issued HS256 app token (per-user credential used by the
    frontends). Falls back to validating a Keycloak-issued RS256 JWT via JWKS.

    A token claiming to be ours but carrying ``typ=refresh`` is rejected here and
    must never trigger a Keycloak lookup or become an access token.
    """
    if _is_app_token(token):
        app_payload = _try_decode_app_token(token)
        if app_payload is None:
            raise UnauthorizedError("Invalid or expired token")
        return app_payload

    global _jwks_cache

    try:
        if _jwks_cache is None:
            await _fetch_jwks()
        payload = _decode_with_jwks(token, _jwks_cache)  # type: ignore[arg-type]
    except JWTError:
        # Attempt a JWKS refresh (key rotation)
        logger.info("JWT decode failed; refreshing JWKS")
        try:
            await _fetch_jwks()
            payload = _decode_with_jwks(token, _jwks_cache)  # type: ignore[arg-type]
        except (JWTError, httpx.HTTPError) as exc:
            logger.warning("JWT validation failed", error=str(exc))
            raise UnauthorizedError("Invalid or expired token") from exc
    except httpx.HTTPError as exc:
        logger.warning("JWKS fetch failed", error=str(exc))
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
