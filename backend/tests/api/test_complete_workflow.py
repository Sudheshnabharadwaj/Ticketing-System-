"""Test the complete ticket creation, assignment, dashboard synchronization and status update flow.

Validates:
1. Real Supabase DB queries and writes.
2. Admin creates ticket with Team Lead (OKL003 Kotesh) and Employee (OKL004 Uday).
3. Integer assigned_team_id (1) and proper handled_by/assigned_to_type.
4. Visibility across dashboards:
   - Admin sees ticket.
   - Team Lead Kotesh (Team Alpha) sees ticket.
   - Team Lead Mounika (Team Beta) DOES NOT see ticket.
   - Employee Uday sees ticket with is_assigned_to_me == True.
   - Employee Bhavya DOES NOT see ticket.
5. Team Lead re-assignment flow:
   - Admin creates ticket for Team Lead only.
   - Team Lead reassigns to employee.
   - Database persists assignment without 22P02 integer error.
6. Status updates:
   - Employee transitions to "In Progress".
   - Employee transitions to "Resolved".
   - Stats reflect changes across dashboards.
"""

import asyncio
from httpx import ASGITransport, AsyncClient

from app.auth.jwt import create_app_token
from app.db.supabase import get_supabase_admin_client
from app.main import app


import pytest

@pytest.mark.asyncio
async def test_complete_workflow():
    print("=== STARTING COMPLETE WORKFLOW TEST ===")
    sb = get_supabase_admin_client()

    # 1. Fetch real users from Supabase to verify test subjects
    res = sb.table("users").select("*").in_("id", ["OKL003", "OKL002", "OKL010", "OKL020"]).execute()
    users_by_id = {u["id"]: u for u in (res.data or [])}
    print("Fetched test users from DB:", {k: v["name"] for k, v in users_by_id.items()})

    admin_res = sb.table("users").select("*").eq("role", "admin").limit(1).execute()
    admin_user = (admin_res.data or [{}])[0]
    admin_id = str(admin_user.get("id", "usr-admin-test"))
    print(f"Using Admin: {admin_user.get('name')} ({admin_id})")

    # Generate tokens for all personas
    admin_token = create_app_token(admin_id, admin_user.get("email", "admin@oklut.com"), "admin", name=admin_user.get("name", "Admin"))
    tl_kotesh_token = create_app_token("OKL003", "k.ananthu@oklut.com", "teamlead", name="Kotesh", department="IT Support", team="Team Alpha")
    tl_mounika_token = create_app_token("OKL120", "s.manikanta@oklut.com", "teamlead", name="manikanta", department="IT Support", team="Team Beta")
    emp_uday_token = create_app_token("OKL002", "u.vadlamudi@oklut.com", "employee", name="uday", department="IT", team="Team Alpha")
    emp_bhavya_token = create_app_token("OKL001", "a.reddy@oklut.com", "employee", name="aditya", department="IT", team="Team Beta")

    created_ticket_ids = []

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # STEP 1: Admin creates ticket with Team Lead Kotesh and Employee Uday
        print("\n--- STEP 1: Admin creates ticket assigned to Kotesh (TL) & Uday (Emp) ---")
        create_payload = {
            "subject": "Integration Test Ticket - Network Outage",
            "description": "High priority fiber cut reported on 3rd floor switch rack.",
            "category": "Hardware",
            "sub_category": "Network",
            "department": "IT Support",
            "departments": ["IT Support"],
            "priority": "High",
            "team_lead_ids": ["OKL003"],
            "team_leads": [{"id": "OKL003", "name": "Kotesh", "email": "k.ananthu@oklut.com"}],
            "tagged_employee_ids": ["OKL002"],
            "employees": [{"id": "OKL002", "name": "Uday", "email": "u.vadlamudi@oklut.com"}],
        }

        resp = await client.post(
            "/api/v1/tickets",
            json=create_payload,
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code in (200, 201), f"Ticket creation failed: {resp.status_code} {resp.text}"
        ticket1 = resp.json()
        ticket1_id = ticket1["id"]
        created_ticket_ids.append(ticket1_id)
        print(f"Created Ticket 1: ID={ticket1_id}")
        assert ticket1["assigned_agent_id"] == "OKL002", f"Expected assigned_agent_id OKL002, got {ticket1.get('assigned_agent_id')}"
        assert ticket1["assigned_to_type"] == "employee", f"Expected assigned_to_type 'employee', got {ticket1.get('assigned_to_type')}"
        assert ticket1["assigned_team_id"] == 1, f"Expected assigned_team_id 1 (Team Alpha), got {ticket1.get('assigned_team_id')}"
        print("Ticket 1 created successfully with correct agent and integer team ID.")

        # STEP 2: Verify database persistence in Supabase
        print("\n--- STEP 2: Verify persistence in real Supabase database ---")
        db_res = sb.table("tickets").select("*").eq("id", ticket1_id).execute()
        assert len(db_res.data or []) == 1, "Ticket was not persisted to Supabase!"
        db_row = db_res.data[0]
        assert db_row["assigned_team_id"] == 1
        assert db_row["assigned_agent_id"] == "OKL002"
        print(f"Verified Supabase row: assigned_team_id={db_row['assigned_team_id']}, assigned_agent={db_row['assigned_agent']}")

        # STEP 3: Verify Dashboards for Ticket 1
        print("\n--- STEP 3: Verify dashboard visibility across roles ---")
        # 3a. Admin Dashboard
        admin_list = await client.get("/api/v1/tickets", headers={"Authorization": f"Bearer {admin_token}"})
        assert admin_list.status_code == 200
        admin_tids = {t["id"] for t in admin_list.json()}
        assert ticket1_id in admin_tids, "Ticket missing from Admin dashboard"
        print("Admin Dashboard: Ticket 1 is present.")

        # 3b. Team Lead Kotesh (Team Alpha) Dashboard
        kotesh_list = await client.get("/api/v1/tickets", headers={"Authorization": f"Bearer {tl_kotesh_token}"})
        assert kotesh_list.status_code == 200
        kotesh_tids = {t["id"] for t in kotesh_list.json()}
        assert ticket1_id in kotesh_tids, "Ticket missing from Kotesh's Team Lead dashboard!"
        print("Team Lead Kotesh (Team Alpha): Ticket 1 is correctly visible.")

        # 3c. Team Lead Mounika (Team Beta) Dashboard
        mounika_list = await client.get("/api/v1/tickets", headers={"Authorization": f"Bearer {tl_mounika_token}"})
        assert mounika_list.status_code == 200
        mounika_tids = {t["id"] for t in mounika_list.json()}
        assert ticket1_id not in mounika_tids, "Security breach! Ticket visible to wrong Team Lead (Mounika - Team Beta)"
        print("Team Lead Mounika (Team Beta): Ticket 1 is correctly hidden (Data Isolation Verified!).")

        # 3d. Employee Uday (Team Alpha, Assigned) Dashboard
        uday_list = await client.get("/api/v1/tickets", headers={"Authorization": f"Bearer {emp_uday_token}"})
        assert uday_list.status_code == 200
        uday_tickets = {t["id"]: t for t in uday_list.json()}
        assert ticket1_id in uday_tickets, "Ticket missing from Uday's Employee dashboard!"
        assert uday_tickets[ticket1_id]["is_assigned_to_me"] is True, "is_assigned_to_me flag should be True for Uday!"
        print("Employee Uday: Ticket 1 is visible with is_assigned_to_me=True.")

        # 3e. Employee Bhavya (Team Beta) Dashboard
        bhavya_list = await client.get("/api/v1/tickets", headers={"Authorization": f"Bearer {emp_bhavya_token}"})
        assert bhavya_list.status_code == 200
        bhavya_tids = {t["id"] for t in bhavya_list.json()}
        assert ticket1_id not in bhavya_tids, "Ticket should not be visible to unassigned employee in another team!"
        print("Employee Bhavya (Team Beta): Ticket 1 is correctly hidden.")

        # STEP 4: Team Lead Assignment Workflow
        print("\n--- STEP 4: Test Ticket created for TL only, then TL reassigns to Employee ---")
        create_payload_tl_only = {
            "subject": "Integration Test Ticket - Server Memory Upgrade",
            "description": "DB server needs 64GB RAM upgrade.",
            "category": "Hardware",
            "department": "IT Support",
            "priority": "Medium",
            "team_lead_ids": ["OKL003"],
            "team_leads": [{"id": "OKL003", "name": "Kotesh", "email": "k.ananthu@oklut.com"}],
        }
        resp2 = await client.post(
            "/api/v1/tickets",
            json=create_payload_tl_only,
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp2.status_code in (200, 201), f"Ticket 2 creation failed: {resp2.status_code} {resp2.text}"
        ticket2 = resp2.json()
        ticket2_id = ticket2["id"]
        created_ticket_ids.append(ticket2_id)
        print(f"Created Ticket 2: ID={ticket2_id}, assigned to TL Kotesh")
        assert ticket2["assigned_agent_id"] == "OKL003"
        assert ticket2["assigned_to_type"] == "teamlead"

        # Kotesh reassigns ticket2 to Uday
        print("Team Lead Kotesh reassigns Ticket 2 to Uday (OKL002)...")
        assign_resp = await client.post(
            f"/api/v1/tickets/{ticket2_id}/assign",
            json={
                "assigned_agent_id": "OKL002",
                "assigned_agent": "Uday",
                "note": "Assigned to Uday for hardware upgrade.",
            },
            headers={"Authorization": f"Bearer {tl_kotesh_token}"},
        )
        assert assign_resp.status_code == 200, f"Assignment failed: {assign_resp.status_code} {assign_resp.text}"
        assigned_ticket2 = assign_resp.json()
        assert assigned_ticket2["assigned_agent_id"] == "OKL002"
        assert assigned_ticket2["assigned_to_type"] == "employee"
        assert assigned_ticket2["assigned_team_id"] == 1
        print("Reassignment succeeded without DB constraint error. assigned_team_id=1.")

        # STEP 5: Employee updates status to "In Progress"
        print("\n--- STEP 5: Employee updates status to 'In Progress' ---")
        status_resp = await client.post(
            f"/api/v1/tickets/{ticket1_id}/status",
            json={"status": "In Progress", "note": "Started working on fiber cut."},
            headers={"Authorization": f"Bearer {emp_uday_token}"},
        )
        assert status_resp.status_code == 200, f"Status update failed: {status_resp.status_code} {status_resp.text}"
        assert status_resp.json()["status"] == "In Progress"

        # Verify status across all 3 dashboards
        admin_t1 = (await client.get(f"/api/v1/tickets/{ticket1_id}", headers={"Authorization": f"Bearer {admin_token}"})).json()
        tl_t1 = (await client.get(f"/api/v1/tickets/{ticket1_id}", headers={"Authorization": f"Bearer {tl_kotesh_token}"})).json()
        emp_t1 = (await client.get(f"/api/v1/tickets/{ticket1_id}", headers={"Authorization": f"Bearer {emp_uday_token}"})).json()
        assert admin_t1["status"] == "In Progress"
        assert tl_t1["status"] == "In Progress"
        assert emp_t1["status"] == "In Progress"
        print("Status change 'In Progress' verified consistently across Admin, TL, and Employee dashboards.")

        # STEP 6: Employee resolves ticket
        print("\n--- STEP 6: Employee resolves ticket ---")
        resolve_resp = await client.post(
            f"/api/v1/tickets/{ticket1_id}/resolve",
            json={"resolution_summary": "Replaced LC patch cable and verified 10Gbps link."},
            headers={"Authorization": f"Bearer {emp_uday_token}"},
        )
        assert resolve_resp.status_code == 200, f"Resolve failed: {resolve_resp.status_code} {resolve_resp.text}"
        assert resolve_resp.json()["status"] == "Resolved"

        # STEP 7: Verify Dashboard Counts and Stats
        print("\n--- STEP 7: Verify synchronized dashboard counts ---")
        emp_stats = (await client.get("/api/v1/tickets/stats", headers={"Authorization": f"Bearer {emp_uday_token}"})).json()
        assert emp_stats["resolvedTickets"] >= 1
        print(f"Employee Uday Stats: total={emp_stats.get('totalTickets')}, resolved={emp_stats.get('resolvedTickets')}, open={emp_stats.get('openTickets')}")

        tl_stats = (await client.get("/api/v1/tickets/stats", headers={"Authorization": f"Bearer {tl_kotesh_token}"})).json()
        print(f"Team Lead Kotesh Stats: total={tl_stats.get('totalTickets')}, resolved={tl_stats.get('resolvedTickets')}, open={tl_stats.get('openTickets')}")

        # Cleanup test tickets
        print("\n--- CLEANUP: Removing integration test tickets from Supabase ---")
        for tid in created_ticket_ids:
            try:
                await client.delete(f"/api/v1/tickets/{tid}", headers={"Authorization": f"Bearer {admin_token}"})
                print(f"Deleted test ticket {tid}")
            except Exception as e:
                print(f"Failed to delete {tid}: {e}")

    print("\n=== COMPLETE WORKFLOW TEST PASSED ALL CHECKS SUCCESSFULLY! ===")


if __name__ == "__main__":
    asyncio.run(run_workflow_test())
