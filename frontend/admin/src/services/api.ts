import type {
  User,
  Ticket,
  DashboardStats,
  AddUserFormData,
  UserRole,
  UserDepartment,
  UserStatus,
  SLAStatus,
} from '../types';
import { getCurrentSessionUser } from './unifiedAuth';
import {
  API_BASE,
  apiRequest,
  apiRequestSafe,
  authenticatedFetch,
  jsonInit,
} from './backendAuth';

/**
 * Base backend origin (no /api/v1 suffix). Kept for pages that build
 * attachment download/preview URLs themselves.
 */
export const BACKEND_API_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) ||
  (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
    ? 'https://ticketing-api-0dht.onrender.com'
    : 'http://127.0.0.1:8000');

export interface BackendAttachment {
  id: string;
  ticket_id: string;
  name: string;
  size: string;
  url: string;
  download_url?: string;
  view_url?: string;
  mime_type?: string;
  type?: string;
  uploaded_by?: string;
  created_at?: string;
}

export interface BackendAttachmentResult {
  attachments: BackendAttachment[];
  error: string | null;
}

/** Fetch attachment metadata from the backend (authoritative, includes on-disk files). */
export async function fetchBackendAttachmentsDetailed(ticketId: string): Promise<BackendAttachmentResult> {
  const result = await apiRequestSafe<BackendAttachment[]>(
    `/tickets/${encodeURIComponent(ticketId)}/attachments`,
  );
  if (result.error) {
    if (result.status === 401 || result.status === 403) {
      return {
        attachments: [],
        error: 'Your session has expired or you do not have access to this ticket. Sign in again to view attachments.',
      };
    }
    return {
      attachments: [],
      error: `Could not load attachments: ${result.error}`,
    };
  }
  return { attachments: Array.isArray(result.data) ? result.data : [], error: null };
}

export async function fetchBackendAttachments(ticketId: string): Promise<BackendAttachment[]> {
  const result = await fetchBackendAttachmentsDetailed(ticketId);
  return result.attachments;
}

/** Upload raw file(s) to the ticket via the backend (stores bytes + metadata). */
export async function uploadBackendAttachments(
  ticketId: string,
  files: File[]
): Promise<BackendAttachment[]> {
  if (!files.length) return [];
  const formData = new FormData();
  files.forEach((f) => formData.append('files', f));
  const res = await authenticatedFetch(
    `${API_BASE}/tickets/${encodeURIComponent(ticketId)}/attachments`,
    { method: 'POST', body: formData }
  );
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Attachment upload failed (${res.status}): ${detail}`);
  }
  const data = await res.json();
  return Array.isArray(data) ? (data as BackendAttachment[]) : [];
}

export function computeSLAStatus(
  createdAtStr?: string,
  priority?: string,
  explicitDueDate?: string,
  status?: string
): SLAStatus {
  const normStatus = (status || '').toLowerCase();
  if (['resolved', 'closed'].includes(normStatus)) {
    return 'Normal';
  }

  const prio = (priority || '').toLowerCase();
  let slaHours = 24;
  if (prio === 'critical' || prio === 'urgent') slaHours = 4;
  else if (prio === 'high') slaHours = 8;
  else if (prio === 'medium') slaHours = 24;
  else if (prio === 'low') slaHours = 48;

  let deadlineMs = 0;
  if (explicitDueDate && explicitDueDate.trim() && explicitDueDate.length >= 10) {
    const parsed = new Date(
      explicitDueDate.includes(' ') && !explicitDueDate.includes('T')
        ? explicitDueDate.replace(' ', 'T')
        : explicitDueDate
    );
    if (!isNaN(parsed.getTime())) deadlineMs = parsed.getTime();
  }

  if (!deadlineMs) {
    if (!createdAtStr) return 'Normal';
    const createdTime = new Date(
      createdAtStr.includes(' ') && !createdAtStr.includes('T')
        ? createdAtStr.replace(' ', 'T')
        : createdAtStr
    );
    const validCreatedMs = !isNaN(createdTime.getTime()) ? createdTime.getTime() : Date.now();
    deadlineMs = validCreatedMs + slaHours * 60 * 60 * 1000;
  }

  const nowMs = Date.now();
  if (nowMs > deadlineMs) return 'SLA Breached';

  const remainingMs = deadlineMs - nowMs;
  const totalDurationMs = slaHours * 60 * 60 * 1000;
  if (remainingMs <= 2 * 60 * 60 * 1000 || remainingMs <= totalDurationMs * 0.25) {
    return 'SLA Risk';
  }
  return 'Normal';
}

function mapSlaStatus(raw?: string): SLAStatus {
  if (!raw) return 'Normal';
  const lower = raw.toLowerCase();
  if (lower.includes('breach')) return 'SLA Breached';
  if (lower.includes('risk')) return 'SLA Risk';
  return 'Normal';
}

export function calculateSLADeadline(
  createdAtStr?: string,
  priority?: string,
  explicitDueDate?: string
): string {
  if (explicitDueDate && explicitDueDate.trim() && explicitDueDate.length >= 10) {
    const raw = explicitDueDate.includes(' ') && !explicitDueDate.includes('T')
      ? explicitDueDate.replace(' ', 'T')
      : explicitDueDate;
    const due = new Date(raw);
    if (!isNaN(due.getTime())) {
      const yyyy = due.getFullYear();
      const mm = String(due.getMonth() + 1).padStart(2, '0');
      const dd = String(due.getDate()).padStart(2, '0');
      const hh = String(due.getHours()).padStart(2, '0');
      const min = String(due.getMinutes()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
    }
    const cleanDue = explicitDueDate.replace('T', ' ').slice(0, 16);
    return cleanDue;
  }

  const prio = (priority || '').toLowerCase();
  let hoursToAdd = 24;
  if (prio === 'critical' || prio === 'urgent') hoursToAdd = 4;
  else if (prio === 'high') hoursToAdd = 8;
  else if (prio === 'medium') hoursToAdd = 24;
  else if (prio === 'low') hoursToAdd = 48;

  const createdTime = createdAtStr
    ? new Date(createdAtStr.includes(' ') && !createdAtStr.includes('T')
        ? createdAtStr.replace(' ', 'T')
        : createdAtStr)
    : new Date();
  const validCreated = isNaN(createdTime.getTime()) ? new Date() : createdTime;
  const deadline = new Date(validCreated.getTime() + hoursToAdd * 60 * 60 * 1000);
  const yyyy = deadline.getFullYear();
  const mm = String(deadline.getMonth() + 1).padStart(2, '0');
  const dd = String(deadline.getDate()).padStart(2, '0');
  const hh = String(deadline.getHours()).padStart(2, '0');
  const min = String(deadline.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
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

// Compatibility empty exports (no mock data is ever used).
export const mockUsers: User[] = [];
export const mockTickets: Ticket[] = [];

interface BackendTicket {
  id: string;
  subject?: string;
  description?: string;
  employee?: string;
  employee_email?: string;
  employee_id?: string;
  assigned_agent?: string;
  assigned_agent_id?: string;
  assigned_by?: string;
  department?: string;
  departments?: string[];
  category?: string;
  priority?: string;
  status?: string;
  sla_status?: string;
  sla_remaining?: string;
  sla_due_at?: string;
  created_at?: string;
  updated_at?: string;
  is_unassigned?: boolean;
  attachments?: string[];
  history?: { id: string; author: string; text: string; timestamp: string }[];
  comments?: any[];
  activities?: any[];
}

interface BackendUserRow {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
  department?: string;
  designation?: string;
  team?: string;
  avatar?: string;
  status?: string;
  created_at?: string;
}

function mapBackendUser(u: BackendUserRow): User {
  let computedStatus: UserStatus = (u.status || 'Active') as UserStatus;
  if (computedStatus === 'Pending Invitation' && (u as any).invite_expires_at) {
    if (new Date((u as any).invite_expires_at).getTime() < Date.now()) {
      computedStatus = 'Invite Expired';
    }
  }
  const rawRole = (u.role || '').toLowerCase();
  const role: UserRole = rawRole.includes('admin')
    ? 'Admin'
    : rawRole.includes('lead')
    ? 'Team Lead'
    : 'Employee';
  return {
    id: u.id,
    employeeId: u.id,
    name: u.name || (u.email ? u.email.split('@')[0] : 'User'),
    email: u.email || '',
    phone: u.phone || '',
    department: (u.department || 'IT Support') as UserDepartment,
    role,
    teamLead: u.team || undefined,
    status: computedStatus,
    avatarUrl: u.avatar || '',
    createdAt: u.created_at ? u.created_at.split('T')[0] : '',
  };
}

function mapBackendTicket(t: BackendTicket): Ticket {
  return {
    id: t.id,
    ticketNumber: t.id,
    title: t.subject || 'No Subject',
    description: t.description || '',
    requesterName: t.employee || 'User',
    requesterEmail: t.employee_email || '',
    assignedTo: t.assigned_agent || 'Unassigned',
    assignedTeamLead: t.assigned_by || '',
    department: t.department || 'IT Support',
    departments: t.departments,
    category: t.category || 'General Support',
    priority: (t.priority || 'Medium') as Ticket['priority'],
    status: (t.status || 'Open') as Ticket['status'],
    slaStatus: mapSlaStatus(t.sla_status),
    createdAt: formatDateTime(t.created_at),
    updatedAt: formatDateTime(t.updated_at || t.created_at),
    dueDate: calculateSLADeadline(t.created_at, t.priority, t.sla_due_at),
    attachments: Array.isArray(t.attachments) ? t.attachments : [],
  };
}

function mapRoleToBackend(role?: string): 'admin' | 'teamlead' | 'employee' {
  const value = (role || '').toLowerCase();
  if (value.includes('admin')) return 'admin';
  if (value.includes('lead')) return 'teamlead';
  return 'employee';
}

async function sendInviteEmail(payload: {
  name: string;
  email: string;
  employee_id: string;
  role: string;
  department: string;
  invite_token: string;
  signup_url: string;
}) {
  return apiRequestSafe('/notifications/send-invite', jsonInit('POST', payload));
}

let _dashboardStatsInflight: Promise<DashboardStats | null> | null = null;
let _dashboardStatsCache: DashboardStats | null = null;
let _lastStatsFetchTime = 0;

let _adminTicketsInflight: Promise<Ticket[]> | null = null;
let _adminTicketsCache: Ticket[] | null = null;
let _lastTicketsFetchTime = 0;

let _adminUsersInflight: Promise<User[]> | null = null;
let _adminUsersCache: User[] | null = null;
let _lastUsersFetchTime = 0;

const CACHE_TTL_MS = 30000;

export function invalidateAdminCache(): void {
  _dashboardStatsCache = null;
  _lastStatsFetchTime = 0;
  _adminTicketsCache = null;
  _lastTicketsFetchTime = 0;
  _adminUsersCache = null;
  _lastUsersFetchTime = 0;
}

export const AdminApiService = {
  invalidateCache(): void {
    invalidateAdminCache();
  },

  getCachedTickets(): Ticket[] | null {
    return _adminTicketsCache;
  },

  getCachedStats(): DashboardStats | null {
    return _dashboardStatsCache;
  },

  getCachedUsers(): User[] | null {
    return _adminUsersCache;
  },

  async getDashboardStats(force = false): Promise<DashboardStats | null> {
    const now = Date.now();
    if (!force && _dashboardStatsCache && now - _lastStatsFetchTime < CACHE_TTL_MS) {
      return _dashboardStatsCache;
    }
    if (_dashboardStatsInflight) {
      return _dashboardStatsInflight;
    }
    _dashboardStatsInflight = (async () => {
      try {
        const result = await apiRequestSafe<DashboardStats>('/tickets/stats/summary');
        if (result.error || !result.data) return null;
        _dashboardStatsCache = result.data;
        _lastStatsFetchTime = Date.now();
        return _dashboardStatsCache;
      } finally {
        _dashboardStatsInflight = null;
      }
    })();
    return _dashboardStatsInflight;
  },

  async getUsers(force = false): Promise<User[]> {
    const now = Date.now();
    if (!force && _adminUsersCache && now - _lastUsersFetchTime < CACHE_TTL_MS) {
      return _adminUsersCache;
    }
    if (_adminUsersInflight) {
      return _adminUsersInflight;
    }
    _adminUsersInflight = (async () => {
      try {
        const result = await apiRequestSafe<BackendUserRow[]>('/admin/users');
        if (result.error || !Array.isArray(result.data)) return [];
        const mapped = result.data.map(mapBackendUser);
        _adminUsersCache = mapped;
        _lastUsersFetchTime = Date.now();
        return mapped;
      } finally {
        _adminUsersInflight = null;
      }
    })();
    return _adminUsersInflight;
  },

  async addUser(data: AddUserFormData): Promise<User> {
    const cleanEmpId =
      (data.employeeId || '').trim().toUpperCase() || `EMP-${Date.now().toString().slice(-6)}`;
    const mappedRole = mapRoleToBackend(data.role);
    const inviteToken = `inv-${Math.random().toString(36).substring(2, 12)}`;
    const cleanEmail = data.email.trim().toLowerCase();

    const created = await apiRequest<BackendUserRow>(
      '/admin/users',
      jsonInit('POST', {
        name: data.name,
        email: cleanEmail,
        employee_id: cleanEmpId,
        phone: data.phone || '',
        department: data.department || 'IT Support',
        role: mappedRole,
        password: data.password || undefined,
        status: data.sendEmailInvite ? 'Pending Invitation' : 'Active',
        send_email_invite: data.sendEmailInvite,
        invite_token: data.sendEmailInvite ? inviteToken : undefined,
      })
    );

    if (data.sendEmailInvite) {
      let targetPortalUrl = `http://localhost:3000/#/signup?token=${inviteToken}&email=${encodeURIComponent(cleanEmail)}&role=${mappedRole}`;
      if (mappedRole === 'teamlead') {
        targetPortalUrl = `http://localhost:4174/login?email=${encodeURIComponent(cleanEmail)}`;
      } else if (mappedRole === 'employee') {
        targetPortalUrl = `http://localhost:4173/signin?email=${encodeURIComponent(cleanEmail)}`;
      }
      const invite = await sendInviteEmail({
        name: data.name,
        email: cleanEmail,
        employee_id: cleanEmpId,
        role: data.role || 'Employee',
        department: data.department || 'IT Support',
        invite_token: inviteToken,
        signup_url: targetPortalUrl,
      });
      if (invite.error) {
        console.warn('Invitation email was not sent:', invite.error);
      }
    }

    invalidateAdminCache();
    return mapBackendUser(created);
  },

  async resendInvite(user: {
    id?: string;
    name: string;
    email: string;
    employeeId?: string;
    role?: string;
    department?: string;
    inviteToken?: string;
  }): Promise<{ success: boolean; status?: string; message?: string }> {
    const cleanEmail = user.email.trim().toLowerCase();
    const token = user.inviteToken || `inv-${Math.random().toString(36).substring(2, 12)}`;
    if (user.id) {
      await apiRequestSafe(
        `/admin/users/${encodeURIComponent(user.id)}`,
        jsonInit('PATCH', { invite_token: token, status: 'Pending Invitation' })
      );
    }
    const roleNorm = mapRoleToBackend(user.role);
    let signupUrl = `http://localhost:3000/#/signup?token=${token}&email=${encodeURIComponent(cleanEmail)}&role=${roleNorm}`;
    if (roleNorm === 'teamlead') {
      signupUrl = `http://localhost:4174/login?email=${encodeURIComponent(cleanEmail)}`;
    } else if (roleNorm === 'employee') {
      signupUrl = `http://localhost:4173/signin?email=${encodeURIComponent(cleanEmail)}`;
    }

    const result = await sendInviteEmail({
      name: user.name,
      email: cleanEmail,
      employee_id: user.employeeId || '',
      role: user.role || 'Employee',
      department: user.department || 'IT Support',
      invite_token: token,
      signup_url: signupUrl,
    });
    if (result.error) throw new Error(result.error);
    const data = result.data as { success?: boolean; status?: string; message?: string } | undefined;
    return {
      success: data?.success ?? true,
      status: data?.status ?? 'success',
      message: data?.message,
    };
  },

  async manuallyActivateUser(userId: string) {
    await apiRequest(
      `/admin/users/${encodeURIComponent(userId)}`,
      jsonInit('PATCH', { status: 'Active' })
    );
    invalidateAdminCache();
    return { success: true };
  },

  async updateUser(
    userId: string,
    data: { name?: string; email?: string; department?: string; role?: string; status?: string; phone?: string }
  ) {
    const payload: Record<string, unknown> = {};
    if (data.name) payload.name = data.name;
    if (data.email) payload.email = data.email.trim().toLowerCase();
    if (data.department) payload.department = data.department;
    if (data.role) payload.role = mapRoleToBackend(data.role);
    if (data.status) payload.status = data.status;
    if (data.phone !== undefined) payload.phone = data.phone;
    await apiRequest(`/admin/users/${encodeURIComponent(userId)}`, jsonInit('PATCH', payload));
    invalidateAdminCache();
    return { success: true };
  },

  async deleteUser(userId: string) {
    await apiRequest(`/admin/users/${encodeURIComponent(userId)}`, { method: 'DELETE' });
    invalidateAdminCache();
    return { success: true };
  },

  async getSmtpStatus() {
    const result = await apiRequestSafe<any>('/notifications/smtp-status');
    if (result.data) return result.data;
    return {
      is_configured: false,
      has_password: false,
      instructions:
        result.error ||
        'Backend notification server is starting or unreachable.',
    };
  },

  async updateSmtpConfig(config: any) {
    return apiRequest<any>('/notifications/smtp-config', jsonInit('POST', config));
  },

  async testSmtp(testEmail: string) {
    return apiRequest<any>('/notifications/smtp-test', jsonInit('POST', { test_email: testEmail }));
  },

  async getTickets(filterType?: string, force = false): Promise<Ticket[]> {
    const now = Date.now();
    let mapped: Ticket[];
    if (!force && _adminTicketsCache && now - _lastTicketsFetchTime < CACHE_TTL_MS) {
      mapped = _adminTicketsCache;
    } else if (_adminTicketsInflight) {
      mapped = await _adminTicketsInflight;
    } else {
      _adminTicketsInflight = (async () => {
        try {
          const result = await apiRequestSafe<BackendTicket[]>('/tickets');
          if (result.error || !Array.isArray(result.data)) {
            console.error('Backend getTickets error:', result.error);
            return _adminTicketsCache || [];
          }
          const m = result.data.map(mapBackendTicket);
          _adminTicketsCache = m;
          _lastTicketsFetchTime = Date.now();
          return m;
        } finally {
          _adminTicketsInflight = null;
        }
      })();
      mapped = await _adminTicketsInflight;
    }

    const isActive = (t: Ticket) => !['resolved', 'closed'].includes((t.status || '').toLowerCase());
    const isEscalated = (t: Ticket) => (t.status || '').toLowerCase() === 'escalated';

    if (!filterType || filterType === 'all') return mapped;
    if (filterType === 'open') {
      return mapped.filter((t) => isActive(t) && (t.status || '').toLowerCase() === 'open');
    }
    if (filterType === 'unassigned') {
      return mapped.filter(
        (t) =>
          isActive(t) &&
          (!t.assignedTo || t.assignedTo.trim() === '' || t.assignedTo.toLowerCase() === 'unassigned')
      );
    }
    if (filterType === 'escalated') {
      return mapped.filter((t) => isActive(t) && isEscalated(t));
    }
    if (filterType === 'sla-risk') {
      return mapped.filter((t) => isActive(t) && !isEscalated(t) && t.slaStatus === 'SLA Risk');
    }
    if (filterType === 'sla-breached') {
      return mapped.filter((t) => isActive(t) && !isEscalated(t) && t.slaStatus === 'SLA Breached');
    }
    if (filterType === 'resolved') {
      return mapped.filter((t) => !isActive(t));
    }
    return mapped;
  },

  async getTicketById(idOrNum: string): Promise<Ticket | null> {
    const result = await apiRequestSafe<BackendTicket>(
      `/tickets/${encodeURIComponent(idOrNum)}`
    );
    if (result.error || !result.data) {
      console.error('Backend getTicketById error:', result.error);
      return null;
    }
    const data = result.data;
    const ticket = mapBackendTicket(data);

    let mappedAttachments = ticket.attachments || [];
    let attachmentsError: string | null = null;
    if (mappedAttachments.length === 0) {
      const backendResult = await fetchBackendAttachmentsDetailed(idOrNum);
      if (backendResult.attachments.length > 0) {
        mappedAttachments = backendResult.attachments.map((a) =>
          a.size && a.size !== 'N/A' ? `${a.name} (${a.size})` : a.name
        );
      }
      attachmentsError = backendResult.error;
    }

    const history =
      Array.isArray(data.history) && data.history.length > 0
        ? data.history.map((a) => ({
            id: a.id,
            author: a.author || 'User',
            text: a.text || '',
            timestamp: formatDateTime(a.timestamp),
          }))
        : [];

    return {
      ...ticket,
      attachments: mappedAttachments,
      attachmentsError:
        attachmentsError && mappedAttachments.length === 0 ? attachmentsError : null,
      history,
    };
  },

  async createTicket(data: {
    title: string;
    category: string;
    department: any;
    departments?: string[];
    priority: any;
    description: string;
    attachments?: string[];
    rawFiles?: File[];
    assignedTeamLead?: string;
    teamLeads?: { id: string; name: string; role: string; employeeId: string; email: string }[];
    employees?: { id: string; name: string; role: string; employeeId: string; email: string }[];
  }): Promise<Ticket> {
    const sessionUser = getCurrentSessionUser();
    const primaryAssignee = data.employees && data.employees.length > 0 ? data.employees[0] : null;
    const firstTL = data.teamLeads && data.teamLeads.length > 0 ? data.teamLeads[0] : null;

    const created = await apiRequest<BackendTicket>(
      '/tickets',
      jsonInit('POST', {
        subject: data.title,
        description: data.description,
        category: data.category || 'General Support',
        priority: data.priority || 'Medium',
        department: data.department || undefined,
        departments: data.departments,
        employee: sessionUser?.name || undefined,
        employee_email: sessionUser?.email || undefined,
        assigned_agent: primaryAssignee?.name || firstTL?.name || undefined,
        assigned_agent_id: primaryAssignee?.id || firstTL?.id || undefined,
        assigned_to_type: primaryAssignee ? 'employee' : firstTL ? 'teamlead' : 'unassigned',
        assigned_by: data.assignedTeamLead || sessionUser?.name || undefined,
        status: 'Open',
        team_lead_ids: (data.teamLeads || []).map((tl) => tl.id),
        team_leads: data.teamLeads || [],
        tagged_employee_ids: (data.employees || []).map((e) => e.id),
        employees: data.employees || [],
      })
    );

    if (data.rawFiles && data.rawFiles.length > 0) {
      try {
        await uploadBackendAttachments(created.id, data.rawFiles);
      } catch (uploadErr) {
        console.warn('Backend file upload error:', uploadErr);
      }
    }

    invalidateAdminCache();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ticket-updated'));
    }

    const full = await this.getTicketById(created.id);
    return full || mapBackendTicket(created);
  },

  async updateTicket(
    ticketId: string,
    updates: Partial<Ticket>,
    activityNote?: string
  ): Promise<Ticket> {
    let assigned = false;
    if (updates.assignedTo !== undefined && updates.assignedTo !== null) {
      await apiRequest(
        `/tickets/${encodeURIComponent(ticketId)}/assign`,
        jsonInit('POST', {
          assigned_agent: updates.assignedTo || 'Unassigned',
          assigned_agent_id: (updates as any).assignedAgentId || undefined,
          priority: updates.priority || undefined,
          note: activityNote,
        })
      );
      assigned = true;
    }

    const statusText = (updates.status || '').toLowerCase();
    if (statusText === 'escalated') {
      await apiRequest(
        `/tickets/${encodeURIComponent(ticketId)}/escalate`,
        jsonInit('POST', {
          reason: activityNote || updates.description || 'Escalated from the admin portal',
        })
      );
    } else if (statusText && statusText !== 'escalated') {
      await apiRequest(
        `/tickets/${encodeURIComponent(ticketId)}/status`,
        jsonInit('POST', { status: updates.status, note: assigned ? undefined : activityNote })
      );
    }

    const patch: Record<string, unknown> = {};
    if (updates.title) patch.subject = updates.title;
    if (updates.description) patch.description = updates.description;
    if (updates.priority) patch.priority = updates.priority;
    if (updates.category) patch.category = updates.category;
    if (updates.department) patch.department = updates.department;
    if (updates.dueDate) patch.sla_due_at = updates.dueDate;
    if (!assigned && activityNote) patch.activity_note = activityNote;

    if (Object.keys(patch).length > 0) {
      await apiRequest(`/tickets/${encodeURIComponent(ticketId)}`, jsonInit('PATCH', patch));
    }

    invalidateAdminCache();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ticket-updated'));
    }

    const reloaded = await this.getTicketById(ticketId);
    if (reloaded) return reloaded;

    // Never fabricate a ticket when the reload fails: surface the error.
    throw new Error('The ticket was updated but could not be reloaded. Refresh the page.');
  },

  async addComment(ticketId: string, text: string, _attachmentName?: string): Promise<Ticket | null> {
    await apiRequest(
      `/tickets/${encodeURIComponent(ticketId)}/comments`,
      jsonInit('POST', { message: text })
    );
    invalidateAdminCache();
    return this.getTicketById(ticketId);
  },

  async addAttachment(ticketId: string, fileName: string, file?: File): Promise<Ticket | null> {
    if (!file) throw new Error('A file is required to add an attachment.');
    await uploadBackendAttachments(ticketId, [file]);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ticket-updated'));
    }
    return this.getTicketById(ticketId);
  },

  async deleteTicket(ticketId: string): Promise<boolean> {
    const result = await apiRequestSafe(
      `/tickets/${encodeURIComponent(ticketId)}`,
      { method: 'DELETE' }
    );
    if (result.error) {
      console.error('Backend deleteTicket error:', result.error);
      return false;
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ticket-updated'));
    }
    return true;
  },
};
