export type UserRole = 'Admin' | 'Team Lead' | 'Employee' | '';

export type UserDepartment = 'IT Support' | 'HR' | 'Finance' | 'Operations' | 'Sales' | 'Marketing' | 'Legal' | 'Facilities' | '';

export type UserStatus = 'Active' | 'Inactive' | 'Pending Invitation';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  department: UserDepartment;
  role: UserRole;
  status: UserStatus;
  avatarUrl?: string;
  createdAt: string;
}

export type TicketPriority = 'Low' | 'Medium' | 'High' | 'Urgent';

export type TicketStatus = 'Open' | 'In Progress' | 'Pending' | 'Escalated' | 'Resolved' | 'Closed';

export type SLAStatus = 'Normal' | 'SLA Risk' | 'SLA Breached';

export interface TicketHistoryItem {
  id: string;
  author: string;
  text: string;
  timestamp: string;
  attachment?: string;
}

export interface Ticket {
  id: string;
  ticketNumber: string;
  title: string;
  description: string;
  requesterName: string;
  requesterEmail: string;
  assignedTo?: string;
  assignedTeamLead?: string;
  department: string;
  departments?: string[];
  category: string;
  priority: TicketPriority;
  status: TicketStatus;
  slaStatus: SLAStatus;
  createdAt: string;
  updatedAt?: string;
  dueDate: string;
  attachments?: string[];
  history?: TicketHistoryItem[];
}

export interface DashboardStats {
  totalTickets: number;
  totalUsers: number;
  openTickets: number;
  escalatedTickets: number;
  slaRiskCount: number;
  slaBreachedCount: number;
  resolvedTodayCount: number;
}

export interface AddUserFormData {
  name: string;
  email: string;
  phone: string;
  department: UserDepartment;
  role: UserRole;
  password?: string;
  userDetails?: string;
  sendEmailInvite: boolean;
}

export interface RolePermission {
  id: string;
  name: string;
  description: string;
  userCount: number;
  permissions: {
    manageUsers: boolean;
    manageTickets: boolean;
    configureWorkflows: boolean;
    viewAnalytics: boolean;
    systemSettings: boolean;
  };
}

export interface TicketCategoryConfig {
  id: string;
  name: string;
  department: UserDepartment;
  defaultPriority: TicketPriority;
  slaHours: number;
}

export interface WorkflowRule {
  id: string;
  name: string;
  triggerEvent: string;
  condition: string;
  action: string;
  isActive: boolean;
}

export interface SecuritySettingsData {
  requireMFA: boolean;
  passwordExpiryDays: number;
  sessionTimeoutMinutes: number;
  ipWhitelistEnabled: boolean;
  whitelistedIPs: string;
  allowedDomains: string;
}
