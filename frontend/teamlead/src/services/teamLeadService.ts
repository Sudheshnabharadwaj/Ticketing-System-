import { Ticket } from '../types/ticket';
import { User } from '../types/user';
import { Escalation } from '../types/escalation';
import { NotificationItem } from '../types/notification';
import { apiRequest, apiRequestSafe, jsonInit } from './backendAuth';
import { mapTicket, ticketService } from './ticketService';

function mapUser(u: any): User {
  return {
    id: String(u.id),
    name: u.name || (u.email ? u.email.split('@')[0] : 'Employee'),
    email: u.email || '',
    phone: u.phone || '',
    role: (u.role === 'teamlead' ? 'teamlead' : u.role === 'admin' ? 'admin' : 'employee') as User['role'],
    department: u.department || 'Operations',
    designation: u.designation || (u.role === 'teamlead' ? 'Team Lead' : 'Team Member'),
    team: u.team || '',
    avatar: u.avatar || '',
    location: u.location || '',
    status: u.status === 'Inactive' ? 'Inactive' : 'Active',
  };
}

function formatNotificationTime(value: any): string {
  if (!value) return 'Just now';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export const teamLeadService = {
  /** Users inside the team lead's department/team scope (server-enforced). */
  getEmployees: async (): Promise<User[]> => {
    const result = await apiRequestSafe<any[]>('/team/users');
    if (result.error || !Array.isArray(result.data)) {
      console.error('Could not load team users:', result.error);
      return [];
    }
    return result.data.map(mapUser);
  },

  /** Escalations are derived from the team lead's scoped escalated tickets. */
  getEscalations: async (providedTickets?: Ticket[]): Promise<Escalation[]> => {
    let list = providedTickets;
    if (!list) {
      const result = await ticketService.getTicketsDetailed();
      list = result.tickets;
    }
    return (list || [])
      .filter((t) => String(t.status).toLowerCase() === 'escalated')
      .map((t) => ({
        id: `esc-${t.id}`,
        ticketId: t.id,
        subject: t.subject,
        priority: t.priority,
        escalatedBy: (t as any).escalatedBy || (t as any).escalated_by || t.assignedBy || t.employee || 'Admin',
        escalatedTo: (t as any).escalatedTo || (t as any).escalated_to || (t as any).targetLead || (t as any).target_lead || t.assignedAgent || 'Team Lead',
        escalationReason: (t as any).escalationReason || (t as any).escalation_reason || (t as any).escalationNotes || t.escalationReason || 'Escalated ticket requiring attention',
        slaStatus: t.slaStatus,
        escalatedDate: ((t as any).escalatedAt || (t as any).escalated_at || t.updatedAt || t.createdAt).slice(0, 10),
        status: 'Pending Review' as const,
      }));
  },

  getNotifications: async (): Promise<NotificationItem[]> => {
    const result = await apiRequestSafe<any[]>('/notifications');
    if (result.error || !Array.isArray(result.data)) {
      console.error('Could not load notifications:', result.error);
      return [];
    }
    return result.data.map((n: any) => ({
      id: String(n.id),
      title: n.title || 'Notification',
      message: n.message || '',
      timestamp: formatNotificationTime(n.timestamp || n.created_at),
      read: !!n.read,
      ticketId: n.ticket_id || undefined,
      type: (n.type || 'info') as NotificationItem['type'],
      forRole: (n.for_role || 'teamlead') as NotificationItem['forRole'],
    }));
  },

  markNotificationRead: async (id: string): Promise<boolean> => {
    try {
      await apiRequest(`/notifications/${encodeURIComponent(id)}/read`, jsonInit('POST'));
      return true;
    } catch (e) {
      console.warn('Could not mark notification read:', e);
      return false;
    }
  },

  markAllNotificationsRead: async (): Promise<boolean> => {
    try {
      await apiRequest('/notifications/read-all', jsonInit('POST'));
      return true;
    } catch (e) {
      console.warn('Could not mark notifications read:', e);
      return false;
    }
  },

  createNotification: async (notif: {
    ticketId?: string;
    title: string;
    message: string;
    type?: 'info' | 'success' | 'warning' | 'error';
    forRole?: 'teamlead' | 'employee' | 'admin' | 'all';
  }): Promise<boolean> => {
    try {
      await apiRequest(
        '/notifications',
        jsonInit('POST', {
          ticket_id: notif.ticketId || null,
          title: notif.title,
          message: notif.message,
          type: notif.type || 'info',
          for_role: notif.forRole || 'all',
        }),
      );
      return true;
    } catch (e) {
      console.warn('Could not create notification:', e);
      return false;
    }
  },

  reassignTicket: async (
    ticketId: string,
    newEmployeeId: string,
    newEmployeeName?: string,
  ): Promise<boolean> => {
    try {
      await apiRequest(
        `/tickets/${encodeURIComponent(ticketId)}/assign`,
        jsonInit('POST', {
          assigned_agent_id: newEmployeeId,
          assigned_agent: newEmployeeName || undefined,
        }),
      );
      return true;
    } catch (e) {
      console.warn('Could not reassign ticket:', e);
      return false;
    }
  },

  escalateTicket: async (ticketId: string, reason: string): Promise<boolean> => {
    try {
      await apiRequest(
        `/tickets/${encodeURIComponent(ticketId)}/escalate`,
        jsonInit('POST', { reason }),
      );
      return true;
    } catch (e) {
      console.warn('Could not escalate ticket:', e);
      return false;
    }
  },
};
