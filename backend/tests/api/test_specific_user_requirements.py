import pytest
from app.services.access import can_manage_ticket, serialize_ticket
from app.db.supabase import get_supabase_client, get_supabase_anon_client, get_supabase_admin_client

def test_supabase_client_disabled_http2():
    """Verify HTTP/2 is disabled across all client instances to prevent ConnectionTerminated error_code:9."""
    for client_fn in [get_supabase_client, get_supabase_anon_client, get_supabase_admin_client]:
        c = client_fn()
        session = getattr(c.postgrest, "session", None)
        assert session is not None
        transport = getattr(session, "_transport", None)
        assert transport is not None
        pool = getattr(transport, "_pool", None)
        assert pool is not None
        assert pool._http2 is False, f"Expected http2=False, found {pool._http2}"

def test_can_manage_ticket_permissions():
    """Verify backend permission enforcement for working on tickets."""
    admin_payload = {"sub": "admin-1", "role": "admin"}
    admin_user = {"id": "admin-1", "role": "admin"}

    tl_payload = {"sub": "tl-1", "role": "teamlead", "department": "IT Support"}
    tl_user = {"id": "tl-1", "role": "teamlead", "department": "IT Support"}

    tl_other_payload = {"sub": "tl-2", "role": "teamlead", "department": "Finance"}
    tl_other_user = {"id": "tl-2", "role": "teamlead", "department": "Finance"}

    emp_assignee_payload = {"sub": "emp-1", "role": "employee", "email": "emp1@company.com"}
    emp_assignee_user = {"id": "emp-1", "role": "employee", "email": "emp1@company.com"}

    emp_creator_payload = {"sub": "emp-2", "role": "employee", "email": "emp2@company.com"}
    emp_creator_user = {"id": "emp-2", "role": "employee", "email": "emp2@company.com"}

    emp_stranger_payload = {"sub": "emp-3", "role": "employee", "email": "emp3@company.com"}
    emp_stranger_user = {"id": "emp-3", "role": "employee", "email": "emp3@company.com"}

    ticket = {
        "id": "t-100",
        "department": "IT Support",
        "employee_id": "emp-2",
        "requester_id": "emp-2",
        "assigned_agent_id": "emp-1",
        "assignee_id": "emp-1",
        "team_lead_id": "tl-1"
    }

    # Admin can manage any ticket
    assert can_manage_ticket(admin_payload, admin_user, ticket) is True

    # Assigned team lead can manage
    assert can_manage_ticket(tl_payload, tl_user, ticket) is True

    # Team lead from different department cannot manage
    assert can_manage_ticket(tl_other_payload, tl_other_user, ticket) is False

    # Assigned employee can work on ticket
    assert can_manage_ticket(emp_assignee_payload, emp_assignee_user, ticket) is True

    # Creator employee can work on / comment on their ticket
    assert can_manage_ticket(emp_creator_payload, emp_creator_user, ticket) is True

    # Unrelated employee cannot manage ticket
    assert can_manage_ticket(emp_stranger_payload, emp_stranger_user, ticket) is False

def test_teamlead_created_ticket_scoping():
    """
    Verify Team Lead ticket creation scoping:
    When a Team Lead creates a ticket assigned to an employee:
    - is_assigned_to_me must be False for the creator Team Lead (unless assigned to them)
    - is_created_by_me must be True for the creator Team Lead
    """
    tl_payload = {"sub": "tl-1", "role": "teamlead", "email": "tl1@company.com", "name": "Team Lead 1"}
    tl_user = {"id": "tl-1", "role": "teamlead", "email": "tl1@company.com", "name": "Team Lead 1"}

    emp_payload = {"sub": "emp-1", "role": "employee", "email": "emp1@company.com", "name": "Employee 1"}
    emp_user = {"id": "emp-1", "role": "employee", "email": "emp1@company.com", "name": "Employee 1"}

    raw_ticket = {
        "id": "t-200",
        "ticket_number": "TICK-200",
        "title": "Hardware Issue",
        "description": "Laptop screen flicker",
        "category": "Hardware",
        "priority": "Medium",
        "status": "In Progress",
        "department": "IT Support",
        "employee_id": "tl-1",
        "requester_id": "tl-1",
        "assigned_agent_id": "emp-1",
        "assigned_agent": "Employee 1",
        "assignee_id": "emp-1",
        "team_lead_id": "tl-1",
        "created_at": "2026-10-27T10:00:00Z",
        "updated_at": "2026-10-27T10:00:00Z"
    }

    # Serialized for creator Team Lead
    tl_view = serialize_ticket(raw_ticket, payload=tl_payload, user=tl_user)
    assert tl_view["is_created_by_me"] is True
    assert tl_view["is_assigned_to_me"] is False  # MUST NOT appear in Assigned Tickets!

    # Serialized for assigned Employee
    emp_view = serialize_ticket(raw_ticket, payload=emp_payload, user=emp_user)
    assert emp_view["is_assigned_to_me"] is True  # MUST appear in Employee's Assigned Tickets!
    assert emp_view["is_created_by_me"] is False
