import { User } from '../types/user';
import { Escalation } from '../types/escalation';
import { NotificationItem } from '../types/notification';
import { supabase } from './supabaseClient';

export const teamLeadService = {
  getEmployees: async (): Promise<User[]> => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        return data.map((u: any) => ({
          id: u.id,
          name: u.name || (u.email ? u.email.split('@')[0] : 'Employee'),
          email: u.email,
          phone: u.phone || '',
          role: (u.role === 'teamlead' ? 'teamlead' : 'employee'),
          department: u.department || 'Operations',
          designation: u.designation || 'Team Member',
          team: u.team || '',
          avatar: u.avatar || '',
          location: u.location || '',
          status: (u.status === 'Inactive' ? 'Inactive' : 'Active'),
        }));
      }
    } catch (e) {
      console.error('Supabase getEmployees error:', e);
    }
    return [];
  },

  getEscalations: async (): Promise<Escalation[]> => {
    try {
      const { data, error } = await supabase
        .from('escalations')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        return data.map((esc: any) => ({
          id: esc.id,
          ticketId: esc.ticket_id || '',
          subject: esc.subject || 'Escalation',
          priority: esc.priority || 'High',
          escalatedBy: esc.escalated_by || 'Team Lead',
          escalatedTo: esc.escalated_to || 'Tier 3 Operations',
          escalationReason: esc.escalation_reason || '',
          slaStatus: esc.sla_status || 'Breached SLA',
          escalatedDate: esc.escalated_date || (esc.created_at ? esc.created_at.slice(0, 10) : ''),
          status: (esc.status || 'Pending Review') as any,
        }));
      }
    } catch (e) {
      console.error('Supabase getEscalations error:', e);
    }
    return [];
  },

  getNotifications: async (userRole = 'teamlead', userName = ''): Promise<NotificationItem[]> => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('timestamp', { ascending: false });

      if (!error && data) {
        const allowedRoles = ['all', userRole];
        const filtered = data.filter((n: any) => {
          if (allowedRoles.includes(n.for_role)) return true;
          if (userName && (n.message?.toLowerCase().includes(userName.toLowerCase()) || n.title?.toLowerCase().includes(userName.toLowerCase()))) return true;
          return false;
        });

        return filtered.map((n: any) => ({
          id: n.id,
          title: n.title || 'Notification',
          message: n.message || '',
          timestamp: n.timestamp ? new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now',
          read: !!n.read,
          ticketId: n.ticket_id || undefined,
          type: (n.type || 'info') as any,
          forRole: (n.for_role || 'all') as any,
        }));
      }
    } catch (e) {
      console.error('Supabase getNotifications error:', e);
    }
    return [];
  },

  markNotificationRead: async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase.from('notifications').update({ read: true }).eq('id', id);
      return !error;
    } catch {
      return false;
    }
  },

  markAllNotificationsRead: async (): Promise<boolean> => {
    try {
      const { error } = await supabase.from('notifications').update({ read: true }).eq('read', false);
      return !error;
    } catch {
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
      const { error } = await supabase.from('notifications').insert([{
        id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        ticket_id: notif.ticketId || null,
        title: notif.title,
        message: notif.message,
        type: notif.type || 'info',
        for_role: notif.forRole || 'all',
        read: false,
        timestamp: new Date().toISOString(),
      }]);
      return !error;
    } catch {
      return false;
    }
  },

  reassignTicket: async (ticketId: string, newEmployeeId: string, newEmployeeName?: string): Promise<boolean> => {
    try {
      const updates: Record<string, any> = {
        assigned_agent_id: newEmployeeId,
      };
      if (newEmployeeName) updates.assigned_agent = newEmployeeName;
      const { error } = await supabase.from('tickets').update(updates).eq('id', ticketId);
      return !error;
    } catch {
      return false;
    }
  },

  escalateTicket: async (ticketId: string, reason: string): Promise<boolean> => {
    try {
      const { error } = await supabase.from('tickets').update({ status: 'Escalated', escalation_reason: reason }).eq('id', ticketId);
      await supabase.from('escalations').insert([{
        id: `ESC-${Date.now()}`,
        ticket_id: ticketId,
        subject: `Escalated Ticket ${ticketId}`,
        priority: 'High',
        escalated_by: 'Team Lead',
        escalated_to: 'Tier 3 Operations',
        escalation_reason: reason,
        sla_status: 'Breached SLA',
        escalated_date: new Date().toISOString().replace('T', ' ').slice(0, 16),
        status: 'Pending Review',
      }]);
      return !error;
    } catch {
      return false;
    }
  }
};
