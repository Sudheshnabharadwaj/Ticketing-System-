import { TicketPriority, SLAStatus } from './ticket';

export interface Escalation {
  id: string;
  ticketId: string;
  subject: string;
  priority: TicketPriority;
  escalatedBy: string;
  escalatedTo: string;
  escalationReason: string;
  slaStatus: SLAStatus;
  escalatedDate: string;
  status: 'Pending Review' | 'In Progress' | 'Resolved';
}
