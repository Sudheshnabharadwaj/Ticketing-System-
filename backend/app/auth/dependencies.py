"""FastAPI auth dependencies — extract and validate the current user."""

from typing import Annotated, Any

from fastapi import Depends, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.auth.jwt import decode_token
from app.core.exceptions import ForbiddenError, UnauthorizedError

_bearer = HTTPBearer(auto_error=False)


async def get_token_payload(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Security(_bearer)],
) -> dict[str, Any]:
    """Extract and validate the Bearer token from the Authorization header."""
    if credentials is None:
        raise UnauthorizedError("No authorization token provided")
    return await decode_token(credentials.credentials)


async def get_current_user(
    payload: Annotated[dict[str, Any], Depends(get_token_payload)],
) -> dict[str, Any]:
    """Return the decoded token payload as the 'current user' context.

    Downstream services can enrich this with a DB User record if needed.
    """
    sub: str | None = payload.get("sub")
    if not sub:
        raise UnauthorizedError("Token missing subject claim")
    return payload


def require_role(*roles: str):  # noqa: ANN201
    """Dependency factory — raises 403 if the token lacks any of the required roles.

    Usage:
        @router.get("/admin", dependencies=[Depends(require_role("admin"))])
    """
    async def _check(
        payload: Annotated[dict[str, Any], Depends(get_current_user)],
    ) -> dict[str, Any]:
        realm_roles: list[str] = (
            payload.get("realm_access", {}).get("roles", [])
        )
        if not any(role in realm_roles for role in roles):
            raise ForbiddenError(
                f"Required role(s): {', '.join(roles)}"
            )
        return payload

    return _check


# ── Convenience type aliases ─────────────────────────────────────────────────
CurrentUser = Annotated[dict[str, Any], Depends(get_current_user)]
