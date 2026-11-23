"""Comprehensive test suite for Team Lead visibility, isolation, cross-team assignment, and Admin access."""

from typing import Any
import pytest
from app.services.access import (
    ROLE_ADMIN,
    ROLE_TEAMLEAD,
    ROLE_EMPLOYEE,
    ticket_visible,
    scoped_tickets,
)


def test_cross_team_ticket_visibility():
    """Verify that cross-team ticket assignment is visible to BOTH creator TL and receiving TL,
    while isolated from unrelated TLs, and fully visible to Admin.
    """
    # Admin
    admin_user = {"id": "usr-admin-1", "name": "Admin User", "role": "admin"}
    admin_payload = {"sub": "usr-admin-1", "role": "admin"}

    # Team Alpha TL and members
    tl_alpha = {
        "id": "TL_ALPHA",
        "name": "Kotesh",
        "email": "kotesh@oklut.com",
        "role": "teamlead",
        "team": "Team Alpha",
        "department": "IT Support",
    }
    payload_alpha = {"sub": "TL_ALPHA", "role": "teamlead", "name": "Kotesh", "email": "kotesh@oklut.com"}

    emp_alpha = {
        "id": "EMP_ALPHA_1",
        "name": "aditya",
        "email": "aditya@oklut.com",
        "role": "employee",
        "team": "Team Alpha",
        "department": "IT Support",
    }

    # Team Beta TL and members
    tl_beta = {
        "id": "TL_BETA",
        "name": "Manikanta",
        "email": "manikanta@oklut.com",
        "role": "teamlead",
        "team": "Team Beta",
        "department": "IT Support",
    }
    payload_beta = {"sub": "TL_BETA", "role": "teamlead", "name": "Manikanta", "email": "manikanta@oklut.com"}

    emp_beta = {
        "id": "EMP_BETA_1",
        "name": "sudha",
        "email": "sudha@oklut.com",
        "role": "employee",
        "team": "Team Beta",
        "department": "IT Support",
    }

    # Team Gamma (Unrelated team) TL
    tl_gamma = {
        "id": "TL_GAMMA",
        "name": "Rahul",
        "email": "rahul@oklut.com",
        "role": "teamlead",
        "team": "Development Team",
        "department": "Development",
    }
    payload_gamma = {"sub": "TL_GAMMA", "role": "teamlead", "name": "Rahul", "email": "rahul@oklut.com"}

    # Ticket 1: Internal Team Alpha ticket (created by Aditya, assigned to Uday in Team Alpha)
    ticket_alpha_internal = {
        "id": "TKT-ALPHA-01",
        "subject": "Alpha Internal Task",
        "department": "IT Support",
        "employee_id": "EMP_ALPHA_1",
        "employee": "aditya",
        "employee_email": "aditya@oklut.com",
        "assigned_agent_id": "EMP_ALPHA_2",
        "assigned_agent": "uday",
        "assigned_agent_email": "uday@oklut.com",
        "assigned_team_id": "Team Alpha",
    }

    # Ticket 2: Internal Team Beta ticket (created by Sudha, assigned to Sudha in Team Beta)
    ticket_beta_internal = {
        "id": "TKT-BETA-01",
        "subject": "Beta Internal Task",
        "department": "IT Support",
        "employee_id": "EMP_BETA_1",
        "employee": "sudha",
        "employee_email": "sudha@oklut.com",
        "assigned_agent_id": "EMP_BETA_1",
        "assigned_agent": "sudha",
        "assigned_agent_email": "sudha@oklut.com",
        "assigned_team_id": "Team Beta",
    }

    # Ticket 3: Cross-Team Ticket!
    # Raised by Aditya (Team Alpha) and assigned to Sudha (Team Beta)
    ticket_cross_team = {
        "id": "TKT-CROSS-01",
        "subject": "Alpha to Beta Cross Request",
        "department": "IT Support",
        "employee_id": "EMP_ALPHA_1",
        "employee": "aditya",
        "employee_email": "aditya@oklut.com",
        "assigned_agent_id": "EMP_BETA_1",
        "assigned_agent": "sudha",
        "assigned_agent_email": "sudha@oklut.com",
        "assigned_team_id": "Team Beta",
    }

    # Ticket 4: Cross-Team Ticket assigned to TL Beta directly by Team Alpha member
    ticket_cross_to_tl = {
        "id": "TKT-CROSS-02",
        "subject": "Alpha to Beta TL Direct Request",
        "department": "IT Support",
        "employee_id": "EMP_ALPHA_1",
        "employee": "aditya",
        "employee_email": "aditya@oklut.com",
        "assigned_agent_id": "TL_BETA",
        "assigned_agent": "Manikanta",
        "assigned_agent_email": "manikanta@oklut.com",
    }

    # Mock teamlead_member_index to return each TL's respective team members
    from unittest.mock import patch

    def mock_member_index(tl_user):
        tid = tl_user.get("id")
        if tid == "TL_ALPHA":
            return ({"EMP_ALPHA_1", "EMP_ALPHA_2"}, {"aditya@oklut.com", "uday@oklut.com"}, {"aditya", "uday"})
        elif tid == "TL_BETA":
            return ({"EMP_BETA_1"}, {"sudha@oklut.com"}, {"sudha"})
        elif tid == "TL_GAMMA":
            return ({"EMP_GAMMA_1"}, {"gamma@oklut.com"}, {"gamma"})
        return (set(), set(), set())

    with patch("app.services.access.teamlead_member_index", side_effect=mock_member_index):
        # 1. Team Alpha internal:
        # TL Alpha MUST see it
        assert ticket_visible(payload_alpha, tl_alpha, ticket_alpha_internal) is True
        # TL Beta MUST NOT see it (even though both are in IT Support!)
        assert ticket_visible(payload_beta, tl_beta, ticket_alpha_internal) is False
        # TL Gamma MUST NOT see it
        assert ticket_visible(payload_gamma, tl_gamma, ticket_alpha_internal) is False
        # Admin MUST see it
        assert ticket_visible(admin_payload, admin_user, ticket_alpha_internal) is True

        # 2. Team Beta internal:
        # TL Beta MUST see it
        assert ticket_visible(payload_beta, tl_beta, ticket_beta_internal) is True
        # TL Alpha MUST NOT see it
        assert ticket_visible(payload_alpha, tl_alpha, ticket_beta_internal) is False
        # TL Gamma MUST NOT see it
        assert ticket_visible(payload_gamma, tl_gamma, ticket_beta_internal) is False
        # Admin MUST see it
        assert ticket_visible(admin_payload, admin_user, ticket_beta_internal) is True

        # 3. Cross-Team Ticket (Aditya Team Alpha -> Sudha Team Beta):
        # Creator TL (TL Alpha) MUST see it
        assert ticket_visible(payload_alpha, tl_alpha, ticket_cross_team) is True
        # Receiving TL (TL Beta) MUST see it
        assert ticket_visible(payload_beta, tl_beta, ticket_cross_team) is True
        # Unrelated TL (TL Gamma) MUST NOT see it
        assert ticket_visible(payload_gamma, tl_gamma, ticket_cross_team) is False
        # Admin MUST see it
        assert ticket_visible(admin_payload, admin_user, ticket_cross_team) is True

        # 4. Cross-Team Ticket directly assigned to TL Beta:
        assert ticket_visible(payload_alpha, tl_alpha, ticket_cross_to_tl) is True
        assert ticket_visible(payload_beta, tl_beta, ticket_cross_to_tl) is True
        assert ticket_visible(payload_gamma, tl_gamma, ticket_cross_to_tl) is False
        assert ticket_visible(admin_payload, admin_user, ticket_cross_to_tl) is True

    print("ALL CROSS-TEAM VISIBILITY CHECKS PASSED PERFECTLY!")


if __name__ == "__main__":
    test_cross_team_ticket_visibility()
