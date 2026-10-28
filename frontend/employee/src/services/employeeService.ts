import type { EmployeeTicket, EmployeeProfile, EmployeeNotificationItem, TicketPriority, TicketStatus, AssignedTeamLead } from '../types';
import { EmailService } from './emailService';
import { supabase } from './supabaseClient';

export function getEmployeeSessionUser() {
  try {
    const raw = localStorage.getItem('platform_current_user');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.email) return parsed;
    }
  } catch {}
  return null;
}

export const INITIAL_EMPLOYEE_PROFILE: EmployeeProfile = {
  name: 'Employee',
  email: 'employee@company.com',
  employeeId: 'EMP-001',
  department: 'Operations',
  role: 'Employee',
  phone: '',
  avatarUrl: '',
};

let ticketsCache: EmployeeTicket[] = [];
let notificationsCache: EmployeeNotificationItem[] = [];

export function formatDateTime(isoOrString?: string): string {
  if (!isoOrString) return '';
  let str = isoOrString;
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(str) && !str.includes('Z') && !str.includes('+')) {
    str = str.replace(' ', 'T') + 'Z';
  }
  const d = new Date(str);
  if (isNaN(d.getTime())) return isoOrString;
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function mapDbTicket(row: any): EmployeeTicket {
  const t: EmployeeTicket = {
    id: row.id,
    ticketNumber: row.id,
    title: row.subject || 'No Subject',
    description: row.description || '',
    category: row.category || 'Other',
    subCategory: row.sub_category || 'General Support',
    department: row.department || 'IT Support',
    departments: row.departments || [],
    teamLeads: [],
    priority: (row.priority || 'Medium') as TicketPriority,
    status: (row.status || 'Open') as TicketStatus,
    createdAt: formatDateTime(row.created_at),
    updatedAt: formatDateTime(row.updated_at || row.created_at),
    assignedTo: row.assigned_agent || row.assigned_to || '',
    assignedBy: row.assigned_by || '',
    assignedDate: row.assigned_date ? formatDateTime(row.assigned_date) : undefined,
    sla: row.sla_remaining || row.sla_status || 'Within SLA',
    attachments: row.attachments || [],
    resolutionNotes: row.resolution_summary || '',
    history: [],
  };
  (t as any).employee = row.employee;
  (t as any).employee_email = row.employee_email;
  (t as any).employee_id = row.employee_id;
  (t as any).assigned_agent = row.assigned_agent;
  (t as any).assigned_agent_id = row.assigned_agent_id;
  (t as any).assigned_to = row.assigned_to;
  return t;
}

// Initial fetch in background
(async () => {
  try {
    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) {
      ticketsCache = data.map(mapDbTicket);
    }
  } catch {}
})();

export const EmployeeService = {
  async fetchTickets(): Promise<EmployeeTicket[]> {
    try {
      const [ticketsRes, attsRes] = await Promise.all([
        supabase.from('tickets').select('*').order('created_at', { ascending: false }),
        supabase.from('ticket_attachments').select('ticket_id, name, size')
      ]);

      if (!ticketsRes.error && ticketsRes.data) {
        const attMap: Record<string, string[]> = {};
        if (attsRes.data) {
          attsRes.data.forEach((att: any) => {
            if (!attMap[att.ticket_id]) attMap[att.ticket_id] = [];
            const str = att.size && att.size !== 'N/A' ? `${att.name} (${att.size})` : att.name;
            if (!attMap[att.ticket_id].includes(str)) {
              attMap[att.ticket_id].push(str);
            }
          });
        }

        ticketsCache = ticketsRes.data.map((d: any) => {
          const t = mapDbTicket(d);
          if (attMap[t.id] && attMap[t.id].length > 0) {
            t.attachments = Array.from(new Set(attMap[t.id]));
          }
          return t;
        });
        return ticketsCache;
      }
    } catch (e) {
      console.error('Supabase fetchTickets error:', e);
    }
    return ticketsCache;
  },

  getTickets(): EmployeeTicket[] {
    return ticketsCache;
  },

  getAssignedTickets(): EmployeeTicket[] {
    const user = getEmployeeSessionUser();
    if (!user) return [];
    const userEmail = (user.email || '').trim().toLowerCase();
    const userName = (user.name || '').trim().toLowerCase();
    const userId = (user.id || '').trim().toLowerCase();
    const empId = ((user as any).employeeId || '').trim().toLowerCase();

    return ticketsCache.filter((t: any) => {
      const assigned = (t.assignedTo || t.assigned_agent || t.assigned_to || '').trim().toLowerCase();
      const agentId = (t.assigned_agent_id || '').trim().toLowerCase();

      // Skip tickets that are unassigned
      if (!assigned || assigned === 'unassigned') return false;

      // Match by User ID or Employee ID
      if (userId && (agentId === userId || assigned === userId || assigned.includes(userId))) return true;
      if (empId && (agentId === empId || assigned === empId || assigned.includes(empId))) return true;

      // Match by Email
      if (userEmail && (assigned === userEmail || assigned.includes(userEmail))) return true;

      // Match by Name (e.g. "Uday" or "Uday (OKL004)")
      if (userName && (assigned === userName || assigned.includes(userName) || userName.includes(assigned))) return true;

      return false;
    });
  },

  getMyTickets(): EmployeeTicket[] {
    const user = getEmployeeSessionUser();
    if (!user) return [];
    const userEmail = (user.email || '').trim().toLowerCase();
    const userName = (user.name || '').trim().toLowerCase();
    const userId = (user.id || '').trim().toLowerCase();
    const empId = ((user as any).employeeId || '').trim().toLowerCase();

    return ticketsCache.filter((t: any) => {
      const email = (t.employee_email || t.employeeEmail || t.requesterEmail || '').trim().toLowerCase();
      const name = (t.employee || t.requesterName || '').trim().toLowerCase();
      const id = (t.employee_id || t.employeeId || '').trim().toLowerCase();

      if (userEmail && (email === userEmail || email.includes(userEmail))) return true;
      if (userId && (id === userId || id.includes(userId))) return true;
      if (empId && (id === empId || id.includes(empId))) return true;
      if (userName && name && (name === userName || name.includes(userName) || userName.includes(name))) return true;
      return false;
    });
  },

  getEmployeeTickets(): EmployeeTicket[] {
    const my = this.getMyTickets();
    const assigned = this.getAssignedTickets();
    const map = new Map<string, EmployeeTicket>();
    // Prioritize assigned tickets first, then my tickets
    assigned.forEach(t => map.set(t.id, t));
    my.forEach(t => map.set(t.id, t));
    return Array.from(map.values());
  },

  getTicketById(idOrNum: string): EmployeeTicket | undefined {
    return ticketsCache.find((t) => t.id === idOrNum || t.ticketNumber === idOrNum);
  },

  async getTicketByIdAsync(idOrNum: string): Promise<EmployeeTicket | undefined> {
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('id', idOrNum)
        .maybeSingle();

      if (!error && data) {
        const ticket = mapDbTicket(data);
        const { data: dbActivities } = await supabase
          .from('ticket_activities')
          .select('*')
          .eq('ticket_id', idOrNum)
          .order('timestamp', { ascending: false });

        ticket.history = (dbActivities || []).map((a: any) => ({
          id: a.id,
          author: a.user,
          text: a.action,
          timestamp: a.timestamp ? formatDateTime(a.timestamp) : '',
        }));

        const { data: dbAttachments } = await supabase
          .from('ticket_attachments')
          .select('*')
          .eq('ticket_id', idOrNum)
          .order('created_at', { ascending: true });

        if (dbAttachments && dbAttachments.length > 0) {
          ticket.attachments = dbAttachments.map((a: any) =>
            a.size && a.size !== 'N/A' ? `${a.name} (${a.size})` : a.name
          );
        }

        // Update in cache
        const idx = ticketsCache.findIndex(t => t.id === idOrNum);
        if (idx >= 0) ticketsCache[idx] = ticket;
        else ticketsCache.unshift(ticket);

        return ticket;
      }
    } catch (e) {
      console.error('Supabase getTicketByIdAsync error:', e);
    }
    return this.getTicketById(idOrNum);
  },

  createTicket(data: {
    title: string;
    category: string;
    subCategory?: string;
    department?: string;
    departments?: string[];
    priority: TicketPriority;
    description: string;
    attachments?: string[];
    teamLeads?: AssignedTeamLead[];
    employees?: Array<{ id: string; name: string; role: string; email: string; employeeId: string }>;
  }): EmployeeTicket {
    const nextNum = Math.floor(1000 + Math.random() * 9000);
    const ticketId = `TKT-${nextNum}`;
    const now = new Date();
    const formatted = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const selectedDepts = data.departments && data.departments.length > 0
      ? data.departments
      : [data.department || 'IT Support'];
    const mainDepartmentStr = selectedDepts.join(' & ');

    const user = getEmployeeSessionUser();
    const creatorName = user?.name || 'Employee';
    const creatorEmail = user?.email || 'employee@platform.local';

    const teamLeads: AssignedTeamLead[] = data.teamLeads && data.teamLeads.length > 0
      ? data.teamLeads
      : EmailService.findTeamLeadsForDepartments(selectedDepts, data.category).map((tl) => ({
          id: tl.id,
          name: tl.name,
          email: tl.email,
          department: tl.department,
          role: tl.role,
        }));

    const assignedEmployee = (data.employees && data.employees.length > 0) ? data.employees[0] : null;
    const assignedAgentName = assignedEmployee ? assignedEmployee.name : (teamLeads[0]?.name || 'Unassigned');
    const assignedAgentId = assignedEmployee ? (assignedEmployee.id || assignedEmployee.employeeId) : null;
    const assignedByStr = assignedEmployee
      ? `${teamLeads[0]?.name || creatorName} (Team Lead)`
      : `${creatorName} (Requester)`;

    const newTicket: EmployeeTicket = {
      id: ticketId,
      ticketNumber: ticketId,
      title: data.title,
      description: data.description,
      category: data.category,
      subCategory: data.subCategory || 'General Support',
      department: mainDepartmentStr,
      departments: selectedDepts,
      teamLeads,
      employees: data.employees || [],
      priority: data.priority,
      status: 'Open',
      createdAt: formatted,
      updatedAt: formatted,
      assignedTo: assignedAgentName,
      assignedBy: assignedByStr,
      attachments: data.attachments || [],
      history: [
        {
          id: `h-${Date.now()}-1`,
          author: creatorName,
          text: 'Ticket created.',
          timestamp: formatted,
        },
      ],
    };
    (newTicket as any).employee_email = creatorEmail;
    (newTicket as any).employee = creatorName;
    (newTicket as any).employee_id = user?.id || null;
    (newTicket as any).assigned_agent = assignedAgentName;
    (newTicket as any).assigned_agent_id = assignedAgentId;

    // Stored directly in Supabase (background async persist)
    try {
      supabase.from('tickets').insert([{
        id: ticketId,
        subject: data.title,
        description: data.description,
        employee: creatorName,
        employee_email: creatorEmail,
        employee_id: user?.id || null,
        department: mainDepartmentStr,
        departments: selectedDepts,
        category: data.category,
        priority: data.priority,
        status: 'Open',
        assigned_agent: assignedAgentName,
        assigned_agent_id: assignedAgentId,
        assigned_by: assignedByStr,
        sla_status: 'Within SLA',
        sla_remaining: '8h 00m remaining',
      }]).then();

      (async () => {
        try {
          const notificationsToInsert = [
            {
              id: `notif-${Date.now()}-tl`,
              ticket_id: ticketId,
              title: `New Ticket: ${ticketId}`,
              message: `${creatorName} created ${ticketId} ("${data.title}") - assigned to ${assignedAgentName}.`,
              type: 'info',
              for_role: 'teamlead',
              read: false,
              timestamp: new Date().toISOString(),
            },
            {
              id: `notif-${Date.now()}-emp`,
              ticket_id: ticketId,
              title: `Ticket Created: ${ticketId}`,
              message: `Your ticket ${ticketId} was created successfully.`,
              type: 'success',
              for_role: 'employee',
              read: false,
              timestamp: new Date().toISOString(),
            }
          ];

          if (assignedEmployee) {
            notificationsToInsert.push({
              id: `notif-${Date.now()}-asg`,
              ticket_id: ticketId,
              title: `Ticket Assigned: ${ticketId}`,
              message: `You were assigned ticket ${ticketId} ("${data.title}") by ${assignedByStr}.`,
              type: 'warning',
              for_role: 'employee',
              read: false,
              timestamp: new Date().toISOString(),
            });
          }

          // Insert notifications into portal_notifications table
          await supabase.from('portal_notifications').insert(notificationsToInsert);
        } catch (e) {
          console.error('Supabase notifications insert error:', e);
        }

        // Insert attachments into ticket_attachments table if provided
        if (data.attachments && data.attachments.length > 0) {
          try {
            const uniqueAtts = Array.from(new Set(data.attachments));
            const attRows = uniqueAtts.map((attStr, idx) => ({
              id: `att-${Date.now()}-${idx}`,
              ticket_id: ticketId,
              name: attStr.split(' (')[0] || attStr,
              size: (attStr.includes('(') ? attStr.split('(')[1].replace(')', '') : 'N/A'),
              url: '',
            }));
            await supabase.from('ticket_attachments').insert(attRows);
          } catch (e) {
            console.error('Supabase ticket_attachments error:', e);
          }
        }

        // Log activity in background without blocking
        try {
          await supabase.from('ticket_activities').insert([{
            id: `act-${Date.now()}`,
            ticket_id: ticketId,
            user: creatorName,
            action: 'Ticket created',
            timestamp: new Date().toISOString(),
          }]);
        } catch (e) {
          console.error('Supabase ticket_activities error:', e);
        }
      })();
    } catch (e: any) {
      console.error('Supabase insert exception:', e);
    }

    ticketsCache.unshift(newTicket);

    // Send email notifications
    EmailService.sendTicketCreationEmail(newTicket, {
      name: creatorName,
      email: creatorEmail,
    });

    return newTicket;
  },

  async updateTicketStatus(ticketId: string, newStatus: TicketStatus, note?: string): Promise<EmployeeTicket | null> {
    const user = getEmployeeSessionUser();
    const actorName = user?.name || 'Employee';

    try {
      const now = new Date().toISOString();
      await supabase.from('tickets').update({ status: newStatus, updated_at: now }).eq('id', ticketId);

      await supabase.from('ticket_activities').insert([{
        id: `act-${Date.now()}`,
        ticket_id: ticketId,
        user: actorName,
        action: `Status updated to ${newStatus}.${note ? ` Note: ${note}` : ''}`,
        timestamp: new Date().toISOString(),
      }]);

      await this.fetchTickets();
      return this.getTicketById(ticketId) || null;
    } catch (e) {
      console.error('Supabase updateTicketStatus error:', e);
      return null;
    }
  },

  async resolveTicket(ticketId: string, resolutionNotes: string): Promise<EmployeeTicket | null> {
    const user = getEmployeeSessionUser();
    const actorName = user?.name || 'Employee';

    try {
      const now = new Date().toISOString();
      await supabase.from('tickets').update({
        status: 'Resolved',
        resolution_summary: resolutionNotes,
        updated_at: now,
      }).eq('id', ticketId);

      await supabase.from('ticket_activities').insert([{
        id: `act-${Date.now()}`,
        ticket_id: ticketId,
        user: actorName,
        action: `Marked ticket as Resolved. Resolution: ${resolutionNotes}`,
        timestamp: new Date().toISOString(),
      }]);

      await this.fetchTickets();
      return this.getTicketById(ticketId) || null;
    } catch (e) {
      console.error('Supabase resolveTicket error:', e);
      return null;
    }
  },

  async escalateTicket(ticketId: string, reason: string, comment: string): Promise<EmployeeTicket | null> {
    const user = getEmployeeSessionUser();
    const actorName = user?.name || 'Employee';

    try {
      const now = new Date().toISOString();
      await supabase.from('tickets').update({
        status: 'Escalated',
        escalation_reason: reason,
        updated_at: now,
      }).eq('id', ticketId);

      const ticket = this.getTicketById(ticketId);

      await supabase.from('escalations').insert([{
        id: `ESC-${Date.now()}`,
        ticket_id: ticketId,
        subject: ticket?.title || 'Escalated Ticket',
        priority: ticket?.priority || 'High',
        escalated_by: actorName,
        escalated_to: ticket?.assignedBy || 'Team Lead',
        escalation_reason: `${reason}. ${comment}`,
        sla_status: 'Escalated',
        escalated_date: now,
        status: 'Pending Review',
      }]);

      await supabase.from('ticket_activities').insert([{
        id: `act-${Date.now()}`,
        ticket_id: ticketId,
        user: actorName,
        action: `Escalated ticket to ${ticket?.assignedBy || 'Team Lead'}. Reason: ${reason}. Explanation: ${comment}`,
        timestamp: new Date().toISOString(),
      }]);

      await this.fetchTickets();
      return this.getTicketById(ticketId) || null;
    } catch (e) {
      console.error('Supabase escalateTicket error:', e);
      return null;
    }
  },

  async addComment(ticketId: string, text: string, attachmentName?: string): Promise<EmployeeTicket | null> {
    const user = getEmployeeSessionUser();
    const actorName = user?.name || 'Employee';

    try {
      const now = new Date().toISOString();
      await supabase.from('ticket_comments').insert([{
        id: `comm-${Date.now()}`,
        ticket_id: ticketId,
        author_name: actorName,
        author_role: 'employee',
        message: text,
        created_at: now,
      }]);

      await supabase.from('ticket_activities').insert([{
        id: `act-${Date.now()}`,
        ticket_id: ticketId,
        user: actorName,
        action: `Comment: ${text}${attachmentName ? ` (Attachment: ${attachmentName})` : ''}`,
        timestamp: now,
      }]);

      await supabase.from('tickets').update({ updated_at: now }).eq('id', ticketId);

      await this.fetchTickets();
      return this.getTicketById(ticketId) || null;
    } catch (e) {
      console.error('Supabase addComment error:', e);
      return null;
    }
  },

  async addAttachment(ticketId: string, fileName: string): Promise<EmployeeTicket | null> {
    const user = getEmployeeSessionUser();
    const actorName = user?.name || 'Employee';

    try {
      const now = new Date().toISOString();
      const name = fileName.includes(' (') ? fileName.split(' (')[0] : fileName;
      const size = fileName.includes('(') ? fileName.split('(')[1].replace(')', '') : '1 MB';

      await supabase.from('ticket_attachments').insert([{
        id: `att-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        ticket_id: ticketId,
        name,
        size,
        created_at: now,
      }]);

      await supabase.from('ticket_activities').insert([{
        id: `act-${Date.now()}`,
        ticket_id: ticketId,
        user: actorName,
        action: `Uploaded attachment: ${fileName}`,
        timestamp: now,
      }]);

      await supabase.from('tickets').update({ updated_at: now }).eq('id', ticketId);

      await this.fetchTickets();
      return this.getTicketById(ticketId) || null;
    } catch (e) {
      console.error('Supabase addAttachment error:', e);
      return null;
    }
  },

  async deleteAttachment(ticketId: string, fileName: string): Promise<EmployeeTicket | null> {
    const user = getEmployeeSessionUser();
    const actorName = user?.name || 'Employee';
    const cleanName = fileName.includes(' (') ? fileName.split(' (')[0] : fileName;

    try {
      await supabase
        .from('ticket_attachments')
        .delete()
        .eq('ticket_id', ticketId)
        .eq('name', cleanName);

      const now = new Date().toISOString();
      await supabase.from('ticket_activities').insert([{
        id: `act-${Date.now()}`,
        ticket_id: ticketId,
        user: actorName,
        action: `Removed attachment: ${cleanName}`,
        timestamp: now,
      }]);

      await supabase.from('tickets').update({ updated_at: now }).eq('id', ticketId);

      // Update in local cache
      const t = ticketsCache.find((x) => x.id === ticketId);
      if (t && t.attachments) {
        t.attachments = t.attachments.filter((att) => !att.startsWith(cleanName));
      }

      const updated = await this.getTicketByIdAsync(ticketId);
      return updated || null;
    } catch (e) {
      console.error('Supabase deleteAttachment error:', e);
      return null;
    }
  },

  async fetchNotifications(): Promise<EmployeeNotificationItem[]> {
    try {
      const user = getEmployeeSessionUser();
      const userName = user?.name || '';
      const userEmail = user?.email || '';

      const { data, error } = await supabase
        .from('portal_notifications')
        .select('*')
        .order('timestamp', { ascending: false });

      if (!error && data) {
        const allowedRoles = ['all', 'employee'];
        const filtered = data.filter((n: any) => {
          if (allowedRoles.includes(n.for_role)) return true;
          if (userName && (n.message?.toLowerCase().includes(userName.toLowerCase()) || n.title?.toLowerCase().includes(userName.toLowerCase()))) return true;
          if (userEmail && (n.message?.toLowerCase().includes(userEmail.toLowerCase()) || n.title?.toLowerCase().includes(userEmail.toLowerCase()))) return true;
          return false;
        });

        notificationsCache = filtered.map((n: any) => ({
          id: n.id,
          ticketId: n.ticket_id || '',
          ticketNumber: n.ticket_id || '',
          title: n.title || 'Notification',
          category: (n.type === 'error' ? 'SLA notification' : n.type === 'success' ? 'Ticket resolved' : n.type === 'warning' ? 'New ticket assigned' : 'Ticket status changed') as any,
          time: n.timestamp ? new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now',
          date: n.timestamp ? new Date(n.timestamp).toLocaleDateString() : 'Today',
          isRead: !!n.read,
          message: n.message || '',
        }));
        return notificationsCache;
      }
    } catch (e) {
      console.warn('Error fetching employee notifications:', e);
    }
    return notificationsCache;
  },

  getNotifications(): EmployeeNotificationItem[] {
    if (notificationsCache.length === 0) {
      this.fetchNotifications();
    }
    return notificationsCache;
  },

  markNotificationsAsRead(): EmployeeNotificationItem[] {
    supabase.from('portal_notifications').update({ read: true }).eq('read', false).then(() => {});
    notificationsCache = notificationsCache.map((n) => ({ ...n, isRead: true }));
    return notificationsCache;
  },

  getProfile(): EmployeeProfile {
    const user = getEmployeeSessionUser();
    return {
      name: user?.name || 'Employee',
      email: user?.email || 'employee@company.com',
      employeeId: user?.id || user?.employeeId || 'OKL004',
      department: user?.department || 'IT Support',
      role: user?.role === 'employee' ? 'Employee' : (user?.role || 'Employee'),
      phone: user?.phone || '',
      avatarUrl: user?.avatar || user?.avatarUrl || '',
    };
  },

  async fetchProfile(): Promise<EmployeeProfile> {
    const sessionUser = getEmployeeSessionUser();
    const email = sessionUser?.email;
    const id = sessionUser?.id;

    if (!email && !id) {
      return this.getProfile();
    }

    try {
      let query = supabase.from('users').select('*');
      if (email) {
        query = query.eq('email', email.trim().toLowerCase());
      } else if (id) {
        query = query.eq('id', id);
      }

      const { data: dbUser, error } = await query.maybeSingle();
      if (!error && dbUser) {
        const synced = {
          ...(sessionUser || {}),
          id: dbUser.id,
          name: dbUser.name || sessionUser?.name || 'Employee',
          email: dbUser.email,
          phone: dbUser.phone || '',
          department: dbUser.department || 'IT Support',
          team: dbUser.team || '',
          role: dbUser.role || 'employee',
          designation: dbUser.designation || '',
          avatar: dbUser.avatar || '',
          avatarUrl: dbUser.avatar || '',
        };
        try {
          const prevRaw = localStorage.getItem('platform_current_user');
          const newRaw = JSON.stringify(synced);
          if (prevRaw !== newRaw) {
            localStorage.setItem('platform_current_user', newRaw);
          }
        } catch {}

        return {
          name: synced.name,
          email: synced.email,
          employeeId: synced.id,
          department: synced.department,
          role: 'Employee',
          phone: synced.phone,
          avatarUrl: synced.avatarUrl,
        };
      }
    } catch (e) {
      console.warn('Error fetching live profile from Supabase:', e);
    }

    return this.getProfile();
  },

  async updateProfile(data: Partial<EmployeeProfile>): Promise<EmployeeProfile> {
    const user = getEmployeeSessionUser();
    if (user?.id || user?.email) {
      const dbUpdates: Record<string, any> = {};
      if (data.name !== undefined) dbUpdates.name = data.name;
      if (data.phone !== undefined) dbUpdates.phone = data.phone;
      if (data.department !== undefined) dbUpdates.department = data.department;
      if (data.avatarUrl !== undefined) dbUpdates.avatar = data.avatarUrl || null;
      dbUpdates.updated_at = new Date().toISOString();

      try {
        if (user?.id) {
          await supabase.from('users').update(dbUpdates).eq('id', user.id);
        } else if (user?.email) {
          await supabase.from('users').update(dbUpdates).eq('email', user.email.toLowerCase());
        }
      } catch (err) {
        console.warn('Error updating profile in Supabase:', err);
      }
    }

    const updatedUser = {
      ...(user || {}),
      name: data.name !== undefined ? data.name : user?.name,
      phone: data.phone !== undefined ? data.phone : user?.phone,
      department: data.department !== undefined ? data.department : user?.department,
      avatar: data.avatarUrl !== undefined ? data.avatarUrl : user?.avatar,
      avatarUrl: data.avatarUrl !== undefined ? data.avatarUrl : user?.avatar,
      updated_at: new Date().toISOString(),
    };

    try {
      localStorage.setItem('platform_current_user', JSON.stringify(updatedUser));
      window.dispatchEvent(new Event('storage'));
    } catch {}

    return {
      name: updatedUser.name || 'Employee',
      email: updatedUser.email || 'employee@company.com',
      employeeId: updatedUser.id || updatedUser.employeeId || 'OKL004',
      department: updatedUser.department || 'IT Support',
      role: 'Employee',
      phone: updatedUser.phone || '',
      avatarUrl: updatedUser.avatar || '',
    };
  },

  getSummaryStats() {
    const employeeTickets = this.getEmployeeTickets();
    const myTicketsCount = this.getMyTickets().length;
    const assignedTicketsCount = this.getAssignedTickets().length;
    const norm = (s?: string) => (s || '').trim().toLowerCase();
    const open = employeeTickets.filter((t) => norm(t.status) === 'open').length;
    const inProgress = employeeTickets.filter((t) => norm(t.status) === 'in progress' || norm(t.status) === 'inprogress').length;
    const pending = employeeTickets.filter((t) => norm(t.status) === 'pending' || norm(t.status) === 'escalated').length;
    const resolved = employeeTickets.filter((t) => norm(t.status) === 'resolved' || norm(t.status) === 'closed').length;

    return { myTicketsCount, assignedTicketsCount, open, inProgress, pending, resolved };
  },
};
