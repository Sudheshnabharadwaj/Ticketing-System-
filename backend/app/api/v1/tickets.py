"""Tickets API endpoints connecting directly to the Supabase PostgreSQL database."""

from typing import Any
from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field
from app.db.supabase import get_supabase_client

router = APIRouter(prefix="/tickets", tags=["Tickets"])


class TicketCreate(BaseModel):
    subject: str
    description: str = ""
    employee: str = "Alex Morgan"
    employee_id: str | None = None
    employee_email: str | None = None
    department: str = "IT Support"
    category: str = "General"
    priority: str = "Medium"
    status: str = "Open"
    assigned_agent: str = "Unassigned"
    sla_status: str = "Within SLA"
    sla_remaining: str = "8h remaining"


class TicketUpdate(BaseModel):
    subject: str | None = None
    description: str | None = None
    status: str | None = None
    priority: str | None = None
    department: str | None = None
    assigned_agent: str | None = None
    assigned_agent_id: str | None = None
    sla_status: str | None = None
    resolution_summary: str | None = None


@router.get("", summary="List tickets from database")
@router.get("/", include_in_schema=False)
def list_tickets(
    status_filter: str | None = Query(None, alias="status"),
    department: str | None = None,
    priority: str | None = None,
) -> list[dict[str, Any]]:
    """Retrieve tickets from the Supabase PostgreSQL database."""
    sb = get_supabase_client()
    query = sb.table("tickets").select("*")
    if status_filter:
        query = query.eq("status", status_filter)
    if department:
        query = query.eq("department", department)
    if priority:
        query = query.eq("priority", priority)

    res = query.order("created_at", desc=True).execute()
    return res.data or []


@router.get("/stats/summary", summary="Get ticket counts and SLA stats")
def get_stats() -> dict[str, Any]:
    """Calculate summary dashboard stats directly from the database."""
    sb = get_supabase_client()
    res = sb.table("tickets").select("id, status, priority, sla_status").execute()
    tickets = res.data or []

    users_res = sb.table("users").select("id").execute()
    total_users = len(users_res.data or [])

    open_count = sum(1 for t in tickets if (t.get("status") or "").lower() == "open")
    escalated_count = sum(1 for t in tickets if (t.get("status") or "").lower() == "escalated")
    sla_risk_count = sum(1 for t in tickets if "risk" in (t.get("sla_status") or "").lower())
    sla_breached_count = sum(1 for t in tickets if "breach" in (t.get("sla_status") or "").lower())
    resolved_count = sum(1 for t in tickets if (t.get("status") or "").lower() in ["resolved", "closed"])

    return {
        "totalTickets": len(tickets),
        "totalUsers": total_users,
        "openTickets": open_count,
        "escalatedTickets": escalated_count,
        "slaRiskCount": sla_risk_count,
        "slaBreachedCount": sla_breached_count,
        "resolvedTodayCount": resolved_count,
    }


@router.get("/{ticket_id}", summary="Get ticket by ID")
def get_ticket(ticket_id: str) -> dict[str, Any]:
    """Fetch single ticket by its ID or ticketNumber."""
    sb = get_supabase_client()
    res = sb.table("tickets").select("*").eq("id", ticket_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return res.data[0]


@router.post("", status_code=status.HTTP_201_CREATED, summary="Create new ticket in database")
@router.post("/", include_in_schema=False, status_code=status.HTTP_201_CREATED)
def create_ticket(payload: TicketCreate) -> dict[str, Any]:
    """Insert a new ticket into the Supabase PostgreSQL database."""
    sb = get_supabase_client()
    import time
    new_id = f"TKT-{int(time.time() * 1000) % 100000}"

    row = {
        "id": new_id,
        "subject": payload.subject,
        "description": payload.description,
        "employee": payload.employee,
        "employee_id": payload.employee_id,
        "employee_email": payload.employee_email,
        "department": payload.department,
        "category": payload.category,
        "priority": payload.priority,
        "status": payload.status,
        "assigned_agent": payload.assigned_agent,
        "sla_status": payload.sla_status,
        "sla_remaining": payload.sla_remaining,
    }

    res = sb.table("tickets").insert(row).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="Failed to create ticket")
    return res.data[0]


@router.patch("/{ticket_id}", summary="Update ticket in database")
def update_ticket(ticket_id: str, payload: TicketUpdate) -> dict[str, Any]:
    """Update ticket attributes in the database."""
    sb = get_supabase_client()
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields provided for update")

    res = sb.table("tickets").update(updates).eq("id", ticket_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Ticket not found or update failed")
    return res.data[0]
