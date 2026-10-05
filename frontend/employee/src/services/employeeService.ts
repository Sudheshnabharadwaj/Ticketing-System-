import type { EmployeeTicket, EmployeeProfile, EmployeeNotificationItem, TicketPriority, TicketStatus, AssignedTeamLead } from '../types';
import { EmailService } from './emailService';

const INITIAL_EMPLOYEE_TICKETS: EmployeeTicket[] = [
  // 1. Assigned Tickets (Assigned to Employee by Team Lead)
  {
    id: 'emp-t-3001',
    ticketNumber: 'TICK-3001',
    title: 'Investigate APAC Region VPN Connectivity Drops',
    description: 'Multiple remote employees in the APAC region report intermittent packet loss and disconnects on GlobalProtect gateway apac-vpn.company.com.',
    category: 'Network & Connectivity',
    subCategory: 'GlobalProtect VPN',
    department: 'IT Support',
    priority: 'High',
    status: 'In Progress',
    createdAt: '2026-09-25 08:00',
    updatedAt: '2026-09-25 09:15',
    assignedTo: 'Manikanta (You)',
    assignedBy: 'Sudha (Team Lead)',
    assignedDate: '2026-09-25 08:30',
    sla: '3h 45m remaining',
    attachments: ['gateway_logs_apac.log'],
    history: [
      {
        id: 'h1',
        author: 'System',
        text: 'Ticket created and routed to IT Support queue.',
        timestamp: '2026-09-25 08:00',
      },
      {
        id: 'h2',
        author: 'Sudha (Team Lead)',
        text: 'Assigned ticket to Manikanta for technical diagnostic and network route tracing.',
        timestamp: '2026-09-25 08:30',
      },
      {
        id: 'h3',
        author: 'Manikanta (You)',
        text: 'Began analyzing gateway logs. Initiated ping trace to Singapore pop server.',
        timestamp: '2026-09-25 09:15',
      },
    ],
  },
  {
    id: 'emp-t-3002',
    ticketNumber: 'TICK-3002',
    title: 'Provision Workday & ADP Accounts for Q4 HR Cohort',
    description: 'Configure role-based access control, SSO permissions, and cost center routing for 5 new HR specialists joining next Monday.',
    category: 'Access & Permissions',
    subCategory: 'Software License',
    department: 'HR Operations',
    priority: 'Medium',
    status: 'Open',
    createdAt: '2026-09-24 13:45',
    updatedAt: '2026-09-24 14:00',
    assignedTo: 'Manikanta (You)',
    assignedBy: 'Kotesh (Team Lead)',
    assignedDate: '2026-09-24 14:00',
    sla: 'On Track (14h remaining)',
    attachments: ['onboarding_cohort_list.xlsx'],
    history: [
      {
        id: 'h1',
        author: 'Kotesh (Team Lead)',
        text: 'Assigned onboarding ticket to Manikanta.',
        timestamp: '2026-09-24 14:00',
      },
    ],
  },
  {
    id: 'emp-t-3003',
    ticketNumber: 'TICK-3003',
    title: 'Quarterly Hardware Inventory Audit & Firmware Upgrades',
    description: 'Perform serial number verification and macOS Sequoia patch updates across 25 laptops in Building A, Desk 400-425.',
    category: 'Hardware & Devices',
    subCategory: 'Laptop / Desktop Diagnostic',
    department: 'IT Support',
    priority: 'Low',
    status: 'Resolved',
    createdAt: '2026-09-22 09:00',
    updatedAt: '2026-09-23 16:30',
    assignedTo: 'Manikanta (You)',
    assignedBy: 'Adi (Team Lead)',
    assignedDate: '2026-09-22 10:15',
    sla: 'Completed (Within SLA)',
    attachments: ['audit_checklist_q3.pdf'],
    resolutionNotes: 'Hardware inventory audit completed successfully. All 25 devices verified, patched, and tagged with modern asset labels.',
    history: [
      {
        id: 'h1',
        author: 'Adi (Team Lead)',
        text: 'Assigned hardware audit task to Manikanta.',
        timestamp: '2026-09-22 10:15',
      },
      {
        id: 'h2',
        author: 'Manikanta (You)',
        text: 'Completed desk-by-desk audit and uploaded verified asset report.',
        timestamp: '2026-09-23 16:30',
      },
    ],
  },

  // 2. My Created Tickets (Submitted by Employee)
  {
    id: 'emp-t-2001',
    ticketNumber: 'TICK-2001',
    title: 'Laptop Battery Draining Rapidly & Overheating',
    description: 'My MacBook Pro battery drops from 100% to 20% in less than an hour and runs excessively hot when running Docker containers and development tools.',
    category: 'Hardware & Devices',
    subCategory: 'Battery & Power Charger',
    department: 'IT Support',
    priority: 'High',
    status: 'In Progress',
    createdAt: '2026-09-24 09:15',
    updatedAt: '2026-09-25 08:30',
    history: [
      {
        id: 'h1',
        author: 'Manikanta (You)',
        text: 'Submitted hardware diagnostic request.',
        timestamp: '2026-09-24 09:15',
      },
      {
        id: 'h2',
        author: 'Adi (IT Support)',
        text: 'Battery health report reviewed. Diagnostics confirmed degraded capacity. Replacement battery ordered.',
        timestamp: '2026-09-25 08:30',
      },
    ],
  },
  {
    id: 'emp-t-2002',
    ticketNumber: 'TICK-2002',
    title: 'Request Access to Figma Enterprise Workspace',
    description: 'Need seat license for Figma Enterprise workspace to collaborate with the Product & Engineering team on Q4 UI redesigns.',
    category: 'Access & Permissions',
    subCategory: 'Software License',
    department: 'IT Support',
    priority: 'Medium',
    status: 'Open',
    createdAt: '2026-09-25 09:00',
    updatedAt: '2026-09-25 09:00',
    history: [
      {
        id: 'h1',
        author: 'Manikanta (You)',
        text: 'Submitted license allocation request.',
        timestamp: '2026-09-25 09:00',
      },
    ],
  },
  {
    id: 'emp-t-2003',
    ticketNumber: 'TICK-2003',
    title: 'Quarterly Dental Insurance Claim Submission',
    description: 'Claim form and itemized receipt submitted for routine dental checkup reimbursement under Cigna policy.',
    category: 'HR & Benefits',
    subCategory: 'Health & Dental Insurance',
    department: 'HR Operations',
    priority: 'Low',
    status: 'Pending',
    createdAt: '2026-09-21 11:30',
    updatedAt: '2026-09-22 14:10',
    history: [
      {
        id: 'h1',
        author: 'Manikanta (You)',
        text: 'Uploaded claim receipt documents.',
        timestamp: '2026-09-21 11:30',
      },
      {
        id: 'h2',
        author: 'Sudha (HR Admin)',
        text: 'Claim forwarded to insurance carrier for verification.',
        timestamp: '2026-09-22 14:10',
      },
    ],
  },
  {
    id: 'emp-t-2004',
    ticketNumber: 'TICK-2004',
    title: 'VPN Client Certificate Renewal for Remote Access',
    description: 'GlobalProtect SSL client certificate expired preventing home office VPN connection to internal development staging servers.',
    category: 'Network & Connectivity',
    subCategory: 'GlobalProtect VPN',
    department: 'IT Support',
    priority: 'High',
    status: 'Resolved',
    createdAt: '2026-09-18 14:20',
    updatedAt: '2026-09-19 10:45',
    history: [
      {
        id: 'h1',
        author: 'Manikanta (You)',
        text: 'Submitted ticket for VPN cert issue.',
        timestamp: '2026-09-18 14:20',
      },
      {
        id: 'h2',
        author: 'Adi (IT Support)',
        text: 'Pushed renewed security certificate to device profile via MDM.',
        timestamp: '2026-09-19 10:45',
      },
    ],
  },
];

const INITIAL_NOTIFICATIONS: EmployeeNotificationItem[] = [
  {
    id: 'n1',
    ticketId: 'emp-t-3001',
    ticketNumber: 'TICK-3001',
    title: 'New Ticket Assigned by Team Lead',
    category: 'New ticket assigned',
    time: '20m ago',
    date: '2026-09-25 08:30',
    isRead: false,
    message: 'Sudha (Team Lead) assigned ticket #TICK-3001 "Investigate APAC Region VPN Connectivity Drops" to you.',
  },
  {
    id: 'n2',
    ticketId: 'emp-t-2001',
    ticketNumber: 'TICK-2001',
    title: 'Ticket Status Updated to In Progress',
    category: 'Ticket status changed',
    time: '1h ago',
    date: '2026-09-25 08:30',
    isRead: false,
    message: 'IT Support updated status of your ticket #TICK-2001 to In Progress.',
  },
  {
    id: 'n3',
    ticketId: 'emp-t-3001',
    ticketNumber: 'TICK-3001',
    title: 'SLA Risk Alert: 3h 45m Remaining',
    category: 'SLA notification',
    time: '2h ago',
    date: '2026-09-25 07:15',
    isRead: false,
    message: 'Ticket #TICK-3001 resolution deadline is approaching SLA limit.',
  },
  {
    id: 'n4',
    ticketId: 'emp-t-2003',
    ticketNumber: 'TICK-2003',
    title: 'New Comment on Dental Insurance Claim',
    category: 'New comment',
    time: '1d ago',
    date: '2026-09-24 14:10',
    isRead: true,
    message: 'Sudha (HR Admin) commented on ticket #TICK-2003.',
  },
  {
    id: 'n5',
    ticketId: 'emp-t-2004',
    ticketNumber: 'TICK-2004',
    title: 'Ticket #TICK-2004 Marked as Resolved',
    category: 'Ticket resolved',
    time: '2d ago',
    date: '2026-09-23 10:45',
    isRead: true,
    message: 'VPN Client Certificate Renewal ticket resolved successfully.',
  },
];

export const INITIAL_EMPLOYEE_PROFILE: EmployeeProfile = {
  name: 'Manikanta',
  email: 'manikanta.k@company.com',
  employeeId: 'EMP-8842',
  department: 'Human Resources',
  role: 'Employee',
  phone: '+1 (555) 018-3342',
  avatarUrl: '',
};

const STORAGE_KEY_TICKETS = 'employee_standalone_tickets';
const STORAGE_KEY_PROFILE = 'employee_standalone_profile';
const STORAGE_KEY_NOTIFS = 'employee_standalone_notifs';

export const EmployeeService = {
  getTickets(): EmployeeTicket[] {
    const cached = localStorage.getItem(STORAGE_KEY_TICKETS);
    if (!cached) {
      localStorage.setItem(STORAGE_KEY_TICKETS, JSON.stringify(INITIAL_EMPLOYEE_TICKETS));
      return INITIAL_EMPLOYEE_TICKETS;
    }
    try {
      return JSON.parse(cached);
    } catch {
      return INITIAL_EMPLOYEE_TICKETS;
    }
  },

  getAssignedTickets(): EmployeeTicket[] {
    const tickets = this.getTickets();
    return tickets.filter((t) => !!t.assignedBy || t.assignedTo === 'Manikanta (You)');
  },

  getMyTickets(): EmployeeTicket[] {
    const tickets = this.getTickets();
    return tickets.filter((t) => !t.assignedBy && t.assignedTo !== 'Manikanta (You)');
  },

  getTicketById(idOrNum: string): EmployeeTicket | undefined {
    const tickets = this.getTickets();
    return tickets.find((t) => t.id === idOrNum || t.ticketNumber === idOrNum);
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
  }): EmployeeTicket {
    const tickets = this.getTickets();
    const nextNum = 2001 + tickets.length;
    const now = new Date();
    const formatted = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const selectedDepts = data.departments && data.departments.length > 0
      ? data.departments
      : [data.department || 'IT Support'];
    const mainDepartmentStr = selectedDepts.join(' & ');

    // Automatically identify or use selected Team Leads
    const teamLeads: AssignedTeamLead[] = data.teamLeads && data.teamLeads.length > 0
      ? data.teamLeads
      : EmailService.findTeamLeadsForDepartments(selectedDepts, data.category).map((tl) => ({
          id: tl.id,
          name: tl.name,
          email: tl.email,
          department: tl.department,
          role: tl.role,
        }));

    const routingSummaryText = teamLeads.length > 0
      ? `Ticket automatically routed to ${teamLeads.map((tl) => `${tl.department} (${tl.name} — ${tl.role})`).join(' and ')}.`
      : `Ticket created and routed to ${mainDepartmentStr}.`;

    const newTicket: EmployeeTicket = {
      id: `emp-t-${Date.now()}`,
      ticketNumber: `TICK-${nextNum}`,
      title: data.title,
      description: data.description,
      category: data.category,
      subCategory: data.subCategory || 'General Support',
      department: mainDepartmentStr,
      departments: selectedDepts,
      teamLeads: teamLeads.map((tl) => ({
        id: tl.id,
        name: tl.name,
        email: tl.email,
        department: tl.department,
        role: tl.role,
      })),
      priority: data.priority,
      status: 'Open',
      createdAt: formatted,
      updatedAt: formatted,
      attachments: data.attachments || [],
      history: [
        {
          id: `h-${Date.now()}-1`,
          author: 'Manikanta (You)',
          text: 'Ticket created.',
          timestamp: formatted,
        },
        {
          id: `h-${Date.now()}-2`,
          author: 'System Routing Engine',
          text: routingSummaryText,
          timestamp: formatted,
        },
      ],
    };

    const updated = [newTicket, ...tickets];
    localStorage.setItem(STORAGE_KEY_TICKETS, JSON.stringify(updated));

    // Send email notifications to all identified Team Leads
    const profile = this.getProfile();
    EmailService.sendTicketCreationEmail(newTicket, {
      name: profile.name,
      email: profile.email,
    });

    // Send dashboard notifications to both / all identified Team Leads
    const currentNotifs = this.getNotifications();
    const newDashboardNotifs: EmployeeNotificationItem[] = teamLeads.map((tl, idx) => ({
      id: `n-${Date.now()}-${idx}`,
      ticketId: newTicket.id,
      ticketNumber: newTicket.ticketNumber,
      title: `New Ticket Assigned (${tl.department})`,
      category: 'New ticket assigned',
      time: 'Just now',
      date: formatted,
      isRead: false,
      message: `New ticket #${newTicket.ticketNumber} "${newTicket.title}" routed to ${tl.name} (${tl.role}).`,
    }));

    localStorage.setItem(STORAGE_KEY_NOTIFS, JSON.stringify([...newDashboardNotifs, ...currentNotifs]));

    return newTicket;
  },

  updateTicketStatus(ticketId: string, newStatus: TicketStatus, note?: string): EmployeeTicket | null {
    const tickets = this.getTickets();
    const target = tickets.find((t) => t.id === ticketId || t.ticketNumber === ticketId);
    if (!target) return null;

    const oldStatus = target.status;
    target.status = newStatus;
    const now = new Date();
    const formatted = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    target.updatedAt = formatted;

    if (!target.history) target.history = [];
    target.history.push({
      id: `h-${Date.now()}`,
      author: 'Manikanta (You)',
      text: `Updated status from ${oldStatus} to ${newStatus}.${note ? ` Note: ${note}` : ''}`,
      timestamp: formatted,
    });

    localStorage.setItem(STORAGE_KEY_TICKETS, JSON.stringify(tickets));
    return target;
  },

  resolveTicket(ticketId: string, resolutionNotes: string): EmployeeTicket | null {
    const tickets = this.getTickets();
    const target = tickets.find((t) => t.id === ticketId || t.ticketNumber === ticketId);
    if (!target) return null;

    target.status = 'Resolved';
    target.resolutionNotes = resolutionNotes;
    const now = new Date();
    const formatted = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    target.updatedAt = formatted;

    if (!target.history) target.history = [];
    target.history.push({
      id: `h-${Date.now()}`,
      author: 'Manikanta (You)',
      text: `Marked ticket as Resolved. Resolution: ${resolutionNotes}`,
      timestamp: formatted,
    });

    localStorage.setItem(STORAGE_KEY_TICKETS, JSON.stringify(tickets));
    return target;
  },

  escalateTicket(ticketId: string, reason: string, comment: string): EmployeeTicket | null {
    const tickets = this.getTickets();
    const target = tickets.find((t) => t.id === ticketId || t.ticketNumber === ticketId);
    if (!target) return null;

    target.status = 'Escalated';
    const now = new Date();
    const formatted = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    target.updatedAt = formatted;

    if (!target.history) target.history = [];
    target.history.push({
      id: `h-${Date.now()}`,
      author: 'Manikanta (You)',
      text: `Escalated ticket to ${target.assignedBy || 'Team Lead'}. Reason: ${reason}. Explanation: ${comment}`,
      timestamp: formatted,
    });

    localStorage.setItem(STORAGE_KEY_TICKETS, JSON.stringify(tickets));

    // Also add notification for Team Lead
    const notifs = this.getNotifications();
    const newNotif: EmployeeNotificationItem = {
      id: `n-${Date.now()}`,
      ticketId: target.id,
      ticketNumber: target.ticketNumber,
      title: `Ticket Escalated to ${target.assignedBy || 'Team Lead'}`,
      category: 'Ticket status changed',
      time: 'Just now',
      date: formatted,
      isRead: false,
      message: `Ticket #${target.ticketNumber} was escalated to ${target.assignedBy || 'Team Lead'}. Reason: ${reason}`,
    };
    localStorage.setItem(STORAGE_KEY_NOTIFS, JSON.stringify([newNotif, ...notifs]));

    return target;
  },

  addComment(ticketId: string, text: string, attachmentName?: string): EmployeeTicket | null {
    const tickets = this.getTickets();
    const target = tickets.find((t) => t.id === ticketId || t.ticketNumber === ticketId);
    if (!target) return null;

    const now = new Date();
    const formatted = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    if (!target.history) target.history = [];
    target.history.push({
      id: `h-${Date.now()}`,
      author: 'Manikanta (You)',
      text,
      timestamp: formatted,
      attachment: attachmentName,
    });

    if (attachmentName) {
      if (!target.attachments) target.attachments = [];
      if (!target.attachments.includes(attachmentName)) {
        target.attachments.push(attachmentName);
      }
    }

    target.updatedAt = formatted;
    localStorage.setItem(STORAGE_KEY_TICKETS, JSON.stringify(tickets));
    return target;
  },

  addAttachment(ticketId: string, fileName: string): EmployeeTicket | null {
    const tickets = this.getTickets();
    const target = tickets.find((t) => t.id === ticketId || t.ticketNumber === ticketId);
    if (!target) return null;

    if (!target.attachments) target.attachments = [];
    if (!target.attachments.includes(fileName)) {
      target.attachments.push(fileName);
    }

    const now = new Date();
    const formatted = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    target.updatedAt = formatted;
    if (!target.history) target.history = [];
    target.history.push({
      id: `h-${Date.now()}`,
      author: 'Manikanta (You)',
      text: `Attached file: ${fileName}`,
      timestamp: formatted,
      attachment: fileName,
    });

    localStorage.setItem(STORAGE_KEY_TICKETS, JSON.stringify(tickets));
    return target;
  },

  getNotifications(): EmployeeNotificationItem[] {
    const cached = localStorage.getItem(STORAGE_KEY_NOTIFS);
    if (!cached) {
      localStorage.setItem(STORAGE_KEY_NOTIFS, JSON.stringify(INITIAL_NOTIFICATIONS));
      return INITIAL_NOTIFICATIONS;
    }
    try {
      return JSON.parse(cached);
    } catch {
      return INITIAL_NOTIFICATIONS;
    }
  },

  markNotificationsAsRead(): EmployeeNotificationItem[] {
    const current = this.getNotifications();
    const updated = current.map((n) => ({ ...n, isRead: true }));
    localStorage.setItem(STORAGE_KEY_NOTIFS, JSON.stringify(updated));
    return updated;
  },

  getProfile(): EmployeeProfile {
    const cached = localStorage.getItem(STORAGE_KEY_PROFILE);
    if (!cached) {
      localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(INITIAL_EMPLOYEE_PROFILE));
      return INITIAL_EMPLOYEE_PROFILE;
    }
    try {
      return JSON.parse(cached);
    } catch {
      return INITIAL_EMPLOYEE_PROFILE;
    }
  },

  updateProfile(data: Partial<EmployeeProfile>): EmployeeProfile {
    const current = this.getProfile();
    const updated = { ...current, ...data };
    localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(updated));
    return updated;
  },

  getSummaryStats() {
    const tickets = this.getTickets();
    const myTicketsCount = this.getMyTickets().length;
    const assignedTicketsCount = this.getAssignedTickets().length;
    const open = tickets.filter((t) => t.status === 'Open').length;
    const inProgress = tickets.filter((t) => t.status === 'In Progress').length;
    const pending = tickets.filter((t) => t.status === 'Pending' || t.status === 'Escalated').length;
    const resolved = tickets.filter((t) => t.status === 'Resolved' || t.status === 'Closed').length;

    return { myTicketsCount, assignedTicketsCount, open, inProgress, pending, resolved };
  },
};
