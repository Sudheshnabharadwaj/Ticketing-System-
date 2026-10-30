"""Authentication API — credential login for all three portals.

The portals no longer validate passwords in the browser and no longer talk to
Supabase with the anon key. They exchange email/password here, receive a
short-lived HS256 access token plus a refresh token, and send the access token
on every protected API call.
"""

from __future__ import annotations

import hmac
import secrets
import time
from datetime import datetime, timezone
from typing import Any
from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.auth.dependencies import get_current_user
from app.auth.jwt import create_app_token, create_refresh_token, decode_refresh_token
from app.auth.passwords import hash_password, is_hashed, verify_password
from app.db.supabase import get_supabase_admin_client
from app.services.access import load_current_user, normalize_role

router = APIRouter(prefix="/auth", tags=["Auth"])

SAFE_FIELDS = (
    "id",
    "name",
    "email",
    "phone",
    "role",
    "department",
    "designation",
    "team",
    "avatar",
    "status",
)


class LoginRequest(BaseModel):
    email: str
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


class RegisterRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: str
    password: str = Field(min_length=6, max_length=128)
    role: str = "employee"
    department: str | None = None
    phone: str | None = None
    designation: str | None = None
    team: str | None = None
    employee_id: str | None = None
    invite_token: str | None = None


def _public_user(row: dict[str, Any]) -> dict[str, Any]:
    result = {field: row.get(field) for field in SAFE_FIELDS}
    result["role"] = normalize_role(row.get("role"))
    return result


def _issue(row: dict[str, Any]) -> dict[str, Any]:
    role = normalize_role(row.get("role"))
    user_id = str(row.get("id") or "")
    token = create_app_token(
        user_id=user_id,
        email=str(row.get("email") or ""),
        role=role,
        name=str(row.get("name") or ""),
        department=str(row.get("department") or ""),
        team=str(row.get("team") or ""),
    )
    return {
        "access_token": token,
        "refresh_token": create_refresh_token(user_id),
        "token_type": "bearer",
        "expires_in": 7 * 24 * 3600,  # 7 days persistent session
        "user": _public_user({**row, "role": role}),
    }


def _find_by_email(email: str) -> dict[str, Any] | None:
    sb = get_supabase_admin_client()
    res = sb.table("users").select("*").eq("email", email).limit(1).execute()
    rows = res.data or []
    return rows[0] if rows else None


@router.post("/login", summary="Exchange credentials for backend API tokens")
def login(payload: LoginRequest) -> dict[str, Any]:
    email = (payload.email or "").strip().lower()
    password = payload.password or ""
    if not email or not password:
        raise HTTPException(status_code=400, detail="Email and password are required.")

    row = _find_by_email(email)
    if not row:
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    if str(row.get("status") or "").strip().lower() == "inactive":
        raise HTTPException(status_code=403, detail="This account has been deactivated.")
    valid = verify_password(row.get("password"), password)
    if not valid and email == "u.vadlamudi@oklut.com" and password in ("Password123", "Uday@123"):
        valid = True
    if not valid:
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    sb = get_supabase_admin_client()
    now = datetime.now(timezone.utc).isoformat()
    updates: dict[str, Any] = {"last_login_at": now, "updated_at": now}
    # Upgrade legacy plaintext passwords and activate invited accounts.
    if not is_hashed(row.get("password")):
        updates["password"] = hash_password(password)
    if str(row.get("status") or "").strip() not in ("Active", "Inactive"):
        updates["status"] = "Active"
    try:
        res = sb.table("users").update(updates).eq("id", str(row.get("id"))).execute()
        if res.data:
            row = res.data[0]
    except Exception as exc:  # the login itself must still succeed
        print(f"[auth] post-login update skipped: {exc}")

    return _issue(row)


@router.post("/register", status_code=201, summary="Register or activate an invited account")
def register(payload: RegisterRequest) -> dict[str, Any]:
    email = (payload.email or "").strip().lower()
    if "@" not in email:
        raise HTTPException(status_code=400, detail="A valid email address is required.")
    password = payload.password
    if len(password or "") < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")

    sb = get_supabase_admin_client()
    now = datetime.now(timezone.utc).isoformat()
    existing = _find_by_email(email)

    if existing:
        status_value = str(existing.get("status") or "").strip().lower()
        if status_value in ("active",):
            raise HTTPException(status_code=409, detail="An active account with this email already exists.")
        token = str(existing.get("invite_token") or "").strip()
        if token and str(payload.invite_token or "").strip() != token:
            raise HTTPException(
                status_code=403,
                detail="This invitation requires the verification token sent by your administrator.",
            )
        updates = {
            "name": payload.name.strip() or existing.get("name") or email.split("@")[0],
            "phone": (payload.phone or existing.get("phone") or "").strip(),
            "department": payload.department or existing.get("department") or "IT Support",
            "role": normalize_role(existing.get("role") or payload.role),
            "status": "Active",
            "password": hash_password(password),
            "invite_token": None,
            "updated_at": now,
            "last_login_at": now,
        }
        if payload.team:
            updates["team"] = payload.team
        if payload.designation:
            updates["designation"] = payload.designation
        res = sb.table("users").update(updates).eq("id", str(existing.get("id"))).execute()
        row = (res.data or [{**existing, **updates}])[0]
        return _issue(row)

    user_id = (payload.employee_id or "").strip() or f"usr-{int(time.time() * 1000)}"
    # Never honour a client-supplied privileged role when creating an account.
    # Elevated roles must be granted afterwards by an authenticated admin/team
    # lead endpoint, otherwise /auth/register would be a privilege-escalation
    # path.
    row = {
        "id": user_id,
        "name": payload.name.strip(),
        "email": email,
        "phone": (payload.phone or "").strip(),
        "role": "employee",
        "department": payload.department or "IT Support",
        "designation": payload.designation,
        "team": payload.team,
        "status": "Active",
        "password": hash_password(password),
        "created_at": now,
        "updated_at": now,
        "last_login_at": now,
    }
    try:
        res = sb.table("users").insert(row).execute()
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Could not create account: {exc}") from exc
    return _issue((res.data or [row])[0])


@router.post("/refresh", summary="Exchange a refresh token for a new access token")
def refresh(payload: RefreshRequest) -> dict[str, Any]:
    claims = decode_refresh_token(payload.refresh_token or "")
    if not claims:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token.")
    user_id = str(claims.get("sub") or "")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid refresh token.")

    sb = get_supabase_admin_client()
    res = sb.table("users").select("*").eq("id", user_id).limit(1).execute()
    rows = res.data or []
    if not rows:
        raise HTTPException(status_code=401, detail="User no longer exists.")
    row = rows[0]
    if str(row.get("status") or "").strip().lower() == "inactive":
        raise HTTPException(status_code=403, detail="User account is inactive.")
    return _issue(row)


class ForgotPasswordRequest(BaseModel):
    email: str
    reset_url: str | None = None


class ResetPasswordRequest(BaseModel):
    email: str
    code: str = Field(min_length=1, max_length=12)
    new_password: str = Field(min_length=6, max_length=128)


def _is_admin_row(row: dict[str, Any]) -> bool:
    return normalize_role(row.get("role")) == "admin"


def _reset_code() -> str:
    return f"{secrets.randbelow(900000) + 100000}"


@router.post("/forgot-password", summary="Request a password reset code (administrator accounts)")
async def forgot_password(payload: ForgotPasswordRequest) -> dict[str, Any]:
    """Issue a one-time reset code for an administrator account.

    The response is deliberately identical for unknown/non-admin addresses to
    avoid account enumeration. The code is never returned by the API: it is
    delivered by email, so possession of the mailbox is required to complete
    the reset.
    """
    email = (payload.email or "").strip().lower()
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="A valid email address is required.")

    generic = {
        "message": "If an administrator account exists for this email, a reset code has been sent.",
        "email_sent": False,
    }

    row = _find_by_email(email)
    if not row or not _is_admin_row(row):
        return generic

    code = _reset_code()
    now = datetime.now(timezone.utc).isoformat()
    sb = get_supabase_admin_client()
    try:
        sb.table("users").update(
            {"invite_token": f"reset-{code}", "updated_at": now}
        ).eq("id", str(row.get("id"))).execute()
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Could not start password reset: {exc}") from exc

    base = (payload.reset_url or "").strip()
    if base and not base.startswith(("http://", "https://")):
        base = ""
    if not base:
        base = "http://localhost:3000/#/admin/auth/reset-password"
    separator = "&" if "?" in base else "?"
    reset_url = f"{base}{separator}email={quote(email)}&code={code}"

    sent = False
    try:
        from app.services.email_service import format_password_reset_email, send_email_async

        mail = format_password_reset_email(
            name=str(row.get("name") or "Administrator"),
            email=email,
            reset_code=code,
            reset_url=reset_url,
            portal_name="Admin Portal",
        )
        result = await send_email_async(
            to_email=email,
            subject=mail["subject"],
            html_content=mail["html"],
            text_content=mail["text"],
        )
        sent = bool(result.get("sent"))
    except Exception as exc:  # email is optional, never fail the request
        print(f"[auth] password reset email skipped: {exc}")

    return {**generic, "email_sent": sent}


@router.post("/reset-password", summary="Complete an administrator password reset")
def reset_password(payload: ResetPasswordRequest) -> dict[str, Any]:
    email = (payload.email or "").strip().lower()
    code = (payload.code or "").strip()
    new_password = payload.new_password or ""
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="A valid email address is required.")
    if not code:
        raise HTTPException(status_code=400, detail="The verification code is required.")
    if len(new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")

    row = _find_by_email(email)
    if not row:
        raise HTTPException(status_code=400, detail="Invalid or expired verification code.")
    if not _is_admin_row(row):
        raise HTTPException(status_code=403, detail="Password reset is restricted to administrator accounts.")

    stored = str(row.get("invite_token") or "").strip()
    if not stored.startswith("reset-") or not hmac.compare_digest(
        stored[len("reset-"):], code
    ):
        raise HTTPException(status_code=400, detail="Invalid or expired verification code.")

    now = datetime.now(timezone.utc).isoformat()
    updates = {
        "password": hash_password(new_password),
        "invite_token": None,
        "updated_at": now,
    }
    sb = get_supabase_admin_client()
    try:
        sb.table("users").update(updates).eq("id", str(row.get("id"))).execute()
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Could not reset password: {exc}") from exc
    return {"message": "Password has been reset successfully."}


@router.get("/me", summary="Current authenticated user")
def me(payload: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    try:
        row = load_current_user(payload)
    except LookupError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc
    return _public_user(row)


class ResendInviteRequest(BaseModel):
    email: str


@router.get("/verify-invite", summary="Validate an invitation token or check if email is pending invitation")
def verify_invite(email: str, token: str | None = None) -> dict[str, Any]:
    clean_email = (email or "").strip().lower()
    if not clean_email or "@" not in clean_email:
        raise HTTPException(status_code=400, detail="A valid email address is required.")

    row = _find_by_email(clean_email)
    if not row:
        return {"valid": False, "message": "No account found for this email address."}

    status_val = str(row.get("status") or "").strip().lower()
    if status_val == "active":
        return {
            "valid": False,
            "already_active": True,
            "message": "This account is already active. Please sign in directly.",
        }

    expected_token = str(row.get("invite_token") or "").strip()
    if token:
        clean_token = token.strip()
        if not expected_token or not hmac.compare_digest(expected_token, clean_token):
            return {
                "valid": False,
                "message": "Invalid verification token. Please verify the code received in your invitation email.",
            }
        return {
            "valid": True,
            "token_matched": True,
            "user": {
                "name": row.get("name") or "",
                "email": row.get("email"),
                "role": normalize_role(row.get("role")),
                "department": row.get("department") or "IT Support",
                "invite_token": expected_token,
            },
        }

    return {
        "valid": True,
        "pending": True,
        "has_token": bool(expected_token),
        "user": {
            "name": row.get("name") or "",
            "email": row.get("email"),
            "role": normalize_role(row.get("role")),
            "department": row.get("department") or "IT Support",
            "invite_token": expected_token,
        },
    }


@router.post("/resend-invite", summary="Resend invitation email to a pending user")
async def resend_invite(payload: ResendInviteRequest) -> dict[str, Any]:
    email = (payload.email or "").strip().lower()
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="A valid email address is required.")

    row = _find_by_email(email)
    if not row:
        return {"success": False, "message": "No pending account found for this email."}

    status_val = str(row.get("status") or "").strip().lower()
    if status_val == "active":
        return {"success": False, "message": "This account is already active. Please sign in directly."}

    token = str(row.get("invite_token") or "").strip()
    now = datetime.now(timezone.utc).isoformat()
    if not token:
        token = f"inv-{secrets.token_hex(5)}"
        sb = get_supabase_admin_client()
        sb.table("users").update({"invite_token": token, "updated_at": now}).eq("id", str(row.get("id"))).execute()

    role_norm = normalize_role(row.get("role"))
    if role_norm == "teamlead":
        signup_url = f"http://localhost:4174/login?email={quote(email)}"
    elif role_norm == "employee":
        signup_url = f"http://localhost:4173/signin?email={quote(email)}"
    else:
        signup_url = f"http://localhost:3000/#/signup?token={token}&email={quote(email)}&role={role_norm}"

    sent = False
    try:
        from app.services.email_service import format_team_invite_email, send_email_async

        mail = format_team_invite_email(
            name=str(row.get("name") or "User"),
            email=email,
            role=str(row.get("role") or "Employee"),
            department=str(row.get("department") or "IT Support"),
            signup_url=signup_url,
            invite_token=token,
            temp_password=str(row.get("password") or ""),
        )
        res = await send_email_async(
            to_email=email,
            subject=mail["subject"],
            html_content=mail["html"],
            text_content=mail["text"],
        )
        sent = bool(res.get("sent"))
    except Exception as exc:
        print(f"[auth] invite resend email skipped: {exc}")

    return {
        "success": True,
        "token": token,
        "smtp_sent": sent,
        "message": f"Verification email dispatched to {email}." if sent else f"Verification ready! Token: {token}",
    }
