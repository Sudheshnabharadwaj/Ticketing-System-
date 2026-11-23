"""FastAPI auth dependencies — extract and validate the current user."""

from collections.abc import Callable, Coroutine
from typing import Annotated, Any

from fastapi import Depends, Query, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.auth.jwt import decode_token
from app.core.exceptions import ForbiddenError, UnauthorizedError

_bearer = HTTPBearer(auto_error=False)


async def get_token_payload(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Security(_bearer)],
    access_token: Annotated[str | None, Query()] = None,
    token: Annotated[str | None, Query()] = None,
) -> dict[str, Any]:
    """Extract and validate the Bearer token from the Authorization header.

    Also accepts an ``?access_token=`` or ``?token=`` query parameter as a fallback
    so that direct-link file downloads and inline previews (which cannot set headers)
    can still authenticate with a short-lived token.
    """
    raw_token = credentials.credentials if credentials is not None else (access_token or token)
    if not raw_token:
        raise UnauthorizedError("No authorization token provided")
    return await decode_token(raw_token)


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


def require_role(*roles: str) -> Callable[..., Coroutine[Any, Any, dict[str, Any]]]:
    """Dependency factory — raises 403 if the token lacks any of the required roles.

    Usage:
        @router.get("/admin", dependencies=[Depends(require_role("admin"))])
    """
    async def _check(
        payload: Annotated[dict[str, Any], Depends(get_current_user)],
    ) -> dict[str, Any]:
        if not _role_satisfies(payload, roles):
            raise ForbiddenError(
                f"Required role(s): {', '.join(roles)}"
            )
        return payload

    return _check


def _user_role(payload: dict[str, Any]) -> str:
    """Extract the user's role from either an app token or a Keycloak token."""
    role = payload.get("role")
    if isinstance(role, str) and role:
        return role.lower()
    realm_roles: list[str] = payload.get("realm_access", {}).get("roles", [])
    for r in realm_roles:
        rl = r.lower()
        if "admin" in rl:
            return "admin"
        if "lead" in rl:
            return "teamlead"
        if "employee" in rl or "user" in rl:
            return "employee"
    return ""


def _role_satisfies(payload: dict[str, Any], roles: tuple[str, ...]) -> bool:
    user_role = _user_role(payload)
    if not user_role:
        return False
    return any(user_role == r.lower() or user_role in r.lower() for r in roles)


def user_email(payload: dict[str, Any]) -> str:
    return (payload.get("email") or "").strip().lower()


def user_name(payload: dict[str, Any]) -> str:
    return (payload.get("name") or "").strip()


def authorize_ticket_access(payload: dict[str, Any], ticket: dict[str, Any]) -> bool:
    """Server-side authorization rule for a single ticket.

    Delegates to the shared scope helper so the attachment endpoints enforce
    the same department/ownership rules as the ticket APIs. Admin has full
    access; a Team Lead is limited to their department/team; an Employee is
    limited to tickets they created or that are assigned/tagged to them.
    """
    from app.services.access import load_current_user, ticket_visible

    if _user_role(payload) not in ("admin", "teamlead", "employee"):
        return False
    try:
        user = load_current_user(payload)
    except LookupError:
        return False
    return ticket_visible(payload, user, ticket)


# ── Convenience type aliases ─────────────────────────────────────────────────
CurrentUser = Annotated[dict[str, Any], Depends(get_current_user)]
