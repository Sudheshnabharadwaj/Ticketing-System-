export type TicketStatus = 'Open' | 'Pending' | 'In Progress' | 'Resolved' | 'Closed' | 'Escalated';
export type TicketPriority = 'Low' | 'Medium' | 'High' | 'Critical';
export type TicketCategory = 'Hardware' | 'Software' | 'Network' | 'Access Issue' | 'Email' | 'Application' | 'Other';
export type SLAStatus = 'Within SLA' | 'At Risk' | 'Breached';

export interface TicketComment {
  id: string;
  ticketId: string;
  authorName: string;
  authorRole: 'teamlead' | 'employee' | 'agent' | 'admin';
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
  ticketNumber?: string;
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
  isUnassigned?: boolean;
  slaStatus: SLAStatus;
  slaRemaining: string;
  dueDate?: string;
  slaDeadline?: string;
  slaStatusRaw?: string;
  can_chat?: boolean;
  can_reply?: boolean;
  is_created_by_me?: boolean;
  is_assigned_to_me?: boolean;
  createdAt: string;
  updatedAt?: string;
  comments?: TicketComment[];
  attachments?: {
    id?: string;
    name: string;
    size: string;
    url?: string;
    viewUrl?: string;
    type?: string;
    uploadedBy?: string;
    createdAt?: string;
  }[];
  activities?: TicketActivity[];
  escalationReason?: string;
  escalationNotes?: string;
  assignedBy?: string;
  assignedDate?: string;
  resolutionSummary?: string;
  subCategory?: string;
  assignedToType?: 'teamlead' | 'employee' | 'unassigned';
  handledBy?: 'teamlead' | 'employee' | 'unassigned';
  departments?: string[];
  taggedMembers?: { id: string; name: string; department: string; avatar?: string }[];
  taggedMemberIds?: string[];
  teamLeads?: { id: string; name: string; employeeId: string; role: string; email: string }[];
  teamLeadIds?: string[];
  taggedEmployees?: { id: string; name: string; employeeId: string; role: string; email: string }[];
  employeeIds?: string[];
}
