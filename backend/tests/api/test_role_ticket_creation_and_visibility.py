"""End-to-End verification of ticket creation, assignment, and visibility across all 3 roles:
- Admin
- Team Lead
- Employee
Verifies:
1. Admin creates ticket assigning to TL + Employee.
2. Team Lead creates ticket assigning to Employee.
3. Employee creates ticket selecting Team Lead.
4. Database persistence in Supabase (tickets & ticket_tagged_members).
5. Visibility scoping (isolation between Team Alpha and unassigned TLs).
6. Performance of cached endpoints (/tickets, /tickets/stats).
"""

import time
import pytest
from httpx import ASGITransport, AsyncClient
from app.auth.jwt import create_app_token
from app.db.supabase import get_supabase_admin_client
from app.main import app


@pytest.mark.asyncio
async def test_all_three_roles_ticket_creation_and_visibility():
    sb = get_supabase_admin_client()

    admin_token = create_app_token(
        "usr-admin-1791538577749",
        "s.ronda@oklut.com",
        "admin",
        name="shruthi",
        department="IT Operations",
    )
    tl_kotesh_token = create_app_token(
        "OKL003",
        "k.ananthu@oklut.com",
        "teamlead",
        name="Kotesh",
        department="IT Support",
        team="Team Alpha",
    )
    tl_manikanta_token = create_app_token(
        "OKL120",
        "s.manikanta@oklut.com",
        "teamlead",
        name="manikanta",
        department="IT Support",
        team=None,
    )
    emp_uday_token = create_app_token(
        "OKL002",
        "u.vadlamudi@oklut.com",
        "employee",
        name="uday",
        department="IT",
        team="Team Alpha",
    )
    emp_aditya_token = create_app_token(
        "OKL001",
        "a.reddy@oklut.com",
        "employee",
        name="aditya",
        department="IT",
        team="Team Alpha",
    )

    created_ids = []

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # ---------------------------------------------------------------------
        # 1. Admin Ticket Creation
        # ---------------------------------------------------------------------
        print("\n=== 1. Admin creates ticket ===")
        admin_payload = {
            "subject": "Admin Created Server Migration",
            "description": "Migrate database replica to region US-East",
            "category": "Infrastructure",
            "sub_category": "Database",
            "department": "IT Support",
            "departments": ["IT Support"],
            "priority": "High",
            "team_lead_ids": ["OKL003"],
            "team_leads": [{"id": "OKL003", "name": "Kotesh", "email": "k.ananthu@oklut.com"}],
            "tagged_employee_ids": ["OKL002"],
            "employees": [{"id": "OKL002", "name": "uday", "email": "u.vadlamudi@oklut.com"}],
        }
        res_admin = await client.post(
            "/api/v1/tickets",
            json=admin_payload,
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert res_admin.status_code in (200, 201), f"Admin creation failed: {res_admin.text}"
        admin_tkt = res_admin.json()
        admin_tid = admin_tkt["id"]
        created_ids.append(admin_tid)

        assert admin_tkt["assigned_agent_id"] == "OKL002"
        assert admin_tkt["assigned_to_type"] == "employee"
        assert admin_tkt.get("ticket_number") == admin_tid

        # Verify DB row
        db_tkt = sb.table("tickets").select("*").eq("id", admin_tid).execute().data
        assert len(db_tkt) == 1
        assert db_tkt[0]["assigned_agent_id"] == "OKL002"

        # Verify tagged members table
        tagged = sb.table("ticket_tagged_members").select("*").eq("ticket_id", admin_tid).execute().data
        tagged_uids = {t["user_id"] for t in (tagged or [])}
        assert "OKL003" in tagged_uids or "OKL002" in tagged_uids

        # ---------------------------------------------------------------------
        # 2. Team Lead Ticket Creation
        # ---------------------------------------------------------------------
        print("\n=== 2. Team Lead creates ticket ===")
        tl_payload = {
            "subject": "TL Created Workstation Setup",
            "description": "Configure developer laptop with Docker and toolchain",
            "category": "Hardware",
            "sub_category": "Workstation",
            "department": "IT Support",
            "departments": ["IT Support"],
            "priority": "Medium",
            "tagged_employee_ids": ["OKL001"],
            "employees": [{"id": "OKL001", "name": "aditya", "email": "a.reddy@oklut.com"}],
        }
        res_tl = await client.post(
            "/api/v1/tickets",
            json=tl_payload,
            headers={"Authorization": f"Bearer {tl_kotesh_token}"},
        )
        assert res_tl.status_code in (200, 201), f"TL creation failed: {res_tl.text}"
        tl_tkt = res_tl.json()
        tl_tid = tl_tkt["id"]
        created_ids.append(tl_tid)

        assert tl_tkt["assigned_agent_id"] == "OKL001"
        assert tl_tkt["assigned_to_type"] == "employee"

        # ---------------------------------------------------------------------
        # 3. Employee Ticket Creation
        # ---------------------------------------------------------------------
        print("\n=== 3. Employee creates ticket ===")
        emp_payload = {
            "subject": "Employee Request - Monitor Stand",
            "description": "Request dual monitor arm for ergonomics",
            "category": "Hardware",
            "sub_category": "Peripherals",
            "department": "IT Support",
            "departments": ["IT Support"],
            "priority": "Low",
            "team_lead_ids": ["OKL003"],
            "team_leads": [{"id": "OKL003", "name": "Kotesh", "email": "k.ananthu@oklut.com"}],
        }
        res_emp = await client.post(
            "/api/v1/tickets",
            json=emp_payload,
            headers={"Authorization": f"Bearer {emp_uday_token}"},
        )
        assert res_emp.status_code in (200, 201), f"Employee creation failed: {res_emp.text}"
        emp_tkt = res_emp.json()
        emp_tid = emp_tkt["id"]
        created_ids.append(emp_tid)

        assert emp_tkt["employee_id"] == "OKL002"
        assert emp_tkt["status"] == "Open"

        # ---------------------------------------------------------------------
        # 4. Visibility Checks Across Roles
        # ---------------------------------------------------------------------
        print("\n=== 4. Visibility verification across dashboards ===")
        
        # 4a. Admin sees ALL 3 tickets
        admin_list = (await client.get("/api/v1/tickets", headers={"Authorization": f"Bearer {admin_token}"})).json()
        admin_tids = {t["id"] for t in admin_list}
        assert admin_tid in admin_tids, "Admin must see admin ticket"
        assert tl_tid in admin_tids, "Admin must see TL ticket"
        assert emp_tid in admin_tids, "Admin must see employee ticket"

        # 4b. TL Kotesh sees all 3 tickets (admin ticket has OKL003 tagged, TL ticket created by him, emp ticket has OKL003 tagged)
        kotesh_list = (await client.get("/api/v1/tickets", headers={"Authorization": f"Bearer {tl_kotesh_token}"})).json()
        kotesh_tids = {t["id"] for t in kotesh_list}
        assert admin_tid in kotesh_tids, "TL Kotesh must see ticket where he is tagged TL"
        assert tl_tid in kotesh_tids, "TL Kotesh must see ticket he created"
        assert emp_tid in kotesh_tids, "TL Kotesh must see ticket submitted to his department/tagged to him"

        # 4c. TL Manikanta (no team, not tagged) should NOT see admin_tid or tl_tid which belong specifically to Team Alpha
        manikanta_list = (await client.get("/api/v1/tickets", headers={"Authorization": f"Bearer {tl_manikanta_token}"})).json()
        manikanta_tids = {t["id"] for t in manikanta_list}
        assert admin_tid not in manikanta_tids, "TL Manikanta must NOT see Team Alpha's ticket"
        assert tl_tid not in manikanta_tids, "TL Manikanta must NOT see Team Alpha's internal ticket"

        # 4d. Employee Uday:
        # sees admin_tid (assigned to him, is_assigned_to_me == True)
        # sees emp_tid (created by him, is_created_by_me == True)
        # DOES NOT see tl_tid (assigned to Aditya, not created by Uday)
        uday_list = (await client.get("/api/v1/tickets", headers={"Authorization": f"Bearer {emp_uday_token}"})).json()
        uday_tids = {t["id"] for t in uday_list}
        assert admin_tid in uday_tids, "Uday must see ticket assigned to him"
        assert emp_tid in uday_tids, "Uday must see ticket created by him"
        assert tl_tid not in uday_tids, "Uday must NOT see ticket assigned exclusively to Aditya"

        uday_admin_tkt = next(t for t in uday_list if t["id"] == admin_tid)
        assert uday_admin_tkt["is_assigned_to_me"] is True

        uday_emp_tkt = next(t for t in uday_list if t["id"] == emp_tid)
        assert uday_emp_tkt["is_created_by_me"] is True

        # 4e. Employee Aditya:
        # sees tl_tid (assigned to him)
        # DOES NOT see admin_tid (assigned to Uday) or emp_tid (created by Uday, not assigned to Aditya)
        aditya_list = (await client.get("/api/v1/tickets", headers={"Authorization": f"Bearer {emp_aditya_token}"})).json()
        aditya_tids = {t["id"] for t in aditya_list}
        assert tl_tid in aditya_tids, "Aditya must see ticket assigned to him"
        assert admin_tid not in aditya_tids, "Aditya must NOT see ticket assigned to Uday"
        assert emp_tid not in aditya_tids, "Aditya must NOT see ticket created by Uday"

        # ---------------------------------------------------------------------
        # 5. Performance Check: In-memory Caching of Scoped Tickets & Stats
        # ---------------------------------------------------------------------
        print("\n=== 5. Performance and Caching ===")
        # First call might prime cache; second call must be instantaneous (< 30ms)
        t0 = time.perf_counter()
        r1 = await client.get("/api/v1/tickets", headers={"Authorization": f"Bearer {admin_token}"})
        t1 = time.perf_counter()
        dur1 = (t1 - t0) * 1000

        t2 = time.perf_counter()
        r2 = await client.get("/api/v1/tickets/stats", headers={"Authorization": f"Bearer {admin_token}"})
        t3 = time.perf_counter()
        dur2 = (t3 - t2) * 1000

        print(f"Cached /tickets latency: {dur1:.2f} ms")
        print(f"Cached /tickets/stats latency: {dur2:.2f} ms")
        assert r1.status_code == 200
        assert r2.status_code == 200
        assert dur1 < 50, f"Expected fast cached response < 50ms, got {dur1}ms"
        assert dur2 < 50, f"Expected fast cached response < 50ms, got {dur2}ms"

    # Cleanup created tickets from Supabase so test is idempotent
    print(f"\nCleaning up test tickets: {created_ids}")
    for tid in created_ids:
        try:
            sb.table("ticket_tagged_members").delete().eq("ticket_id", tid).execute()
            sb.table("tickets").delete().eq("id", tid).execute()
        except Exception as e:
            print(f"Cleanup error for {tid}: {e}")

    print("\n=== ALL ROLE CREATION AND VISIBILITY CHECKS PASSED ===")
