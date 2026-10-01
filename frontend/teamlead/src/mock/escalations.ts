import { Escalation } from '../types/escalation';

export const mockEscalations: Escalation[] = [
  {
    id: "ESC-201",
    ticketId: "TKT-1003",
    subject: "GlobalProtect VPN failing authentication on Tokyo node",
    priority: "Critical",
    escalatedBy: "Alex Morgan (Team Lead)",
    escalatedTo: "Tier 3 Network Operations",
    escalationReason: "Multiple engineers blocked in APAC region; router gateway firmware issue suspected.",
    slaStatus: "Breached",
    escalatedDate: "2026-09-22 06:30 AM",
    status: "In Progress"
  },
  {
    id: "ESC-202",
    ticketId: "TKT-1011",
    subject: "Security breach alert: Unauthorized IP login attempt flagged",
    priority: "Critical",
    escalatedBy: "SIEM Automated Monitor",
    escalatedTo: "InfoSec Incident Response",
    escalationReason: "Repeated SSH brute force attempts from untrusted IP block 185.220.101.x",
    slaStatus: "Breached",
    escalatedDate: "2026-09-21 07:00 AM",
    status: "Pending Review"
  },
  {
    id: "ESC-203",
    ticketId: "TKT-1009",
    subject: "New employee onboarding access bundle for DevOps intern",
    priority: "High",
    escalatedBy: "Rahul Sharma (Engineering Lead)",
    escalatedTo: "IAM Access Team",
    escalationReason: "Intern starting today has 0 system access; onboarding SLA at risk.",
    slaStatus: "At Risk",
    escalatedDate: "2026-09-22 09:00 AM",
    status: "Pending Review"
  },
  {
    id: "ESC-204",
    ticketId: "TKT-1007",
    subject: "Salesforce CRM SSO redirect loop",
    priority: "High",
    escalatedBy: "Arjun Mehta (L2 Agent)",
    escalatedTo: "SAML SSO Engineering",
    escalationReason: "SAML Metadata assertion signing key mismatch after Okta certificate rotation.",
    slaStatus: "Within SLA",
    escalatedDate: "2026-09-22 10:10 AM",
    status: "In Progress"
  },
  {
    id: "ESC-205",
    ticketId: "TKT-1014",
    subject: "Office 365 Shared Mailbox sync delay",
    priority: "High",
    escalatedBy: "Elena Rostova (L2 Agent)",
    escalatedTo: "Microsoft Exchange Ops",
    escalationReason: "Tenant Exchange online connector queue backlog.",
    slaStatus: "At Risk",
    escalatedDate: "2026-09-22 09:15 AM",
    status: "In Progress"
  }
];
