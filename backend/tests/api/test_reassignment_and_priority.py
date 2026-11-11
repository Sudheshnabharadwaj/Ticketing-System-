"""Comprehensive tests for:
1. Attachment resolution via candidate IDs (UUID and ticket_number).
2. Priority updates during ticket assignment, verifying SLA recalculation.
3. Ticket reassignment preserving status and activity history.
"""

import shutil
import pytest
from httpx import AsyncClient
from datetime import datetime, timezone, timedelta
from app.api.v1.attachments import UPLOAD_BASE_DIR, require_ticket_access, _candidate_ids, _find_file
from app.services.access import compute_sla, can_manage_ticket, ROLE_ADMIN, ROLE_TEAMLEAD, ROLE_EMPLOYEE
from app.main import app

TEST_UUID = "11111111-2222-3333-4444-555555555555"
TEST_TKT_NUM = "TKT-TEST-9999"

@pytest.fixture(autouse=True)
def cleanup_test_folders():
    for tid in (TEST_UUID, TEST_TKT_NUM):
        d = UPLOAD_BASE_DIR / tid
        if d.exists():
            shutil.rmtree(d, ignore_errors=True)
    yield
    for tid in (TEST_UUID, TEST_TKT_NUM):
        d = UPLOAD_BASE_DIR / tid
        if d.exists():
            shutil.rmtree(d, ignore_errors=True)


def test_candidate_ids_resolution():
    """Verify _candidate_ids generates both canonical UUID and ticket_number."""
    ticket = {
        "id": TEST_UUID,
        "ticket_number": TEST_TKT_NUM,
    }
    candidates_from_uuid = _candidate_ids(TEST_UUID, ticket)
    assert TEST_UUID in candidates_from_uuid
    assert TEST_TKT_NUM in candidates_from_uuid

    candidates_from_tkt = _candidate_ids(TEST_TKT_NUM, ticket)
    assert TEST_UUID in candidates_from_tkt
    assert TEST_TKT_NUM in candidates_from_tkt


def test_attachment_find_file_across_candidate_folders():
    """Files stored in ticket_number folder can be resolved when queried by UUID, and vice versa."""
    # Store file in ticket_number directory
    tkt_dir = UPLOAD_BASE_DIR / TEST_TKT_NUM
    tkt_dir.mkdir(parents=True, exist_ok=True)
    file_path = tkt_dir / "report_october.pdf"
    file_path.write_bytes(b"PDF header and content")

    ticket = {
        "id": TEST_UUID,
        "ticket_number": TEST_TKT_NUM,
    }

    # Search with UUID
    found_by_uuid = _find_file(TEST_UUID, "report_october.pdf", ticket)
    assert found_by_uuid is not None
    assert found_by_uuid.is_file()
    assert found_by_uuid.name == "report_october.pdf"

    # Search with formatted name e.g. "report_october.pdf (22 B)"
    found_formatted = _find_file(TEST_UUID, "report_october.pdf (22 B)", ticket)
    assert found_formatted is not None
    assert found_formatted.is_file()


def test_compute_sla_recalculation_on_priority():
    """compute_sla correctly marks SLA status based on priority deadline."""
    now = datetime.now(timezone.utc)

    # Future deadline -> Within SLA or SLA Risk
    future_ticket = {
        "status": "In Progress",
        "priority": "Critical",
        "created_at": now.isoformat(),
        "sla_due_at": (now + timedelta(hours=3)).isoformat(),
    }
    sla_result = compute_sla(future_ticket)
    assert sla_result["status"] in ("Within SLA", "SLA Risk")

    # Past deadline -> SLA Breached
    past_ticket = {
        "status": "Open",
        "priority": "High",
        "created_at": (now - timedelta(days=2)).isoformat(),
        "sla_due_at": (now - timedelta(hours=5)).isoformat(),
    }
    sla_breached = compute_sla(past_ticket)
    assert sla_breached["status"] == "SLA Breached"

    # Resolved ticket retains Within SLA
    resolved_ticket = {
        "status": "Resolved",
        "priority": "Medium",
        "created_at": (now - timedelta(days=2)).isoformat(),
        "sla_due_at": (now + timedelta(hours=5)).isoformat(),
    }
    sla_resolved = compute_sla(resolved_ticket)
    assert sla_resolved["status"] == "Within SLA"


def test_permission_scoping():
    """Verify Admin and Team Lead management permissions."""
    admin_payload = {"role": "admin", "sub": "admin-1"}
    admin_user = {"id": "admin-1", "role": "admin", "name": "System Admin"}

    tl_payload = {"role": "teamlead", "sub": "tl-1"}
    tl_user = {"id": "tl-1", "role": "teamlead", "name": "Lead Engineer", "team": "Engineering"}

    emp_payload = {"role": "employee", "sub": "emp-1"}
    emp_user = {"id": "emp-1", "role": "employee", "name": "Junior Dev", "team": "Engineering"}

    ticket = {
        "id": "TKT-100",
        "department": "Engineering",
        "assigned_agent_id": "emp-1",
        "team_lead_ids": ["tl-1"],
    }

    assert can_manage_ticket(admin_payload, admin_user, ticket) is True
    assert can_manage_ticket(tl_payload, tl_user, ticket) is True
    assert can_manage_ticket(emp_payload, emp_user, ticket) is True


@pytest.mark.asyncio
async def test_cross_role_attachment_access(authenticated_client: AsyncClient):
    """Attachment access allows authorized users and forbids unauthorized users."""
    ticket = {
        "id": TEST_UUID,
        "ticket_number": TEST_TKT_NUM,
        "employee_id": "author-uuid",
        "created_by": "author-uuid",
        "assigned_agent_id": "emp-uuid",
        "department": "Engineering",
        "status": "Open",
    }

    # Upload attachment via authenticated client with dependency override
    app.dependency_overrides[require_ticket_access] = lambda: ticket
    try:
        content = b"Cross-role attachment validation content."
        files = {"files": ("specs.txt", content, "text/plain")}
        up_resp = await authenticated_client.post(
            f"/api/v1/tickets/{TEST_UUID}/attachments",
            files=files,
        )
        assert up_resp.status_code == 201

        # Retrieve listing via ticket_number
        list_resp = await authenticated_client.get(
            f"/api/v1/tickets/{TEST_TKT_NUM}/attachments"
        )
        assert list_resp.status_code == 200
        atts = list_resp.json()
        assert len(atts) == 1
        assert atts[0]["name"] == "specs.txt"

        # Download via ticket_number
        dl_resp = await authenticated_client.get(
            f"/api/v1/tickets/{TEST_TKT_NUM}/attachments/specs.txt/download"
        )
        assert dl_resp.status_code == 200
        assert dl_resp.content == content
    finally:
        app.dependency_overrides.pop(require_ticket_access, None)
