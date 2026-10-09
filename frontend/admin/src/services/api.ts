import type { User, Ticket, DashboardStats, AddUserFormData, UserRole, UserDepartment, SLAStatus } from '../types';
import { getCurrentSessionUser } from './unifiedAuth';
import { supabase } from './supabaseClient';

function mapSlaStatus(raw?: string): SLAStatus {
  if (!raw) return 'Normal';
  const lower = raw.toLowerCase();
  if (lower.includes('breach')) return 'SLA Breached';
  if (lower.includes('risk')) return 'SLA Risk';
  return 'Normal';
}

// Compatibility empty exports (no mock data used)
export const mockUsers: User[] = [];
export const mockTickets: Ticket[] = [];

export const AdminApiService = {
  async getDashboardStats(): Promise<DashboardStats> {
    try {
      const { data: dbTickets } = await supabase.from('tickets').select('id, status, sla_status');
      const { data: dbUsers } = await supabase.from('users').select('id');

      const tickets: any[] = dbTickets || [];
      const openTickets = tickets.filter(t => (t.status || '').toLowerCase() === 'open').length;
      const escalatedTickets = tickets.filter(t => (t.status || '').toLowerCase() === 'escalated').length;
      const slaRiskCount = tickets.filter(t => (t.sla_status || '').toLowerCase().includes('risk')).length;
      const slaBreachedCount = tickets.filter(t => (t.sla_status || '').toLowerCase().includes('breach')).length;
      const resolvedTodayCount = tickets.filter(t => ['resolved', 'closed'].includes((t.status || '').toLowerCase())).length;

      return {
        totalTickets: tickets.length,
        totalUsers: dbUsers ? dbUsers.length : 0,
        openTickets,
        escalatedTickets,
        slaRiskCount,
        slaBreachedCount,
        resolvedTodayCount,
      };
    } catch (e) {
      console.error('Error fetching dashboard stats from Supabase:', e);
      return {
        totalTickets: 0,
        totalUsers: 0,
        openTickets: 0,
        escalatedTickets: 0,
        slaRiskCount: 0,
        slaBreachedCount: 0,
        resolvedTodayCount: 0,
      };
    }
  },

  async getUsers(): Promise<User[]> {
    try {
      const { data: dbUsers, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && dbUsers) {
        return dbUsers.map((u: any) => ({
          id: u.id,
          employeeId: u.id,
          name: u.name || (u.email ? u.email.split('@')[0] : 'User'),
          email: u.email,
          phone: u.phone || '+1 (555) 000-0000',
          department: (u.department || 'IT Support') as UserDepartment,
          role: (u.role === 'admin' ? 'Admin' : u.role === 'teamlead' ? 'Team Lead' : 'Employee') as UserRole,
          teamLead: u.team_lead || undefined,
          status: (u.status || 'Active') as 'Active' | 'Pending Invitation' | 'Inactive',
          inviteToken: u.invite_token || undefined,
          avatarUrl: u.avatar || '',
          createdAt: u.created_at ? u.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
        }));
      }
    } catch (e) {
      console.error('Supabase getUsers error:', e);
    }
    return [];
  },

  async addUser(data: AddUserFormData): Promise<User> {
    const cleanEmpId = (data.employeeId || '').trim().toUpperCase() || `EMP-${Date.now().toString().slice(-4)}`;
    const userId = cleanEmpId;
    let mappedRole: 'admin' | 'teamlead' | 'employee' = 'employee';
    if (data.role === 'Admin') mappedRole = 'admin';
    else if (data.role === 'Team Lead') mappedRole = 'teamlead';

    const inviteToken = `inv-${Math.random().toString(36).substring(2, 10)}`;

    const newUser: User = {
      id: userId,
      employeeId: cleanEmpId,
      name: data.name,
      email: data.email.trim().toLowerCase(),
      phone: data.phone,
      department: data.department,
      role: data.role,
      teamLead: data.teamLead,
      status: data.sendEmailInvite ? 'Pending Invitation' : 'Active',
      inviteToken: inviteToken,
      createdAt: new Date().toISOString().split('T')[0]
    };

    const { error } = await supabase.from('users').insert([{
      id: userId,
      name: data.name,
      email: data.email.trim().toLowerCase(),
      phone: data.phone || '',
      department: data.department,
      role: mappedRole,
      status: data.sendEmailInvite ? 'Pending Invitation' : 'Active',
      password: data.password || 'Password123',
      invite_token: inviteToken,
      invite_sent_at: new Date().toISOString(),
    }]);

    if (error) {
      console.error('Supabase addUser error:', error);
      throw new Error(error.message);
    }

    (newUser as any).inviteToken = inviteToken;

    // Dispatch verification & onboarding invitation notification
    try {
      const inviteUrl = 'http://localhost:8000/api/v1/notifications/send-invite';
      const cleanEmail = data.email.trim().toLowerCase();
      let targetPortalUrl = `http://localhost:3000/signup?token=${inviteToken}&email=${encodeURIComponent(cleanEmail)}&role=${mappedRole}`;
      if (mappedRole === 'teamlead') {
        targetPortalUrl = `http://localhost:4174/login?email=${encodeURIComponent(cleanEmail)}`;
      } else if (mappedRole === 'employee') {
        targetPortalUrl = `http://localhost:4173/signin?email=${encodeURIComponent(cleanEmail)}`;
      }

      const notifyResp = await fetch(inviteUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          email: cleanEmail,
          employee_id: cleanEmpId,
          role: data.role,
          department: data.department,
          invite_token: inviteToken,
          signup_url: targetPortalUrl,
          password: data.password || 'Password123'
        })
      });
      if (notifyResp.ok) {
        const notifyData = await notifyResp.json();
        (newUser as any).emailNotification = notifyData;
      }
    } catch (notifyErr) {
      console.warn('Could not dispatch invitation notification:', notifyErr);
    }

    return newUser;
  },

  async resendInvite(user: { name: string; email: string; employeeId?: string; role?: string; department?: string; inviteToken?: string; password?: string }) {
    const inviteUrl = 'http://localhost:8000/api/v1/notifications/send-invite';
    let token = user.inviteToken;
    const cleanEmail = user.email.trim().toLowerCase();
    if (!token) {
      token = `inv-${Math.random().toString(36).substring(2, 10)}`;
      await supabase.from('users').update({ invite_token: token, invite_sent_at: new Date().toISOString() }).eq('email', cleanEmail);
    }
    const roleNorm = (user.role || 'employee').toLowerCase().replace(' ', '');
    let signupUrl = `http://localhost:3000/signup?token=${token}&email=${encodeURIComponent(cleanEmail)}&role=${roleNorm}`;
    if (roleNorm.includes('teamlead') || roleNorm.includes('lead')) {
      signupUrl = `http://localhost:4174/login?email=${encodeURIComponent(cleanEmail)}`;
    } else if (roleNorm.includes('employee') || roleNorm.includes('emp')) {
      signupUrl = `http://localhost:4173/signin?email=${encodeURIComponent(cleanEmail)}`;
    }

    const resp = await fetch(inviteUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: user.name,
        email: cleanEmail,
        employee_id: user.employeeId || '',
        role: user.role || 'Employee',
        department: user.department || 'IT Support',
        invite_token: token,
        signup_url: signupUrl,
        password: user.password || 'Password123'
      })
    });
    return await resp.json();
  },

  async manuallyActivateUser(userId: string) {
    const { error } = await supabase
      .from('users')
      .update({
        status: 'Active',
        invite_token: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);
    if (error) throw new Error(error.message);
    return { success: true };
  },

  async getSmtpStatus() {
    try {
      const resp = await fetch('http://localhost:8000/api/v1/notifications/smtp-status');
      if (resp.ok) return await resp.json();
    } catch {}
    return {
      is_configured: false,
      has_password: false,
      instructions: 'Backend notification server is starting or unreachable.'
    };
  },

  async updateSmtpConfig(config: any) {
    const resp = await fetch('http://localhost:8000/api/v1/notifications/smtp-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
    return await resp.json();
  },

  async testSmtp(testEmail: string) {
    const resp = await fetch('http://localhost:8000/api/v1/notifications/smtp-test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test_email: testEmail })
    });
    return await resp.json();
  },

  async getTickets(filterType?: string): Promise<Ticket[]> {
    try {
      const { data: dbTickets, error } = await supabase
        .from('tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && dbTickets) {
        const mapped: Ticket[] = dbTickets.map((t: any) => ({
          id: t.id,
          ticketNumber: t.id,
          title: t.subject || 'No Subject',
          description: t.description || '',
          requesterName: t.employee || 'User',
          requesterEmail: t.employee_email || '',
          assignedTo: t.assigned_agent || 'Unassigned',
          assignedTeamLead: t.assigned_by || 'Kotesh Goud (IT Support Team Lead)',
          department: t.department || 'IT Support',
          category: t.category || 'General Support',
          priority: t.priority || 'Medium',
          status: t.status || 'Open',
          slaStatus: mapSlaStatus(t.sla_status),
          createdAt: t.created_at ? t.created_at.replace('T', ' ').slice(0, 16) : '',
          updatedAt: t.updated_at ? t.updated_at.replace('T', ' ').slice(0, 16) : '',
          dueDate: t.created_at ? t.created_at.replace('T', ' ').slice(0, 16) : '',
          attachments: t.attachments || [],
        }));

        if (!filterType || filterType === 'all') return mapped;
        if (filterType === 'open') return mapped.filter(t => (t.status || '').toLowerCase() === 'open');
        if (filterType === 'escalated') return mapped.filter(t => (t.status || '').toLowerCase() === 'escalated');
        if (filterType === 'sla-risk') return mapped.filter(t => (t.slaStatus || '').toLowerCase().includes('risk'));
        if (filterType === 'sla-breached') return mapped.filter(t => (t.slaStatus || '').toLowerCase().includes('breach'));
        return mapped;
      }
    } catch (e) {
      console.error('Supabase getTickets error:', e);
    }
    return [];
  },

  async getTicketById(idOrNum: string): Promise<Ticket | null> {
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('id', idOrNum)
        .maybeSingle();

      if (!error && data) {
        // Fetch comments and activities for ticket
        const { data: dbActivities } = await supabase
          .from('ticket_activities')
          .select('*')
          .eq('ticket_id', idOrNum)
          .order('timestamp', { ascending: false });

        return {
          id: data.id,
          ticketNumber: data.id,
          title: data.subject || 'No Subject',
          description: data.description || '',
          requesterName: data.employee || 'User',
          requesterEmail: data.employee_email || '',
          assignedTo: data.assigned_agent || 'Unassigned',
          assignedTeamLead: data.assigned_by || 'Kotesh Goud (IT Support Team Lead)',
          department: data.department || 'IT Support',
          category: data.category || 'General Support',
          priority: data.priority || 'Medium',
          status: data.status || 'Open',
          slaStatus: mapSlaStatus(data.sla_status),
          createdAt: data.created_at ? data.created_at.replace('T', ' ').slice(0, 16) : '',
          updatedAt: data.updated_at ? data.updated_at.replace('T', ' ').slice(0, 16) : '',
          dueDate: data.created_at ? data.created_at.replace('T', ' ').slice(0, 16) : '',
          attachments: data.attachments || [],
          history: (dbActivities || []).map((a: any) => ({
            id: a.id,
            author: a.user,
            text: a.action,
            timestamp: a.timestamp ? a.timestamp.replace('T', ' ').slice(0, 16) : '',
          })),
        };
      }
    } catch (e) {
      console.error('Supabase getTicketById error:', e);
    }
    return null;
  },

  async createTicket(data: {
    title: string;
    category: string;
    department: any;
    departments?: string[];
    priority: any;
    description: string;
    attachments?: string[];
    assignedTeamLead?: string;
    teamLeads?: { id: string; name: string; role: string; employeeId: string; email: string }[];
    employees?: { id: string; name: string; role: string; employeeId: string; email: string }[];
  }): Promise<Ticket> {
    const nextNum = Math.floor(1000 + Math.random() * 9000);
    const ticketId = `TKT-${nextNum}`;

    const sessionUser = getCurrentSessionUser();
    const creatorName = (sessionUser?.name && sessionUser.name.trim()) ? sessionUser.name.trim() : 'Administrator';
    const creatorEmail = (sessionUser?.email && sessionUser.email.trim()) ? sessionUser.email.trim() : 'admin@platform.local';

    const now = new Date();
    const formatted = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const teamLeadSummary = data.teamLeads && data.teamLeads.length > 0
      ? data.teamLeads.map((tl) => `${tl.name} (${tl.role})`).join(', ')
      : data.assignedTeamLead || 'Kotesh Goud (IT Support Team Lead)';

    const employeeSummary = data.employees && data.employees.length > 0
      ? data.employees.map((emp) => `${emp.name} (${emp.employeeId})`).join(', ')
      : 'Unassigned';

    const newTicket: Ticket = {
      id: ticketId,
      ticketNumber: ticketId,
      title: data.title,
      description: data.description,
      requesterName: creatorName,
      requesterEmail: creatorEmail,
      assignedTo: employeeSummary !== 'Unassigned' ? employeeSummary : 'Unassigned',
      assignedTeamLead: teamLeadSummary,
      department: data.department || 'IT Support',
      departments: data.departments,
      category: data.category || 'General Support',
      priority: data.priority || 'Medium',
      status: 'Open',
      slaStatus: 'Normal',
      createdAt: formatted,
      updatedAt: formatted,
      dueDate: formatted,
      attachments: data.attachments || [],
      teamLeads: data.teamLeads,
      employees: data.employees,
      history: [
        {
          id: `h-${Date.now()}-1`,
          author: creatorName,
          text: 'Ticket created.',
          timestamp: formatted,
        },
      ],
    };

    // Stored directly in Supabase Database
    const { error: insError } = await supabase.from('tickets').insert([{
      id: ticketId,
      subject: data.title,
      description: data.description,
      employee: creatorName,
      employee_email: creatorEmail,
      department: data.department || 'IT Support',
      category: data.category || 'General Support',
      priority: data.priority || 'Medium',
      status: 'Open',
      assigned_agent: employeeSummary !== 'Unassigned' ? employeeSummary : 'Unassigned',
      assigned_by: teamLeadSummary,
      sla_status: 'Within SLA',
      sla_remaining: '8h 00m remaining',
      departments: data.departments || [],
    }]);

    if (insError) {
      console.error('Supabase insert ticket error:', insError);
      throw new Error(insError.message);
    }

    // Insert attachments into ticket_attachments table if provided
    if (data.attachments && data.attachments.length > 0) {
      const attRows = data.attachments.map((attStr, idx) => ({
        id: `att-${Date.now()}-${idx}`,
        ticket_id: ticketId,
        name: attStr.split(' (')[0] || attStr,
        size: (attStr.includes('(') ? attStr.split('(')[1].replace(')', '') : 'N/A'),
        url: '',
      }));
      supabase.from('ticket_attachments').insert(attRows).then(() => {});
    }

    // Log initial activity in background without blocking user
    supabase.from('ticket_activities').insert([{
      id: `act-${Date.now()}`,
      ticket_id: ticketId,
      user: creatorName,
      action: 'Ticket created',
      timestamp: new Date().toISOString(),
    }]).then(() => {});

    return newTicket;
  },

  async updateTicket(
    ticketId: string,
    updates: Partial<Ticket>,
    activityNote?: string
  ): Promise<Ticket> {
    const dbUpdates: Record<string, any> = {};
    if (updates.title) dbUpdates.subject = updates.title;
    if (updates.description) dbUpdates.description = updates.description;
    if (updates.status) dbUpdates.status = updates.status;
    if (updates.priority) dbUpdates.priority = updates.priority;
    if (updates.assignedTo) dbUpdates.assigned_agent = updates.assignedTo;
    if (updates.department) dbUpdates.department = updates.department;

    if (Object.keys(dbUpdates).length > 0) {
      const { error } = await supabase.from('tickets').update(dbUpdates).eq('id', ticketId);
      if (error) console.error('Supabase update ticket error:', error);
    }

    const sessionUser = getCurrentSessionUser();
    const actorName = sessionUser?.name || 'Administrator';

    if (activityNote) {
      await supabase.from('ticket_activities').insert([{
        id: `act-${Date.now()}`,
        ticket_id: ticketId,
        user: actorName,
        action: activityNote,
        timestamp: new Date().toISOString(),
      }]);
    }

    const reloaded = await this.getTicketById(ticketId);
    if (reloaded) return reloaded;

    return {
      id: ticketId,
      ticketNumber: ticketId,
      title: updates.title || 'Ticket',
      description: updates.description || '',
      requesterName: updates.requesterName || actorName,
      requesterEmail: updates.requesterEmail || '',
      assignedTo: updates.assignedTo || 'Unassigned',
      department: updates.department || 'IT Support',
      category: updates.category || 'General',
      priority: updates.priority || 'Medium',
      status: updates.status || 'Open',
      slaStatus: mapSlaStatus(updates.slaStatus),
      createdAt: updates.createdAt || '',
      updatedAt: new Date().toISOString(),
      dueDate: '',
      attachments: updates.attachments || [],
      history: updates.history || [],
    };
  },

  async addComment(ticketId: string, text: string, attachmentName?: string): Promise<Ticket | null> {
    const sessionUser = getCurrentSessionUser();
    const author = sessionUser?.name || 'User';

    await supabase.from('ticket_activities').insert([{
      id: `act-${Date.now()}`,
      ticket_id: ticketId,
      user: author,
      action: text,
      timestamp: new Date().toISOString(),
    }]);

    await supabase.from('ticket_comments').insert([{
      id: `comm-${Date.now()}`,
      ticket_id: ticketId,
      author_name: author,
      author_role: sessionUser?.role || 'admin',
      message: text,
      created_at: new Date().toISOString(),
    }]);

    return this.getTicketById(ticketId);
  },

  async addAttachment(ticketId: string, fileName: string): Promise<Ticket | null> {
    const sessionUser = getCurrentSessionUser();
    const author = sessionUser?.name || 'User';

    await supabase.from('ticket_activities').insert([{
      id: `act-${Date.now()}`,
      ticket_id: ticketId,
      user: author,
      action: `Uploaded attachment: ${fileName}`,
      timestamp: new Date().toISOString(),
    }]);

    return this.getTicketById(ticketId);
  },
};
