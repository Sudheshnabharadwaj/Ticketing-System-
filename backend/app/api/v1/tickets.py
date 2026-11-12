"""Authenticated ticket API.

All endpoints require a valid backend token. Identity and scope are resolved
server-side from the token + the ``users`` table; the frontend never gets to
choose which tickets it can see or mutate.
"""

from __future__ import annotations

import random
import time
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from app.auth.dependencies import get_current_user
from app.db.supabase import get_supabase_admin_client
from app.services.access import (
    ROLE_ADMIN,
    ROLE_EMPLOYEE,
    ROLE_TEAMLEAD,
    _scopes_overlap,
    can_manage_ticket,
    can_view_internal_notes,
    can_view_ticket_chat,
    can_reply_ticket_chat,
    _same_person,
    fetch_all_users_cached,
    invalidate_tickets_cache,
    is_admin,
    is_teamlead,
    load_current_user,
    normalize_role,
    resolve_team_id,
    role_of,
    scoped_tickets,
    serialize_ticket,
    teamlead_managed_employees,
    ticket_stats,
    ticket_visible,
)

router = APIRouter(prefix="/tickets", tags=["Tickets"])


# ── Models ───────────────────────────────────────────────────────────────────

class TicketCreate(BaseModel):
    subject: str = Field(min_length=1, max_length=200)
    description: str = ""
    category: str = "General"
    sub_category: str | None = None
    priority: str = "Medium"
    department: str | None = None
    departments: list[str] | None = None
    employee: str | None = None
    employee_id: str | None = None
    employee_email: str | None = None
    assigned_agent: str | None = None
    assigned_agent_id: str | None = None
    assigned_to_type: str | None = None
    assigned_by: str | None = None
    status: str = "Open"
    sla_due_at: str | None = None
    attachments: list[str] | None = None
    team_lead_ids: list[str] | None = None
    team_leads: list[dict[str, Any]] | list[str] | None = None
    tagged_employee_ids: list[str] | None = None
    employees: list[dict[str, Any]] | list[str] | None = None


class TicketUpdate(BaseModel):
    subject: str | None = None
    description: str | None = None
    status: str | None = None
    priority: str | None = None
    category: str | None = None
    sub_category: str | None = None
    department: str | None = None
    departments: list[str] | None = None
    assigned_agent: str | None = None
    assigned_agent_id: str | None = None
    assigned_to_type: str | None = None
    handled_by: str | None = None
    assigned_by: str | None = None
    assigned_date: str | None = None
    sla_due_at: str | None = None
    resolution_summary: str | None = None
    escalation_reason: str | None = None
    activity_note: str | None = None


class AssignRequest(BaseModel):
    assigned_agent: str | None = None
    assigned_agent_id: str | None = None
    assigned_to_type: str | None = None
    handled_by: str | None = None
    assigned_by: str | None = None
    priority: str | None = None
    note: str | None = None


class StatusRequest(BaseModel):
    status: str
    note: str | None = None


class EscalateRequest(BaseModel):
    reason: str = Field(min_length=1)
    comment: str | None = None
    note: str | None = None
    notes: str | None = None
    escalated_to: str | None = None


class ResolveRequest(BaseModel):
    resolution_summary: str = ""


class CommentCreate(BaseModel):
    message: str = Field(min_length=1)
    is_internal: bool = False


# ── Helpers ──────────────────────────────────────────────────────────────────

def _current(payload: dict[str, Any] = Depends(get_current_user)) -> tuple[dict[str, Any], dict[str, Any]]:
    try:
        user = load_current_user(payload)
    except LookupError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc
    if str(user.get("status") or "").strip().lower() == "inactive":
        raise HTTPException(status_code=403, detail="User account is inactive")
    return payload, user


def _actor_name(user: dict[str, Any]) -> str:
    return str(user.get("name") or user.get("email") or "User").strip()


VALID_TICKET_COLUMNS = {
    "id", "ticket_number", "subject", "description", "employee", "employee_id",
    "employee_email", "requester_id", "department", "departments", "category",
    "sub_category", "priority", "status", "assigned_agent", "assigned_agent_id",
    "assigned_to_type", "handled_by", "assigned_by", "assigned_by_user_id",
    "assigned_team_id", "sla_due_at", "created_at", "updated_at",
}


def _save_ticket_atomic(ticket_id: str, updates: dict[str, Any]) -> dict[str, Any]:
    """Safely update a ticket row in Supabase, sanitizing fields to prevent column errors."""
    canonical_id = ticket_id.strip()
    sb = get_supabase_admin_client()

    clean_updates = {k: v for k, v in updates.items() if k in VALID_TICKET_COLUMNS}
    if "updated_at" not in clean_updates:
        clean_updates["updated_at"] = datetime.now(timezone.utc).isoformat()

    # 1. Try standard update by id or ticket_number
    try:
        res = sb.table("tickets").update(clean_updates).eq("id", canonical_id).execute()
        if res.data:
            return res.data[0]
        res = sb.table("tickets").update(clean_updates).eq("ticket_number", canonical_id).execute()
        if res.data:
            return res.data[0]
    except Exception as exc:
        print(f"[_save_ticket_atomic] standard update error: {exc}")
        # If some specific column failed (e.g. assigned_team_id), fall through to minimal update
        pass

    # 2. Look up the ticket to find its actual DB id
    existing_res = sb.table("tickets").select("*").eq("id", canonical_id).execute()
    existing_rows = existing_res.data or []
    if not existing_rows:
        existing_res = sb.table("tickets").select("*").eq("ticket_number", canonical_id).execute()
        existing_rows = existing_res.data or []
    if not existing_rows:
        raise HTTPException(status_code=404, detail="Ticket not found for update")

    actual_id = str(existing_rows[0].get("id") or canonical_id)

    # 3. Retry update with actual ID
    try:
        res = sb.table("tickets").update(clean_updates).eq("id", actual_id).execute()
        if res.data:
            return res.data[0]
    except Exception as exc:
        # 4. Retry with core columns only in case of custom column errors
        core_columns = {"status", "priority", "assigned_agent", "assigned_agent_id", "assigned_to_type", "handled_by", "assigned_by", "updated_at", "sla_due_at"}
        minimal_updates = {k: v for k, v in clean_updates.items() if k in core_columns}
        try:
            res = sb.table("tickets").update(minimal_updates).eq("id", actual_id).execute()
            if res.data:
                return res.data[0]
        except Exception as retry_exc:
            raise HTTPException(status_code=502, detail=f"Database update failed: {retry_exc}") from retry_exc

    # Final check: re-fetch updated row
    final_res = sb.table("tickets").select("*").eq("id", actual_id).execute()
    if final_res.data:
        return final_res.data[0]

    raise HTTPException(status_code=502, detail="Failed to save ticket update")


def _fetch_ticket(ticket_id: str) -> dict[str, Any]:
    clean_id = (ticket_id or "").strip()
    sb = get_supabase_admin_client()
    res = sb.table("tickets").select("*").eq("id", clean_id).limit(1).execute()
    rows = res.data or []
    if not rows:
        try:
            res = sb.table("tickets").select("*").eq("ticket_number", clean_id).limit(1).execute()
            rows = res.data or []
        except Exception:
            pass
    if not rows:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return rows[0]


def _require_visible(payload: dict[str, Any], user: dict[str, Any], ticket_id: str) -> dict[str, Any]:
    ticket = _fetch_ticket(ticket_id)
    if not ticket_visible(payload, user, ticket):
        raise HTTPException(status_code=403, detail="You do not have access to this ticket")
    return ticket


ACTIVITY_PAYLOAD_PREFIX = "[ACTIVITY_V1]:"


def _resolve_valid_author_user_id(user_id: str | None = None, ticket: dict[str, Any] | None = None) -> str:
    """Ensure a valid user ID from `users` table is used to satisfy FK constraints."""
    if user_id and str(user_id).strip() and str(user_id).strip().lower() != "system":
        return str(user_id).strip()
    if ticket:
        for cand in (ticket.get("employee_id"), ticket.get("requester_id"), ticket.get("assigned_agent_id")):
            if cand and str(cand).strip() and str(cand).strip().lower() != "system":
                return str(cand).strip()
    return "usr-admin-1791538577749"


def _log_activity(
    ticket_id: str,
    actor: str,
    action: str,
    user_id: str | None = None,
    ticket: dict[str, Any] | None = None,
) -> None:
    """Record activity permanently in Supabase database."""
    invalidate_tickets_cache()
    now = datetime.now(timezone.utc).isoformat()
    act_id = f"act-{int(time.time() * 1000)}-{random.randint(100, 999)}"
    record = {
        "id": act_id,
        "ticket_id": ticket_id,
        "user": actor,
        "action": action,
        "timestamp": now,
    }
    sb = get_supabase_admin_client()

    # 1. Attempt direct insert into ticket_activities table
    try:
        sb.table("ticket_activities").insert(record).execute()
    except Exception as exc:
        print(f"[tickets] ticket_activities table insert note: {exc}")

    # 2. Persist in database via ticket_comments activity envelope so history survives permanently
    try:
        valid_uid = _resolve_valid_author_user_id(user_id, ticket)
        msg = ACTIVITY_PAYLOAD_PREFIX + json.dumps(record)
        comm_row = {
            "id": f"comm-{act_id}",
            "ticket_id": ticket_id,
            "author_user_id": valid_uid,
            "author_name": "__activity__",
            "author_role": "employee",
            "message": msg,
            "is_internal": True,
            "created_at": now,
        }
        try:
            sb.table("ticket_comments").upsert(comm_row).execute()
        except Exception as exc:
            if "author_user_id" in str(exc):
                comm_row_alt = dict(comm_row)
                comm_row_alt["author_id"] = comm_row_alt.pop("author_user_id", None)
                try:
                    sb.table("ticket_comments").upsert(comm_row_alt).execute()
                except Exception:
                    pass
            else:
                print(f"[tickets] activity persistence note for {ticket_id}: {exc}")
    except Exception as outer_exc:
        print(f"[tickets] activity persistence note for {ticket_id}: {outer_exc}")


def _fetch_all_activities(ticket_ids: list[str]) -> list[dict[str, Any]]:
    """Retrieve all activities from database (both direct table and persisted activity rows)."""
    clean_ids = [str(x).strip() for x in ticket_ids if str(x).strip()]
    if not clean_ids:
        return []
    sb = get_supabase_admin_client()
    merged: dict[str, dict[str, Any]] = {}

    # 1. Direct table
    try:
        res = (
            sb.table("ticket_activities")
            .select("*")
            .in_("ticket_id", clean_ids)
            .order("timestamp", desc=True)
            .execute()
        )
        for row in (res.data or []):
            rid = str(row.get("id") or "")
            if rid:
                merged[rid] = row
    except Exception as exc:
        print(f"[tickets] activities table fetch error: {exc}")

    # 2. Persisted in ticket_comments
    try:
        res2 = (
            sb.table("ticket_comments")
            .select("*")
            .in_("ticket_id", clean_ids)
            .eq("author_name", "__activity__")
            .order("created_at", desc=True)
            .execute()
        )
        for row in (res2.data or []):
            msg = str(row.get("message") or "")
            if msg.startswith(ACTIVITY_PAYLOAD_PREFIX):
                try:
                    payload = json.loads(msg[len(ACTIVITY_PAYLOAD_PREFIX):])
                    pid = str(payload.get("id") or "")
                    if pid and pid not in merged:
                        merged[pid] = payload
                except Exception:
                    pass
    except Exception as exc:
        print(f"[tickets] persisted activities fetch error: {exc}")

    results = list(merged.values())
    results.sort(key=lambda x: str(x.get("timestamp") or ""), reverse=True)
    return results


def _notify(
    title: str,
    message: str,
    for_role: str,
    ticket_id: str | None = None,
    kind: str = "info",
) -> None:
    """Best-effort persisted in-app notification saved directly in portal_notifications."""
    now_str = datetime.now(timezone.utc).isoformat()
    clean_target = str(for_role or "all").strip()
    user_email: str | None = None
    if clean_target.startswith("user:"):
        val = clean_target.split(":", 1)[1].strip()
        if "@" in val:
            user_email = val
    try:
        get_supabase_admin_client().table("portal_notifications").insert(
            {
                "id": f"notif-{int(time.time() * 1000)}-{random.randint(100, 999)}",
                "ticket_id": ticket_id,
                "title": title,
                "message": message,
                "type": kind,
                "user_id": clean_target,
                "user_email": user_email,
                "read": False,
                "created_at": now_str,
            }
        ).execute()
        from app.api.v1.portal import invalidate_notifications_cache
        invalidate_notifications_cache()
    except Exception as exc:
        print(f"[tickets] notification error ({for_role}): {exc}")


def _notify_batch(items: list[dict[str, Any]]) -> None:
    """Persist multiple in-app notifications in a single batch roundtrip."""
    if not items:
        return
    now_str = datetime.now(timezone.utc).isoformat()
    rows = []
    for item in items:
        clean_target = str(item.get("for_role") or "all").strip()
        user_email: str | None = None
        if clean_target.startswith("user:"):
            val = clean_target.split(":", 1)[1].strip()
            if "@" in val:
                user_email = val
        rows.append(
            {
                "id": f"notif-{int(time.time() * 1000)}-{random.randint(100, 999)}",
                "ticket_id": item.get("ticket_id"),
                "title": item.get("title"),
                "message": item.get("message"),
                "type": item.get("kind", "info"),
                "user_id": clean_target,
                "user_email": user_email,
                "read": False,
                "created_at": now_str,
            }
        )
    try:
        get_supabase_admin_client().table("portal_notifications").insert(rows).execute()
        from app.api.v1.portal import invalidate_notifications_cache
        invalidate_notifications_cache()
    except Exception as exc:
        print(f"[tickets] batch notification error: {exc}")


def _find_user(user_id: str | None = None, email: str | None = None) -> dict[str, Any] | None:
    if not user_id and not email:
        return None
    uid = str(user_id).strip().lower() if user_id else None
    em = str(email).strip().lower() if email else None
    # 1. Check in-memory cached user list first to eliminate redundant WAN latency
    for u in fetch_all_users_cached():
        if uid:
            c_id = str(u.get("id") or "").strip().lower()
            c_emp = str(u.get("employee_id") or "").strip().lower()
            if uid in (c_id, c_emp):
                return u
        if em and str(u.get("email") or "").strip().lower() == em:
            return u
    # 2. Database query fallback
    sb = get_supabase_admin_client()
    try:
        if user_id:
            res = sb.table("users").select("*").eq("id", str(user_id)).limit(1).execute()
            rows = res.data or []
            if rows:
                return rows[0]
            res = sb.table("users").select("*").eq("employee_id", str(user_id)).limit(1).execute()
            rows = res.data or []
            if rows:
                return rows[0]
        if email:
            res = sb.table("users").select("*").eq("email", str(email).lower()).limit(1).execute()
            rows = res.data or []
            if rows:
                return rows[0]
    except Exception:
        return None
    return None


def _find_user_by_name(name: str | None) -> dict[str, Any] | None:
    if not name or name.strip().lower() in ("unassigned", "none", "null"):
        return None
    clean = name.strip().lower()
    all_users = fetch_all_users_cached()
    for u in all_users:
        uid = str(u.get("id") or "").strip().lower()
        uempid = str(u.get("employee_id") or "").strip().lower()
        uname = str(u.get("name") or "").strip().lower()
        uemail = str(u.get("email") or "").strip().lower()
        if clean in (uid, uempid, uname, uemail):
            return u
    for u in all_users:
        uid = str(u.get("id") or "").strip().lower()
        uempid = str(u.get("employee_id") or "").strip().lower()
        uname = str(u.get("name") or "").strip().lower()
        if (uid and uid in clean) or (uempid and uempid in clean):
            return u
        if uname and len(uname) >= 3 and (uname in clean or clean in uname):
            return u
    # DB fallback
    try:
        sb = get_supabase_admin_client()
        res = sb.table("users").select("*").ilike("name", f"%{name.strip()}%").limit(1).execute()
        if res.data:
            return res.data[0]
    except Exception:
        pass
    return None



def _sla_due(priority: str | None, created_at: Any = None, explicit: str | None = None) -> str:
    from app.services.access import SLA_HOURS, _parse_dt
    from datetime import timedelta

    if explicit:
        parsed = _parse_dt(explicit)
        if parsed:
            return parsed.isoformat()
    hours = SLA_HOURS.get((priority or "medium").strip().lower(), 24)
    base_dt = _parse_dt(created_at) if created_at else None
    if not base_dt:
        base_dt = datetime.now(timezone.utc)
    return (base_dt + timedelta(hours=hours)).isoformat()


def _new_ticket_id() -> str:
    sb = get_supabase_admin_client()
    for _ in range(20):
        candidate = f"TKT-{random.randint(1000, 9999)}"
        try:
            res = sb.table("tickets").select("id").eq("id", candidate).limit(1).execute()
            if not (res.data or []):
                return candidate
        except Exception:
            break
    return f"TKT-{int(time.time() * 1000) % 1000000}"


# ── Read ─────────────────────────────────────────────────────────────────────

@router.get("", summary="List tickets visible to the authenticated user")
@router.get("/", include_in_schema=False)
def list_tickets(
    context: tuple[dict[str, Any], dict[str, Any]] = Depends(_current),
    status_filter: str | None = Query(None, alias="status"),
    department: str | None = None,
    priority: str | None = None,
    assigned: str | None = None,
    search: str | None = None,
) -> list[dict[str, Any]]:
    payload, user = context
    tickets = [serialize_ticket(t, payload=payload, user=user) for t in scoped_tickets(payload, user)]

    if status_filter and status_filter.lower() != "all":
        wanted = status_filter.strip().lower()
        if wanted == "active":
            tickets = [t for t in tickets if str(t.get("status") or "").lower() not in ("resolved", "closed")]
        else:
            tickets = [t for t in tickets if str(t.get("status") or "").strip().lower() == wanted]
    if department:
        tickets = [t for t in tickets if department.strip().lower() in str(t.get("department") or "").lower()]
    if priority:
        tickets = [t for t in tickets if str(t.get("priority") or "").lower() == priority.lower()]
    if assigned == "unassigned":
        tickets = [t for t in tickets if t.get("is_unassigned")]
    elif assigned == "me":
        tickets = [
            t
            for t in tickets
            if _same_person(user, payload, t, "assigned_agent")
        ]
    elif assigned in ("created_by_me", "my"):
        tickets = [
            t
            for t in tickets
            if _same_person(user, payload, t, "employee")
            or str(t.get("requester_id") or "") == str(user.get("id") or "")
        ]
    if search:
        needle = search.strip().lower()
        tickets = [
            t
            for t in tickets
            if needle in str(t.get("id") or "").lower()
            or needle in str(t.get("ticket_number") or "").lower()
            or needle in str(t.get("subject") or "").lower()
            or needle in str(t.get("description") or "").lower()
            or needle in str(t.get("department") or "").lower()
            or needle in str(t.get("category") or "").lower()
            or needle in str(t.get("sub_category") or "").lower()
            or needle in str(t.get("priority") or "").lower()
            or needle in str(t.get("status") or "").lower()
            or needle in str(t.get("employee") or "").lower()
            or needle in str(t.get("employee_email") or "").lower()
            or needle in str(t.get("assigned_agent") or "").lower()
        ]
    return tickets


_USERS_DIR_CACHE: tuple[float, list[dict[str, Any]]] | None = None
_USERS_DIR_TTL = 30.0  # seconds


@router.get("/stats", summary="Dashboard counts alias")
@router.get("/stats/summary", summary="Dashboard counts computed from the same scoped rows")
def get_stats(context: tuple[dict[str, Any], dict[str, Any]] = Depends(_current)) -> dict[str, Any]:
    payload, user = context
    tickets = scoped_tickets(payload, user)
    stats = ticket_stats(tickets, payload=payload, user=user)

    rows = fetch_all_users_cached()

    if is_admin(payload):
        users_count = len(rows)
    elif is_teamlead(payload):
        users_count = len(teamlead_managed_employees(user))
    else:
        users_count = sum(
            1
            for row in rows
            if _scopes_overlap(user.get("department"), row.get("department"))
        )

    return {
        **stats,
        "totalUsers": users_count,
        # Backwards-compatible alias: resolved + closed.
        "resolvedTodayCount": stats["resolvedTickets"],
    }


@router.get("/{ticket_id}", summary="Get a single ticket with comments/activities")
def get_ticket(
    ticket_id: str,
    context: tuple[dict[str, Any], dict[str, Any]] = Depends(_current),
) -> dict[str, Any]:
    payload, user = context
    ticket = _require_visible(payload, user, ticket_id)

    sb = get_supabase_admin_client()
    cands: list[str] = []
    for cand in (ticket_id, ticket.get("id"), ticket.get("ticket_number")):
        if cand:
            c = str(cand).strip()
            if c and c not in cands:
                cands.append(c)

    comments: list[dict[str, Any]] = []
    activities: list[dict[str, Any]] = []
    try:
        res = (
            sb.table("ticket_comments")
            .select("*")
            .in_("ticket_id", cands)
            .order("created_at", desc=False)
            .execute()
        )
        raw_comments = res.data or []
        comments = [
            c for c in raw_comments
            if c.get("author_name") not in ("__attachment__", "__activity__")
            and not str(c.get("message") or "").startswith(("[ATTACHMENT_V1]:", "[ACTIVITY_V1]:"))
        ]
    except Exception as exc:
        print(f"[tickets] comments unavailable: {exc}")

    activities = _fetch_all_activities(cands)

    result = serialize_ticket(ticket, load_attachments=True)
    can_chat = can_view_ticket_chat(payload, user, ticket)
    can_reply = can_reply_ticket_chat(payload, user, ticket)
    if not can_chat:
        comments = []
    elif not can_view_internal_notes(payload, user, ticket):
        comments = [c for c in comments if not c.get("is_internal")]
    result["comments"] = comments
    result["can_chat"] = can_chat
    result["can_reply"] = can_reply
    result["activities"] = activities
    result["history"] = [
        {
            "id": a.get("id"),
            "author": a.get("user") or "System",
            "text": a.get("action"),
            "timestamp": a.get("timestamp"),
        }
        for a in activities
    ]

    try:
        from app.api.v1.attachments import _base_url, _db_attachments, _disk_records
        base = _base_url(None)
        merged_atts: dict[str, dict[str, Any]] = {}
        for cid in cands:
            for r in _db_attachments(cid):
                att_id = str(r.get("id") or r.get("name") or "")
                if att_id:
                    merged_atts[att_id] = r
            for r in _disk_records(cid, base):
                merged_atts[r["id"]] = r
        if merged_atts:
            result["attachments"] = list(merged_atts.values())
    except Exception as exc:
        print(f"[tickets] attachments retrieval failed for {ticket_id}: {exc}")

    return result


# ── Create / update ──────────────────────────────────────────────────────────

@router.post("", status_code=status.HTTP_201_CREATED, summary="Create a ticket")
@router.post("/", include_in_schema=False, status_code=status.HTTP_201_CREATED)
def create_ticket(
    body: TicketCreate,
    context: tuple[dict[str, Any], dict[str, Any]] = Depends(_current),
) -> dict[str, Any]:
    payload, user = context
    role = role_of(payload)

    employee_name = (body.employee or "").strip()
    employee_id = (body.employee_id or "").strip() or None
    employee_email = (body.employee_email or "").strip().lower() or None

    if role == "employee":
        # Employees may only create tickets on their own behalf.
        employee_name = _actor_name(user)
        employee_id = str(user.get("id") or "")
        employee_email = str(user.get("email") or "").lower() or None
    else:
        if employee_id:
            target = _find_user(user_id=employee_id)
            if target:
                employee_name = employee_name or str(target.get("name") or "")
                employee_email = employee_email or str(target.get("email") or "").lower()
        if not employee_id:
            employee_id = str(user.get("id") or "")
        if not employee_name and not employee_email:
            employee_name = _actor_name(user)
            employee_email = str(user.get("email") or "").lower() or None

    departments = [d.strip() for d in (body.departments or []) if d and d.strip()]
    department = (body.department or "").strip()
    if not department and departments:
        department = ", ".join(departments)
    if not department:
        department = str(user.get("department") or "IT Support")

    agent = (body.assigned_agent or "").strip() or "Unassigned"
    agent_id = (body.assigned_agent_id or "").strip() or None
    agent_email: str | None = None
    if agent_id:
        target = _find_user(user_id=agent_id)
        if target:
            agent = str(target.get("name") or agent)
            agent_email = str(target.get("email") or "").lower() or None
    elif agent and agent.lower() != "unassigned":
        target = _find_user_by_name(agent)
        if target:
            agent_id = str(target.get("id") or "")
            agent = str(target.get("name") or agent)
            agent_email = str(target.get("email") or "").lower() or None

    # Validate Team Lead and Employee combinations (Requirement 2, Points 9 & 10)
    raw_tl_ids: set[str] = set()
    if body.team_lead_ids:
        raw_tl_ids.update(str(x).strip() for x in body.team_lead_ids if str(x).strip())
    if body.team_leads:
        for item in body.team_leads:
            if isinstance(item, dict) and item.get("id"):
                raw_tl_ids.add(str(item["id"]).strip())
            elif isinstance(item, str) and item.strip():
                raw_tl_ids.add(item.strip())

    raw_emp_ids: set[str] = set()
    if body.tagged_employee_ids:
        raw_emp_ids.update(str(x).strip() for x in body.tagged_employee_ids if str(x).strip())
    if body.employees:
        for item in body.employees:
            if isinstance(item, dict) and item.get("id"):
                raw_emp_ids.add(str(item["id"]).strip())
            elif isinstance(item, str) and item.strip():
                raw_emp_ids.add(item.strip())
    if agent_id:
        target_agent = _find_user(user_id=agent_id)
        if target_agent and normalize_role(target_agent.get("role")) == ROLE_TEAMLEAD:
            raw_tl_ids.add(agent_id)
            body.assigned_to_type = "teamlead"
        else:
            raw_emp_ids.add(agent_id)

    # Ticket Assignment:
    # 1. When an employee is tagged/selected, assign directly to the employee.
    # 2. When only a Team Lead is selected, assign to that Team Lead.
    # 3. When neither is selected or explicitly unassigned, leave as Unassigned.
    from app.services.access import find_user_team_lead

    assigned_emp_id = None
    if raw_emp_ids:
        if agent_id and agent_id in raw_emp_ids and agent_id not in raw_tl_ids:
            assigned_emp_id = agent_id
        else:
            for eid in raw_emp_ids:
                if eid not in raw_tl_ids:
                    assigned_emp_id = eid
                    break
            if not assigned_emp_id:
                assigned_emp_id = next(iter(raw_emp_ids))

    if assigned_emp_id:
        emp_target = _find_user(user_id=assigned_emp_id)
        if emp_target:
            agent_id = str(emp_target.get("id") or "")
            agent = str(emp_target.get("name") or agent or "Employee")
            agent_email = str(emp_target.get("email") or "").lower() or None
            assigned_to_type = "employee"
            handled_by = "employee"
    elif raw_tl_ids:
        # Team Lead selected without tagged employee
        first_tl_id = next(iter(raw_tl_ids))
        tl_target = _find_user(user_id=first_tl_id)
        if tl_target:
            agent_id = str(tl_target.get("id") or "")
            agent = str(tl_target.get("name") or agent or "Team Lead")
            agent_email = str(tl_target.get("email") or "").lower() or None
            assigned_to_type = "teamlead"
            handled_by = "teamlead"
    elif agent_id and agent.lower() != "unassigned":
        # Assignee was explicitly specified (e.g. by admin or team lead)
        target_user = _find_user(user_id=agent_id)
        if target_user:
            target_role = normalize_role(target_user.get("role"))
            assigned_to_type = "teamlead" if target_role == ROLE_TEAMLEAD else "employee"
            handled_by = assigned_to_type
    else:
        # No Team Lead or assignee selected: leave as Unassigned
        agent = "Unassigned"
        agent_id = None
        agent_email = None
        assigned_to_type = "unassigned"
        handled_by = "unassigned" 

    if raw_tl_ids:
        permitted_employee_ids: set[str] = set()
        for tlid in raw_tl_ids:
            tl_row = _find_user(user_id=tlid)
            if not tl_row or normalize_role(tl_row.get("role")) != ROLE_TEAMLEAD:
                raise HTTPException(status_code=400, detail=f"Invalid Team Lead ID: {tlid}")
            if departments:
                tl_dept = tl_row.get("department")
                has_custom = any(d.strip().lower() not in {"it support", "it", "finance", "hr", "facilities", "general administration"} for d in departments)
                if not has_custom and not any(_scopes_overlap(tl_dept, d) for d in departments):
                    raise HTTPException(
                        status_code=400,
                        detail=f"Team Lead {tl_row.get('name') or tlid} does not belong to the selected department(s)",
                    )
            managed_rows = teamlead_managed_employees(tl_row)
            permitted_employee_ids.update(str(m.get("id")) for m in managed_rows)

        # Validate each tagged/assigned employee against the selected Team Lead's managed employees
        for empid in raw_emp_ids:
            if empid in raw_tl_ids:
                continue
            emp_row = _find_user(user_id=empid)
            if not emp_row:
                raise HTTPException(status_code=400, detail=f"Employee {empid} not found")
            if empid not in permitted_employee_ids:
                tl_depts = [tl.get("department") for tl in (_find_user(user_id=t) for t in raw_tl_ids) if tl]
                emp_dept = emp_row.get("department")
                if not any(_scopes_overlap(emp_dept, td) for td in tl_depts):
                    raise HTTPException(
                        status_code=400,
                        detail=f"Employee {emp_row.get('name') or empid} does not belong to the selected Team Lead(s)",
                    )
            if departments:
                emp_dept = emp_row.get("department")
                has_custom = any(d.strip().lower() not in {"it support", "it", "finance", "hr", "facilities", "general administration"} for d in departments)
                if not has_custom and not any(_scopes_overlap(emp_dept, d) for d in departments):
                    raise HTTPException(
                        status_code=400,
                        detail=f"Employee {emp_row.get('name') or empid} does not belong to the selected department(s)",
                    )

    # Determine assigned_to_type and handled_by
    if not assigned_to_type:
        assigned_to_type = body.assigned_to_type
    if agent_id:
        target_user = _find_user(user_id=agent_id)
        if target_user:
            target_role = normalize_role(target_user.get("role"))
            if target_role == ROLE_TEAMLEAD:
                assigned_to_type = "teamlead"
            elif target_role == ROLE_EMPLOYEE:
                assigned_to_type = "employee"
    if not assigned_to_type:
        assigned_to_type = "employee" if agent_id else "unassigned"
    handled_by = "teamlead" if assigned_to_type == "teamlead" else ("employee" if agent_id else "unassigned")

    # Strictly integer assigned_team_id (or None)
    assigned_team_id: int | None = None
    if raw_tl_ids:
        first_tl_id = next(iter(raw_tl_ids))
        tl_row = _find_user(user_id=first_tl_id)
        if tl_row:
            assigned_team_id = (
                resolve_team_id(tl_row.get("team"))
                or resolve_team_id(tl_row.get("id"))
                or resolve_team_id(tl_row.get("department"))
            )
    if not assigned_team_id and agent_id:
        target_row = _find_user(user_id=agent_id)
        if target_row:
            assigned_team_id = (
                resolve_team_id(target_row.get("team"))
                or resolve_team_id(target_row.get("id"))
                or resolve_team_id(target_row.get("department"))
            )
    if not assigned_team_id:
        creator_tl = find_user_team_lead(user)
        if creator_tl:
            assigned_team_id = (
                resolve_team_id(creator_tl.get("team"))
                or resolve_team_id(creator_tl.get("id"))
                or resolve_team_id(creator_tl.get("department"))
            )
    if not assigned_team_id and is_teamlead(payload):
        assigned_team_id = (
            resolve_team_id(user.get("team"))
            or resolve_team_id(user.get("id"))
            or resolve_team_id(user.get("department"))
        )

    assigned_by_user_id: str | None = None
    if is_teamlead(payload) or is_admin(payload):
        assigned_by_user_id = str(user.get("id") or "")

    ticket_id = _new_ticket_id()
    now = datetime.now(timezone.utc).isoformat()
    row: dict[str, Any] = {
        "id": ticket_id,
        "ticket_number": ticket_id,
        "subject": body.subject.strip(),
        "description": body.description,
        "employee": employee_name or "User",
        "employee_id": employee_id,
        "employee_email": employee_email,
        "requester_id": employee_id,
        "department": department,
        "departments": departments or [department],
        "category": body.category or "General",
        "sub_category": body.sub_category,
        "priority": body.priority or "Medium",
        "status": body.status or "Open",
        "assigned_agent": agent,
        "assigned_agent_id": agent_id,
        "assigned_to_type": assigned_to_type,
        "handled_by": handled_by,
        "assigned_by": body.assigned_by or _actor_name(user),
        "assigned_by_user_id": assigned_by_user_id,
        "assigned_team_id": assigned_team_id,
        "sla_due_at": _sla_due(body.priority, created_at=now, explicit=body.sla_due_at),
        "created_at": now,
        "updated_at": now,
    }
    # Note: 'attachments' is stored in ticket_attachments / disk sidecars, not on the tickets table.

    sb = get_supabase_admin_client()
    try:
        res = sb.table("tickets").insert(row).execute()
    except Exception as exc:
        err_msg = str(exc)
        if any(term in err_msg for term in ("ConnectionTerminated", "RemoteProtocolError", "ConnectError", "BrokenPipe")):
            from app.db.supabase import reset_supabase_clients
            reset_supabase_clients()
            sb = get_supabase_admin_client()
            res = sb.table("tickets").insert(row).execute()
        else:
            raise HTTPException(status_code=502, detail=f"Could not create ticket: {exc}") from exc
    created = (res.data or [row])[0]

    # Persist tagged and assigned members into ticket_tagged_members table (batched)
    tagged_to_insert = set()
    if raw_tl_ids:
        tagged_to_insert.update(raw_tl_ids)
    if raw_emp_ids:
        tagged_to_insert.update(raw_emp_ids)
    if tagged_to_insert:
        tagged_rows = [
            {
                "ticket_id": ticket_id,
                "user_id": str(member_uid),
                "tagged_by": str(user.get("id") or ""),
            }
            for member_uid in tagged_to_insert
        ]
        try:
            sb.table("ticket_tagged_members").insert(tagged_rows).execute()
        except Exception as exc:
            print(f"[tickets] batch insert tagged members skipped: {exc}")

    invalidate_tickets_cache()
    _log_activity(ticket_id, _actor_name(user), "Ticket created", user_id=str(user.get("id") or ""), ticket=row)

    # Batch build notifications to eliminate 6-8 sequential WAN queries
    notifications_to_send: list[dict[str, Any]] = []
    if employee_id:
        notifications_to_send.append({
            "title": f"Ticket Created: {ticket_id}",
            "message": f"Your ticket \"{row['subject']}\" was created and is now {row['status']}.",
            "for_role": f"user:{employee_id}",
            "ticket_id": ticket_id,
            "kind": "success",
        })
    if agent_id:
        notifications_to_send.append({
            "title": f"Ticket Assigned: {ticket_id}",
            "message": f"You were assigned \"{row['subject']}\" ({ticket_id}).",
            "for_role": f"user:{agent_id}",
            "ticket_id": ticket_id,
            "kind": "warning",
        })
    for tl_id in raw_tl_ids:
        if tl_id != str(user.get("id") or "") and tl_id != agent_id:
            notifications_to_send.append({
                "title": f"Tagged in Ticket: {ticket_id}",
                "message": f"You were tagged on ticket \"{row['subject']}\" ({ticket_id}) in {department or 'General'}.",
                "for_role": f"user:{tl_id}",
                "ticket_id": ticket_id,
                "kind": "info",
            })
    for emp_id in raw_emp_ids:
        if emp_id != str(user.get("id") or "") and emp_id != agent_id:
            notifications_to_send.append({
                "title": f"Tagged in Ticket: {ticket_id}",
                "message": f"You were tagged on ticket \"{row['subject']}\" ({ticket_id}).",
                "for_role": f"user:{emp_id}",
                "ticket_id": ticket_id,
                "kind": "info",
            })
    if department:
        notifications_to_send.append({
            "title": f"New Ticket: {ticket_id}",
            "message": f"{row['employee']} raised \"{row['subject']}\" for {department}.",
            "for_role": f"dept:{department}",
            "ticket_id": ticket_id,
            "kind": "info",
        })
    notifications_to_send.append({
        "title": f"New Ticket: {ticket_id}",
        "message": f"{row['employee']} raised \"{row['subject']}\" ({row['priority']} priority).",
        "for_role": "admin",
        "ticket_id": ticket_id,
        "kind": "info",
    })
    _notify_batch(notifications_to_send)

    return serialize_ticket(created, payload=payload, user=user)


@router.patch("/{ticket_id}", summary="Update a ticket")
def update_ticket(
    ticket_id: str,
    body: TicketUpdate,
    context: tuple[dict[str, Any], dict[str, Any]] = Depends(_current),
) -> dict[str, Any]:
    payload, user = context
    ticket = _require_visible(payload, user, ticket_id)
    if not can_manage_ticket(payload, user, ticket):
        raise HTTPException(status_code=403, detail="You cannot modify this ticket")

    role = role_of(payload)
    updates = {k: v for k, v in body.model_dump().items() if v is not None and k != "activity_note"}

    if role == "employee":
        allowed = {"description", "status", "priority", "category", "sub_category", "resolution_summary"}
        forbidden = set(updates) - allowed
        if forbidden:
            raise HTTPException(
                status_code=403,
                detail=f"Employees cannot change: {', '.join(sorted(forbidden))}",
            )

    if "assigned_agent_id" in updates and updates["assigned_agent_id"]:
        target = _find_user(user_id=str(updates["assigned_agent_id"]))
        if not target:
            raise HTTPException(status_code=400, detail="Assigned user does not exist")
        updates.setdefault("assigned_agent", target.get("name") or "Unassigned")
    if "priority" in updates:
        norm_priority = str(updates["priority"]).strip()
        updates["priority"] = norm_priority
        if "sla_due_at" not in updates:
            updates["sla_due_at"] = _sla_due(norm_priority, created_at=ticket.get("created_at"))
        from app.services.access import compute_sla
        new_sla = compute_sla({**ticket, **updates})
        updates["sla_status"] = new_sla["status"]
    if "status" in updates:
        new_status = str(updates["status"]).strip()
        if new_status.lower() == "resolved":
            updates.setdefault("resolved_at", datetime.now(timezone.utc).isoformat())
        elif new_status.lower() == "closed":
            updates.setdefault("closed_at", datetime.now(timezone.utc).isoformat())
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()

    canonical_id = str(ticket.get("id") or ticket_id)
    updated = _save_ticket_atomic(canonical_id, updates)

    actor = _actor_name(user)
    changed = ", ".join(sorted(k for k in updates if k != "updated_at"))
    _log_activity(ticket_id, actor, f"Updated {changed}", user_id=str(user.get("id") or ""), ticket=ticket)
    if body.activity_note:
        _log_activity(ticket_id, actor, body.activity_note, user_id=str(user.get("id") or ""), ticket=ticket)
    invalidate_tickets_cache()
    _notify_ticket_change(ticket_id, updated, payload, user, changed)
    return serialize_ticket(updated, payload=payload, user=user)


def _notify_ticket_change(
    ticket_id: str,
    ticket: dict[str, Any],
    payload: dict[str, Any],
    user: dict[str, Any],
    changed: str,
) -> None:
    """Notify the requester, assignee, tagged members, department queue and admin about a change."""
    actor = _actor_name(user)
    notifs: list[dict[str, Any]] = []
    cur_uids = {
        str(user.get("id") or "").strip().lower(),
        str(user.get("employee_id") or "").strip().lower(),
        str(user.get("email") or "").strip().lower(),
    }

    recipients: set[str] = set()
    creator_id = str(ticket.get("employee_id") or ticket.get("requester_id") or "").strip()
    if creator_id and creator_id.lower() not in cur_uids:
        recipients.add(creator_id)
    agent_id = str(ticket.get("assigned_agent_id") or "").strip()
    if agent_id and agent_id.lower() not in cur_uids:
        recipients.add(agent_id)
    for tl_id in (ticket.get("team_lead_ids") or []):
        if tl_id and str(tl_id).strip().lower() not in cur_uids:
            recipients.add(str(tl_id).strip())
    for emp_id in (ticket.get("tagged_employee_ids") or []):
        if emp_id and str(emp_id).strip().lower() not in cur_uids:
            recipients.add(str(emp_id).strip())

    for target_uid in recipients:
        notifs.append({
            "title": f"Ticket Updated: {ticket_id}",
            "message": f"{actor} updated {changed or 'the ticket'} on \"{ticket.get('subject')}\" (status: {ticket.get('status')}).",
            "for_role": f"user:{target_uid}",
            "ticket_id": ticket_id,
            "kind": "info",
        })

    dept = ticket.get("department")
    if dept:
        notifs.append({
            "title": f"Ticket Updated: {ticket_id}",
            "message": f"{actor} updated {changed or 'the ticket'} on \"{ticket.get('subject')}\" (status: {ticket.get('status')}).",
            "for_role": f"dept:{dept}",
            "ticket_id": ticket_id,
            "kind": "info",
        })

    if not is_admin(payload):
        notifs.append({
            "title": f"Ticket Updated: {ticket_id}",
            "message": f"{actor} updated {changed or 'the ticket'} on \"{ticket.get('subject')}\" (status: {ticket.get('status')}).",
            "for_role": "admin",
            "ticket_id": ticket_id,
            "kind": "info",
        })

    _notify_batch(notifs)


@router.delete("/{ticket_id}", summary="Delete a ticket")
def delete_ticket(
    ticket_id: str,
    context: tuple[dict[str, Any], dict[str, Any]] = Depends(_current),
) -> dict[str, Any]:
    payload, user = context
    if not (is_admin(payload) or is_teamlead(payload)):
        raise HTTPException(status_code=403, detail="Only admins and team leads can delete tickets")
    ticket = _require_visible(payload, user, ticket_id)
    if not can_manage_ticket(payload, user, ticket):
        raise HTTPException(status_code=403, detail="You cannot delete this ticket")

    sb = get_supabase_admin_client()
    for table in ("ticket_comments", "ticket_activities", "ticket_attachments", "escalations"):
        try:
            sb.table(table).delete().eq("ticket_id", ticket_id).execute()
        except Exception as exc:
            print(f"[tickets] could not delete {table} rows for {ticket_id}: {exc}")
    try:
        sb.table("tickets").delete().eq("id", ticket_id).execute()
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Could not delete ticket: {exc}") from exc

    invalidate_tickets_cache()

    # Remove the persisted files for this ticket so a re-created ticket id can
    # never inherit another ticket's attachments.
    try:
        import shutil

        from app.api.v1.attachments import UPLOAD_BASE_DIR

        folder = UPLOAD_BASE_DIR / ticket_id
        if folder.is_dir() and folder.resolve().is_relative_to(UPLOAD_BASE_DIR.resolve()):
            shutil.rmtree(folder, ignore_errors=True)
    except Exception as exc:  # pragma: no cover - best effort cleanup
        print(f"[tickets] could not remove attachment folder for {ticket_id}: {exc}")

    return {"success": True, "id": ticket_id}


# ── Assignment / status / escalation / resolution ────────────────────────────

@router.post("/{ticket_id}/assign", summary="Assign or reassign a ticket")
def assign_ticket(
    ticket_id: str,
    body: AssignRequest,
    context: tuple[dict[str, Any], dict[str, Any]] = Depends(_current),
) -> dict[str, Any]:
    payload, user = context
    ticket = _require_visible(payload, user, ticket_id)
    if not (is_admin(payload) or is_teamlead(payload) or can_manage_ticket(payload, user, ticket)):
        raise HTTPException(status_code=403, detail="You cannot assign this ticket")

    agent_id = (body.assigned_agent_id or "").strip() or None
    agent_name = (body.assigned_agent or "").strip() or None
    target = None
    if agent_id:
        target = _find_user(user_id=agent_id)
        if not target and agent_name:
            target = _find_user_by_name(agent_name)
        if not target and agent_name and agent_name.lower() != "unassigned":
            # Target not found in cache, search or accept provided name
            agent_name = agent_name
        elif target:
            agent_name = str(target.get("name") or agent_name or "Unassigned")
            agent_id = str(target.get("id") or target.get("employee_id") or agent_id)
    elif agent_name and agent_name.lower() != "unassigned":
        target = _find_user_by_name(agent_name)
        if target:
            agent_id = str(target.get("id") or target.get("employee_id") or "")
            agent_name = str(target.get("name") or agent_name)

    if not agent_name:
        raise HTTPException(status_code=400, detail="An assignee is required")
    if agent_name.lower() == "unassigned":
        agent_id = None
        target = None

    if is_teamlead(payload) and agent_id and target:
        tl_id = str(user.get("id") or "").strip()
        tl_emp_id = str(user.get("employee_id") or "").strip()
        managed = teamlead_managed_employees(user)
        managed_ids = {str(m.get("id")) for m in managed if m.get("id")}
        managed_ids |= {str(m.get("employee_id")) for m in managed if m.get("employee_id")}
        # Team lead can assign to their managed list, themselves, matching department, or any ticket in their queue
        pass

    now = datetime.now(timezone.utc).isoformat()
    target_role = normalize_role(target.get("role")) if target else None
    assigned_to_type = body.assigned_to_type or ("teamlead" if target_role == ROLE_TEAMLEAD else ("employee" if agent_id else "unassigned"))
    handled_by = body.handled_by or ("teamlead" if assigned_to_type == "teamlead" else ("employee" if agent_id else "unassigned"))

    updates: dict[str, Any] = {
        "assigned_agent": agent_name,
        "assigned_agent_id": agent_id,
        "assigned_to_type": assigned_to_type,
        "handled_by": handled_by,
        "assigned_by": body.assigned_by or _actor_name(user),
        "assigned_by_user_id": str(user.get("id") or ""),
        "updated_at": now,
    }
    if body.priority:
        norm_priority = body.priority.strip().replace(" Priority", "").strip().capitalize()
        if norm_priority not in {"Low", "Medium", "High", "Critical"}:
            norm_priority = body.priority.strip()
        updates["priority"] = norm_priority
        updates["sla_due_at"] = _sla_due(norm_priority, created_at=ticket.get("created_at"))

    assigned_team_id: int | None = None
    if target:
        assigned_team_id = resolve_team_id(target.get("team")) or resolve_team_id(target.get("id"))
    if not assigned_team_id and is_teamlead(payload):
        assigned_team_id = resolve_team_id(user.get("team")) or resolve_team_id(user.get("id"))
    if assigned_team_id is not None:
        updates["assigned_team_id"] = assigned_team_id

    canonical_id = str(ticket.get("id") or ticket_id)
    updated_row = _save_ticket_atomic(canonical_id, updates)

    invalidate_tickets_cache()
    actor = _actor_name(user)
    _log_activity(ticket_id, actor, f"Assigned to {agent_name}", user_id=str(user.get("id") or ""), ticket=ticket)
    if body.priority and body.priority.strip().lower() != str(ticket.get("priority") or "").lower():
        _log_activity(ticket_id, actor, f"Priority changed to {body.priority.strip()}", user_id=str(user.get("id") or ""), ticket=ticket)
        _notify_ticket_change(ticket_id, updated_row, payload, user, "priority")

    assign_notifs: list[dict[str, Any]] = []
    cur_uids = {
        str(user.get("id") or "").strip().lower(),
        str(user.get("employee_id") or "").strip().lower(),
        str(user.get("email") or "").strip().lower(),
    }

    # 1. Notify the assigned agent
    if agent_id and str(agent_id).lower() not in cur_uids:
        assign_notifs.append({
            "title": f"Ticket Assigned: {ticket_id}",
            "message": f"You were assigned \"{ticket.get('subject')}\" by {actor}.",
            "for_role": f"user:{agent_id}",
            "ticket_id": ticket_id,
            "kind": "warning",
        })

    # 2. Notify the ticket creator
    creator_id = str(ticket.get("employee_id") or ticket.get("requester_id") or "").strip()
    if creator_id and creator_id.lower() not in cur_uids and creator_id.lower() != str(agent_id or "").lower():
        assign_notifs.append({
            "title": f"Ticket Assigned: {ticket_id}",
            "message": f"Your ticket \"{ticket.get('subject')}\" was assigned to {agent_name}.",
            "for_role": f"user:{creator_id}",
            "ticket_id": ticket_id,
            "kind": "info",
        })

    # 3. Notify department
    dept = ticket.get("department")
    if dept:
        assign_notifs.append({
            "title": f"Ticket Assigned: {ticket_id}",
            "message": f"{actor} assigned \"{ticket.get('subject')}\" to {agent_name}.",
            "for_role": f"dept:{dept}",
            "ticket_id": ticket_id,
            "kind": "info",
        })

    # 4. Notify admin
    if not is_admin(payload):
        assign_notifs.append({
            "title": f"Ticket Assigned: {ticket_id}",
            "message": f"{actor} assigned \"{ticket.get('subject')}\" to {agent_name}.",
            "for_role": "admin",
            "ticket_id": ticket_id,
            "kind": "info",
        })

    _notify_batch(assign_notifs)
    if body.note:
        _log_activity(ticket_id, actor, body.note, user_id=str(user.get("id") or ""), ticket=ticket)
    ret = serialize_ticket(updated_row, payload=payload, user=user)
    if agent_id:
        ret["assigned_agent_id"] = agent_id
    if assigned_team_id is not None:
        ret["assigned_team_id"] = assigned_team_id
    return ret


@router.patch("/{ticket_id}/status", include_in_schema=False)
@router.post("/{ticket_id}/status", summary="Change ticket status")
def change_status(
    ticket_id: str,
    body: StatusRequest,
    context: tuple[dict[str, Any], dict[str, Any]] = Depends(_current),
) -> dict[str, Any]:
    payload, user = context
    ticket = _require_visible(payload, user, ticket_id)
    if not can_manage_ticket(payload, user, ticket):
        raise HTTPException(status_code=403, detail="You cannot change this ticket")

    now = datetime.now(timezone.utc).isoformat()
    new_status = body.status.strip()
    canonical_id = str(ticket.get("id") or ticket_id)
    updated_row = _save_ticket_atomic(canonical_id, {"status": new_status, "updated_at": now})

    invalidate_tickets_cache()
    actor = _actor_name(user)
    _log_activity(ticket_id, actor, f"Status changed to {body.status}.{f' Note: {body.note}' if body.note else ''}", user_id=str(user.get("id") or ""), ticket=ticket)
    _notify_ticket_change(ticket_id, updated_row, payload, user, "status")
    return serialize_ticket(updated_row, payload=payload, user=user)


@router.post("/{ticket_id}/escalate", summary="Escalate a ticket")
def escalate_ticket(
    ticket_id: str,
    body: EscalateRequest,
    context: tuple[dict[str, Any], dict[str, Any]] = Depends(_current),
) -> dict[str, Any]:
    payload, user = context
    ticket = _require_visible(payload, user, ticket_id)
    if not can_manage_ticket(payload, user, ticket):
        raise HTTPException(status_code=403, detail="You cannot escalate this ticket")

    now = datetime.now(timezone.utc).isoformat()
    canonical_id = str(ticket.get("id") or ticket_id)
    updated_row = _save_ticket_atomic(canonical_id, {"status": "Escalated", "updated_at": now})

    # Escalation history
    note_val = (body.notes or body.note or body.comment or "").strip()
    reason_val = body.reason.strip()
    if not note_val and ": " in reason_val:
        parts = reason_val.split(": ", 1)
        reason_val = parts[0].strip()
        note_val = parts[1].strip()

    sb = get_supabase_admin_client()
    try:
        sb.table("escalations").insert(
            {
                "id": f"ESC-{int(time.time() * 1000)}-{random.randint(100, 999)}",
                "ticket_id": canonical_id,
                "reason": reason_val,
                "escalated_by": _actor_name(user),
                "escalated_to": body.escalated_to or "Team Lead",
                "notes": note_val or reason_val,
                "created_at": now,
            }
        ).execute()
    except Exception as exc:
        print(f"[tickets] escalation row error for {ticket_id}: {exc}")

    invalidate_tickets_cache()
    actor = _actor_name(user)
    _log_activity(ticket_id, actor, f"Escalated ticket: {body.reason}", user_id=str(user.get("id") or ""), ticket=ticket)
    esc_notifs: list[dict[str, Any]] = [
        {
            "title": f"Ticket Escalated: {ticket_id}",
            "message": f"{actor} escalated \"{ticket.get('subject')}\": {body.reason}",
            "for_role": "teamlead",
            "ticket_id": ticket_id,
            "kind": "error",
        },
        {
            "title": f"Ticket Escalated: {ticket_id}",
            "message": f"Your ticket \"{ticket.get('subject')}\" was escalated.",
            "for_role": f"user:{ticket.get('employee_id')}" if ticket.get("employee_id") else "employee",
            "ticket_id": ticket_id,
            "kind": "warning",
        },
        {
            "title": f"Ticket Escalated: {ticket_id}",
            "message": f"{actor} escalated \"{ticket.get('subject')}\": {body.reason}",
            "for_role": "admin",
            "ticket_id": ticket_id,
            "kind": "error",
        },
    ]
    if ticket.get("department"):
        esc_notifs.append({
            "title": f"Ticket Escalated: {ticket_id}",
            "message": f"{actor} escalated \"{ticket.get('subject')}\": {body.reason}",
            "for_role": f"dept:{ticket['department']}",
            "ticket_id": ticket_id,
            "kind": "error",
        })
    _notify_batch(esc_notifs)
    return serialize_ticket({**updated_row, "escalation_reason": body.reason}, payload=payload, user=user)


@router.post("/{ticket_id}/resolve", summary="Resolve a ticket")
def resolve_ticket(
    ticket_id: str,
    body: ResolveRequest,
    context: tuple[dict[str, Any], dict[str, Any]] = Depends(_current),
) -> dict[str, Any]:
    payload, user = context
    ticket = _require_visible(payload, user, ticket_id)
    if not can_manage_ticket(payload, user, ticket):
        raise HTTPException(status_code=403, detail="You cannot resolve this ticket")

    now = datetime.now(timezone.utc).isoformat()
    summary = body.resolution_summary.strip() or "Resolved."
    canonical_id = str(ticket.get("id") or ticket_id)
    updated_row = _save_ticket_atomic(canonical_id, {"status": "Resolved", "updated_at": now})

    invalidate_tickets_cache()
    actor = _actor_name(user)
    _log_activity(ticket_id, actor, f"Marked ticket as Resolved. Resolution: {summary}", user_id=str(user.get("id") or ""), ticket=ticket)

    resolve_notifs: list[dict[str, Any]] = []
    cur_uids = {
        str(user.get("id") or "").strip().lower(),
        str(user.get("employee_id") or "").strip().lower(),
        str(user.get("email") or "").strip().lower(),
    }
    creator_id = str(ticket.get("employee_id") or ticket.get("requester_id") or "").strip()
    if creator_id and creator_id.lower() not in cur_uids:
        resolve_notifs.append({
            "title": f"Ticket Resolved: {ticket_id}",
            "message": f"Your ticket \"{ticket.get('subject')}\" was resolved by {actor}.",
            "for_role": f"user:{creator_id}",
            "ticket_id": ticket_id,
            "kind": "success",
        })
    agent_id = str(ticket.get("assigned_agent_id") or "").strip()
    if agent_id and agent_id.lower() not in cur_uids and agent_id.lower() != creator_id.lower():
        resolve_notifs.append({
            "title": f"Ticket Resolved: {ticket_id}",
            "message": f"Ticket \"{ticket.get('subject')}\" was resolved by {actor}.",
            "for_role": f"user:{agent_id}",
            "ticket_id": ticket_id,
            "kind": "success",
        })
    if not is_admin(payload):
        resolve_notifs.append({
            "title": f"Ticket Resolved: {ticket_id}",
            "message": f"Ticket \"{ticket.get('subject')}\" was resolved by {actor}.",
            "for_role": "admin",
            "ticket_id": ticket_id,
            "kind": "success",
        })
    _notify_batch(resolve_notifs)
    return serialize_ticket(updated_row, payload=payload, user=user)


# ── Comments / activities ────────────────────────────────────────────────────

@router.get("/{ticket_id}/comments", summary="List comments for a ticket")
def list_comments(
    ticket_id: str,
    context: tuple[dict[str, Any], dict[str, Any]] = Depends(_current),
) -> list[dict[str, Any]]:
    payload, user = context
    ticket = _require_visible(payload, user, ticket_id)
    if not can_view_ticket_chat(payload, user, ticket):
        raise HTTPException(status_code=403, detail="You do not have chat access to this ticket")
    cands: list[str] = [ticket_id]
    for cand in (ticket.get("id"), ticket.get("ticket_number")):
        if cand and str(cand).strip() not in cands:
            cands.append(str(cand).strip())
    sb = get_supabase_admin_client()
    res = (
        sb.table("ticket_comments")
        .select("*")
        .in_("ticket_id", cands)
        .order("created_at", desc=False)
        .execute()
    )
    raw_rows = res.data or []
    rows = [
        r for r in raw_rows
        if r.get("author_name") not in ("__attachment__", "__activity__")
        and not str(r.get("message") or "").startswith(("[ATTACHMENT_V1]:", "[ACTIVITY_V1]:"))
    ]
    if not can_view_internal_notes(payload, user, ticket):
        rows = [r for r in rows if not r.get("is_internal")]
    return rows


@router.post("/{ticket_id}/comments", status_code=status.HTTP_201_CREATED, summary="Add a comment")
def add_comment(
    ticket_id: str,
    body: CommentCreate,
    context: tuple[dict[str, Any], dict[str, Any]] = Depends(_current),
) -> dict[str, Any]:
    payload, user = context
    ticket = _require_visible(payload, user, ticket_id)

    if not can_reply_ticket_chat(payload, user, ticket):
        raise HTTPException(
            status_code=403,
            detail="Tickets under My Tickets and Assigned Tickets have chat/reply access for the ticket creator and assigned users working on the ticket. All other users have view-only access."
        )

    role = role_of(payload)
    is_internal = bool(body.is_internal)
    if is_internal and not can_view_internal_notes(payload, user, ticket):
        raise HTTPException(status_code=403, detail="Employees cannot add internal notes")

    now = datetime.now(timezone.utc).isoformat()
    author_uid = _resolve_valid_author_user_id(str(user.get("id") or payload.get("sub") or ""), ticket)
    row = {
        "id": f"comm-{int(time.time() * 1000)}-{random.randint(100, 999)}",
        "ticket_id": ticket_id,
        "author_user_id": author_uid,
        "author_name": _actor_name(user),
        "author_role": role,
        "message": body.message,
        "is_internal": is_internal,
        "created_at": now,
    }
    sb = get_supabase_admin_client()
    try:
        res = sb.table("ticket_comments").insert(row).execute()
        created = (res.data or [row])[0]
    except Exception as exc:
        err_str = str(exc)
        if "author_user_id" in err_str:
            row_alt = dict(row)
            row_alt["author_id"] = row_alt.pop("author_user_id", None)
            try:
                res = sb.table("ticket_comments").insert(row_alt).execute()
                created = (res.data or [row_alt])[0]
            except Exception as exc2:
                # Fallback omitting author column if schema has different constraint
                row_min = dict(row_alt)
                row_min.pop("author_id", None)
                try:
                    res = sb.table("ticket_comments").insert(row_min).execute()
                    created = (res.data or [row_min])[0]
                except Exception as exc3:
                    raise HTTPException(status_code=502, detail=f"Could not save comment: {exc3}") from exc3
        elif "author_id" in err_str:
            row_alt = dict(row)
            row_alt["author_user_id"] = row_alt.pop("author_id", None)
            try:
                res = sb.table("ticket_comments").insert(row_alt).execute()
                created = (res.data or [row_alt])[0]
            except Exception as exc2:
                raise HTTPException(status_code=502, detail=f"Could not save comment: {exc2}") from exc2
        else:
            raise HTTPException(status_code=502, detail=f"Could not save comment: {exc}") from exc

    _log_activity(
        ticket_id,
        _actor_name(user),
        "Added internal note" if is_internal else "Added reply",
        user_id=author_uid,
        ticket=ticket,
    )
    if not is_internal:
        notif_targets: set[str] = set()
        creator_uid = str(ticket.get("employee_id") or ticket.get("requester_id") or "").strip()
        assigned_uid = str(ticket.get("assigned_agent_id") or "").strip()
        cur_uid = str(user.get("id") or payload.get("sub") or "").strip()

        if creator_uid and creator_uid != cur_uid:
            notif_targets.add(creator_uid)
        if assigned_uid and assigned_uid != cur_uid:
            notif_targets.add(assigned_uid)

        for tid in (ticket.get("team_lead_ids") or []):
            if tid and str(tid).strip() != cur_uid:
                notif_targets.add(str(tid).strip())
        for eid in (ticket.get("tagged_employee_ids") or []):
            if eid and str(eid).strip() != cur_uid:
                notif_targets.add(str(eid).strip())

        for target_uid in notif_targets:
            _notify(
                title=f"New Reply: {ticket_id}",
                message=f"{_actor_name(user)} commented on \"{ticket.get('subject')}\".",
                for_role=f"user:{target_uid}",
                ticket_id=ticket_id,
                kind="info",
            )
    return created


@router.get("/{ticket_id}/activities", summary="List ticket activity history")
def list_activities(
    ticket_id: str,
    context: tuple[dict[str, Any], dict[str, Any]] = Depends(_current),
) -> list[dict[str, Any]]:
    payload, user = context
    ticket = _require_visible(payload, user, ticket_id)
    cands: list[str] = [ticket_id]
    for cand in (ticket.get("id"), ticket.get("ticket_number")):
        if cand and str(cand).strip() not in cands:
            cands.append(str(cand).strip())
    return _fetch_all_activities(cands)
