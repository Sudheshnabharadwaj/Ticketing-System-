export type TicketStatus = 'Open' | 'Pending' | 'In Progress' | 'Resolved' | 'Closed' | 'Escalated';
export type TicketPriority = 'Low' | 'Medium' | 'High' | 'Critical';
export type TicketCategory = 'Hardware' | 'Software' | 'Network' | 'Access Issue' | 'Email' | 'Application' | 'Other';
export type SLAStatus = 'Within SLA' | 'At Risk' | 'Breached';

export interface TicketComment {
  id: string;
  ticketId: string;
  authorName: string;
  authorRole: 'teamlead' | 'employee' | 'agent';
  authorAvatar?: string;
  message: string;
  createdAt: string;
  isInternal?: boolean;
}

export interface TicketActivity {
  id: string;
  ticketId: string;
  user: string;
  action: string;
  timestamp: string;
}

export interface Ticket {
  id: string;
  subject: string;
  description: string;
  employee: string;
  employeeId: string;
  employeeEmail: string;
  department?: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  assignedAgent: string;
  assignedAgentId?: string;
  slaStatus: SLAStatus;
  slaRemaining: string;
  createdAt: string;
  updatedAt: string;
  attachments?: { name: string; size: string; url?: string }[];
  comments?: TicketComment[];
  activities?: TicketActivity[];
  escalationReason?: string;
  assignedBy?: string;
  assignedDate?: string;
  resolutionSummary?: string;
  subCategory?: string;
  assignedToType?: 'teamlead' | 'employee' | 'unassigned';
  handledBy?: 'teamlead' | 'employee' | 'unassigned';
  departments?: string[];
  taggedMembers?: { id: string; name: string; department: string; avatar?: string }[];
  taggedMemberIds?: string[];
}
