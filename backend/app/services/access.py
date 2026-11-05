"""Role/ownership scoping helpers shared by the authenticated API surface.

Every query that returns application data goes through these helpers. The
frontends never supply a user/team id that is trusted: identity always comes
from the validated JWT, and the matching DB row is loaded server-side.
"""

from __future__ import annotations

import re
import time
from datetime import datetime, timedelta, timezone
from typing import Any, Iterable

from app.db.supabase import get_supabase_admin_client

# ── Roles ────────────────────────────────────────────────────────────────────

ROLE_ADMIN = "admin"
ROLE_TEAMLEAD = "teamlead"
ROLE_EMPLOYEE = "employee"

ROLE_ALIASES: dict[str, str] = {
    "admin": ROLE_ADMIN,
    "administrator": ROLE_ADMIN,
    "superadmin": ROLE_ADMIN,
    "super admin": ROLE_ADMIN,
    "teamlead": ROLE_TEAMLEAD,
    "team lead": ROLE_TEAMLEAD,
    "team_lead": ROLE_TEAMLEAD,
    "lead": ROLE_TEAMLEAD,
    "supervisor": ROLE_TEAMLEAD,
    "manager": ROLE_TEAMLEAD,
    "employee": ROLE_EMPLOYEE,
    "user": ROLE_EMPLOYEE,
    "agent": ROLE_EMPLOYEE,
    "member": ROLE_EMPLOYEE,
}


def normalize_role(raw: str | None) -> str:
    value = (raw or "").strip().lower()
    if value in ROLE_ALIASES:
        return ROLE_ALIASES[value]
    if "admin" in value:
        return ROLE_ADMIN
    if "lead" in value:
        return ROLE_TEAMLEAD
    return ROLE_EMPLOYEE


def role_of(payload: dict[str, Any]) -> str:
    return normalize_role(payload.get("role") or "")


def is_admin(payload: dict[str, Any]) -> bool:
    return role_of(payload) == ROLE_ADMIN


def is_teamlead(payload: dict[str, Any]) -> bool:
    return role_of(payload) == ROLE_TEAMLEAD


# ── User record & Team cache (cached with short TTL) ─────────────────────────

_USER_CACHE: dict[str, tuple[float, dict[str, Any]]] = {}
_USER_CACHE_TTL = 30.0  # seconds

_TEAM_MEMBERS_CACHE: dict[str, tuple[float, list[dict[str, Any]]]] = {}
_TEAM_MEMBERS_TTL = 30.0  # seconds

# Lookup index (ids/emails/names) of a team lead's managed employees. Building
# it once per team instead of once per ticket keeps ticket visibility checks
# linear rather than quadratic.
_TEAM_MEMBER_INDEX_CACHE: dict[str, tuple[float, tuple[set[str], set[str], set[str]]]] = {}

_ALL_USERS_CACHE: tuple[float, list[dict[str, Any]]] | None = None
_ALL_USERS_TTL = 30.0  # seconds


def invalidate_all_users_cache() -> None:
    global _ALL_USERS_CACHE
    _ALL_USERS_CACHE = None


def fetch_all_users_cached() -> list[dict[str, Any]]:
    global _ALL_USERS_CACHE
    now = time.time()
    if _ALL_USERS_CACHE and (now - _ALL_USERS_CACHE[0]) < _ALL_USERS_TTL:
        return _ALL_USERS_CACHE[1]
    sb = get_supabase_admin_client()
    try:
        res = (
            sb.table("users")
            .select("id, name, email, phone, role, department, designation, team, avatar, location, status, created_at")
            .execute()
        )
        data = res.data or []
        _ALL_USERS_CACHE = (now, data)
        return data
    except Exception as exc:
        print(f"[access] could not fetch all users: {exc}")
        return _ALL_USERS_CACHE[1] if _ALL_USERS_CACHE else []


def invalidate_team_cache(tl_id: str | None = None) -> None:
    if tl_id:
        clean = str(tl_id).strip()
        _TEAM_MEMBERS_CACHE.pop(clean, None)
        _TEAM_MEMBER_INDEX_CACHE.pop(clean, None)
    else:
        _TEAM_MEMBERS_CACHE.clear()
        _TEAM_MEMBER_INDEX_CACHE.clear()


def invalidate_user_cache(user_id: str | None = None, email: str | None = None) -> None:
    invalidate_all_users_cache()
    if user_id:
        clean_id = str(user_id).strip()
        if clean_id in _USER_CACHE:
            _USER_CACHE.pop(clean_id, None)
        invalidate_team_cache(clean_id)
    if email:
        clean = email.strip().lower()
        if clean in _USER_CACHE:
            _USER_CACHE.pop(clean, None)


def load_current_user(payload: dict[str, Any]) -> dict[str, Any]:
    """Load the authenticated user's DB row using the token subject/email.

    Cached in-memory for 30s to avoid redundant WAN roundtrips on rapid dashboard actions.
    Raises ``LookupError`` when the account no longer exists.
    """
    sub = str(payload.get("sub") or "").strip()
    email = str(payload.get("email") or "").strip().lower()
    now = time.time()

    cache_key = sub or email
    if cache_key and cache_key in _USER_CACHE:
        cached_time, cached_row = _USER_CACHE[cache_key]
        if now - cached_time < _USER_CACHE_TTL:
            return cached_row

    # Fast path: check memory-cached users first (eliminates WAN roundtrip on every API request)
    all_users = fetch_all_users_cached()
    for u in all_users:
        uid = str(u.get("id") or "").strip()
        uemail = str(u.get("email") or "").strip().lower()
        if (sub and uid.lower() == sub.lower()) or (email and uemail == email):
            if uid:
                _USER_CACHE[uid] = (now, u)
            if uemail:
                _USER_CACHE[uemail] = (now, u)
            return u

    sb = get_supabase_admin_client()
    row: dict[str, Any] | None = None
    if sub:
        try:
            res = sb.table("users").select("*").eq("id", sub).limit(1).execute()
            rows = res.data or []
            row = rows[0] if rows else None
        except Exception:
            row = None
    if row is None and email:
        try:
            res = sb.table("users").select("*").eq("email", email).limit(1).execute()
            rows = res.data or []
            row = rows[0] if rows else None
        except Exception:
            row = None
    if row is None:
        raise LookupError("Authenticated user no longer exists")

    if sub:
        _USER_CACHE[sub] = (now, row)
    if email:
        _USER_CACHE[email] = (now, row)
    return row


def user_display_name(user: dict[str, Any], payload: dict[str, Any]) -> str:
    return str(user.get("name") or payload.get("name") or "").strip()


def _split_scope(value: Any) -> set[str]:
    """Turn a department/team cell into comparable lowercase tokens.

    Handles values such as ``"IT Support"``, ``"IT, HR"``,
    ``"IT Support & HR Operations"`` and lists.
    """
    if value is None:
        return set()
    if isinstance(value, (list, tuple, set)):
        parts: Iterable[Any] = value
    else:
        parts = re.split(r"[,;/|&]|\band\b", str(value), flags=re.IGNORECASE)
    tokens: set[str] = set()
    for part in parts:
        token = re.sub(r"\s+", " ", str(part or "")).strip().lower()
        if token:
            tokens.add(token)
    return tokens


def _scopes_overlap(a: Any, b: Any) -> bool:
    left = _split_scope(a)
    right = _split_scope(b)
    if not left or not right:
        return False
    if left & right:
        return True
    # "IT" (user) should match "IT Support" (ticket) and vice versa.
    for l in left:
        for r in right:
            if len(l) >= 2 and len(r) >= 2 and (l in r or r in l):
                return True
    return False


def _teams_overlap(a: Any, b: Any) -> bool:
    left = _split_scope(a)
    right = _split_scope(b)
    if not left or not right:
        return False
    return bool(left & right)


TEAM_NAME_OR_LEAD_TO_ID: dict[str, int] = {
    # Team Alpha (ID 1 in teams table, Lead Kotesh OKL003)
    "team alpha": 1,
    "alpha": 1,
    "okl003": 1,
    "kotesh": 1,
    "kotesh ananthu": 1,
    "l2 support & escalations": 1,
    # Team Beta (ID 2 in teams table, Lead Mounika OKL010)
    "team beta": 2,
    "beta": 2,
    "okl010": 2,
    "mounika": 2,
    "frontend guild": 2,
    # Other teams in DB
    "cloud infrastructure": 3,
    "talent acquisition": 4,
    "payroll & operations": 5,
    "digital campaigns": 6,
    "it support team": 7,
    "it support": 7,
    "it": 7,
    "it operations": 7,
    "okl120": 7,
    "manikanta": 7,
    "finance team": 8,
    "finance": 8,
    "hr operations team": 9,
    "hr operations": 9,
    "hr": 9,
    "okl011": 9,
    "facilities team": 10,
    "facilities": 10,
    "general administration team": 11,
    "general administration": 11,
}


def resolve_team_id(value: Any) -> int | None:
    if value is None:
        return None
    if isinstance(value, int):
        return value
    s = str(value).strip().lower()
    if not s or s in ("none", "null", "unassigned"):
        return None
    if s.isdigit():
        return int(s)
    return TEAM_NAME_OR_LEAD_TO_ID.get(s)



def teamlead_scope(user: dict[str, Any]) -> dict[str, Any]:
    """Derive the Team Lead's managed scope from the existing user columns.

    Scope is derived from unique user ID and team identifier.
    Department alone is never used to grant cross-team visibility.
    """
    return {
        "department": user.get("department"),
        "team": user.get("team"),
        "name": (user.get("name") or "").strip(),
        "id": str(user.get("id") or ""),
        "email": (user.get("email") or "").strip().lower(),
    }


def teamlead_managed_employees(tl_user: dict[str, Any]) -> list[dict[str, Any]]:
    """Return the list of employees belonging to this Team Lead's team.

    Enforces the relationship:
    - Target user is not an admin or another team lead.
    - Linked by employee.team matching tl.id or tl.team, OR
      employee.team_lead_id matching tl.id.
    - If the lead has no restricted team, employees in the same department
      are managed by this lead.
    """
    tl_id = str(tl_user.get("id") or "").strip()
    now = time.time()
    if tl_id and tl_id in _TEAM_MEMBERS_CACHE:
        cached_time, cached_rows = _TEAM_MEMBERS_CACHE[tl_id]
        if now - cached_time < _TEAM_MEMBERS_TTL:
            return cached_rows

    all_users = fetch_all_users_cached()

    tl_team = str(tl_user.get("team") or "").strip()
    tl_team_keys = {k.lower() for k in (tl_id, tl_team) if k}

    matched: list[dict[str, Any]] = []
    for u in all_users:
        uid = str(u.get("id") or "").strip()
        if uid == tl_id:
            continue
        urole = normalize_role(u.get("role"))
        if urole in (ROLE_ADMIN, ROLE_TEAMLEAD):
            continue

        uteam = str(u.get("team") or "").strip()
        is_member = False
        if uteam:
            if uteam.lower() in tl_team_keys or uteam.lower() == tl_id.lower():
                is_member = True
            elif tl_team and _teams_overlap(tl_team, uteam):
                is_member = True
        if not is_member and u.get("team_lead_id"):
            if str(u.get("team_lead_id") or "").strip() == tl_id:
                is_member = True
        if not is_member and not tl_team and not uteam:
            # If lead and employee both have no specific sub-team, match by department
            if _scopes_overlap(tl_user.get("department"), u.get("department")):
                is_member = True

        if is_member:
            matched.append(u)

    if tl_id:
        _TEAM_MEMBERS_CACHE[tl_id] = (now, matched)
    return matched


def teamlead_member_index(
    tl_user: dict[str, Any],
) -> tuple[set[str], set[str], set[str]]:
    """Cached ``(ids, emails, names)`` index of a Team Lead's managed employees.

    ``ticket_visible`` needs these lookups for every candidate ticket. Building
    the index once per team (instead of once per ticket) turns the per-ticket
    visibility check into a constant-time set lookup and keeps the dashboard
    list endpoints linear in the number of tickets.
    """
    tl_id = str(tl_user.get("id") or "").strip()
    now = time.time()
    if tl_id:
        cached = _TEAM_MEMBER_INDEX_CACHE.get(tl_id)
        if cached and (now - cached[0]) < _TEAM_MEMBERS_TTL:
            return cached[1]

    members = teamlead_managed_employees(tl_user)
    index = (
        {str(m.get("id")) for m in members if m.get("id")},
        {_norm(m.get("email")) for m in members if m.get("email")},
        {_norm(m.get("name")) for m in members if m.get("name")},
    )
    if tl_id:
        _TEAM_MEMBER_INDEX_CACHE[tl_id] = (now, index)
    return index


def find_user_team_lead(user: dict[str, Any], all_users: list[dict[str, Any]] | None = None) -> dict[str, Any] | None:
    """Find the Team Lead of a user (or the user themselves if they are already a Team Lead)."""
    role = normalize_role(user.get("role"))
    if role == ROLE_TEAMLEAD:
        return user

    users = all_users if all_users is not None else fetch_all_users_cached()
    uid = str(user.get("id") or "").strip()
    uteam = str(user.get("team") or "").strip()
    udept = user.get("department")
    tl_id_field = str(user.get("team_lead_id") or "").strip()

    # 1. Direct team_lead_id match
    if tl_id_field:
        for u in users:
            if normalize_role(u.get("role")) == ROLE_TEAMLEAD and str(u.get("id") or "").strip() == tl_id_field:
                return u

    # 2. uteam matches team lead's id (e.g. team='OKL013')
    if uteam:
        for u in users:
            if normalize_role(u.get("role")) == ROLE_TEAMLEAD:
                tl_id = str(u.get("id") or "").strip()
                if tl_id and tl_id.lower() == uteam.lower():
                    return u

    # 3. uteam matches team lead's team name (e.g. team='Team Alpha')
    if uteam:
        for u in users:
            if normalize_role(u.get("role")) == ROLE_TEAMLEAD:
                tl_team = str(u.get("team") or "").strip()
                if tl_team and (tl_team.lower() == uteam.lower() or _teams_overlap(tl_team, uteam)):
                    return u

    # 4. Department match fallback
    if udept:
        for u in users:
            if normalize_role(u.get("role")) == ROLE_TEAMLEAD:
                if _scopes_overlap(udept, u.get("department")):
                    return u

    # 5. Fallback: first active team lead
    for u in users:
        if normalize_role(u.get("role")) == ROLE_TEAMLEAD and str(u.get("status") or "").strip().lower() == "active":
            return u

    # 6. Fallback: any team lead
    for u in users:
        if normalize_role(u.get("role")) == ROLE_TEAMLEAD:
            return u

    return None


# ── Ticket authorization ─────────────────────────────────────────────────────


def _norm(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip().lower()


def _same_person(user: dict[str, Any], payload: dict[str, Any], ticket: dict[str, Any], prefix: str) -> bool:
    """Compare the authenticated user with ``<prefix>_id``/``<prefix>_email``/``<prefix>``."""
    if prefix == "assigned_agent":
        ag_name = _norm(ticket.get("assigned_agent"))
        to_type = _norm(ticket.get("assigned_to_type"))
        if ag_name in ("", "unassigned", "none", "null") or to_type == "unassigned":
            return False

    user_id = str(user.get("id") or payload.get("sub") or "").strip().lower()
    email = _norm(user.get("email") or payload.get("email"))
    name = _norm(user.get("name") or payload.get("name"))

    agent_id = str(ticket.get(f"{prefix}_id") or "").strip().lower()
    agent_email = _norm(ticket.get(f"{prefix}_email"))
    agent_name = _norm(ticket.get(prefix))

    if user_id and agent_id and user_id == agent_id:
        return True
    if email and agent_email and email == agent_email:
        return True
    if name and agent_name and agent_name not in ("", "unassigned", "user", "employee"):
        if name == agent_name or (len(name) >= 3 and name in agent_name):
            return True
    return False


def ticket_visible(payload: dict[str, Any], user: dict[str, Any], ticket: dict[str, Any]) -> bool:
    """Server-side rule for whether a user may see a ticket.

    - Admin: every ticket.
    - Team Lead: strictly tickets assigned to/requested by themselves or their
      team members, assigned by this Team Lead, or explicitly assigned to their
      team identifier. Department alone NEVER grants cross-team visibility.
    - Employee: tickets they created or are assigned to (and explicitly tagged
      tickets).
    """
    role = role_of(payload)
    if role == ROLE_ADMIN:
        return True

    if role == ROLE_TEAMLEAD:
        tl_id = str(user.get("id") or payload.get("sub") or "").strip()
        tl_team = str(user.get("team") or "").strip()
        tl_name = (user.get("name") or payload.get("name") or "").strip()
        tl_email = (user.get("email") or payload.get("email") or "").strip().lower()

        # 1. Directly assigned to Team Lead
        if _same_person(user, payload, ticket, "assigned_agent"):
            return True
        # 2. Directly created / requested by Team Lead
        if _same_person(user, payload, ticket, "employee"):
            return True
        if str(ticket.get("requester_id") or "") == tl_id:
            return True
        # 3. Assigned by this Team Lead
        if str(ticket.get("assigned_by_user_id") or "") == tl_id:
            return True
        if _norm(ticket.get("assigned_by")) and tl_name and tl_name.lower() in _norm(ticket.get("assigned_by")):
            return True

        # 4. Explicitly assigned to this Team Lead's team identifier
        tl_team_id = resolve_team_id(user.get("team")) or resolve_team_id(user.get("id"))
        ticket_team_id = resolve_team_id(ticket.get("assigned_team_id"))
        if tl_team_id is not None and ticket_team_id is not None and tl_team_id == ticket_team_id:
            return True
        assigned_team_id = str(ticket.get("assigned_team_id") or "").strip()
        if assigned_team_id and (assigned_team_id == tl_id or (tl_team and assigned_team_id.lower() == tl_team.lower())):
            return True
        if tl_team and _scopes_overlap(tl_team, ticket.get("assigned_team_id")):
            return True

        # 4b. Explicitly routed to this Team Lead via team_lead_id / team_lead_ids
        tl_ids_on_ticket = [str(x) for x in (ticket.get("team_lead_ids") or [])]
        if str(ticket.get("team_lead_id") or ""):
            tl_ids_on_ticket.append(str(ticket.get("team_lead_id")))
        if tl_id and tl_id in tl_ids_on_ticket:
            return True

        # 5. Tagged members
        tagged = [str(x) for x in (ticket.get("tagged_member_ids") or [])]
        if tl_id and tl_id in tagged:
            return True

        # 6. Belongs to any managed team member (created by, assigned to, or tagged to)
        member_ids, member_emails, member_names = teamlead_member_index(user)

        # Assigned to a team member
        agent_id = str(ticket.get("assigned_agent_id") or "").strip()
        if agent_id and agent_id in member_ids:
            return True
        agent_email = _norm(ticket.get("assigned_agent_email"))
        if agent_email and agent_email in member_emails:
            return True
        agent_name = _norm(ticket.get("assigned_agent"))
        if agent_name and agent_name not in ("", "unassigned", "user", "employee") and agent_name in member_names:
            return True

        # Created by / requested by a team member
        emp_id = str(ticket.get("employee_id") or ticket.get("requester_id") or "").strip()
        if emp_id and emp_id in member_ids:
            return True
        emp_email = _norm(ticket.get("employee_email"))
        if emp_email and emp_email in member_emails:
            return True
        emp_name = _norm(ticket.get("employee"))
        if emp_name and emp_name not in ("", "unassigned", "user", "employee") and emp_name in member_names:
            return True

        # Tagged member is on the team
        if member_ids and any(m_id in member_ids for m_id in tagged):
            return True

        return False

    # Employee
    if _same_person(user, payload, ticket, "employee"):
        return True
    if _same_person(user, payload, ticket, "assigned_agent"):
        return True
    if str(ticket.get("requester_id") or "") == str(user.get("id") or ""):
        return True
    tagged_ids = [str(x) for x in (ticket.get("tagged_member_ids") or [])]
    if str(user.get("id") or "") in tagged_ids:
        return True
    for member in ticket.get("tagged_members") or []:
        if isinstance(member, dict):
            if str(member.get("id") or "") == str(user.get("id") or ""):
                return True
            if _norm(member.get("email")) and _norm(member.get("email")) == _norm(user.get("email")):
                return True
    return False


def can_manage_ticket(payload: dict[str, Any], user: dict[str, Any], ticket: dict[str, Any]) -> bool:
    """Mutating a ticket additionally requires ownership/scope, not just visibility."""
    if is_admin(payload):
        return True
    if is_teamlead(payload):
        return ticket_visible(payload, user, ticket)
    # Employees may update the tickets they created (status/comment) and the
    # ones assigned to them.
    user_id = str(user.get("id") or payload.get("sub") or "").strip()
    creator_id = str(ticket.get("employee_id") or ticket.get("requester_id") or ticket.get("created_by") or "").strip()
    if user_id and creator_id and user_id.lower() == creator_id.lower():
        return True
    return _same_person(user, payload, ticket, "employee") or _same_person(
        user, payload, ticket, "assigned_agent"
    )


def is_ticket_creator(user: dict[str, Any], payload: dict[str, Any], ticket: dict[str, Any]) -> bool:
    user_id = str(user.get("id") or payload.get("sub") or "").strip().lower()
    creator_id = str(ticket.get("employee_id") or ticket.get("requester_id") or ticket.get("created_by") or "").strip().lower()
    if user_id and creator_id and user_id == creator_id:
        return True
    return _same_person(user, payload, ticket, "employee")


def is_teamlead_involved_in_ticket(user: dict[str, Any], payload: dict[str, Any], ticket: dict[str, Any]) -> bool:
    """Check if a Team Lead is assigned to or involved in the ticket."""
    user_id = str(user.get("id") or payload.get("sub") or "").strip().lower()
    user_name = str(user.get("name") or "").strip().lower()
    user_email = str(user.get("email") or payload.get("email") or "").strip().lower()

    # 1. Directly assigned agent
    agent_id = str(ticket.get("assigned_agent_id") or "").strip().lower()
    agent_name = str(ticket.get("assigned_agent") or "").strip().lower()
    agent_email = str(ticket.get("assigned_agent_email") or "").strip().lower()
    if user_id and agent_id and user_id == agent_id:
        return True
    if user_name and agent_name and user_name == agent_name:
        return True
    if user_email and agent_email and user_email == agent_email:
        return True

    # 2. Creator
    if is_ticket_creator(user, payload, ticket):
        return True

    # 3. Explicitly assigned/tagged team leads
    tl_ids = [str(x).strip().lower() for x in (ticket.get("team_lead_ids") or []) if x]
    if user_id and user_id in tl_ids:
        return True
    for tl in (ticket.get("team_leads") or []):
        if isinstance(tl, dict):
            tl_id = str(tl.get("id") or tl.get("employeeId") or "").strip().lower()
            tl_em = str(tl.get("email") or "").strip().lower()
            if (user_id and tl_id == user_id) or (user_email and tl_em == user_email):
                return True
        elif isinstance(tl, str) and (user_id == tl.lower() or user_name == tl.lower()):
            return True

    # 4. Assigned by this team lead
    assigned_by = str(ticket.get("assigned_by") or "").strip().lower()
    if user_name and user_name in assigned_by:
        return True

    # 5. Lead of the assigned employee who is working on the ticket
    if agent_id or agent_name or agent_email:
        managed = teamlead_managed_employees(user)
        for m in managed:
            mid = str(m.get("id") or "").strip().lower()
            mem = str(m.get("email") or "").strip().lower()
            mnm = str(m.get("name") or "").strip().lower()
            if (agent_id and mid == agent_id) or (agent_email and mem == agent_email) or (agent_name and mnm == agent_name):
                return True

    return False


def can_view_ticket_chat(payload: dict[str, Any], user: dict[str, Any], ticket: dict[str, Any]) -> bool:
    """All users with ticket access have view-only access to view the complete conversation history."""
    return ticket_visible(payload, user, ticket)


def can_reply_ticket_chat(payload: dict[str, Any], user: dict[str, Any], ticket: dict[str, Any]) -> bool:
    """Tickets under My Tickets and Assigned Tickets have chat/reply access for the ticket creator
    and assigned users who are working on the ticket. All other users have view-only access without chat/reply.
    """
    if is_ticket_creator(user, payload, ticket):
        return True

    user_id = str(user.get("id") or payload.get("sub") or "").strip().lower()
    user_name = str(user.get("name") or "").strip().lower()
    user_email = str(user.get("email") or payload.get("email") or "").strip().lower()

    agent_id = str(ticket.get("assigned_agent_id") or "").strip().lower()
    agent_name = str(ticket.get("assigned_agent") or "").strip().lower()
    agent_email = str(ticket.get("assigned_agent_email") or "").strip().lower()

    if user_id and agent_id and user_id == agent_id:
        return True
    if user_name and agent_name and user_name == agent_name:
        return True
    if user_email and agent_email and user_email == agent_email:
        return True
    if _same_person(user, payload, ticket, "assigned_agent"):
        return True

    return False


def can_view_internal_notes(payload: dict[str, Any], user: dict[str, Any], ticket: dict[str, Any]) -> bool:
    """Internal notes are strictly restricted to Admin and authorized Team Leads, never regular employees."""
    if is_admin(payload):
        return True
    if is_teamlead(payload):
        return is_teamlead_involved_in_ticket(user, payload, ticket) and ticket_visible(payload, user, ticket)
    return False


# ── SLA ──────────────────────────────────────────────────────────────────────

SLA_HOURS = {
    "critical": 4,
    "urgent": 4,
    "high": 8,
    "medium": 24,
    "low": 48,
}


def _parse_dt(value: Any) -> datetime | None:
    if not value:
        return None
    if isinstance(value, datetime):
        dt = value
    else:
        text = str(value).strip().replace("Z", "+00:00")
        if " " in text and "T" not in text:
            text = text.replace(" ", "T", 1)
        try:
            dt = datetime.fromisoformat(text)
        except ValueError:
            return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def sla_deadline(ticket: dict[str, Any]) -> datetime | None:
    explicit = _parse_dt(ticket.get("sla_due_at"))
    if explicit:
        return explicit
    created = _parse_dt(ticket.get("created_at"))
    if not created:
        return None
    priority = str(ticket.get("priority") or "medium").strip().lower()
    hours = SLA_HOURS.get(priority, 24)
    return created + timedelta(hours=hours)


def compute_sla(ticket: dict[str, Any], now: datetime | None = None) -> dict[str, Any]:
    """Return ``{"status", "state", "remaining", "due_at"}`` from real dates.

    Resolved/closed tickets are excluded from risk/breach reporting.
    """
    now = now or datetime.now(timezone.utc)
    status = str(ticket.get("status") or "").strip().lower()
    deadline = sla_deadline(ticket)

    if status in ("resolved", "closed"):
        resolved_at = _parse_dt(ticket.get("resolved_at") or ticket.get("closed_at") or ticket.get("updated_at"))
        if deadline and resolved_at and resolved_at > deadline:
            return {
                "status": "SLA Breached",
                "state": "breached",
                "remaining": "Breached prior to resolution",
                "due_at": deadline.isoformat(),
            }
        return {
            "status": "Within SLA",
            "state": "normal",
            "remaining": "Completed",
            "due_at": deadline.isoformat() if deadline else ticket.get("sla_due_at"),
        }

    if deadline is None:
        return {
            "status": "Within SLA",
            "state": "normal",
            "remaining": "No SLA due date",
            "due_at": ticket.get("sla_due_at"),
        }

    remaining = deadline - now
    if remaining.total_seconds() <= 0:
        return {
            "status": "SLA Breached",
            "state": "breached",
            "remaining": "SLA breached",
            "due_at": deadline.isoformat(),
        }

    priority = str(ticket.get("priority") or "medium").strip().lower()
    total = timedelta(hours=SLA_HOURS.get(priority, 24))
    if remaining <= timedelta(hours=2) or remaining <= total * 0.25:
        hours, rem = divmod(int(remaining.total_seconds()), 3600)
        minutes = rem // 60
        return {
            "status": "SLA Risk",
            "state": "risk",
            "remaining": f"{hours}h {minutes:02d}m remaining",
            "due_at": deadline.isoformat(),
        }

    hours, rem = divmod(int(remaining.total_seconds()), 3600)
    minutes = rem // 60
    return {
        "status": "Within SLA",
        "state": "normal",
        "remaining": f"{hours}h {minutes:02d}m remaining",
        "due_at": deadline.isoformat(),
    }


def serialize_ticket(
    ticket: dict[str, Any],
    now: datetime | None = None,
    payload: dict[str, Any] | None = None,
    user: dict[str, Any] | None = None,
    load_attachments: bool = True,
) -> dict[str, Any]:
    """Add server-computed SLA fields without mutating the stored row."""
    result = dict(ticket)
    sla = compute_sla(ticket, now)
    result["sla_status"] = sla["status"]
    result["sla_state"] = sla["state"]
    result["sla_remaining"] = sla["remaining"]
    if sla["due_at"]:
        result["sla_due_at"] = sla["due_at"]

    cached_users = fetch_all_users_cached()
    agent = _norm(ticket.get("assigned_agent"))
    to_type = _norm(ticket.get("assigned_to_type"))
    is_ticket_unassigned = agent in ("", "unassigned", "none", "null") or to_type == "unassigned"

    if not is_ticket_unassigned and agent:
        matched = None
        for u in cached_users:
            uname = _norm(u.get("name"))
            uid = _norm(u.get("id"))
            if uname == agent or (len(uname) >= 3 and uname in agent) or uid == agent:
                matched = u
                break
        if matched:
            result["assigned_agent_id"] = str(matched.get("id") or "")
            if not result.get("assigned_agent_email"):
                result["assigned_agent_email"] = matched.get("email")
            if not result.get("assigned_team_id"):
                result["assigned_team_id"] = resolve_team_id(matched.get("team")) or resolve_team_id(matched.get("id"))
    elif is_ticket_unassigned:
        result["assigned_agent"] = "Unassigned"
        result["assigned_agent_id"] = None
        result["assigned_agent_email"] = None

    emp = _norm(ticket.get("employee"))
    if emp and emp not in ("", "unassigned", "none", "null") and not result.get("employee_id"):
        for u in cached_users:
            uname = _norm(u.get("name"))
            uid = _norm(u.get("id"))
            if uname == emp or (len(uname) >= 3 and uname in emp) or uid == emp:
                result["employee_id"] = str(u.get("id") or "")
                if not result.get("employee_email"):
                    result["employee_email"] = u.get("email")
                break

    result["is_unassigned"] = is_ticket_unassigned
    if payload is not None and user is not None:
        result["is_assigned_to_me"] = _same_person(user, payload, result, "assigned_agent")
        result["is_created_by_me"] = (
            _same_person(user, payload, result, "employee")
            or str(result.get("requester_id") or "") == str(user.get("id") or "")
        )

    tid = str(ticket.get("id") or "")
    if load_attachments and tid:
        try:
            from app.api.v1.attachments import _disk_records
            disk_atts = _disk_records(tid, "")
            result["attachments"] = disk_atts
            result["attachments_count"] = len(disk_atts)
        except Exception:
            result["attachments"] = ticket.get("attachments") or []
            result["attachments_count"] = len(result["attachments"])
    else:
        result["attachments"] = ticket.get("attachments") or []
        result["attachments_count"] = len(result["attachments"])

    return result


def is_active(ticket: dict[str, Any]) -> bool:
    return str(ticket.get("status") or "").strip().lower() not in ("resolved", "closed")


_RAW_TICKETS_CACHE: tuple[float, list[dict[str, Any]]] | None = None
_RAW_TICKETS_TTL = 30.0  # seconds

# Per-caller result of the visibility filter. ``/tickets``, ``/tickets/stats``
# and ``/notifications`` all need the same scoped list, so the filtered rows
# are computed once per caller instead of once per endpoint.
_SCOPED_TICKETS_CACHE: dict[str, tuple[float, list[dict[str, Any]]]] = {}
_SCOPED_TICKETS_TTL = 30.0  # seconds


def invalidate_tickets_cache() -> None:
    global _RAW_TICKETS_CACHE
    _RAW_TICKETS_CACHE = None
    _SCOPED_TICKETS_CACHE.clear()


def _scoped_cache_key(payload: dict[str, Any], user: dict[str, Any]) -> str:
    """Identity of the visibility scope: role plus the fields that drive it."""
    return "|".join(
        (
            role_of(payload),
            str(user.get("id") or ""),
            _norm(user.get("team")),
            _norm(user.get("name")),
            _norm(user.get("email")),
        )
    )


def scoped_tickets(payload: dict[str, Any], user: dict[str, Any]) -> list[dict[str, Any]]:
    """Fetch and filter tickets according to the caller's role.

    The raw Supabase ticket list is cached for 30s to collapse parallel dashboard
    requests, and the per-caller visibility filter is cached for the same
    window so several endpoints share a single pass over the rows.
    """
    global _RAW_TICKETS_CACHE
    now = time.time()

    key = _scoped_cache_key(payload, user)
    cached = _SCOPED_TICKETS_CACHE.get(key)
    if cached and (now - cached[0]) < _SCOPED_TICKETS_TTL:
        return list(cached[1])

    if _RAW_TICKETS_CACHE and (now - _RAW_TICKETS_CACHE[0]) < _RAW_TICKETS_TTL:
        rows = _RAW_TICKETS_CACHE[1]
    else:
        sb = get_supabase_admin_client()
        res = sb.table("tickets").select("*").order("created_at", desc=True).execute()
        rows = res.data or []

        # Batch load tagged members to populate visibility without N+1 queries
        tagged_map: dict[str, list[str]] = {}
        try:
            tt_res = sb.table("ticket_tagged_members").select("ticket_id, user_id").execute()
            for tm in (tt_res.data or []):
                t_id = str(tm.get("ticket_id") or "")
                u_id = str(tm.get("user_id") or "")
                if t_id and u_id:
                    tagged_map.setdefault(t_id, []).append(u_id)
        except Exception:
            pass

        for r in rows:
            t_id = str(r.get("id") or "")
            if t_id in tagged_map:
                r["tagged_member_ids"] = tagged_map[t_id]

        _RAW_TICKETS_CACHE = (now, rows)

    unique: dict[str, dict[str, Any]] = {}
    for row in rows:
        tid = str(row.get("id") or "")
        if tid and tid not in unique:
            unique[tid] = row
    visible = [row for row in unique.values() if ticket_visible(payload, user, row)]
    _SCOPED_TICKETS_CACHE[key] = (now, visible)
    return list(visible)


def ticket_stats(
    tickets: list[dict[str, Any]],
    now: datetime | None = None,
    payload: dict[str, Any] | None = None,
    user: dict[str, Any] | None = None,
) -> dict[str, int]:
    now = now or datetime.now(timezone.utc)
    total = len(tickets)
    open_cnt = 0
    in_progress_cnt = 0
    pending_cnt = 0
    resolved_cnt = 0
    unassigned_cnt = 0
    escalated_cnt = 0
    sla_risk_cnt = 0
    sla_breached_cnt = 0
    assigned_to_me_cnt = 0
    my_tickets_cnt = 0

    for t in tickets:
        st = _norm(t.get("status"))
        active = st not in ("resolved", "closed")

        if not active:
            resolved_cnt += 1
        else:
            if st == "open":
                open_cnt += 1
            elif st == "in progress":
                in_progress_cnt += 1
            elif st == "pending":
                pending_cnt += 1
            if st == "escalated":
                escalated_cnt += 1

            sla = compute_sla(t, now)
            if sla["state"] == "risk":
                sla_risk_cnt += 1
            elif sla["state"] == "breached":
                sla_breached_cnt += 1

            ag = _norm(t.get("assigned_agent"))
            ag_id = str(t.get("assigned_agent_id") or "")
            to_type = _norm(t.get("assigned_to_type"))
            if (not ag or ag in ("unassigned", "none", "null")) or to_type == "unassigned":
                unassigned_cnt += 1

        if payload is not None and user is not None:
            if _same_person(user, payload, t, "assigned_agent"):
                assigned_to_me_cnt += 1
            if _same_person(user, payload, t, "employee") or str(t.get("requester_id") or "") == str(user.get("id") or ""):
                my_tickets_cnt += 1

    stats: dict[str, int] = {
        "totalTickets": total,
        "openTickets": open_cnt,
        "inProgressTickets": in_progress_cnt,
        "pendingTickets": pending_cnt,
        "resolvedTickets": resolved_cnt,
        "unassignedTickets": unassigned_cnt,
        "escalatedTickets": escalated_cnt,
        "slaRiskCount": sla_risk_cnt,
        "slaBreachedCount": sla_breached_cnt,
    }
    if payload is not None and user is not None:
        stats["assignedTicketsCount"] = assigned_to_me_cnt
        stats["myTicketsCount"] = my_tickets_cnt
    return stats


# ── Notifications ────────────────────────────────────────────────────────────


def notification_visible(
    payload: dict[str, Any], user: dict[str, Any], notification: dict[str, Any]
) -> bool:
    """Evaluate the text ``for_role`` targeting used by portal_notifications.

    Supported values (existing data uses the role aliases):
      ``all``, ``admin``, ``teamlead``, ``employee``,
      ``user:<id>``, ``user:<email>``, ``dept:<name>``, ``team:<name>``.
    Unrecognised values are compared to the user's email/name so legacy
    rows can never leak to an unrelated account.
    """
    raw = str(notification.get("for_role") or "").strip()
    target = raw.lower()
    role = role_of(payload)
    user_id = str(user.get("id") or payload.get("sub") or "").strip().lower()
    email = _norm(user.get("email") or payload.get("email"))
    name = _norm(user.get("name") or payload.get("name"))

    if target in ("", "all", "*"):
        return True

    if target.startswith("user:"):
        value = target.split(":", 1)[1].strip()
        return bool(value) and value in {user_id, email}

    if target.startswith("dept:"):
        value = target.split(":", 1)[1].strip()
        return _scopes_overlap(user.get("department"), value)

    if target.startswith("team:"):
        value = target.split(":", 1)[1].strip()
        user_team = str(user.get("team") or "").strip()
        return (
            (bool(user_team) and _scopes_overlap(user_team, value))
            or (bool(user_team) and value.lower() == user_team.lower())
            or value.lower() == user_id
        )

    normalized = normalize_role(target)
    if target in ROLE_ALIASES or normalized == role:
        # Role broadcast: the notification explicitly targets this role.
        if target in ("admin", "teamlead", "employee", "all"):
            return normalized == role
        return normalized == role

    return target in {email, name}


def notification_matches_scope(
    payload: dict[str, Any],
    user: dict[str, Any],
    notification: dict[str, Any],
    visible_ticket_ids: set[str] | None = None,
) -> bool:
    """Visibility + optional ticket access for ticket-linked notifications."""
    if not notification_visible(payload, user, notification):
        return False
    ticket_id = str(notification.get("ticket_id") or "").strip()
    if not ticket_id:
        return True
    if is_admin(payload):
        return True
    if visible_ticket_ids is not None:
        return ticket_id in visible_ticket_ids
    # Fallback to cached scoped_tickets instead of WAN N+1 calls
    return ticket_id in {str(t.get("id")) for t in scoped_tickets(payload, user) if t.get("id")}
