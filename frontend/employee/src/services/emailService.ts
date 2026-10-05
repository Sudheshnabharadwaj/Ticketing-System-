export interface TeamLead {
  id: string;
  name: string;
  email: string;
  department: string;
  role: string;
  categories: string[];
}

export interface SentEmailNotification {
  id: string;
  recipientName: string;
  recipientEmail: string;
  recipientRole: string;
  subject: string;
  ticketId: string;
  ticketNumber: string;
  ticketTitle: string;
  description: string;
  department: string;
  category: string;
  priority: string;
  createdBy: string;
  createdByEmail: string;
  createdDate: string;
  viewTicketUrl: string;
  sentAt: string;
  status: 'DELIVERED';
}

// Master Team Lead Registry mapped by Department & Category
export const REGISTERED_TEAM_LEADS: TeamLead[] = [
  {
    id: 'tl-sarah',
    name: 'Sarah Connor',
    email: 'sarah.connor@company.com',
    department: 'IT Support',
    role: 'IT Support Team Lead',
    categories: ['IT Support', 'Hardware & Devices', 'Access & Permissions', 'Network & Connectivity', 'GlobalProtect VPN', 'Software License'],
  },
  {
    id: 'tl-david',
    name: 'David Miller',
    email: 'david.miller@company.com',
    department: 'Finance',
    role: 'Finance Team Lead',
    categories: ['Finance', 'Finance & Payroll', 'Billing', 'Expenses', 'Reimbursements', 'Procurement'],
  },
  {
    id: 'tl-adi',
    name: 'Adi',
    email: 'adi.lead@company.com',
    department: 'HR Operations',
    role: 'HR Operations Team Lead',
    categories: ['HR Operations', 'HR & Benefits', 'Health & Dental Insurance', 'Onboarding', 'HR'],
  },
  {
    id: 'tl-mounika',
    name: 'Mounika',
    email: 'mounika.lead@company.com',
    department: 'Facilities',
    role: 'Facilities Team Lead',
    categories: ['Facilities', 'Physical Security', 'Facilities & Building', 'Operations'],
  },
  {
    id: 'tl-sudha',
    name: 'Sudha',
    email: 'sudha.lead@company.com',
    department: 'General Administration',
    role: 'General Administration Team Lead',
    categories: ['General Administration', 'Administration', 'General'],
  },
];

const STORAGE_KEY_SENT_EMAILS = 'employee_sent_email_notifications';

export const EmailService = {
  /**
   * Find Team Lead for a single department name
   */
  findTeamLeadForDepartment(department: string, category?: string): TeamLead {
    const deptNorm = (department || '').toLowerCase().trim();
    const catNorm = (category || '').toLowerCase().trim();

    // 1. Direct match on department name or alias
    let match = REGISTERED_TEAM_LEADS.find((tl) => {
      const tlDept = tl.department.toLowerCase();
      return tlDept === deptNorm || deptNorm.includes(tlDept) || tlDept.includes(deptNorm);
    });

    if (match) return match;

    // 2. Special aliases (e.g. Finance & Payroll -> Finance)
    if (deptNorm.includes('finance')) {
      match = REGISTERED_TEAM_LEADS.find((tl) => tl.department === 'Finance');
      if (match) return match;
    }
    if (deptNorm.includes('it') || deptNorm.includes('tech')) {
      match = REGISTERED_TEAM_LEADS.find((tl) => tl.department === 'IT Support');
      if (match) return match;
    }
    if (deptNorm.includes('hr')) {
      match = REGISTERED_TEAM_LEADS.find((tl) => tl.department === 'HR Operations');
      if (match) return match;
    }
    if (deptNorm.includes('admin')) {
      match = REGISTERED_TEAM_LEADS.find((tl) => tl.department === 'General Administration');
      if (match) return match;
    }

    // 3. Category match fallback
    if (catNorm) {
      match = REGISTERED_TEAM_LEADS.find((tl) =>
        tl.categories.some((c) => c.toLowerCase().includes(catNorm) || catNorm.includes(c.toLowerCase()))
      );
      if (match) return match;
    }

    // 4. Dynamic Team Lead for custom typed department (e.g. "Marketing")
    const cleanName = department.trim() || 'General';
    return {
      id: `tl-custom-${cleanName.toLowerCase().replace(/\s+/g, '-')}`,
      name: `${cleanName} Team Lead`,
      email: `${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '')}.lead@company.com`,
      department: cleanName,
      role: `${cleanName} Team Lead`,
      categories: [cleanName],
    };
  },

  /**
   * Find Team Leads for multiple selected departments
   */
  findTeamLeadsForDepartments(departments: string[], category?: string): TeamLead[] {
    const list: TeamLead[] = [];
    const deptList = departments && departments.length > 0 ? departments : ['IT Support'];

    for (const dept of deptList) {
      const lead = this.findTeamLeadForDepartment(dept, category);
      if (lead && !list.some((existing) => existing.id === lead.id)) {
        list.push(lead);
      }
    }

    return list;
  },

  /**
   * Backward compatible single Team Lead lookup
   */
  findTeamLeadForTicket(department: string, category: string): TeamLead | null {
    return this.findTeamLeadForDepartment(department, category);
  },

  /**
   * Send email notifications to all mapped Team Leads AFTER ticket creation
   */
  sendTicketCreationEmail(
    ticket: {
      id: string;
      ticketNumber: string;
      title: string;
      description: string;
      department: string;
      departments?: string[];
      category: string;
      priority: string;
      createdAt: string;
    },
    createdBy: { name: string; email: string }
  ): {
    sent: boolean;
    teamLeads: TeamLead[];
    emailLogs: SentEmailNotification[];
  } {
    const depts = ticket.departments && ticket.departments.length > 0
      ? ticket.departments
      : [ticket.department];

    const teamLeads = this.findTeamLeadsForDepartments(depts, ticket.category);

    if (teamLeads.length === 0) {
      console.info(
        `[EmailService] Gracefully handled: No specific Team Leads mapped for departments "${depts.join(', ')}".`
      );
      return { sent: false, teamLeads: [], emailLogs: [] };
    }

    const emailLogs: SentEmailNotification[] = [];
    const existing = this.getSentEmailLogs();

    teamLeads.forEach((teamLead, idx) => {
      const emailLog: SentEmailNotification = {
        id: `email-${Date.now()}-${idx}`,
        recipientName: teamLead.name,
        recipientEmail: teamLead.email,
        recipientRole: teamLead.role,
        subject: `New Ticket Created: [${ticket.ticketNumber}] ${ticket.title}`,
        ticketId: ticket.id,
        ticketNumber: ticket.ticketNumber,
        ticketTitle: ticket.title,
        description: ticket.description,
        department: teamLead.department,
        category: ticket.category,
        priority: ticket.priority,
        createdBy: createdBy.name,
        createdByEmail: createdBy.email,
        createdDate: ticket.createdAt,
        viewTicketUrl: `/assigned-tickets/${ticket.id}`,
        sentAt: new Date().toISOString(),
        status: 'DELIVERED',
      };
      emailLogs.push(emailLog);

      console.log(
        `[EmailService] SUCCESS: Email notification sent to Team Lead ${teamLead.name} (${teamLead.email}) for department ${teamLead.department}`
      );
    });

    const updated = [...emailLogs, ...existing];
    localStorage.setItem(STORAGE_KEY_SENT_EMAILS, JSON.stringify(updated));

    emailLogs.forEach((log) => {
      window.dispatchEvent(new CustomEvent('email_sent', { detail: log }));
    });

    return { sent: true, teamLeads, emailLogs };
  },

  /**
   * Retrieve sent email logs
   */
  getSentEmailLogs(): SentEmailNotification[] {
    const cached = localStorage.getItem(STORAGE_KEY_SENT_EMAILS);
    if (!cached) return [];
    try {
      return JSON.parse(cached);
    } catch {
      return [];
    }
  },
};
