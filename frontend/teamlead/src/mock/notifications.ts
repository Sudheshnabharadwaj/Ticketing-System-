import { NotificationItem } from '../types/notification';

export const mockNotifications: NotificationItem[] = [
  {
    id: "n1",
    title: "Ticket Assigned",
    message: "Your ticket TKT-1001 has been assigned to Arjun Mehta.",
    timestamp: "10 minutes ago",
    read: false,
    ticketId: "TKT-1001",
    type: "info",
    forRole: "employee"
  },
  {
    id: "n2",
    title: "New Agent Reply",
    message: "Arjun Mehta replied to TKT-1001: 'Checking your Azure AD Conditional Access policies.'",
    timestamp: "30 minutes ago",
    read: false,
    ticketId: "TKT-1001",
    type: "info",
    forRole: "employee"
  },
  {
    id: "n3",
    title: "SLA Warning",
    message: "Ticket TKT-1009 (Onboarding access) is approaching SLA breach (25m remaining).",
    timestamp: "1 hour ago",
    read: false,
    ticketId: "TKT-1009",
    type: "warning",
    forRole: "teamlead"
  },
  {
    id: "n4",
    title: "Ticket Escalated",
    message: "TKT-1003 has been escalated to Tier 3 Network Operations.",
    timestamp: "2 hours ago",
    read: true,
    ticketId: "TKT-1003",
    type: "error",
    forRole: "all"
  },
  {
    id: "n5",
    title: "Ticket Resolved",
    message: "Ticket TKT-1004 (Figma License) has been marked as Resolved by Michael Chang.",
    timestamp: "Yesterday",
    read: true,
    ticketId: "TKT-1004",
    type: "success",
    forRole: "employee"
  },
  {
    id: "n6",
    title: "High Priority Ticket",
    message: "New High Priority ticket TKT-1007 created by Marcus Vance.",
    timestamp: "3 hours ago",
    read: false,
    ticketId: "TKT-1007",
    type: "warning",
    forRole: "teamlead"
  },
  {
    id: "n7",
    title: "SLA Breached",
    message: "Security incident ticket TKT-1011 has breached response SLA.",
    timestamp: "4 hours ago",
    read: false,
    ticketId: "TKT-1011",
    type: "error",
    forRole: "teamlead"
  },
  {
    id: "n8",
    title: "Knowledge Base Updated",
    message: "New article published: 'Resolving GlobalProtect VPN Connection Timeouts'.",
    timestamp: "2 days ago",
    read: true,
    type: "info",
    forRole: "all"
  }
];
