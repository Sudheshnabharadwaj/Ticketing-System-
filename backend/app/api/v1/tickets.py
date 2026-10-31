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


def _log_activity(ticket_id: str, actor: str, action: str) -> None:
    """Best-effort activity log (the table is RLS restricted in some envs)."""
    invalidate_tickets_cache()
    try:
        get_supabase_admin_client().table("ticket_activities").insert(
            {
                "id": f"act-{int(time.time() * 1000)}-{random.randint(100, 999)}",
                "ticket_id": ticket_id,
                "user": actor,
                "action": action,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
        ).execute()
    except Exception as exc:  # pragma: no cover - depends on RLS configuration
        print(f"[tickets] activity log skipped for {ticket_id}: {exc}")


def _notify(
    title: str,
    message: str,
    for_role: str,
    ticket_id: str | None = None,
    kind: str = "info",
) -> None:
    """Best-effort persisted in-app notification."""
    try:
        get_supabase_admin_client().table("portal_notifications").insert(
            {
                "id": f"notif-{int(time.time() * 1000)}-{random.randint(100, 999)}",
                "ticket_id": ticket_id,
                "title": title,
                "message": message,
                "type": kind,
                "for_role": for_role,
                "read": False,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
        ).execute()
    except Exception as exc:  # pragma: no cover - depends on RLS configuration
        print(f"[tickets] notification skipped ({for_role}): {exc}")


def _notify_batch(items: list[dict[str, Any]]) -> None:
    """Persist multiple in-app notifications in a single batch roundtrip."""
    if not items:
        return
    now_str = datetime.now(timezone.utc).isoformat()
    rows = [
        {
            "id": f"notif-{int(time.time() * 1000)}-{random.randint(100, 999)}",
            "ticket_id": item.get("ticket_id"),
            "title": item.get("title"),
            "message": item.get("message"),
            "type": item.get("kind", "info"),
            "for_role": item.get("for_role"),
            "read": False,
            "timestamp": now_str,
        }
        for item in items
    ]
    try:
        get_supabase_admin_client().table("portal_notifications").insert(rows).execute()
    except Exception as exc:  # pragma: no cover - depends on RLS configuration
        print(f"[tickets] batch notification skipped: {exc}")


def _find_user(user_id: str | None = None, email: str | None = None) -> dict[str, Any] | None:
    if not user_id and not email:
        return None
    uid = str(user_id).strip().lower() if user_id else None
    em = str(email).strip().lower() if email else None
    # 1. Check in-memory cached user list first to eliminate redundant WAN latency
    for u in fetch_all_users_cached():
        if uid and str(u.get("id") or "").strip().lower() == uid:
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
        uname = str(u.get("name") or "").strip().lower()
        uemail = str(u.get("email") or "").strip().lower()
        if clean in (uid, uname, uemail):
            return u
    for u in all_users:
        uid = str(u.get("id") or "").strip().lower()
        uname = str(u.get("name") or "").strip().lower()
        if uid and uid in clean:
            return u
        if uname and len(uname) >= 3 and (uname in clean or clean in uname):
            return u
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
            if c.get("author_name") != "__attachment__"
            and not str(c.get("message") or "").startswith("[ATTACHMENT_V1]:")
        ]
    except Exception as exc:
        print(f"[tickets] comments unavailable: {exc}")

    try:
        res = (
            sb.table("ticket_activities")
            .select("*")
            .in_("ticket_id", cands)
            .order("timestamp", desc=True)
            .execute()
        )
        activities = res.data or []
    except Exception as exc:
        print(f"[tickets] activities unavailable: {exc}")

    result = serialize_ticket(ticket, load_attachments=True)
    # Internal notes are only returned to users who can manage the ticket.
    if not can_manage_ticket(payload, user, ticket):
        comments = [c for c in comments if not c.get("is_internal")]
    result["comments"] = comments
    result["activities"] = activities
    result["history"] = [
        {
            "id": a.get("id"),
            "author": a.get("user"),
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
        if body.assigned_agent_id:
            raise HTTPException(status_code=403, detail="Employees cannot assign tickets directly")
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

    # If agent was not specified explicitly, resolve from selected employees
    if not agent_id and raw_emp_ids:
        first_emp_id = next(iter(raw_emp_ids))
        emp_target = _find_user(user_id=first_emp_id)
        if emp_target:
            agent_id = str(emp_target.get("id") or "")
            agent = str(emp_target.get("name") or agent or "Employee")
            agent_email = str(emp_target.get("email") or "").lower() or None
            body.assigned_to_type = "employee"
    elif not agent_id and raw_tl_ids:
        # Route to selected Team Lead, UNLESS the selected Team Lead is the creator themselves.
        # (Requirement: Team Lead created tickets must NOT automatically appear in their own Assigned Tickets unless explicitly selected)
        creator_id = str(user.get("id") or "").strip()
        candidate_leads = [tlid for tlid in raw_tl_ids if not (is_teamlead(payload) and tlid == creator_id)]
        if candidate_leads:
            first_tl_id = candidate_leads[0]
            tl_target = _find_user(user_id=first_tl_id)
            if tl_target:
                agent_id = str(tl_target.get("id") or "")
                agent = str(tl_target.get("name") or agent or "Team Lead")
                agent_email = str(tl_target.get("email") or "").lower() or None
                body.assigned_to_type = "teamlead"

    if raw_tl_ids:
        permitted_employee_ids: set[str] = set()
        for tlid in raw_tl_ids:
            tl_row = _find_user(user_id=tlid)
            if not tl_row or normalize_role(tl_row.get("role")) != ROLE_TEAMLEAD:
                raise HTTPException(status_code=400, detail=f"Invalid Team Lead ID: {tlid}")
            if departments:
                tl_dept = tl_row.get("department")
                if not any(_scopes_overlap(tl_dept, d) for d in departments):
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
                raise HTTPException(
                    status_code=400,
                    detail=f"Employee {emp_row.get('name') or empid} does not belong to the selected Team Lead(s)",
                )
            if departments:
                emp_dept = emp_row.get("department")
                if not any(_scopes_overlap(emp_dept, d) for d in departments):
                    raise HTTPException(
                        status_code=400,
                        detail=f"Employee {emp_row.get('name') or empid} does not belong to the selected department(s)",
                    )

    # Determine assigned_to_type and handled_by
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
    _log_activity(ticket_id, _actor_name(user), "Ticket created")

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

    sb = get_supabase_admin_client()
    canonical_id = str(ticket.get("id") or ticket_id)
    try:
        res = sb.table("tickets").update(updates).eq("id", canonical_id).execute()
        if not (res.data or []):
            res = sb.table("tickets").update(updates).eq("ticket_number", ticket_id).execute()
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Could not update ticket: {exc}") from exc
    if not (res.data or []):
        raise HTTPException(status_code=404, detail="Ticket not found or update failed")

    actor = _actor_name(user)
    changed = ", ".join(sorted(k for k in updates if k != "updated_at"))
    _log_activity(ticket_id, actor, f"Updated {changed}")
    if body.activity_note:
        _log_activity(ticket_id, actor, body.activity_note)

    updated = (res.data or [ticket])[0]
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
    """Notify the requester, assignee and department queue about a change."""
    actor = _actor_name(user)
    recipients: set[str] = set()
    if ticket.get("employee_id"):
        recipients.add(f"user:{ticket['employee_id']}")
    if ticket.get("assigned_agent_id"):
        recipients.add(f"user:{ticket['assigned_agent_id']}")
    for target in recipients:
        if target == f"user:{user.get('id')}":
            continue
        _notify(
            title=f"Ticket Updated: {ticket_id}",
            message=f"{actor} updated {changed or 'the ticket'} on \"{ticket.get('subject')}\".",
            for_role=target,
            ticket_id=ticket_id,
            kind="info",
        )
    if ticket.get("department"):
        _notify(
            title=f"Ticket Updated: {ticket_id}",
            message=f"{actor} updated {changed or 'the ticket'} (status: {ticket.get('status')}).",
            for_role=f"dept:{ticket['department']}",
            ticket_id=ticket_id,
            kind="info",
        )


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
        if not target:
            raise HTTPException(status_code=400, detail="Assigned user does not exist")
        agent_name = str(target.get("name") or agent_name or "Unassigned")
    elif agent_name and agent_name.lower() != "unassigned":
        target = _find_user_by_name(agent_name)
        if target:
            agent_id = str(target.get("id") or "")
            agent_name = str(target.get("name") or agent_name)

    if not agent_name:
        raise HTTPException(status_code=400, detail="An assignee is required")
    if agent_name.lower() == "unassigned":
        agent_id = None
        target = None

    if is_teamlead(payload) and agent_id:
        tl_id = str(user.get("id") or "").strip()
        managed = teamlead_managed_employees(user)
        managed_ids = {str(m.get("id")) for m in managed if m.get("id")}
        if agent_id != tl_id and agent_id not in managed_ids:
            raise HTTPException(
                status_code=403,
                detail="Team Leads can only assign tickets to members of their own team",
            )

    now = datetime.now(timezone.utc).isoformat()
    target_role = normalize_role(target.get("role")) if target else None
    assigned_to_type = body.assigned_to_type or ("teamlead" if target_role == ROLE_TEAMLEAD else ("employee" if agent_id else "unassigned"))
    handled_by = body.handled_by or ("teamlead" if assigned_to_type == "teamlead" else ("employee" if agent_id else "unassigned"))

    updates: dict[str, Any] = {
        "assigned_agent": agent_name,
        "assigned_agent_id": agent_id,
        "assigned_date": now,
        "assigned_to_type": assigned_to_type,
        "handled_by": handled_by,
        "assigned_by": body.assigned_by or _actor_name(user),
        "assigned_by_user_id": str(user.get("id") or ""),
        "updated_at": now,
    }
    if body.priority:
        norm_priority = body.priority.strip()
        updates["priority"] = norm_priority
        updates["sla_due_at"] = _sla_due(norm_priority, created_at=ticket.get("created_at"))
        from app.services.access import compute_sla
        new_sla = compute_sla({**ticket, **updates})
        updates["sla_status"] = new_sla["status"]

    assigned_team_id: int | None = None
    if target:
        assigned_team_id = resolve_team_id(target.get("team")) or resolve_team_id(target.get("id"))
    if not assigned_team_id and is_teamlead(payload):
        assigned_team_id = resolve_team_id(user.get("team")) or resolve_team_id(user.get("id"))
    if assigned_team_id is not None:
        updates["assigned_team_id"] = assigned_team_id

    sb = get_supabase_admin_client()
    canonical_id = str(ticket.get("id") or ticket_id)
    try:
        res = sb.table("tickets").update(updates).eq("id", canonical_id).execute()
        if not (res.data or []):
            res = sb.table("tickets").update(updates).eq("ticket_number", ticket_id).execute()
    except Exception as exc:
        if "Employees may only change status" in str(exc) or "42501" in str(exc):
            # Postgres trigger restricts anon updates on assigned_agent_id and assigned_team_id
            updates.pop("assigned_agent_id", None)
            updates.pop("assigned_team_id", None)
            res = sb.table("tickets").update(updates).eq("id", canonical_id).execute()
            if not (res.data or []):
                res = sb.table("tickets").update(updates).eq("ticket_number", ticket_id).execute()
        else:
            raise HTTPException(status_code=502, detail=f"Database update failed: {exc}") from exc
    if not (res.data or []):
        raise HTTPException(status_code=404, detail="Ticket not found or assignment failed")

    invalidate_tickets_cache()
    actor = _actor_name(user)
    _log_activity(ticket_id, actor, f"Assigned to {agent_name}")
    if body.priority and body.priority.strip().lower() != str(ticket.get("priority") or "").lower():
        _log_activity(ticket_id, actor, f"Priority changed to {body.priority.strip()}")
    _notify(
        title=f"Ticket Assigned: {ticket_id}",
        message=f"{actor} assigned \"{ticket.get('subject')}\" to {agent_name}.",
        for_role=f"user:{agent_id}" if agent_id else f"dept:{ticket.get('department') or 'all'}",
        ticket_id=ticket_id,
        kind="warning",
    )
    if body.note:
        _log_activity(ticket_id, actor, body.note)
    ret = serialize_ticket((res.data or [ticket])[0], payload=payload, user=user)
    if agent_id:
        ret["assigned_agent_id"] = agent_id
    if assigned_team_id is not None:
        ret["assigned_team_id"] = assigned_team_id
    return ret


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
    updates: dict[str, Any] = {"status": new_status, "updated_at": now}
    if new_status.lower() == "resolved":
        updates["resolved_at"] = now
    elif new_status.lower() == "closed":
        updates["closed_at"] = now

    from app.services.access import compute_sla
    new_sla = compute_sla({**ticket, **updates})
    updates["sla_status"] = new_sla["status"]

    sb = get_supabase_admin_client()
    canonical_id = str(ticket.get("id") or ticket_id)
    try:
        res = sb.table("tickets").update(updates).eq("id", canonical_id).execute()
        if not (res.data or []):
            res = sb.table("tickets").update(updates).eq("ticket_number", ticket_id).execute()
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Database update failed: {exc}") from exc
    if not (res.data or []):
        raise HTTPException(status_code=404, detail="Ticket not found or update failed")

    invalidate_tickets_cache()
    actor = _actor_name(user)
    _log_activity(ticket_id, actor, f"Status changed to {body.status}.{f' Note: {body.note}' if body.note else ''}")
    _notify_ticket_change(ticket_id, (res.data or [ticket])[0], payload, user, "status")
    return serialize_ticket((res.data or [ticket])[0], payload=payload, user=user)


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
    sb = get_supabase_admin_client()
    res = sb.table("tickets").update(
        {"status": "Escalated", "escalation_reason": body.reason, "updated_at": now}
    ).eq("id", ticket_id).execute()

    # Escalation history is best-effort: the table is RLS protected in some
    # deployments (writes fail without a service-role key).
    try:
        sb.table("escalations").insert(
            {
                "id": f"ESC-{int(time.time() * 1000)}",
                "ticket_id": ticket_id,
                "subject": ticket.get("subject") or f"Escalated Ticket {ticket_id}",
                "priority": ticket.get("priority") or "High",
                "escalated_by": _actor_name(user),
                "escalated_to": body.escalated_to or "Tier 3 Operations",
                "escalation_reason": body.reason,
                "sla_status": ticket.get("sla_status") or "Escalated",
                "escalated_date": now.replace("T", " ")[:16],
                "status": "Pending Review",
            }
        ).execute()
    except Exception as exc:
        print(f"[tickets] escalation row skipped for {ticket_id}: {exc}")

    invalidate_tickets_cache()
    actor = _actor_name(user)
    _log_activity(ticket_id, actor, f"Escalated ticket: {body.reason}")
    _notify(
        title=f"Ticket Escalated: {ticket_id}",
        message=f"{actor} escalated \"{ticket.get('subject')}\": {body.reason}",
        for_role="teamlead",
        ticket_id=ticket_id,
        kind="error",
    )
    _notify(
        title=f"Ticket Escalated: {ticket_id}",
        message=f"Your ticket \"{ticket.get('subject')}\" was escalated.",
        for_role=f"user:{ticket.get('employee_id')}" if ticket.get("employee_id") else "employee",
        ticket_id=ticket_id,
        kind="warning",
    )
    _notify(
        title=f"Ticket Escalated: {ticket_id}",
        message=f"{actor} escalated \"{ticket.get('subject')}\": {body.reason}",
        for_role="admin",
        ticket_id=ticket_id,
        kind="error",
    )
    return serialize_ticket((res.data or [ticket])[0], payload=payload, user=user)


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

    from app.services.access import compute_sla
    new_sla = compute_sla({**ticket, "status": "Resolved", "resolved_at": now})
    updates = {
        "status": "Resolved",
        "resolution_summary": summary,
        "resolved_at": now,
        "sla_status": new_sla["status"],
        "updated_at": now,
    }

    sb = get_supabase_admin_client()
    canonical_id = str(ticket.get("id") or ticket_id)
    try:
        res = sb.table("tickets").update(updates).eq("id", canonical_id).execute()
        if not (res.data or []):
            res = sb.table("tickets").update(updates).eq("ticket_number", ticket_id).execute()
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Database update failed: {exc}") from exc
    if not (res.data or []):
        raise HTTPException(status_code=404, detail="Ticket not found or update failed")

    invalidate_tickets_cache()
    actor = _actor_name(user)
    _log_activity(ticket_id, actor, f"Marked ticket as Resolved. Resolution: {summary}")
    _notify(
        title=f"Ticket Resolved: {ticket_id}",
        message=f"Your ticket \"{ticket.get('subject')}\" was resolved by {actor}.",
        for_role=f"user:{ticket.get('employee_id')}" if ticket.get("employee_id") else "employee",
        ticket_id=ticket_id,
        kind="success",
    )
    return serialize_ticket((res.data or [ticket])[0], payload=payload, user=user)


# ── Comments / activities ────────────────────────────────────────────────────

@router.get("/{ticket_id}/comments", summary="List comments for a ticket")
def list_comments(
    ticket_id: str,
    context: tuple[dict[str, Any], dict[str, Any]] = Depends(_current),
) -> list[dict[str, Any]]:
    payload, user = context
    ticket = _require_visible(payload, user, ticket_id)
    sb = get_supabase_admin_client()
    res = (
        sb.table("ticket_comments")
        .select("*")
        .eq("ticket_id", ticket_id)
        .order("created_at", desc=False)
        .execute()
    )
    raw_rows = res.data or []
    rows = [
        r for r in raw_rows
        if r.get("author_name") != "__attachment__"
        and not str(r.get("message") or "").startswith("[ATTACHMENT_V1]:")
    ]
    if not can_manage_ticket(payload, user, ticket):
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
    if not can_manage_ticket(payload, user, ticket):
        raise HTTPException(status_code=403, detail="You cannot comment on this ticket")
    role = role_of(payload)
    is_internal = bool(body.is_internal)
    if is_internal and role == "employee":
        raise HTTPException(status_code=403, detail="Employees cannot add internal notes")

    now = datetime.now(timezone.utc).isoformat()
    row = {
        "id": f"comm-{int(time.time() * 1000)}-{random.randint(100, 999)}",
        "ticket_id": ticket_id,
        "author_user_id": str(user.get("id") or ""),
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
        raise HTTPException(status_code=502, detail=f"Could not save comment: {exc}") from exc

    _log_activity(ticket_id, _actor_name(user), "Added internal note" if is_internal else "Added reply")
    if not is_internal:
        target = ticket.get("employee_id") if str(user.get("id")) == str(ticket.get("assigned_agent_id")) else ticket.get("assigned_agent_id")
        if target:
            _notify(
                title=f"New Reply: {ticket_id}",
                message=f"{_actor_name(user)} commented on \"{ticket.get('subject')}\".",
                for_role=f"user:{target}",
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
    _require_visible(payload, user, ticket_id)
    sb = get_supabase_admin_client()
    try:
        res = (
            sb.table("ticket_activities")
            .select("*")
            .eq("ticket_id", ticket_id)
            .order("timestamp", desc=True)
            .execute()
        )
        return res.data or []
    except Exception as exc:
        print(f"[tickets] activities unavailable: {exc}")
        return []
