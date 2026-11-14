"""Authenticated portal endpoints: directory, profile and notifications.

These replace the frontends' direct Supabase reads. Every response is scoped
by the caller's role and identity, and password hashes are never returned.
"""

from __future__ import annotations

import base64
import random
import time
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from app.auth.dependencies import get_current_user, require_role
from app.auth.passwords import hash_password
from app.db.supabase import get_supabase_admin_client
from app.services.user_store import find_user_by_email, save_user, delete_user_from_store
from app.services.access import (
    ROLE_ADMIN,
    ROLE_TEAMLEAD,
    ROLE_EMPLOYEE,
    _scopes_overlap,
    fetch_all_users_cached,
    invalidate_all_users_cache,
    invalidate_team_cache,
    invalidate_tickets_cache,
    invalidate_user_cache,
    is_admin,
    is_teamlead,
    load_current_user,
    normalize_role,
    notification_matches_scope,
    notification_visible,
    role_of,
    scoped_tickets,
    teamlead_managed_employees,
)

router = APIRouter(tags=["Portal"])

PUBLIC_USER_FIELDS = (
    "id, name, email, phone, role, department, designation, team, avatar, "
    "location, status, created_at"
)


# ── Shared dependencies ──────────────────────────────────────────────────────

def _current(payload: dict[str, Any] = Depends(get_current_user)) -> tuple[dict[str, Any], dict[str, Any]]:
    try:
        user = load_current_user(payload)
    except LookupError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc
    if str(user.get("status") or "").strip().lower() == "inactive":
        raise HTTPException(status_code=403, detail="User account is inactive")
    return payload, user


def _safe_user(row: dict[str, Any]) -> dict[str, Any]:
    base = {k: row.get(k) for k in PUBLIC_USER_FIELDS.split(", ")} | {
        "role": normalize_role(row.get("role")),
    }
    base["employee_id"] = str(row.get("employee_id") or row.get("id") or "").strip()
    avatar_val = row.get("avatar") or row.get("avatarUrl") or row.get("avatar_url") or ""
    base["avatar"] = avatar_val
    base["avatarUrl"] = avatar_val
    return base


def _all_users() -> list[dict[str, Any]]:
    return fetch_all_users_cached()


def _visible_user(
    payload: dict[str, Any],
    user: dict[str, Any],
    row: dict[str, Any],
    managed_ids: set[str] | None = None,
) -> bool:
    """Whether ``row`` may appear in the caller's directory listing."""
    if is_admin(payload):
        return True
    if str(row.get("id") or "") == str(user.get("id") or ""):
        return True
    if is_teamlead(payload):
        # A Team Lead must be able to route a ticket to *any* Team Lead and to
        # request assistance from an administrator, so both roles stay in the
        # directory. Employee visibility stays limited to the Lead's own team.
        if normalize_role(row.get("role")) in (ROLE_ADMIN, ROLE_TEAMLEAD):
            return True
        if managed_ids is None:
            managed_ids = {str(m.get("id")) for m in teamlead_managed_employees(user)}
        return str(row.get("id") or "") in managed_ids
    # Employees may see Team Leads and colleagues across departments (to route tickets
    # to the proper department lead and tag team members).
    if normalize_role(row.get("role")) in (ROLE_TEAMLEAD, ROLE_EMPLOYEE):
        return True
    return _scopes_overlap(user.get("department"), row.get("department"))


def _visible_rows(
    payload: dict[str, Any], user: dict[str, Any], rows: list[dict[str, Any]]
) -> list[dict[str, Any]]:
    """Filter a user list for the caller, resolving the team scope only once."""
    if is_admin(payload):
        return list(rows)
    managed_ids: set[str] | None = None
    if is_teamlead(payload):
        managed_ids = {str(m.get("id")) for m in teamlead_managed_employees(user)}
    return [
        row
        for row in rows
        if _visible_user(payload, user, row, managed_ids)
    ]


# ── Directory / profile ──────────────────────────────────────────────────────

@router.get("/users/directory", summary="Role-scoped user directory")
def user_directory(
    context: tuple[dict[str, Any], dict[str, Any]] = Depends(_current),
    role: str | None = Query(None, description="Filter by normalized role"),
) -> list[dict[str, Any]]:
    payload, user = context
    rows = _visible_rows(payload, user, _all_users())
    if role:
        wanted = normalize_role(role)
        rows = [r for r in rows if normalize_role(r.get("role")) == wanted]
    rows.sort(key=lambda r: (str(r.get("name") or "").lower(), str(r.get("email") or "")))
    return [_safe_user(r) for r in rows]


@router.get("/users/profile", summary="Current user's profile")
def get_profile(
    context: tuple[dict[str, Any], dict[str, Any]] = Depends(_current),
) -> dict[str, Any]:
    _, user = context
    return _safe_user(user)


@router.get("/team-leads/{team_lead_id}/employees", summary="Get employees strictly managed by a specific Team Lead")
def get_team_lead_employees(
    team_lead_id: str,
    context: tuple[dict[str, Any], dict[str, Any]] = Depends(_current),
) -> list[dict[str, Any]]:
    clean_tl_id = str(team_lead_id).strip()

    # 1. Fast path: check in-memory cached users first (0ms latency)
    all_users = fetch_all_users_cached()
    tl_user = next(
        (
            u for u in all_users
            if str(u.get("id") or "").strip().lower() == clean_tl_id.lower()
            or str(u.get("employee_id") or "").strip().lower() == clean_tl_id.lower()
            or str(u.get("email") or "").strip().lower() == clean_tl_id.lower()
            or str(u.get("name") or "").strip().lower() == clean_tl_id.lower()
        ),
        None,
    )

    if not tl_user:
        sb = get_supabase_admin_client()
        try:
            res = sb.table("users").select("*").or_(f"id.eq.{clean_tl_id},employee_id.eq.{clean_tl_id},email.eq.{clean_tl_id.lower()},name.eq.{clean_tl_id}").limit(1).execute()
            rows = res.data or []
        except Exception as exc:
            raise HTTPException(status_code=502, detail=f"Database error: {exc}") from exc

        if not rows:
            try:
                res = sb.table("users").select("*").eq("email", clean_tl_id.lower()).limit(1).execute()
                rows = res.data or []
            except Exception:
                pass

        if not rows:
            raise HTTPException(status_code=404, detail="Team lead not found")
        tl_user = rows[0]

    if normalize_role(tl_user.get("role")) != ROLE_TEAMLEAD:
        raise HTTPException(status_code=400, detail="Specified user is not a Team Lead")

    managed = teamlead_managed_employees(tl_user)
    managed.sort(key=lambda r: (str(r.get("name") or "").lower(), str(r.get("email") or "")))
    return [_safe_user(r) for r in managed]


class ProfileUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=120)
    phone: str | None = Field(default=None, max_length=40)
    department: str | None = Field(default=None, max_length=120)
    designation: str | None = Field(default=None, max_length=120)
    location: str | None = Field(default=None, max_length=120)
    avatar: str | None = None
    # ``avatar`` set to an empty string/null clears only the photo reference.
    password: str | None = Field(default=None, min_length=6, max_length=128)
    current_password: str | None = None


@router.patch("/users/profile", summary="Update the current user's profile")
def update_profile(
    body: ProfileUpdate,
    context: tuple[dict[str, Any], dict[str, Any]] = Depends(_current),
) -> dict[str, Any]:
    payload, user = context
    updates: dict[str, Any] = {}

    for field in ("name", "phone", "department", "designation", "location"):
        value = getattr(body, field)
        if value is not None:
            updates[field] = value.strip()

    avatar_url: str | None = None
    if body.avatar is not None:
        avatar = body.avatar.strip()
        if avatar and len(avatar) > 5_000_000:
            raise HTTPException(status_code=413, detail="Profile photo is too large (max ~5 MB)")
        if avatar and not avatar.startswith(("data:image/", "http://", "https://", "/")):
            raise HTTPException(status_code=400, detail="Invalid profile photo format")
        avatar_url = avatar or ""
        if avatar_url and avatar_url.startswith("data:image/"):
            try:
                header, encoded = avatar_url.split(",", 1)
                ext = "png"
                if "jpeg" in header or "jpg" in header:
                    ext = "jpg"
                elif "webp" in header:
                    ext = "webp"
                elif "gif" in header:
                    ext = "gif"
                image_data = base64.b64decode(encoded)
                clean_uid = str(user.get("id") or "user").replace("/", "_").replace(" ", "_")
                file_path = f"avatars/{clean_uid}.{ext}"
                sb_client = get_supabase_admin_client()
                sb_client.storage.from_("ticket-attachments").upload(
                    file_path,
                    image_data,
                    file_options={"content-type": f"image/{ext}", "upsert": "true"},
                )
                avatar_url = sb_client.storage.from_("ticket-attachments").get_public_url(file_path)
            except Exception as upload_exc:
                print(f"[portal] avatar upload to storage warning: {upload_exc}")
        updates["avatar"] = avatar_url

    if body.password:
        updates["password_hash"] = hash_password(body.password)

    if not updates:
        raise HTTPException(status_code=400, detail="No profile fields provided")

    # Only an admin may move their own account between departments; everyone
    # else keeps their existing department to preserve scope integrity.
    if "department" in updates and not is_admin(payload):
        updates.pop("department")

    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Save in persistent user store with avatar
    saved_user = save_user({**user, **updates})

    valid_user_cols = {
        "id", "employee_id", "name", "email", "role", "department",
        "designation", "team", "phone", "location", "status",
        "password_hash", "updated_at",
    }
    clean_user_updates = {k: v for k, v in updates.items() if k in valid_user_cols}
    if clean_user_updates:
        sb = get_supabase_admin_client()
        try:
            sb.table("users").update(clean_user_updates).eq("id", str(user.get("id"))).execute()
        except Exception as exc:
            try:
                sb.table("users").update(clean_user_updates).eq("email", str(user.get("email")).lower()).execute()
            except Exception:
                print(f"[portal] Supabase profile update notice: {exc}")

    invalidate_user_cache(str(user.get("id")), str(user.get("email")))
    invalidate_all_users_cache()
    return _safe_user(saved_user)


# ── Departments ──────────────────────────────────────────────────────────────

_DEPARTMENTS_CACHE: tuple[float, list[dict[str, Any]]] | None = None
_DEPARTMENTS_CACHE_TTL = 300.0  # 5 minutes

@router.get("/departments", summary="List configured departments")
def get_departments(
    context: tuple[dict[str, Any], dict[str, Any]] = Depends(_current),
) -> list[dict[str, Any]]:
    global _DEPARTMENTS_CACHE
    now = time.time()
    from app.services.user_store import is_department_deleted

    if _DEPARTMENTS_CACHE and (now - _DEPARTMENTS_CACHE[0]) < _DEPARTMENTS_CACHE_TTL:
        filtered = [d for d in _DEPARTMENTS_CACHE[1] if not is_department_deleted(d.get("name") or "")]
        return filtered

    sb = get_supabase_admin_client()
    try:
        res = sb.table("departments").select("id, name, code, display_aliases, description, is_active").eq("is_active", True).order("id").execute()
        rows = res.data or []
        if rows:
            valid_rows = [r for r in rows if not is_department_deleted(r.get("name") or "")]
            _DEPARTMENTS_CACHE = (now, valid_rows)
            return valid_rows
    except Exception as exc:
        print(f"[portal] departments table fallback: {exc}")
    fallback = [
        {"id": 1, "name": "IT Support", "code": "ITSUPPORT", "display_aliases": ["IT Support", "IT Support Team", "IT"]},
        {"id": 2, "name": "Finance", "code": "FINANCE", "display_aliases": ["Finance", "Finance & Payroll"]},
        {"id": 3, "name": "HR", "code": "HR", "display_aliases": ["HR", "HR Operations", "HR & Benefits"]},
        {"id": 4, "name": "QA Team", "code": "QATEAM", "display_aliases": ["QA Team", "QA", "Quality Assurance"]},
        {"id": 5, "name": "Development", "code": "DEV", "display_aliases": ["Development", "Dev", "Engineering"]},
        {"id": 6, "name": "Operations", "code": "OPS", "display_aliases": ["Operations", "Operations & Logistics"]},
        {"id": 8, "name": "Facilities", "code": "FACILITY", "display_aliases": ["Facilities", "Facilities & Building"]},
        {"id": 9, "name": "General Administration", "code": "GENADMIN", "display_aliases": ["General Administration", "Administration"]},
        {"id": 10, "name": "Other", "code": "OTHER", "display_aliases": ["Other", "Others"]},
    ]
    valid_fallback = [d for d in fallback if not is_department_deleted(d.get("name") or "")]
    _DEPARTMENTS_CACHE = (now, valid_fallback)
    return valid_fallback


@router.delete("/departments/{dept_name}", summary="Permanently delete a department")
def delete_department_endpoint(
    dept_name: str,
    payload: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    from app.services.user_store import delete_department_permanently
    global _DEPARTMENTS_CACHE
    _DEPARTMENTS_CACHE = None
    delete_department_permanently(dept_name)
    try:
        sb = get_supabase_admin_client()
        sb.table("departments").update({"is_active": False}).ilike("name", dept_name).execute()
        sb.table("departments").delete().ilike("name", dept_name).execute()
    except Exception as exc:
        print(f"[portal] delete department error in db: {exc}")
    invalidate_all_users_cache()
    return {"success": True, "department": dept_name}


# ── Notifications ────────────────────────────────────────────────────────────

_NOTIF_CACHE: tuple[float, list[dict[str, Any]]] | None = None
_NOTIF_CACHE_TTL = 15.0  # seconds


def invalidate_notifications_cache() -> None:
    global _NOTIF_CACHE
    _NOTIF_CACHE = None


def _notification_rows() -> list[dict[str, Any]]:
    global _NOTIF_CACHE
    now = time.time()
    if _NOTIF_CACHE and (now - _NOTIF_CACHE[0]) < _NOTIF_CACHE_TTL:
        return _NOTIF_CACHE[1]
    try:
        res = (
            get_supabase_admin_client()
            .table("portal_notifications")
            .select("*")
            .order("created_at", desc=True)
            .limit(200)
            .execute()
        )
        raw_rows = res.data or []
        rows = []
        for r in raw_rows:
            item = dict(r)
            # Ensure backwards compatibility for fields expected by frontend
            item["timestamp"] = item.get("created_at") or datetime.now(timezone.utc).isoformat()
            item["for_role"] = item.get("user_id") or "all"
            rows.append(item)
        _NOTIF_CACHE = (now, rows)
        return rows
    except Exception as exc:
        print(f"[notifications] unavailable: {exc}")
        return []


def _visible_notifications(payload: dict[str, Any], user: dict[str, Any]) -> list[dict[str, Any]]:
    rows = _notification_rows()
    if is_admin(payload):
        return [n for n in rows if notification_visible(payload, user, n)]
    sc = scoped_tickets(payload, user)
    visible_tids = {str(t.get("id")) for t in sc if t.get("id")}
    visible_tids |= {str(t.get("ticket_number")) for t in sc if t.get("ticket_number")}
    return [
        n
        for n in rows
        if notification_matches_scope(payload, user, n, visible_ticket_ids=visible_tids)
    ]


@router.get("/notifications", summary="List notifications addressed to the current user")
def list_notifications(
    context: tuple[dict[str, Any], dict[str, Any]] = Depends(_current),
    limit: int = Query(50, ge=1, le=200),
) -> list[dict[str, Any]]:
    payload, user = context
    rows = _visible_notifications(payload, user)
    return rows[:limit]


@router.get("/notifications/unread-count", summary="Unread notification count for the current user")
def unread_count(
    context: tuple[dict[str, Any], dict[str, Any]] = Depends(_current),
) -> dict[str, int]:
    payload, user = context
    rows = _visible_notifications(payload, user)
    return {"count": sum(1 for n in rows if not n.get("read"))}


@router.post("/notifications/{notification_id}/read", summary="Mark one notification as read")
def mark_read(
    notification_id: str,
    context: tuple[dict[str, Any], dict[str, Any]] = Depends(_current),
) -> dict[str, Any]:
    payload, user = context
    visible = {str(n.get("id")): n for n in _visible_notifications(payload, user)}
    if notification_id not in visible:
        raise HTTPException(status_code=404, detail="Notification not found")
    sb = get_supabase_admin_client()
    res = sb.table("portal_notifications").update({"read": True}).eq("id", notification_id).execute()
    invalidate_notifications_cache()
    return {"success": True, "notification": (res.data or [visible[notification_id]])[0]}


@router.post("/notifications/read-all", summary="Mark all notifications visible to the current user as read")
def mark_all_read(
    context: tuple[dict[str, Any], dict[str, Any]] = Depends(_current),
) -> dict[str, Any]:
    payload, user = context
    ids = [str(n.get("id")) for n in _visible_notifications(payload, user) if not n.get("read")]
    if not ids:
        return {"success": True, "updated": 0}
    sb = get_supabase_admin_client()
    try:
        sb.table("portal_notifications").update({"read": True}).in_("id", ids).execute()
    except Exception as exc:
        print(f"[notifications] batch mark read fallback: {exc}")
        for notif_id in ids:
            try:
                sb.table("portal_notifications").update({"read": True}).eq("id", notif_id).execute()
            except Exception:
                pass
    invalidate_notifications_cache()
    return {"success": True, "updated": len(ids)}


class NotificationCreate(BaseModel):
    title: str = Field(min_length=1, max_length=160)
    message: str = ""
    type: str = "info"
    for_role: str = "all"
    ticket_id: str | None = None


@router.post("/notifications", status_code=status.HTTP_201_CREATED, summary="Create a notification")
def create_notification(
    body: NotificationCreate,
    context: tuple[dict[str, Any], dict[str, Any]] = Depends(_current),
) -> dict[str, Any]:
    payload, user = context
    role = role_of(payload)
    target = (body.for_role or "all").strip()
    target_lower = target.lower()

    if role == "employee" and target_lower not in ("employee", f"user:{user.get('id')}", "all"):
        raise HTTPException(status_code=403, detail="Employees cannot target other roles")
    if role == "teamlead" and target_lower == "admin":
        raise HTTPException(status_code=403, detail="Team leads cannot broadcast to admins")

    now_str = datetime.now(timezone.utc).isoformat()
    clean_target = target
    user_email: str | None = None
    if clean_target.startswith("user:"):
        val = clean_target.split(":", 1)[1].strip()
        if "@" in val:
            user_email = val

    db_row = {
        "id": f"notif-{int(time.time() * 1000)}-{random.randint(100, 999)}",
        "ticket_id": body.ticket_id,
        "title": body.title,
        "message": body.message,
        "type": body.type or "info",
        "user_id": clean_target,
        "user_email": user_email,
        "read": False,
        "created_at": now_str,
    }
    sb = get_supabase_admin_client()
    try:
        res = sb.table("portal_notifications").insert(db_row).execute()
        invalidate_notifications_cache()
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Could not create notification: {exc}") from exc
    ret = (res.data or [db_row])[0]
    ret["timestamp"] = ret.get("created_at")
    ret["for_role"] = ret.get("user_id") or "all"
    return ret


# ── Admin user management ────────────────────────────────────────────────────

@router.get(
    "/admin/users",
    summary="List all users (admin only)",
    dependencies=[Depends(require_role("admin"))],
)
def admin_list_users() -> list[dict[str, Any]]:
    rows = _all_users()
    rows.sort(key=lambda r: str(r.get("created_at") or ""), reverse=True)
    return [_safe_user(r) for r in rows]


class UserCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: str
    phone: str | None = None
    role: str = "employee"
    department: str | None = None
    designation: str | None = None
    team: str | None = None
    team_lead: str | None = None
    team_lead_id: str | None = None
    status: str = "Active"
    password: str | None = Field(default=None, min_length=6, max_length=128)
    employee_id: str | None = None
    send_email_invite: bool = False
    invite_token: str | None = None


@router.post(
    "/admin/users",
    status_code=status.HTTP_201_CREATED,
    summary="Create a user (admin only)",
    dependencies=[Depends(require_role("admin"))],
)
def admin_create_user(body: UserCreate) -> dict[str, Any]:
    email = body.email.strip().lower()
    if "@" not in email:
        raise HTTPException(status_code=400, detail="A valid email is required")

    existing = find_user_by_email(email)
    if existing:
        raise HTTPException(status_code=409, detail="A user with this email already exists")

    user_id = (body.employee_id or "").strip() or f"usr-{int(time.time() * 1000)}"
    now = datetime.now(timezone.utc).isoformat()
    norm_role = normalize_role(body.role)

    # Resolve team lead and team relationships
    resolved_team = body.team
    resolved_tl_id = body.team_lead_id
    resolved_tl_name = body.team_lead

    if norm_role == "employee" and (body.team_lead or body.team_lead_id or body.team):
        all_u = fetch_all_users_cached()
        for cand in (body.team_lead_id, body.team_lead, body.team):
            if not cand:
                continue
            cand_str = str(cand).strip()
            # Strip '(OKL...)' if formatted as 'Name (ID)'
            clean_cand = cand_str.split('(')[-1].replace(')', '').strip() if '(' in cand_str else cand_str
            for u in all_u:
                if normalize_role(u.get("role")) == ROLE_TEAMLEAD:
                    if (
                        str(u.get("id") or "").lower() == clean_cand.lower()
                        or str(u.get("employee_id") or "").lower() == clean_cand.lower()
                        or str(u.get("name") or "").lower() == clean_cand.lower()
                        or (clean_cand.lower() in str(u.get("name") or "").lower())
                    ):
                        resolved_tl_id = str(u.get("id") or u.get("employee_id"))
                        resolved_tl_name = str(u.get("name"))
                        resolved_team = u.get("team") or resolved_team
                        break
            if resolved_tl_id:
                break

    row = {
        "id": user_id,
        "employee_id": (body.employee_id or "").strip() or user_id,
        "name": body.name.strip(),
        "email": email,
        "phone": (body.phone or "").strip(),
        "role": norm_role,
        "department": body.department or "IT Support",
        "designation": body.designation,
        "team": resolved_team,
        "team_lead": resolved_tl_name,
        "team_lead_id": resolved_tl_id,
        "status": body.status or "Active",
        "password": hash_password(body.password or "Password123"),
        "password_hash": hash_password(body.password or "Password123"),
        "invite_token": body.invite_token,
        "invite_sent_at": now if body.send_email_invite else None,
        "created_at": now,
        "updated_at": now,
    }
    valid_cols = {
        "id", "employee_id", "name", "email", "phone", "role",
        "department", "designation", "team", "team_lead", "team_lead_id", "location", "status",
        "password_hash", "auth_user_id", "created_at", "updated_at",
    }
    clean_row = {k: v for k, v in row.items() if k in valid_cols and v is not None}
    sb = get_supabase_admin_client()
    try:
        sb.table("users").insert(clean_row).execute()
    except Exception as exc:
        try:
            sb.table("users").upsert(clean_row).execute()
        except Exception:
            print(f"[portal] admin_create_user Supabase insert notice: {exc}")

    saved = save_user(row)
    invalidate_all_users_cache()
    if resolved_tl_id:
        invalidate_team_cache(resolved_tl_id)
    return _safe_user(saved)


class UserAdminUpdate(BaseModel):
    name: str | None = None
    email: str | None = None
    phone: str | None = None
    role: str | None = None
    department: str | None = None
    designation: str | None = None
    team: str | None = None
    status: str | None = None
    password: str | None = Field(default=None, min_length=6, max_length=128)
    invite_token: str | None = None


@router.patch(
    "/admin/users/{user_id}",
    summary="Update a user (admin only)",
    dependencies=[Depends(require_role("admin"))],
)
def admin_update_user(user_id: str, body: UserAdminUpdate) -> dict[str, Any]:
    updates: dict[str, Any] = {}
    data = body.model_dump()
    for field in ("name", "phone", "department", "designation", "team", "status"):
        value = data.get(field)
        if value is not None:
            updates[field] = value.strip() if isinstance(value, str) else value
    if data.get("email"):
        updates["email"] = data["email"].strip().lower()
    if data.get("role"):
        updates["role"] = normalize_role(data["role"])
    if data.get("password"):
        updates["password_hash"] = hash_password(data["password"])
    if data.get("invite_token") is not None:
        updates["invite_token"] = data["invite_token"].strip() or None
        updates["invite_sent_at"] = datetime.now(timezone.utc).isoformat()
    if not updates:
        raise HTTPException(status_code=400, detail="No fields provided")
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()

    valid_cols = {
        "id", "employee_id", "name", "email", "role", "department",
        "designation", "team", "phone", "location", "status",
        "password_hash", "auth_user_id", "created_at", "updated_at",
    }
    clean_user_updates = {k: v for k, v in updates.items() if k in valid_cols}

    sb = get_supabase_admin_client()
    try:
        res = sb.table("users").update(clean_user_updates).eq("id", user_id).execute()
        if not (res.data or []):
            res = sb.table("users").update(clean_user_updates).eq("employee_id", user_id).execute()
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Could not update user: {exc}") from exc
    if not (res.data or []):
        raise HTTPException(status_code=404, detail="User not found")
    return _safe_user((res.data or [])[0])


def _permanently_delete_user(user_id: str, actor_id: str = "") -> None:
    """Permanently delete a user from authentication, database records, and safe-handle existing tickets and audit history."""
    clean_id = str(user_id).strip()
    sb = get_supabase_admin_client()

    # 1. Fetch user to obtain email and details before deletion
    user_res = sb.table("users").select("*").eq("id", clean_id).limit(1).execute()
    user_row = (user_res.data or [])[0] if user_res.data else None
    if not user_row:
        try:
            res_alt = sb.table("users").select("*").eq("email", clean_id).limit(1).execute()
            user_row = (res_alt.data or [])[0] if res_alt.data else None
        except Exception:
            pass

    user_email = (user_row.get("email") if isinstance(user_row, dict) else "").strip().lower()
    canonical_id = str((user_row.get("id") if isinstance(user_row, dict) else None) or clean_id).strip()

    # 2. Safely handle ticket_comments to satisfy FK constraints without losing audit history/messages
    fallback_uid = actor_id if (actor_id and actor_id != canonical_id) else "usr-admin-1791538577749"
    try:
        sb.table("ticket_comments").update({
            "author_user_id": fallback_uid,
        }).eq("author_user_id", canonical_id).execute()
    except Exception as exc:
        print(f"[portal] ticket_comments FK update notice: {exc}")

    # 3. Safely handle tickets where user was assigned agent
    try:
        sb.table("tickets").update({
            "assigned_agent": "Unassigned",
            "assigned_agent_id": None,
            "assigned_to_type": "unassigned",
        }).eq("assigned_agent_id", canonical_id).execute()
    except Exception as exc:
        print(f"[portal] tickets assigned_agent_id update notice: {exc}")

    # 4. Safely handle tickets where user was employee/requester
    try:
        sb.table("tickets").update({
            "employee_id": None,
        }).eq("employee_id", canonical_id).execute()
    except Exception as exc:
        print(f"[portal] tickets employee_id update notice: {exc}")

    # 5. Remove user from ticket_tagged_members
    try:
        sb.table("ticket_tagged_members").delete().eq("user_id", canonical_id).execute()
        sb.table("ticket_tagged_members").delete().eq("member_uid", canonical_id).execute()
    except Exception:
        pass

    # 6. Delete user from auth system if applicable
    if user_row:
        auth_uid = user_row.get("auth_id") or user_row.get("id")
        try:
            if hasattr(sb, "auth") and hasattr(sb.auth, "admin") and hasattr(sb.auth.admin, "delete_user"):
                sb.auth.admin.delete_user(auth_uid)
        except Exception as auth_exc:
            print(f"[portal] auth user deletion notice: {auth_exc}")

    # 7. Delete user from users table (permanent delete by id, employee_id, and email)
    try:
        sb.table("users").delete().eq("id", canonical_id).execute()
    except Exception as exc:
        print(f"[portal] delete user by id note: {exc}")
    try:
        sb.table("users").delete().eq("employee_id", canonical_id).execute()
    except Exception:
        pass
    if user_email:
        try:
            sb.table("users").delete().eq("email", user_email).execute()
        except Exception:
            pass

    # 8. Invalidate all caches so user disappears immediately from every dashboard
    delete_user_from_store(canonical_id)
    if user_email:
        delete_user_from_store(user_email)
    invalidate_user_cache(canonical_id, user_email)
    invalidate_all_users_cache()
    invalidate_team_cache()
    invalidate_tickets_cache()


@router.delete(
    "/admin/users/{user_id}",
    summary="Delete a user (admin only)",
    dependencies=[Depends(require_role("admin"))],
)
def admin_delete_user(
    user_id: str,
    payload: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    actor_id = str(payload.get("sub") or "")
    if actor_id == user_id:
        raise HTTPException(status_code=400, detail="You cannot delete your own account")
    try:
        _permanently_delete_user(user_id, actor_id=actor_id)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Could not delete user: {exc}") from exc
    return {"success": True, "id": user_id}


# ��"? Team-lead scoped user management ��"?��"?��"?��"?��"?��"?��"?��"?��"?��"?��"?��"?��"?��"?��"?��"?��"?��"?��"?��"?��"?��"?��"?��"?��"?��"?��"?��"?��"?��"?��"?��"?��"?��"?��"?


def _team_lead_can_manage(context_user: dict[str, Any], target: dict[str, Any]) -> bool:
    if normalize_role(target.get("role")) in ("admin", "teamlead"):
        return False
    managed_ids = {str(m.get("id")) for m in teamlead_managed_employees(context_user)}
    return str(target.get("id") or "") in managed_ids


@router.get("/team/users", summary="List users manageable by the current team lead")
def team_list_users(context: tuple[dict[str, Any], dict[str, Any]] = Depends(_current)) -> list[dict[str, Any]]:
    payload, user = context
    if not is_teamlead(payload):
        raise HTTPException(status_code=403, detail="Team lead access required")
    rows = teamlead_managed_employees(user)
    rows.sort(key=lambda r: (str(r.get("name") or "").lower(), str(r.get("email") or "")))
    return [_safe_user(r) for r in rows]


@router.post("/team/users", status_code=status.HTTP_201_CREATED, summary="Create an employee under team lead scope")
def team_create_user(body: UserCreate, context: tuple[dict[str, Any], dict[str, Any]] = Depends(_current)) -> dict[str, Any]:
    payload, user = context
    if not is_teamlead(payload):
        raise HTTPException(status_code=403, detail="Team lead access required")
    email = (body.email or "").strip().lower()
    if "@" not in email:
        raise HTTPException(status_code=400, detail="A valid email is required")
    sb = get_supabase_admin_client()
    existing = sb.table("users").select("id").eq("email", email).limit(1).execute()
    if existing.data:
        raise HTTPException(status_code=409, detail="A user with this email already exists")

    user_id = (body.employee_id or "").strip() or f"usr-{int(time.time() * 1000)}"
    now = datetime.now(timezone.utc).isoformat()
    tl_id = str(user.get("id") or "").strip()
    tl_team = str(user.get("team") or "").strip()
    assigned_team = tl_team or tl_id or (body.team or "").strip()

    # Force role to employee and bind to this team lead's team
    row = {
        "id": user_id,
        "employee_id": (body.employee_id or "").strip() or user_id,
        "name": (body.name or "").strip(),
        "email": email,
        "phone": (body.phone or "").strip(),
        "role": "employee",
        "department": body.department or user.get("department") or "IT Support",
        "designation": body.designation,
        "team": assigned_team,
        "team_lead_id": tl_id,
        "status": body.status or "Active",
        "password": hash_password(body.password or "Password123"),
        "password_hash": hash_password(body.password or "Password123"),
        "invite_token": body.invite_token,
        "invite_sent_at": now if body.send_email_invite else None,
        "created_at": now,
        "updated_at": now,
    }
    valid_cols = {
        "id", "employee_id", "name", "email", "phone", "role",
        "department", "designation", "team", "team_lead_id", "location", "status",
        "password_hash", "auth_user_id", "created_at", "updated_at",
    }
    clean_row = {k: v for k, v in row.items() if k in valid_cols and v is not None}
    try:
        sb.table("users").insert(clean_row).execute()
    except Exception as exc:
        try:
            sb.table("users").upsert(clean_row).execute()
        except Exception:
            print(f"[portal] Supabase user creation notice: {exc}")
    saved = save_user(row)
    invalidate_all_users_cache()
    invalidate_team_cache(tl_id)
    return _safe_user(saved)


@router.patch("/team/users/{user_id}", summary="Update an employee under team lead scope")
def team_update_user(user_id: str, body: UserAdminUpdate, context: tuple[dict[str, Any], dict[str, Any]] = Depends(_current)) -> dict[str, Any]:
    payload, user = context
    if not is_teamlead(payload):
        raise HTTPException(status_code=403, detail="Team lead access required")
    sb = get_supabase_admin_client()
    res = sb.table("users").select("*").eq("id", user_id).limit(1).execute()
    target = (res.data or [])[0] if (res.data or []) else None
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if not _team_lead_can_manage(user, target):
        raise HTTPException(status_code=403, detail="Not allowed to manage this user")
    updates: dict[str, Any] = {}
    data = body.model_dump()
    for field in ("name", "phone", "designation", "team", "status"):
        value = data.get(field)
        if value is not None:
            updates[field] = value.strip() if isinstance(value, str) else value
    if data.get("department") is not None:
        updates["department"] = data["department"].strip() if isinstance(data["department"], str) else data["department"]
    if data.get("email"):
        updates["email"] = data["email"].strip().lower()
    if data.get("role") is not None:
        updates["role"] = "employee"
    if data.get("password"):
        updates["password"] = hash_password(data["password"])
    if not updates:
        raise HTTPException(status_code=400, detail="No fields provided")
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    try:
        res2 = sb.table("users").update(updates).eq("id", user_id).execute()
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Could not update user: {exc}") from exc
    if not (res2.data or []):
        raise HTTPException(status_code=404, detail="User not found")
    invalidate_team_cache(str(user.get("id") or ""))
    invalidate_user_cache(user_id)
    return _safe_user((res2.data or [])[0])


@router.delete("/team/users/{user_id}", summary="Delete an employee under team lead scope")
def team_delete_user(user_id: str, context: tuple[dict[str, Any], dict[str, Any]] = Depends(_current)) -> dict[str, Any]:
    payload, user = context
    if not is_teamlead(payload):
        raise HTTPException(status_code=403, detail="Team lead access required")
    if str(payload.get("sub") or "") == user_id or str(user.get("id") or "") == user_id:
        raise HTTPException(status_code=400, detail="You cannot delete your own account")
    sb = get_supabase_admin_client()
    res = sb.table("users").select("*").eq("id", user_id).limit(1).execute()
    target = (res.data or [])[0] if (res.data or []) else None
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if not _team_lead_can_manage(user, target):
        raise HTTPException(status_code=403, detail="Not allowed to delete this user")
    try:
        _permanently_delete_user(user_id, actor_id=str(user.get("id") or payload.get("sub") or ""))
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Could not delete user: {exc}") from exc
    return {"success": True, "id": user_id}


@router.get("/team-leads", summary="List all team leads across departments")
def list_all_team_leads() -> list[dict[str, Any]]:
    all_users = _all_users()
    leads = [
        _safe_user(u)
        for u in all_users
        if normalize_role(u.get("role")) == "teamlead"
        and str(u.get("status") or "").strip().lower() not in ("deleted", "inactive")
    ]
    return leads


@router.get("/team-leads/{lead_id}/employees", summary="List employees assigned to a specific team lead")
def list_lead_employees(lead_id: str) -> list[dict[str, Any]]:
    all_users = _all_users()
    clean_id = (lead_id or "").strip().lower()
    tl_user = None
    for u in all_users:
        uid = str(u.get("id") or "").strip().lower()
        empid = str(u.get("employee_id") or "").strip().lower()
        email = str(u.get("email") or "").strip().lower()
        name = str(u.get("name") or "").strip().lower()
        if clean_id in (uid, empid, email, name):
            tl_user = u
            break
    if not tl_user:
        return []
    managed = teamlead_managed_employees(tl_user)
    return [_safe_user(m) for m in managed]

