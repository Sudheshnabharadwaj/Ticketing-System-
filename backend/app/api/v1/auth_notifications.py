"""API endpoints for auth, invitation verification, ticket assignment notifications and SMTP diagnostics."""

from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr

from app.config import get_settings
from app.services.email_service import (
    format_user_invitation_email,
    format_teamlead_welcome_email,
    format_ticket_assignment_email,
    format_password_reset_email,
    send_email_async,
)

router = APIRouter(prefix="/notifications", tags=["notifications"])


class TeamLeadWelcomeRequest(BaseModel):
    name: str
    email: EmailStr
    employee_id: str
    password: str
    department: Optional[str] = "IT Support"
    login_url: Optional[str] = "http://localhost:4174/login"


class UserInvitationRequest(BaseModel):
    name: str
    email: EmailStr
    employee_id: Optional[str] = ""
    role: Optional[str] = "Employee"
    department: Optional[str] = "IT Support"
    invite_token: str
    signup_url: Optional[str] = None
    password: Optional[str] = None


class TicketAssignmentRequest(BaseModel):
    ticket_id: str
    title: str
    assigned_agent_name: str
    assigned_agent_email: EmailStr
    priority: Optional[str] = "Medium"
    department: Optional[str] = "IT Support"
    requester_name: Optional[str] = "User"
    description: Optional[str] = ""
    ticket_url: Optional[str] = None


class ForgotPasswordNotificationRequest(BaseModel):
    email: EmailStr
    name: Optional[str] = "User"
    reset_code: str
    reset_url: str
    portal: Optional[str] = "Ticketing Platform"


class SMTPTestRequest(BaseModel):
    test_email: EmailStr


@router.post("/forgot-password")
async def send_forgot_password_email(payload: ForgotPasswordNotificationRequest):
    """Send live password reset email with OTP code and direct reset link."""
    email_data = format_password_reset_email(
        name=payload.name or "User",
        email=payload.email,
        reset_code=payload.reset_code,
        reset_url=payload.reset_url,
        portal_name=payload.portal or "Ticketing Platform"
    )

    result = await send_email_async(
        to_email=payload.email,
        subject=email_data["subject"],
        html_content=email_data["html"],
        text_content=email_data["text"],
    )

    return {
        "success": True,
        "smtp_sent": result.get("sent", False),
        "recipient": payload.email,
        "reset_code": payload.reset_code,
        "delivery_details": result,
    }


@router.get("/smtp-status")
async def get_smtp_status():
    """Return whether SMTP is configured and whether password credentials are set."""
    settings = get_settings()
    has_host = bool(settings.smtp_host and settings.smtp_port)
    has_password = bool(settings.smtp_password and settings.smtp_password.strip())
    is_fully_configured = bool(has_host and has_password)

    return {
        "is_configured": is_fully_configured,
        "has_host": has_host,
        "has_password": has_password,
        "host": settings.smtp_host or None,
        "port": settings.smtp_port,
        "sender_email": settings.smtp_from_email or settings.smtp_user,
        "sender_name": settings.smtp_from_name,
        "tls": settings.smtp_tls,
        "instructions": (
            "SMTP is ready for live inbox delivery."
            if is_fully_configured
            else "For live emails to reach Gmail inboxes, generate a 16-character App Password at https://myaccount.google.com/apppasswords and set SMTP_PASSWORD in backend/.env."
        )
    }


@router.post("/send-invite")
async def send_user_invitation(payload: UserInvitationRequest):
    """Send account verification & onboarding invitation email to a newly added user."""
    role_norm = (payload.role or "employee").lower().replace(" ", "")

    if role_norm in ("teamlead", "tl", "team_lead"):
        login_url = payload.signup_url or f"http://localhost:4174/login?email={payload.email}"
        email_data = format_teamlead_welcome_email(
            name=payload.name,
            email=payload.email,
            employee_id=payload.employee_id or "",
            password=payload.password or "Password123",
            department=payload.department or "IT Support",
            login_url=login_url,
        )
        dest_url = login_url
    else:
        dest_url = payload.signup_url or f"http://localhost:4173/signin?email={payload.email}"
        email_data = format_user_invitation_email(
            name=payload.name,
            email=payload.email,
            role=payload.role or "Employee",
            department=payload.department or "IT Support",
            employee_id=payload.employee_id or "",
            invite_token=payload.invite_token,
            signup_url=dest_url,
            temp_password=payload.password,
        )

    result = await send_email_async(
        to_email=payload.email,
        subject=email_data["subject"],
        html_content=email_data["html"],
        text_content=email_data["text"],
    )

    return {
        "success": True,
        "smtp_sent": result.get("sent", False),
        "recipient": payload.email,
        "role": payload.role,
        "invite_token": payload.invite_token,
        "signup_url": dest_url,
        "delivery_details": result,
        "preview": {
            "subject": email_data["subject"],
            "verification_token": payload.invite_token,
            "signup_url": dest_url,
            "recipient": payload.email,
        }
    }


@router.post("/ticket-assigned")
async def send_ticket_assignment_notification(payload: TicketAssignmentRequest):
    """Send email notification to an agent/employee when a ticket is assigned to them."""
    ticket_url = payload.ticket_url or f"http://localhost:3000/admin/workspace/tickets/{payload.ticket_id}"

    email_data = format_ticket_assignment_email(
        ticket_id=payload.ticket_id,
        title=payload.title,
        assigned_agent_name=payload.assigned_agent_name,
        assigned_agent_email=payload.assigned_agent_email,
        priority=payload.priority or "Medium",
        department=payload.department or "IT Support",
        requester_name=payload.requester_name or "User",
        description=payload.description or "",
        ticket_url=ticket_url,
    )

    result = await send_email_async(
        to_email=payload.assigned_agent_email,
        subject=email_data["subject"],
        html_content=email_data["html"],
        text_content=email_data["text"],
    )

    return {
        "success": True,
        "smtp_sent": result.get("sent", False),
        "ticket_id": payload.ticket_id,
        "recipient": payload.assigned_agent_email,
        "delivery_details": result,
    }


@router.post("/teamlead-welcome")
async def send_teamlead_welcome(payload: TeamLeadWelcomeRequest):
    """Send welcome and credential notification email to newly created Team Lead."""
    email_data = format_teamlead_welcome_email(
        name=payload.name,
        email=payload.email,
        employee_id=payload.employee_id,
        password=payload.password,
        department=payload.department or "IT Support",
        login_url=payload.login_url or "http://localhost:4174/login",
    )

    result = await send_email_async(
        to_email=payload.email,
        subject=email_data["subject"],
        html_content=email_data["html"],
        text_content=email_data["text"],
    )

    return {
        "success": True,
        "smtp_sent": result.get("sent", False),
        "recipient": payload.email,
        "employee_id": payload.employee_id,
        "delivery_details": result,
        "preview_email": {
            "subject": email_data["subject"],
            "recipient": payload.email,
            "employee_id": payload.employee_id,
            "password": payload.password,
            "login_url": payload.login_url,
        },
    }


@router.post("/smtp-test")
async def send_smtp_test(payload: SMTPTestRequest):
    """Trigger a test email to verify live SMTP delivery."""
    subject = "Ticketing Platform - SMTP Connectivity Test"
    text = f"This is an automated test email sent to {payload.test_email} from the Ticketing Platform."
    html = f"""<html><body><h2>SMTP Test Successful</h2><p>This email confirms that the Ticketing Platform SMTP server is properly configured and successfully transmitting messages to {payload.test_email}.</p></body></html>"""

    result = await send_email_async(
        to_email=payload.test_email,
        subject=subject,
        html_content=html,
        text_content=text
    )

    return {
        "success": result.get("sent", False),
        "recipient": payload.test_email,
        "details": result,
    }


class SMTPConfigRequest(BaseModel):
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_user: Optional[str] = None
    smtp_password: Optional[str] = None
    smtp_from_email: Optional[str] = None
    smtp_from_name: Optional[str] = None
    smtp_tls: Optional[bool] = None


@router.post("/smtp-config")
async def update_smtp_config(payload: SMTPConfigRequest):
    """Update and persist SMTP configuration to backend settings and .env files."""
    from pathlib import Path

    settings = get_settings()
    if payload.smtp_host is not None:
        settings.smtp_host = payload.smtp_host
    if payload.smtp_port is not None:
        settings.smtp_port = payload.smtp_port
    if payload.smtp_user is not None:
        settings.smtp_user = payload.smtp_user
    if payload.smtp_password is not None:
        settings.smtp_password = payload.smtp_password.strip()
    if payload.smtp_from_email is not None:
        settings.smtp_from_email = payload.smtp_from_email
    if payload.smtp_from_name is not None:
        settings.smtp_from_name = payload.smtp_from_name
    if payload.smtp_tls is not None:
        settings.smtp_tls = payload.smtp_tls

    env_updates = {
        "SMTP_HOST": settings.smtp_host or "",
        "SMTP_PORT": str(settings.smtp_port or 465),
        "SMTP_USER": settings.smtp_user or "",
        "SMTP_PASSWORD": settings.smtp_password or "",
        "SMTP_FROM_EMAIL": settings.smtp_from_email or "",
        "SMTP_FROM_NAME": settings.smtp_from_name or "",
        "SMTP_TLS": str(settings.smtp_tls or False).lower(),
    }

    env_paths = [
        Path.cwd() / ".env",
        Path.cwd() / "backend" / ".env",
        Path(__file__).resolve().parent.parent.parent.parent / ".env",
        Path(__file__).resolve().parent.parent.parent.parent.parent / ".env",
    ]
    for env_file in env_paths:
        if env_file.is_file():
            try:
                lines = env_file.read_text(encoding="utf-8").splitlines()
                updated_lines = []
                keys_seen = set()
                for line in lines:
                    stripped = line.strip()
                    if stripped and not stripped.startswith("#") and "=" in stripped:
                        k = stripped.split("=", 1)[0].strip()
                        if k in env_updates:
                            updated_lines.append(f"{k}={env_updates[k]}")
                            keys_seen.add(k)
                            continue
                    updated_lines.append(line)
                for k, v in env_updates.items():
                    if k not in keys_seen:
                        updated_lines.append(f"{k}={v}")
                env_file.write_text("\n".join(updated_lines) + "\n", encoding="utf-8")
            except Exception:
                pass

    return {
        "success": True,
        "is_configured": bool(settings.smtp_host and settings.smtp_password),
        "has_password": bool(settings.smtp_password),
        "smtp_host": settings.smtp_host,
        "smtp_port": settings.smtp_port,
        "smtp_user": settings.smtp_user,
        "smtp_from_email": settings.smtp_from_email,
        "smtp_from_name": settings.smtp_from_name,
    }
