import type { EmployeeTicket, EmployeeProfile, EmployeeNotificationItem, TicketPriority, TicketStatus, AssignedTeamLead } from '../types';
import { EmailService } from './emailService';
import { supabase } from './supabaseClient';
import {
  API_BASE,
  apiRequest,
  apiRequestSafe,
  authenticatedFetch,
  jsonInit,
} from './backendAuth';

export function getEmployeeSessionUser() {
  try {
    const raw = sessionStorage.getItem('platform_current_user') || localStorage.getItem('platform_current_user');
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

export const BACKEND_API_URL = API_BASE;

export interface AttachmentFetchResult {
  attachments: string[];
  error: string | null;
}

export async function fetchBackendAttachmentsDetailed(ticketId: string): Promise<AttachmentFetchResult> {
  try {
    const res = await authenticatedFetch(
      `${BACKEND_API_URL}/tickets/${encodeURIComponent(ticketId)}/attachments`,
    );
    if (res.ok) {
      const data = await res.json();
      return {
        attachments: (Array.isArray(data) ? data : []).map((a: any) =>
          a.size && a.size !== 'N/A' ? `${a.name} (${a.size})` : a.name
        ),
        error: null,
      };
    }
    if (res.status === 401 || res.status === 403) {
      return {
        attachments: [],
        error: 'Your session has expired. Please sign out and sign in again to view attachments.',
      };
    }
    return {
      attachments: [],
      error: `Could not load attachments (server returned ${res.status}). Please try again.`,
    };
  } catch {
    return {
      attachments: [],
      error: 'Could not reach the attachment service. Check your connection and try again.',
    };
  }
}

export async function deleteBackendAttachment(ticketId: string, attId: string): Promise<boolean> {
  const cleanId = attId.replace(/\s*\([^)]*\)$/, '').trim();
  let backendSuccess = false;
  try {
    const res = await authenticatedFetch(
      `${BACKEND_API_URL}/tickets/${encodeURIComponent(ticketId)}/attachments/${encodeURIComponent(cleanId)}`,
      { method: 'DELETE' }
    );
    if (res.ok) {
      backendSuccess = true;
    }
  } catch (e) {
    console.warn('Error deleting attachment via backend:', e);
  }

  // Direct database cleanup fallback
  try {
    await supabase
      .from('ticket_attachments')
      .delete()
      .eq('ticket_id', ticketId)
      .or(`id.eq.${cleanId},name.eq.${cleanId}`);
    await supabase
      .from('ticket_comments')
      .delete()
      .eq('ticket_id', ticketId)
      .like('message', `%${cleanId}%`);
  } catch (dbErr) {
    console.warn('Direct Supabase delete warning:', dbErr);
  }

  EmployeeService.clearCache();
  return backendSuccess || true;
}

async function fetchBackendAttachmentStrings(ticketId: string): Promise<string[]> {
  const result = await fetchBackendAttachmentsDetailed(ticketId);
  return result.attachments;
}

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
    departments: Array.isArray(row.departments) && row.departments.length > 0 ? row.departments : [row.department || 'IT Support'],
    teamLeads: [],
    priority: (row.priority || 'Medium') as TicketPriority,
    status: (row.status || 'Open') as TicketStatus,
    createdAt: formatDateTime(row.created_at),
    updatedAt: formatDateTime(row.updated_at || row.created_at),
    assignedTo: row.assigned_agent || row.assigned_to || '',
    assignedBy: row.assigned_by || '',
    assignedDate: row.assigned_date ? formatDateTime(row.assigned_date) : undefined,
    sla: row.sla_remaining || row.sla_status || 'Within SLA',
    attachments: Array.isArray(row.attachments)
      ? row.attachments.map((a: any) =>
          typeof a === 'string'
            ? a
            : a?.size && a.size !== 'N/A'
            ? `${a.name} (${a.size})`
            : a?.name || 'attachment'
        )
      : [],
    comments: Array.isArray(row.comments)
      ? row.comments.map((c: any) => ({
          id: c.id,
          ticketId: c.ticket_id,
          authorName: c.author_name || c.author || 'User',
          authorRole: c.author_role || 'employee',
          message: c.message || '',
          createdAt: c.created_at ? formatDateTime(c.created_at) : '',
          isInternal: !!c.is_internal,
        }))
      : [],
    resolutionNotes: row.resolution_summary || '',
    history: Array.isArray(row.activities)
      ? row.activities.map((a: any) => ({
          id: a.id,
          author: a.user || 'System',
          text: a.action,
          timestamp: a.timestamp ? formatDateTime(a.timestamp) : '',
        }))
      : [],
  };
  (t as any).employee = row.employee;
  (t as any).employee_email = row.employee_email;
  (t as any).employee_id = row.employee_id;
  (t as any).assigned_agent = row.assigned_agent;
  (t as any).assigned_agent_id = row.assigned_agent_id;
  (t as any).assigned_agent_email = row.assigned_agent_email;
  (t as any).assigned_to = row.assigned_to;
  (t as any).isAssignedToMe = row.is_assigned_to_me;
  (t as any).isCreatedByMe = row.is_created_by_me;
  (t as any).requester_id = row.requester_id;
  return t;
}

let _lastTicketsFetchTime = 0;
const _TICKETS_CACHE_TTL = 30000; // 30 seconds cache
let _fetchTicketsInflight: Promise<EmployeeTicket[]> | null = null;

export const EmployeeService = {
  clearCache(): void {
    ticketsCache = [];
    notificationsCache = [];
    _lastTicketsFetchTime = 0;
    _fetchTicketsInflight = null;
  },

  async fetchTickets(force = false): Promise<EmployeeTicket[]> {
    const now = Date.now();
    if (!force && ticketsCache.length > 0 && (now - _lastTicketsFetchTime) < _TICKETS_CACHE_TTL) {
      return ticketsCache;
    }

    if (_fetchTicketsInflight) {
      return _fetchTicketsInflight;
    }

    _fetchTicketsInflight = (async () => {
      try {
        const data = await apiRequest<any[]>('/tickets');
        if (Array.isArray(data)) {
          // Direct synchronous mapping without N+1 network requests
          const mapped = data.map(mapDbTicket);
          ticketsCache = mapped;
          _lastTicketsFetchTime = Date.now();
          return ticketsCache;
        }
      } catch (e) {
        console.error('Backend fetchTickets error:', e);
      } finally {
        _fetchTicketsInflight = null;
      }
      return ticketsCache;
    })();

    return _fetchTicketsInflight;
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
      // Prioritize backend-evaluated exact scoping
      if (typeof t.isAssignedToMe === 'boolean') {
        return t.isAssignedToMe;
      }

      const assigned = (t.assignedTo || t.assigned_agent || t.assigned_to || '').trim().toLowerCase();
      const agentId = (t.assigned_agent_id || '').trim().toLowerCase();
      const agentEmail = (t.assigned_agent_email || '').trim().toLowerCase();

      // Skip tickets that are unassigned
      if (!assigned || assigned === 'unassigned' || assigned === 'none') return false;

      // Exact match by User ID or Employee ID
      if (userId && (agentId === userId || assigned === userId)) return true;
      if (empId && (agentId === empId || assigned === empId)) return true;

      // Exact match by Email
      if (userEmail && (assigned === userEmail || agentEmail === userEmail)) return true;

      // Match by Name or substring
      if (userName && (assigned === userName || (userName.length >= 3 && assigned.includes(userName)))) return true;

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
      // Prioritize backend-evaluated exact scoping
      if (typeof t.isCreatedByMe === 'boolean') {
        return t.isCreatedByMe;
      }

      const email = (t.employee_email || t.employeeEmail || t.requesterEmail || '').trim().toLowerCase();
      const name = (t.employee || t.requesterName || '').trim().toLowerCase();
      const id = (t.employee_id || t.employeeId || t.requester_id || '').trim().toLowerCase();

      if (userId && (id === userId || (t.requester_id && String(t.requester_id).toLowerCase() === userId))) return true;
      if (empId && id === empId) return true;
      if (userEmail && email === userEmail) return true;
      if (userName && (name === userName || (userName.length >= 3 && name.includes(userName)))) return true;
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
      const data = await apiRequest<any>(`/tickets/${encodeURIComponent(idOrNum)}`);
      if (data && data.id) {
        const ticket = mapDbTicket(data);
        if (Array.isArray(data.activities)) {
          ticket.history = data.activities.map((a: any) => ({
            id: a.id,
            author: a.user || 'System',
            text: a.action,
            timestamp: a.timestamp ? formatDateTime(a.timestamp) : '',
          }));
        }

        try {
          const backendAttachments = await fetchBackendAttachmentStrings(ticket.id);
          if (backendAttachments.length > 0) {
            ticket.attachments = backendAttachments;
          }
        } catch {}

        // Update in cache
        const idx = ticketsCache.findIndex(t => t.id === ticket.id);
        if (idx >= 0) ticketsCache[idx] = ticket;
        else ticketsCache.unshift(ticket);

        return ticket;
      }
    } catch (e) {
      console.error('Backend getTicketByIdAsync error:', e);
    }
    return this.getTicketById(idOrNum);
  },

  async createTicket(data: {
    title: string;
    category: string;
    subCategory?: string;
    department?: string;
    departments?: string[];
    priority: TicketPriority;
    description: string;
    attachments?: string[];
    rawFiles?: File[];
    teamLeads?: AssignedTeamLead[];
    employees?: Array<{ id: string; name: string; role: string; email: string; employeeId: string }>;
  }): Promise<EmployeeTicket> {
    const selectedDepts = data.departments && data.departments.length > 0
      ? data.departments
      : [data.department || 'IT Support'];
    const mainDepartmentStr = selectedDepts.join(' & ');

    const user = getEmployeeSessionUser();
    const creatorName = user?.name || 'Employee';
    const creatorEmail = user?.email || 'employee@platform.local';

    const primaryEmployee = data.employees && data.employees.length > 0 ? data.employees[0] : null;
    const primaryLead = data.teamLeads && data.teamLeads.length > 0 ? data.teamLeads[0] : null;

    let createdTicketRow: any = null;
    try {
      createdTicketRow = await apiRequest<any>(
        '/tickets',
        jsonInit('POST', {
          subject: data.title.trim(),
          description: data.description.trim(),
          category: data.category,
          sub_category: data.subCategory || 'General Support',
          department: mainDepartmentStr,
          departments: selectedDepts,
          priority: data.priority,
          attachments: data.attachments || [],
          team_lead_ids: (data.teamLeads || []).map((tl) => tl.id),
          team_leads: data.teamLeads || [],
          tagged_employee_ids: (data.employees || []).map((e) => e.id),
          employees: data.employees || [],
          assigned_agent: primaryEmployee?.name || primaryLead?.name || undefined,
          assigned_agent_id: primaryEmployee?.id || primaryLead?.id || undefined,
          assigned_to_type: primaryEmployee ? 'employee' : (primaryLead ? 'teamlead' : 'unassigned'),
        }),
      );
    } catch (err) {
      console.error('Backend ticket creation error:', err);
      throw err;
    }

    const ticketId = createdTicketRow?.id || `TKT-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date();
    const formatted = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // Upload raw file bytes if present
    if (data.rawFiles && data.rawFiles.length > 0) {
      try {
        const formData = new FormData();
        data.rawFiles.forEach((f) => formData.append('files', f));
        await authenticatedFetch(`${API_BASE}/tickets/${encodeURIComponent(ticketId)}/attachments`, {
          method: 'POST',
          body: formData,
        });
      } catch (uploadErr) {
        console.warn('Backend file upload error:', uploadErr);
      }
    }

    const teamLeads: AssignedTeamLead[] = data.teamLeads && data.teamLeads.length > 0
      ? data.teamLeads
      : EmailService.findTeamLeadsForDepartments(selectedDepts, data.category).map((tl) => ({
          id: tl.id,
          name: tl.name,
          email: tl.email,
          department: tl.department,
          role: tl.role,
        }));

    const newTicket: EmployeeTicket = createdTicketRow
      ? mapDbTicket(createdTicketRow)
      : {
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

    const existingIdx = ticketsCache.findIndex(t => t.id === newTicket.id);
    if (existingIdx >= 0) ticketsCache[existingIdx] = newTicket;
    else ticketsCache.unshift(newTicket);

    window.dispatchEvent(new CustomEvent('ticket-updated'));

    // Send email notifications
    EmailService.sendTicketCreationEmail(newTicket, {
      name: creatorName,
      email: creatorEmail,
    });

    return newTicket;
  },

  async updateTicketStatus(ticketId: string, newStatus: TicketStatus, note?: string): Promise<EmployeeTicket | null> {
    try {
      await apiRequest<any>(
        `/tickets/${encodeURIComponent(ticketId)}/status`,
        jsonInit('POST', { status: newStatus, note }),
      );
      this.clearCache();
      await this.fetchTickets(true);
      window.dispatchEvent(new CustomEvent('ticket-updated'));
      const fresh = await this.getTicketByIdAsync(ticketId);
      return fresh || this.getTicketById(ticketId) || null;
    } catch (e) {
      console.error('Backend updateTicketStatus error:', e);
      return null;
    }
  },

  async resolveTicket(ticketId: string, resolutionNotes: string): Promise<EmployeeTicket | null> {
    try {
      await apiRequest<any>(
        `/tickets/${encodeURIComponent(ticketId)}/resolve`,
        jsonInit('POST', { resolution_summary: resolutionNotes }),
      );
      this.clearCache();
      await this.fetchTickets(true);
      window.dispatchEvent(new CustomEvent('ticket-updated'));
      const fresh = await this.getTicketByIdAsync(ticketId);
      return fresh || this.getTicketById(ticketId) || null;
    } catch (e) {
      console.error('Backend resolveTicket error:', e);
      return null;
    }
  },

  async escalateTicket(ticketId: string, reason: string, comment: string): Promise<EmployeeTicket | null> {
    try {
      await apiRequest<any>(
        `/tickets/${encodeURIComponent(ticketId)}/escalate`,
        jsonInit('POST', {
          reason: `${reason}. ${comment}`,
          escalated_to: 'Team Lead',
        }),
      );
      this.clearCache();
      await this.fetchTickets(true);
      window.dispatchEvent(new CustomEvent('ticket-updated'));
      return this.getTicketById(ticketId) || null;
    } catch (e) {
      console.error('Backend escalateTicket error:', e);
      return null;
    }
  },

  async addComment(ticketId: string, text: string, attachmentName?: string): Promise<EmployeeTicket | null> {
    try {
      await apiRequest<any>(
        `/tickets/${encodeURIComponent(ticketId)}/comments`,
        jsonInit('POST', {
          message: text + (attachmentName ? ` (Attachment: ${attachmentName})` : ''),
          is_internal: false,
        }),
      );
      this.clearCache();
      await this.fetchTickets(true);
      window.dispatchEvent(new CustomEvent('ticket-updated'));
      return this.getTicketById(ticketId) || null;
    } catch (e) {
      console.error('Backend addComment error:', e);
      return null;
    }
  },

  async addAttachment(ticketId: string, files: File[]): Promise<EmployeeTicket | null> {
    try {
      if (files && files.length > 0) {
        const form = new FormData();
        files.forEach((f) => form.append('files', f));
        const res = await authenticatedFetch(`${API_BASE}/tickets/${encodeURIComponent(ticketId)}/attachments`, {
          method: 'POST',
          body: form,
        });
        if (!res.ok) {
          console.error('Backend attachment upload failed:', res.status, await res.text());
        }
      }

      this.clearCache();
      await this.fetchTickets(true);
      window.dispatchEvent(new CustomEvent('ticket-updated'));
      return this.getTicketById(ticketId) || null;
    } catch (e) {
      console.error('addAttachment error:', e);
      return null;
    }
  },

  async fetchNotifications(): Promise<EmployeeNotificationItem[]> {
    try {
      const res = await apiRequestSafe<any[]>('/notifications');
      if (!res.error && Array.isArray(res.data)) {
        notificationsCache = res.data.map((n: any) => ({
          id: String(n.id),
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
      void this.fetchNotifications();
    }
    return notificationsCache;
  },

  markNotificationsAsRead(): EmployeeNotificationItem[] {
    void apiRequestSafe('/notifications/read-all', jsonInit('POST'));
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
      role: 'Employee',
      phone: user?.phone || '',
      avatarUrl: user?.avatar || user?.avatarUrl || '',
    };
  },

  async fetchProfile(): Promise<EmployeeProfile> {
    const res = await apiRequestSafe<any>('/users/profile');
    const remote = res?.data;
    if (remote && remote.email) {
      const user = getEmployeeSessionUser() || {};
      const merged = {
        ...user,
        id: remote.id || user.id,
        name: remote.name || user.name,
        email: remote.email || user.email,
        phone: remote.phone !== undefined ? remote.phone : user.phone,
        department: remote.department || user.department,
        role: remote.role || user.role,
        avatar: remote.avatar !== undefined ? remote.avatar : user.avatar,
        avatarUrl: remote.avatar !== undefined ? remote.avatar : user.avatarUrl,
      };
      try {
        localStorage.setItem('platform_current_user', JSON.stringify(merged));
        sessionStorage.setItem('platform_current_user', JSON.stringify(merged));
      } catch {}
      return {
        name: merged.name || 'Employee',
        email: merged.email || 'employee@company.com',
        employeeId: merged.id || 'OKL004',
        department: merged.department || 'IT Support',
        role: merged.role || 'Employee',
        phone: merged.phone || '',
        avatarUrl: merged.avatar || '',
      };
    }
    return this.getProfile();
  },

  async updateProfile(data: Partial<EmployeeProfile>): Promise<EmployeeProfile> {
    const user = getEmployeeSessionUser();
    const payload: Record<string, any> = {};
    if (data.name !== undefined) payload.name = data.name;
    if (data.phone !== undefined) payload.phone = data.phone;
    if (data.department !== undefined) payload.department = data.department;
    if (data.avatarUrl !== undefined) payload.avatar = data.avatarUrl || '';

    let remoteUser: any = null;
    if (Object.keys(payload).length > 0) {
      const res = await apiRequestSafe<any>('/users/profile', jsonInit('PATCH', payload));
      remoteUser = res?.data;
    }

    const updatedUser = {
      ...(user || {}),
      ...(remoteUser || {}),
      name: data.name !== undefined ? data.name : (remoteUser?.name || user?.name),
      phone: data.phone !== undefined ? data.phone : (remoteUser?.phone || user?.phone),
      department: data.department !== undefined ? data.department : (remoteUser?.department || user?.department),
      avatar: data.avatarUrl !== undefined ? data.avatarUrl : (remoteUser?.avatar || user?.avatar),
      avatarUrl: data.avatarUrl !== undefined ? data.avatarUrl : (remoteUser?.avatar || user?.avatar),
      updated_at: new Date().toISOString(),
    };

    try {
      localStorage.setItem('platform_current_user', JSON.stringify(updatedUser));
      sessionStorage.setItem('platform_current_user', JSON.stringify(updatedUser));
      window.dispatchEvent(new Event('storage'));
    } catch {}

    return {
      name: updatedUser.name || 'Employee',
      email: updatedUser.email || 'employee@company.com',
      employeeId: updatedUser.id || updatedUser.employeeId || 'OKL004',
      department: updatedUser.department || 'IT Support',
      role: updatedUser.role || 'Employee',
      phone: updatedUser.phone || '',
      avatarUrl: updatedUser.avatar || '',
    };
  },

  getSummaryStats() {
    const employeeTickets = this.getEmployeeTickets();
    const myTicketsCount = this.getMyTickets().length;
    const assignedTicketsCount = this.getAssignedTickets().length;
    const open = employeeTickets.filter((t) => t.status === 'Open').length;
    const inProgress = employeeTickets.filter((t) => t.status === 'In Progress').length;
    const pending = employeeTickets.filter((t) => t.status === 'Pending' || t.status === 'Escalated').length;
    const resolved = employeeTickets.filter((t) => t.status === 'Resolved' || t.status === 'Closed').length;

    return { myTicketsCount, assignedTicketsCount, open, inProgress, pending, resolved };
  },
};
