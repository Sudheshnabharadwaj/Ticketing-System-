export type TicketPriority = 'Low' | 'Medium' | 'High' | 'Urgent';
export type TicketStatus = 'Open' | 'In Progress' | 'Pending' | 'Resolved' | 'Closed' | 'Escalated';

export interface AssignedTeamLead {
  id: string;
  name: string;
  email: string;
  department: string;
  role: string;
}

export interface EmployeeTicket {
  id: string;
  ticketNumber: string;
  title: string;
  description: string;
  category: string;
  subCategory?: string;
  department: string;
  departments?: string[];
  teamLeads?: AssignedTeamLead[];
  employees?: Array<{ id: string; name: string; role: string; email: string; employeeId: string }>;
  employeeIds?: string[];
  priority: TicketPriority;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
  assignedTo?: string;
  assignedBy?: string;
  assignedDate?: string;
  sla?: string;
  attachments?: string[];
  resolutionNotes?: string;
  history?: Array<{
    id: string;
    author: string;
    text: string;
    timestamp: string;
    attachment?: string;
  }>;
}

export interface EmployeeProfile {
  name: string;
  email: string;
  employeeId: string;
  department: string;
  role: string;
  phone: string;
  avatarUrl?: string;
}

export interface EmployeeNotificationItem {
  id: string;
  ticketId: string;
  ticketNumber: string;
  title: string;
  category: 'New ticket assigned' | 'Ticket status changed' | 'New comment' | 'SLA notification' | 'Ticket resolved';
  time: string;
  date: string;
  isRead: boolean;
  message: string;
}
