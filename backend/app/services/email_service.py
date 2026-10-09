"""Email notification service using standard smtplib and formatted HTML templates."""

import asyncio
import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Any, Dict, Optional

from app.config import get_settings

logger = logging.getLogger("email_service")


def format_user_invitation_email(
    name: str,
    email: str,
    role: str,
    department: str,
    employee_id: str,
    invite_token: str,
    signup_url: str,
    temp_password: Optional[str] = None
) -> Dict[str, str]:
    """Return subject, HTML and text content for a user onboarding & email verification invitation."""
    subject = f"Your Account Access & Password Details - Ticketing Platform ({name})"

    password_row = ""
    if temp_password:
        password_row = f"""
          <tr style="border-bottom: 1px solid #e2e8f0; background: #f0fdf4;">
            <td style="padding: 10px 12px; color: #166534; font-size: 13px; font-weight: 600;">Your Login Password:</td>
            <td style="padding: 10px 12px; text-align: right; color: #15803d; font-weight: 800; font-family: monospace; font-size: 15px;">{temp_password}</td>
          </tr>
        """

    employee_row = ""
    if employee_id:
        employee_row = f"""
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px 0; color: #64748b; font-size: 13px; font-weight: 500;">Employee ID:</td>
            <td style="padding: 10px 0; text-align: right; color: #0f172a; font-weight: 700; font-family: monospace; font-size: 14px;">{employee_id}</td>
          </tr>
        """

    html = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>{subject}</title>
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }}
    .container {{ max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }}
    .header {{ background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); padding: 32px 24px; text-align: center; color: #ffffff; }}
    .header h1 {{ margin: 0 0 8px 0; font-size: 22px; font-weight: 700; }}
    .header p {{ margin: 0; font-size: 14px; opacity: 0.9; }}
    .content {{ padding: 32px 28px; line-height: 1.6; font-size: 15px; }}
    .badge {{ display: inline-block; background: #e0f2fe; color: #0369a1; padding: 4px 10px; border-radius: 6px; font-weight: 600; font-size: 12px; text-transform: uppercase; margin-bottom: 16px; }}
    .token-box {{ background: #eff6ff; border: 2px dashed #93c5fd; border-radius: 10px; padding: 16px; margin: 20px 0; text-align: center; }}
    .token-label {{ font-size: 12px; text-transform: uppercase; color: #1e40af; font-weight: 700; margin-bottom: 4px; }}
    .token-code {{ font-size: 20px; font-family: monospace; font-weight: 800; color: #0284c7; letter-spacing: 2px; }}
    .credentials-box {{ background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 18px; margin: 20px 0; }}
    .button-container {{ text-align: center; margin: 28px 0 16px 0; }}
    .btn {{ display: inline-block; background-color: #0284c7; color: #ffffff !important; padding: 14px 28px; border-radius: 8px; font-weight: 700; text-decoration: none; font-size: 15px; box-shadow: 0 2px 4px rgba(2, 132, 199, 0.25); }}
    .direct-link {{ word-break: break-all; font-size: 12px; color: #64748b; background: #f1f5f9; padding: 8px 12px; border-radius: 6px; margin-top: 10px; font-family: monospace; }}
    .notice {{ background: #fffbeb; border: 1px solid #fef3c7; border-radius: 8px; padding: 12px 16px; font-size: 13px; color: #92400e; margin-top: 20px; }}
    .footer {{ background: #f1f5f9; padding: 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Ticketing & Operations Platform</h1>
      <p>Account Access & Email Verification</p>
    </div>
    <div class="content">
      <div class="badge">Role: {role.upper()} ({department})</div>
      <p style="margin-top: 0;">Hello <strong>{name}</strong>,</p>
      <p>An account has been assigned to you by your Administrator. To complete your onboarding and verify your access, please click the button below or enter your verification token on the registration portal.</p>
      
      <div class="token-box">
        <div class="token-label">Your Verification Token</div>
        <div class="token-code">{invite_token}</div>
        <div style="font-size: 11px; color: #64748b; margin-top: 6px;">Use this token to activate your account</div>
      </div>

      <div class="credentials-box">
        <table style="width: 100%; border-collapse: collapse;">
          {employee_row}
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px 0; color: #64748b; font-size: 13px; font-weight: 500;">Assigned Email:</td>
            <td style="padding: 10px 0; text-align: right; color: #0f172a; font-weight: 600;">{email}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px 0; color: #64748b; font-size: 13px; font-weight: 500;">Assigned Role:</td>
            <td style="padding: 10px 0; text-align: right; color: #0f172a; font-weight: 600;">{role}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px 0; color: #64748b; font-size: 13px; font-weight: 500;">Department:</td>
            <td style="padding: 10px 0; text-align: right; color: #0f172a; font-weight: 600;">{department}</td>
          </tr>
          {password_row}
        </table>
      </div>

      <div class="button-container">
        <a href="{signup_url}" class="btn" target="_blank">Verify Email & Activate Account</a>
      </div>

      <p style="font-size: 12px; color: #64748b; margin-bottom: 4px;">Or copy and paste this direct verification URL into your browser:</p>
      <div class="direct-link">{signup_url}</div>

      <div class="notice">
        <strong>Security Notice:</strong> This invitation was generated specifically for {email}. Please do not forward this email to anyone else.
      </div>
    </div>
    <div class="footer">
      <p style="margin: 0;">Automated System Notification • Ticketing & Operations Platform</p>
    </div>
  </div>
</body>
</html>"""

    text = f"""Ticketing & Operations Platform - Account Verification & Invitation

Hello {name},

An account has been assigned to you by your Administrator.

Your Verification Details:
- Verification Token: {invite_token}
- Assigned Email: {email}
- Assigned Role: {role}
- Department: {department}
{f'- Employee ID: {employee_id}' if employee_id else ''}
{f'- Temporary Password: {temp_password}' if temp_password else ''}

To activate your account and verify your email, visit:
{signup_url}

Please do not reply to this automated message.
"""
    return {"subject": subject, "html": html, "text": text}


def format_teamlead_welcome_email(
    name: str,
    email: str,
    employee_id: str,
    password: str,
    department: str = "IT Support",
    login_url: str = "http://localhost:4174/login"
) -> Dict[str, str]:
    """Return subject and HTML content for Team Lead welcome & verification email."""
    subject = f"Welcome to Ticketing Platform - Your Team Lead Account Details ({employee_id})"
    
    html = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>{subject}</title>
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }}
    .container {{ max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }}
    .header {{ background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); padding: 32px 24px; text-align: center; color: #ffffff; }}
    .header h1 {{ margin: 0 0 8px 0; font-size: 22px; font-weight: 700; }}
    .header p {{ margin: 0; font-size: 14px; opacity: 0.9; }}
    .content {{ padding: 32px 28px; line-height: 1.6; font-size: 15px; }}
    .welcome-text {{ margin-top: 0; margin-bottom: 20px; font-size: 16px; color: #0f172a; }}
    .badge {{ display: inline-block; background: #e0f2fe; color: #0369a1; padding: 4px 10px; border-radius: 6px; font-weight: 600; font-size: 12px; text-transform: uppercase; margin-bottom: 16px; }}
    .credentials-box {{ background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px; margin: 24px 0; }}
    .button-container {{ text-align: center; margin: 30px 0 10px 0; }}
    .btn {{ display: inline-block; background-color: #0284c7; color: #ffffff !important; padding: 14px 28px; border-radius: 8px; font-weight: 600; text-decoration: none; font-size: 15px; box-shadow: 0 2px 4px rgba(2, 132, 199, 0.25); }}
    .notice {{ background: #fffbeb; border: 1px solid #fef3c7; border-radius: 8px; padding: 12px 16px; font-size: 13px; color: #92400e; margin-top: 24px; }}
    .footer {{ background: #f1f5f9; padding: 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Ticketing & Operations Platform</h1>
      <p>Team Lead Account Activation</p>
    </div>
    <div class="content">
      <div class="badge">Role: Team Lead ({department})</div>
      <p class="welcome-text">Hello <strong>{name}</strong>,</p>
      <p>Your Team Lead administrator account has been successfully created. You can now access your dashboard to manage tickets, coordinate team member assignments, and monitor SLA resolutions.</p>
      
      <div class="credentials-box">
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px 0; color: #64748b; font-size: 13px; font-weight: 500;">Employee ID:</td>
            <td style="padding: 10px 0; text-align: right; color: #0f172a; font-weight: 700; font-family: monospace; font-size: 14px;">{employee_id}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px 0; color: #64748b; font-size: 13px; font-weight: 500;">Login Email:</td>
            <td style="padding: 10px 0; text-align: right; color: #0f172a; font-weight: 600;">{email}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px 0; color: #64748b; font-size: 13px; font-weight: 500;">Temporary Password:</td>
            <td style="padding: 10px 0; text-align: right; color: #0284c7; font-weight: 700; font-family: monospace; font-size: 14px;">{password}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #64748b; font-size: 13px; font-weight: 500;">Assigned Department:</td>
            <td style="padding: 10px 0; text-align: right; color: #0f172a; font-weight: 600;">{department}</td>
          </tr>
        </table>
      </div>

      <div class="button-container">
        <a href="{login_url}" class="btn" target="_blank">Access Team Lead Portal</a>
      </div>

      <p style="font-size: 12px; color: #64748b; margin-bottom: 4px; text-align: center;">Or copy and paste this portal link into your browser:</p>
      <div style="word-break: break-all; font-size: 12px; color: #0284c7; background: #f1f5f9; padding: 10px 14px; border-radius: 6px; font-family: monospace; text-align: center; border: 1px solid #e2e8f0;">{login_url}</div>

      <div class="notice">
        <strong>Security Notice:</strong> Please sign in using the temporary credentials above and change your password in your Profile & Security settings immediately upon initial login.
      </div>
    </div>
    <div class="footer">
      <p style="margin: 0;">This is an automated system notification from your platform administrator. Please do not reply directly to this message.</p>
    </div>
  </div>
</body>
</html>"""

    text = f"""Welcome to Ticketing Platform - Team Lead Account

Hello {name},

Your Team Lead account has been created.

Your Login Credentials:
- Employee ID: {employee_id}
- Login Email: {email}
- Password: {password}
- Department: {department}

Login Portal: {login_url}

Please change your password immediately upon your first login.
"""
    return {"subject": subject, "html": html, "text": text}


def format_password_reset_email(
    name: str,
    email: str,
    reset_code: str,
    reset_url: str,
    portal_name: str = "Ticketing Platform"
) -> Dict[str, str]:
    """Return subject, HTML and text content for a password reset request email."""
    subject = f"Password Reset Code: {reset_code} - {portal_name}"
    html = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>{subject}</title>
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }}
    .container {{ max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }}
    .header {{ background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); padding: 32px 24px; text-align: center; color: #ffffff; }}
    .header h1 {{ margin: 0 0 8px 0; font-size: 22px; font-weight: 700; }}
    .header p {{ margin: 0; font-size: 14px; opacity: 0.9; }}
    .content {{ padding: 32px 28px; line-height: 1.6; font-size: 15px; }}
    .otp-box {{ background: #eff6ff; border: 2px dashed #93c5fd; border-radius: 10px; padding: 20px; margin: 24px 0; text-align: center; }}
    .otp-label {{ font-size: 12px; text-transform: uppercase; color: #1e40af; font-weight: 700; margin-bottom: 6px; letter-spacing: 1px; }}
    .otp-code {{ font-size: 32px; font-family: monospace; font-weight: 800; color: #0284c7; letter-spacing: 6px; }}
    .button-container {{ text-align: center; margin: 28px 0 16px 0; }}
    .btn {{ display: inline-block; background-color: #0284c7; color: #ffffff !important; padding: 14px 28px; border-radius: 8px; font-weight: 700; text-decoration: none; font-size: 15px; box-shadow: 0 2px 4px rgba(2, 132, 199, 0.25); }}
    .notice {{ background: #fffbeb; border: 1px solid #fef3c7; border-radius: 8px; padding: 12px 16px; font-size: 13px; color: #92400e; margin-top: 24px; }}
    .footer {{ background: #f1f5f9; padding: 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>{portal_name}</h1>
      <p>Password Reset Request</p>
    </div>
    <div class="content">
      <p style="margin-top: 0;">Hello <strong>{name}</strong>,</p>
      <p>We received a request to reset the password for your account (<strong>{email}</strong>). Use the verification code below or click the button to set a new password.</p>
      
      <div class="otp-box">
        <div class="otp-label">Your Password Reset Code</div>
        <div class="otp-code">{reset_code}</div>
        <div style="font-size: 12px; color: #64748b; margin-top: 8px;">Valid for 15 minutes</div>
      </div>

      <div class="button-container">
        <a href="{reset_url}" class="btn" target="_blank">Reset Password Now</a>
      </div>

      <p style="font-size: 12px; color: #64748b; margin-bottom: 4px; text-align: center;">Or copy and paste this link into your browser:</p>
      <div style="word-break: break-all; font-size: 12px; color: #0284c7; background: #f1f5f9; padding: 10px 14px; border-radius: 6px; font-family: monospace; text-align: center; border: 1px solid #e2e8f0;">{reset_url}</div>

      <div class="notice">
        <strong>Security Notice:</strong> If you did not request a password reset, please ignore this email or contact your administrator immediately. Your password will remain unchanged.
      </div>
    </div>
    <div class="footer">
      <p style="margin: 0;">Automated System Notification • {portal_name}</p>
    </div>
  </div>
</body>
</html>"""

    text = f"""{portal_name} - Password Reset Request

Hello {name},

We received a request to reset the password for your account ({email}).

Your Reset Verification Code: {reset_code}

To set a new password, visit:
{reset_url}

If you did not request this reset, you can safely ignore this email.
"""
    return {"subject": subject, "html": html, "text": text}


def format_ticket_assignment_email(
    ticket_id: str,
    title: str,
    assigned_agent_name: str,
    assigned_agent_email: str,
    priority: str = "Medium",
    department: str = "IT Support",
    requester_name: str = "User",
    description: str = "",
    ticket_url: str = "http://localhost:3000/admin/tickets"
) -> Dict[str, str]:
    """Return subject, HTML and text content for a ticket assignment email notification."""
    subject = f"Ticket Assigned to You: [{ticket_id}] {title}"

    short_desc = description[:250] + "..." if len(description) > 250 else (description or "No description provided.")

    priority_color = "#0284c7"
    if priority.lower() in ("high", "urgent"):
        priority_color = "#ea580c"
    elif priority.lower() == "critical":
        priority_color = "#dc2626"

    html = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>{subject}</title>
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }}
    .container {{ max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }}
    .header {{ background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); padding: 28px 24px; text-align: center; color: #ffffff; }}
    .header h1 {{ margin: 0 0 6px 0; font-size: 20px; font-weight: 700; }}
    .content {{ padding: 28px 24px; line-height: 1.6; font-size: 14px; }}
    .ticket-box {{ background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 18px; margin: 18px 0; }}
    .btn {{ display: inline-block; background-color: #0284c7; color: #ffffff !important; padding: 12px 24px; border-radius: 8px; font-weight: 600; text-decoration: none; font-size: 14px; }}
    .footer {{ background: #f1f5f9; padding: 16px; text-align: center; font-size: 12px; color: #64748b; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>New Ticket Assignment</h1>
      <p style="margin: 0; font-size: 13px; opacity: 0.9;">Ticket #{ticket_id}</p>
    </div>
    <div class="content">
      <p>Hello <strong>{assigned_agent_name}</strong>,</p>
      <p>A support ticket has been assigned to you for resolution:</p>
      
      <div class="ticket-box">
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 8px 0; color: #64748b; font-weight: 500;">Ticket ID:</td>
            <td style="padding: 8px 0; text-align: right; font-weight: 700; font-family: monospace; color: #0284c7;">{ticket_id}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 8px 0; color: #64748b; font-weight: 500;">Subject:</td>
            <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #0f172a;">{title}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 8px 0; color: #64748b; font-weight: 500;">Priority:</td>
            <td style="padding: 8px 0; text-align: right; font-weight: 700; color: {priority_color};">{priority}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 8px 0; color: #64748b; font-weight: 500;">Department:</td>
            <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #0f172a;">{department}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b; font-weight: 500;">Requester:</td>
            <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #0f172a;">{requester_name}</td>
          </tr>
        </table>
        <div style="margin-top: 14px; padding-top: 10px; border-top: 1px solid #e2e8f0; font-size: 13px; color: #334155;">
          <strong>Description:</strong><br />
          <p style="margin: 4px 0 0 0; font-style: italic;">{short_desc}</p>
        </div>
      </div>

      <div style="text-align: center; margin: 24px 0;">
        <a href="{ticket_url}" class="btn" target="_blank">Open Ticket & Respond</a>
      </div>
    </div>
    <div class="footer">
      <p style="margin: 0;">Automated System Notification • Ticketing Platform</p>
    </div>
  </div>
</body>
</html>"""

    text = f"""Ticket Assigned to You: [{ticket_id}] {title}

Hello {assigned_agent_name},

A ticket has been assigned to you:
- Ticket ID: {ticket_id}
- Subject: {title}
- Priority: {priority}
- Department: {department}
- Requester: {requester_name}
- Description: {short_desc}

View Ticket: {ticket_url}
"""
    return {"subject": subject, "html": html, "text": text}


def _send_smtp_sync(
    to_email: str,
    subject: str,
    html_content: str,
    text_content: str
) -> Dict[str, Any]:
    """Synchronous SMTP email sending function executed via asyncio threadpool."""
    settings = get_settings()

    if not settings.smtp_host:
        logger.warning(
            "SMTP_HOST is not configured. Email logged to console instead of sending.",
            extra={"to_email": to_email, "subject": subject}
        )
        return {
            "sent": False,
            "reason": "SMTP_HOST not configured in environment.",
            "recipient": to_email,
            "subject": subject
        }

    # If SMTP_USER is set but SMTP_PASSWORD is not provided, Gmail/SMTP requires credentials
    if settings.smtp_user and not settings.smtp_password:
        logger.info(
            "SMTP_USER is '%s' but SMTP_PASSWORD is not set. SMTP delivery bypassed gracefully. Verification details logged.",
            settings.smtp_user,
            extra={"to_email": to_email, "subject": subject}
        )
        return {
            "sent": False,
            "reason": "SMTP_PASSWORD not configured in backend/.env. To send live emails to inbox, enter a 16-character Google App Password in backend/.env.",
            "recipient": to_email,
            "subject": subject
        }

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    from_name = settings.smtp_from_name or "Ticketing Platform"
    from_email = settings.smtp_from_email or settings.smtp_user or "noreply@company.com"
    msg["From"] = f"{from_name} <{from_email}>"
    msg["To"] = to_email

    msg.attach(MIMEText(text_content, "plain"))
    msg.attach(MIMEText(html_content, "html"))

    try:
        if settings.smtp_port == 465:
            server = smtplib.SMTP_SSL(settings.smtp_host, settings.smtp_port, timeout=15)
        else:
            server = smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15)
            if settings.smtp_tls:
                server.starttls()

        if settings.smtp_user and settings.smtp_password:
            clean_password = str(settings.smtp_password).replace(" ", "").strip()
            server.login(settings.smtp_user, clean_password)

        server.send_message(msg)
        server.quit()
        logger.info("Email sent successfully via SMTP to %s", to_email)
        return {"sent": True, "recipient": to_email, "subject": subject}
    except Exception as exc:
        logger.error("Failed to send email via SMTP to %s: %s", to_email, exc)
        return {"sent": False, "error": str(exc), "recipient": to_email}


async def send_email_async(
    to_email: str,
    subject: str,
    html_content: str,
    text_content: str
) -> Dict[str, Any]:
    """Send email asynchronously in a background thread."""
    return await asyncio.to_thread(_send_smtp_sync, to_email, subject, html_content, text_content)
