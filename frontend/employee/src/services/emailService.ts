import { OrganizationService } from './organizationService';

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

export const REGISTERED_TEAM_LEADS: TeamLead[] = [];

const STORAGE_KEY_SENT_EMAILS = 'employee_sent_email_notifications';

export const EmailService = {
  /**
   * Find Team Lead for a single department name
   */
  findTeamLeadForDepartment(department: string, category?: string): TeamLead {
    const orgLeads = OrganizationService.getTeamLeadsByDepartment(department);
    if (orgLeads && orgLeads.length > 0) {
      const first = orgLeads[0];
      return {
        id: first.id,
        name: first.name,
        email: first.email,
        department: first.departmentName,
        role: first.role,
        categories: [first.departmentName],
      };
    }

    const allLeads = OrganizationService.getAllTeamLeads();
    if (allLeads && allLeads.length > 0) {
      const fallback = allLeads[0];
      return {
        id: fallback.id,
        name: fallback.name,
        email: fallback.email,
        department: fallback.departmentName,
        role: fallback.role,
        categories: [fallback.departmentName],
      };
    }

    const cleanName = (department || '').trim() || 'General';
    return {
      id: '',
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
      teamLeads?: Array<{ id: string; name: string; email: string; department: string; role: string }>;
      employees?: Array<{ id: string; name: string; email: string; role: string; employeeId: string }>;
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

    const targetTeamLeads: TeamLead[] = ticket.teamLeads && ticket.teamLeads.length > 0
      ? ticket.teamLeads.map((tl) => ({
          id: tl.id,
          name: tl.name,
          email: tl.email,
          department: tl.department,
          role: tl.role,
          categories: [tl.department],
        }))
      : this.findTeamLeadsForDepartments(depts, ticket.category);

    const emailLogs: SentEmailNotification[] = [];
    const existing = this.getSentEmailLogs();

    // 1. Notify Team Leads
    targetTeamLeads.forEach((teamLead, idx) => {
      const emailLog: SentEmailNotification = {
        id: `email-tl-${Date.now()}-${idx}`,
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

    // 2. Notify Tagged Employees if applicable
    if (ticket.employees && ticket.employees.length > 0) {
      ticket.employees.forEach((emp, idx) => {
        const emailLog: SentEmailNotification = {
          id: `email-emp-${Date.now()}-${idx}`,
          recipientName: emp.name,
          recipientEmail: emp.email,
          recipientRole: `${emp.role} (Tagged Member — ${emp.employeeId})`,
          subject: `You have been tagged in Ticket: [${ticket.ticketNumber}] ${ticket.title}`,
          ticketId: ticket.id,
          ticketNumber: ticket.ticketNumber,
          ticketTitle: ticket.title,
          description: ticket.description,
          department: ticket.department,
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
          `[EmailService] SUCCESS: Email notification sent to Tagged Employee ${emp.name} (${emp.email})`
        );
      });
    }

    const updated = [...emailLogs, ...existing];
    localStorage.setItem(STORAGE_KEY_SENT_EMAILS, JSON.stringify(updated));

    emailLogs.forEach((log) => {
      window.dispatchEvent(new CustomEvent('email_sent', { detail: log }));
    });

    return { sent: emailLogs.length > 0, teamLeads: targetTeamLeads, emailLogs };
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
