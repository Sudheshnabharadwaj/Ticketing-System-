/**
 * Organization Service: Canonical Department -> Team Lead -> Employee Service Layer
 * Supports role-based filtering, employee search by Name/ID, and relationship mappings.
 */

import { supabase } from './supabaseClient';

export interface DepartmentItem {
  id: string;
  name: string;
}

export interface TeamLeadItem {
  id: string;
  employeeId: string;
  name: string;
  role: string;
  departmentId: string;
  departmentName: string;
  email: string;
}

export interface EmployeeItem {
  id: string;
  employeeId: string;
  name: string;
  role: string;
  teamLeadId: string;
  departmentId: string;
  departmentName: string;
  email: string;
}

export const DEPARTMENTS: DepartmentItem[] = [
  { id: 'D001', name: 'IT Support' },
  { id: 'D002', name: 'Finance' },
  { id: 'D003', name: 'HR Operations' },
  { id: 'D004', name: 'Facilities' },
  { id: 'D005', name: 'General Administration' },
  { id: 'D006', name: 'Other' },
];

export const TEAM_LEADS: TeamLeadItem[] = [
  // IT Support (D001) - Real Platform Team Leads from Database
  {
    id: 'OKL001',
    employeeId: 'OKL001',
    name: 'Kotesh Goud',
    role: 'IT Support Team Lead',
    departmentId: 'D001',
    departmentName: 'IT Support',
    email: 'kotesh1720@gmail.com',
  },
  {
    id: 'OKL002',
    employeeId: 'OKL002',
    name: 'Kotesh Goud',
    role: 'IT Infrastructure Lead',
    departmentId: 'D001',
    departmentName: 'IT Support',
    email: 'k.ananthu@oklut.com',
  },
  {
    id: 'OKL003',
    employeeId: 'OKL003',
    name: 'Lahari Pedada',
    role: 'IT Operations Team Lead',
    departmentId: 'D001',
    departmentName: 'IT Support',
    email: 'sudheshnasatyanarayana@gmail.com',
  },
  {
    id: 'usr-1791223003549',
    employeeId: 'TL-SUMANA',
    name: 'Sumana Bharadwaj',
    role: 'IT Support Lead',
    departmentId: 'D001',
    departmentName: 'IT Support',
    email: 'sumana@gmail.com',
  },

  // Finance (D002)
  {
    id: 'TL003',
    employeeId: 'TL003',
    name: 'David Miller',
    role: 'Finance Team Lead',
    departmentId: 'D002',
    departmentName: 'Finance',
    email: 'david.miller@company.com',
  },
  {
    id: 'TL004',
    employeeId: 'TL004',
    name: 'Rachel Green',
    role: 'Payroll Lead',
    departmentId: 'D002',
    departmentName: 'Finance',
    email: 'rachel.green@company.com',
  },

  // HR Operations (D003)
  {
    id: 'TL005',
    employeeId: 'TL005',
    name: 'Adi',
    role: 'HR Operations Team Lead',
    departmentId: 'D003',
    departmentName: 'HR Operations',
    email: 'adi.hr@company.com',
  },
  {
    id: 'TL006',
    employeeId: 'TL006',
    name: 'Kotesh',
    role: 'Talent Acquisition Lead',
    departmentId: 'D003',
    departmentName: 'HR Operations',
    email: 'kotesh.hr@company.com',
  },

  // Facilities (D004)
  {
    id: 'TL007',
    employeeId: 'TL007',
    name: 'Mounika',
    role: 'Facilities Team Lead',
    departmentId: 'D004',
    departmentName: 'Facilities',
    email: 'mounika.fac@company.com',
  },
  {
    id: 'TL008',
    employeeId: 'TL008',
    name: 'Marcus Vance',
    role: 'Workplace Operations Lead',
    departmentId: 'D004',
    departmentName: 'Facilities',
    email: 'marcus.vance@company.com',
  },

  // General Administration (D005)
  {
    id: 'TL009',
    employeeId: 'TL009',
    name: 'Sudha',
    role: 'General Admin Team Lead',
    departmentId: 'D005',
    departmentName: 'General Administration',
    email: 'sudha.admin@company.com',
  },
  {
    id: 'TL010',
    employeeId: 'TL010',
    name: 'Elena Rostova',
    role: 'Corporate Admin Lead',
    departmentId: 'D005',
    departmentName: 'General Administration',
    email: 'elena.rostova@company.com',
  },
];

export const EMPLOYEES: EmployeeItem[] = [
  // IT Support Team Members - Real Database Employees
  {
    id: 'OKL005',
    employeeId: 'OKL005',
    name: 'aditya',
    role: 'IT Support Specialist',
    teamLeadId: 'OKL001',
    departmentId: 'D001',
    departmentName: 'IT Support',
    email: 'a.reddy@oklut.com',
  },
  {
    id: 'OKL004',
    employeeId: 'OKL004',
    name: 'Hyma',
    role: 'Technical Support Specialist',
    teamLeadId: 'OKL001',
    departmentId: 'D001',
    departmentName: 'IT Support',
    email: 'h.jagarapu@oklut.com',
  },
  {
    id: 'OKL005-2',
    employeeId: 'OKL005',
    name: 'aditya',
    role: 'IT Support Specialist',
    teamLeadId: 'OKL002',
    departmentId: 'D001',
    departmentName: 'IT Support',
    email: 'a.reddy@oklut.com',
  },
  {
    id: 'OKL004-2',
    employeeId: 'OKL004',
    name: 'Hyma',
    role: 'Technical Support Specialist',
    teamLeadId: 'OKL002',
    departmentId: 'D001',
    departmentName: 'IT Support',
    email: 'h.jagarapu@oklut.com',
  },
  {
    id: 'OKL005-3',
    employeeId: 'OKL005',
    name: 'aditya',
    role: 'IT Support Specialist',
    teamLeadId: 'OKL003',
    departmentId: 'D001',
    departmentName: 'IT Support',
    email: 'a.reddy@oklut.com',
  },
  {
    id: 'OKL004-3',
    employeeId: 'OKL004',
    name: 'Hyma',
    role: 'Technical Support Specialist',
    teamLeadId: 'OKL003',
    departmentId: 'D001',
    departmentName: 'IT Support',
    email: 'h.jagarapu@oklut.com',
  },

  // David Miller's Team (TL003) - Finance
  {
    id: 'EMP006',
    employeeId: 'EMP006',
    name: 'Marcus Vance',
    role: 'Senior Financial Analyst',
    teamLeadId: 'TL003',
    departmentId: 'D002',
    departmentName: 'Finance',
    email: 'marcus.vance@company.com',
  },
  {
    id: 'EMP007',
    employeeId: 'EMP007',
    name: 'Sneha Reddy',
    role: 'Billing Operations Specialist',
    teamLeadId: 'TL003',
    departmentId: 'D002',
    departmentName: 'Finance',
    email: 'sneha.reddy@company.com',
  },
  {
    id: 'EMP008',
    employeeId: 'EMP008',
    name: 'Kiran Kumar',
    role: 'Accounts Auditor',
    teamLeadId: 'TL003',
    departmentId: 'D002',
    departmentName: 'Finance',
    email: 'kiran.kumar@company.com',
  },

  // Rachel Green's Team (TL004) - Finance
  {
    id: 'EMP009',
    employeeId: 'EMP009',
    name: 'Rohit Verma',
    role: 'Payroll Specialist',
    teamLeadId: 'TL004',
    departmentId: 'D002',
    departmentName: 'Finance',
    email: 'rohit.verma@company.com',
  },
  {
    id: 'EMP010',
    employeeId: 'EMP010',
    name: 'Priya Patel',
    role: 'Compensation Analyst',
    teamLeadId: 'TL004',
    departmentId: 'D002',
    departmentName: 'Finance',
    email: 'priya.patel@company.com',
  },

  // Adi's Team (TL005) - HR Operations
  {
    id: 'EMP011',
    employeeId: 'EMP011',
    name: 'Sophia Chen',
    role: 'HR Generalist',
    teamLeadId: 'TL005',
    departmentId: 'D003',
    departmentName: 'HR Operations',
    email: 'sophia.chen@company.com',
  },
  {
    id: 'EMP012',
    employeeId: 'EMP012',
    name: 'Kavya Patel',
    role: 'Employee Relations Specialist',
    teamLeadId: 'TL005',
    departmentId: 'D003',
    departmentName: 'HR Operations',
    email: 'kavya.patel@company.com',
  },
  {
    id: 'EMP013',
    employeeId: 'EMP013',
    name: 'Tanya Joshi',
    role: 'Benefits Coordinator',
    teamLeadId: 'TL005',
    departmentId: 'D003',
    departmentName: 'HR Operations',
    email: 'tanya.joshi@company.com',
  },

  // Kotesh's Team (TL006) - HR Operations
  {
    id: 'EMP014',
    employeeId: 'EMP014',
    name: 'Arjun Verma',
    role: 'Senior Technical Recruiter',
    teamLeadId: 'TL006',
    departmentId: 'D003',
    departmentName: 'HR Operations',
    email: 'arjun.verma@company.com',
  },
  {
    id: 'EMP015',
    employeeId: 'EMP015',
    name: 'Ritu Sen',
    role: 'Talent Sourcing Specialist',
    teamLeadId: 'TL006',
    departmentId: 'D003',
    departmentName: 'HR Operations',
    email: 'ritu.sen@company.com',
  },

  // Mounika's Team (TL007) - Facilities
  {
    id: 'EMP016',
    employeeId: 'EMP016',
    name: 'Vikram Singh',
    role: 'Facilities Maintenance Lead',
    teamLeadId: 'TL007',
    departmentId: 'D004',
    departmentName: 'Facilities',
    email: 'vikram.singh@company.com',
  },
  {
    id: 'EMP017',
    employeeId: 'EMP017',
    name: 'Tanvi Shah',
    role: 'Building Security Coordinator',
    teamLeadId: 'TL007',
    departmentId: 'D004',
    departmentName: 'Facilities',
    email: 'tanvi.shah@company.com',
  },

  // Marcus Vance's Team (TL008) - Facilities
  {
    id: 'EMP018',
    employeeId: 'EMP018',
    name: 'Daniel Rivera',
    role: 'Workplace Logistics Specialist',
    teamLeadId: 'TL008',
    departmentId: 'D004',
    departmentName: 'Facilities',
    email: 'daniel.rivera@company.com',
  },
  {
    id: 'EMP019',
    employeeId: 'EMP019',
    name: 'Neha Gupta',
    role: 'Physical Infrastructure Tech',
    teamLeadId: 'TL008',
    departmentId: 'D004',
    departmentName: 'Facilities',
    email: 'neha.gupta@company.com',
  },

  // Sudha's Team (TL009) - General Administration
  {
    id: 'EMP020',
    employeeId: 'EMP020',
    name: 'Meera Kapoor',
    role: 'Corporate Office Administrator',
    teamLeadId: 'TL009',
    departmentId: 'D005',
    departmentName: 'General Administration',
    email: 'meera.kapoor@company.com',
  },
  {
    id: 'EMP021',
    employeeId: 'EMP021',
    name: 'Rohan Mehta',
    role: 'Executive Support Specialist',
    teamLeadId: 'TL009',
    departmentId: 'D005',
    departmentName: 'General Administration',
    email: 'rohan.mehta@company.com',
  },

  // Elena Rostova's Team (TL010) - General Administration
  {
    id: 'EMP022',
    employeeId: 'EMP022',
    name: 'Sanjay Mishra',
    role: 'Procurement Administrator',
    teamLeadId: 'TL010',
    departmentId: 'D005',
    departmentName: 'General Administration',
    email: 'sanjay.mishra@company.com',
  },
  {
    id: 'EMP023',
    employeeId: 'EMP023',
    name: 'Pooja Nair',
    role: 'Records & Compliance Clerk',
    teamLeadId: 'TL010',
    departmentId: 'D005',
    departmentName: 'General Administration',
    email: 'pooja.nair@company.com',
  },
];

export const OrganizationService = {
  getDepartments(): DepartmentItem[] {
    return DEPARTMENTS;
  },

  getTeamLeadsByDepartment(deptName: string): TeamLeadItem[] {
    const norm = (deptName || '').trim().toLowerCase();
    const leads = TEAM_LEADS.filter(
      (tl) => tl.departmentName.toLowerCase() === norm
    );
    if (leads.length > 0) return leads;

    // Custom department dynamic fallback
    if (norm && norm !== 'other') {
      const cleanDept = deptName.trim();
      const customId = `TL-CUST-${cleanDept.replace(/\s+/g, '-').toUpperCase()}`;
      return [
        {
          id: customId,
          employeeId: customId,
          name: `${cleanDept} Team Lead`,
          role: `${cleanDept} Lead`,
          departmentId: 'D006',
          departmentName: cleanDept,
          email: `lead.${cleanDept.toLowerCase().replace(/\s+/g, '')}@company.com`,
        },
      ];
    }
    return [];
  },

  getEmployeesByTeamLead(teamLeadId: string): EmployeeItem[] {
    const list = EMPLOYEES.filter((emp) => emp.teamLeadId === teamLeadId);
    if (list.length > 0) return list;

    // Fallback to employees from the same department
    const lead = this.getTeamLeadById(teamLeadId);
    if (lead) {
      const deptList = EMPLOYEES.filter(
        (emp) =>
          emp.departmentId === lead.departmentId ||
          emp.departmentName.toLowerCase() === lead.departmentName.toLowerCase()
      );
      if (deptList.length > 0) return deptList;
    }

    // Custom department dynamic fallback employees if needed
    if (teamLeadId.startsWith('TL-CUST-')) {
      const baseName = teamLeadId.replace('TL-CUST-', '').toLowerCase();
      return [
        {
          id: `EMP-${baseName}-1`,
          employeeId: `EMP-${baseName.substring(0, 3).toUpperCase()}01`,
          name: `${baseName.toUpperCase()} Specialist 1`,
          role: 'Support Specialist',
          teamLeadId,
          departmentId: 'D006',
          departmentName: 'Custom Department',
          email: `emp1.${baseName}@company.com`,
        },
      ];
    }

    return [];
  },

  searchEmployees(teamLeadId: string, query: string): EmployeeItem[] {
    const all = this.getEmployeesByTeamLead(teamLeadId);
    if (!query || !query.trim()) return all;
    const q = query.trim().toLowerCase();
    return all.filter(
      (emp) =>
        emp.name.toLowerCase().includes(q) ||
        emp.employeeId.toLowerCase().includes(q)
    );
  },

  getTeamLeadById(id: string): TeamLeadItem | undefined {
    return TEAM_LEADS.find((tl) => tl.id === id || tl.employeeId === id);
  },

  getEmployeeById(id: string): EmployeeItem | undefined {
    return EMPLOYEES.find((emp) => emp.id === id || emp.employeeId === id);
  },

  searchTeamLeads(deptName: string, query: string): TeamLeadItem[] {
    const all = this.getTeamLeadsByDepartment(deptName);
    if (!query || !query.trim()) return all;
    const q = query.trim().toLowerCase();
    return all.filter(
      (tl) =>
        tl.name.toLowerCase().includes(q) ||
        tl.employeeId.toLowerCase().includes(q)
    );
  },

  searchTeamLeadsAcrossDepartments(departments: string[], query: string): TeamLeadItem[] {
    const list: TeamLeadItem[] = [];
    const depts = departments && departments.length > 0 ? departments : ['IT Support'];
    for (const d of depts) {
      const leads = this.getTeamLeadsByDepartment(d);
      for (const lead of leads) {
        if (!list.some((existing) => existing.id === lead.id)) {
          list.push(lead);
        }
      }
    }
    if (!query || !query.trim()) return list;
    const q = query.trim().toLowerCase();
    return list.filter(
      (tl: TeamLeadItem) =>
        tl.name.toLowerCase().includes(q) ||
        tl.employeeId.toLowerCase().includes(q)
    );
  },

  isEmployeeIdTaken(employeeId: string): boolean {
    if (!employeeId || !employeeId.trim()) return false;
    const normalized = employeeId.trim().toUpperCase();
    const leadMatch = TEAM_LEADS.some(
      (tl) => tl.employeeId.toUpperCase() === normalized || tl.id.toUpperCase() === normalized
    );
    if (leadMatch) return true;
    return EMPLOYEES.some(
      (emp) => emp.employeeId.toUpperCase() === normalized || emp.id.toUpperCase() === normalized
    );
  },

  addTeamLead(lead: TeamLeadItem): void {
    if (!TEAM_LEADS.some((tl) => tl.employeeId.toUpperCase() === lead.employeeId.toUpperCase())) {
      TEAM_LEADS.unshift(lead);
    }
  },

  addEmployee(emp: EmployeeItem): void {
    if (!EMPLOYEES.some((e) => e.employeeId.toUpperCase() === emp.employeeId.toUpperCase())) {
      EMPLOYEES.unshift(emp);
    }
  },

  getAllTeamLeads(): TeamLeadItem[] {
    return TEAM_LEADS;
  },

  getAllEmployees(): EmployeeItem[] {
    return EMPLOYEES;
  },

  async syncFromDatabase(): Promise<void> {
    try {
      const { data: dbUsers, error } = await supabase
        .from('users')
        .select('*');

      if (error || !dbUsers) return;

      for (const u of dbUsers) {
        const roleLower = (u.role || '').toLowerCase();
        const rawDept = u.department || 'IT Support';
        let deptName = rawDept;
        if (rawDept.toLowerCase().includes('it')) deptName = 'IT Support';
        else if (rawDept.toLowerCase().includes('fin')) deptName = 'Finance';
        else if (rawDept.toLowerCase().includes('hr')) deptName = 'HR Operations';
        else if (rawDept.toLowerCase().includes('fac')) deptName = 'Facilities';
        else if (rawDept.toLowerCase().includes('admin')) deptName = 'General Administration';

        const deptObj = DEPARTMENTS.find(d => d.name.toLowerCase() === deptName.toLowerCase()) || DEPARTMENTS[0];

        if (roleLower === 'teamlead' || roleLower === 'team lead') {
          const leadItem: TeamLeadItem = {
            id: u.id,
            employeeId: u.id,
            name: u.name,
            role: `${deptName} Team Lead`,
            departmentId: deptObj.id,
            departmentName: deptName,
            email: u.email,
          };
          const existingIdx = TEAM_LEADS.findIndex(t => t.id === u.id || t.email === u.email);
          if (existingIdx >= 0) {
            TEAM_LEADS[existingIdx] = leadItem;
          } else {
            TEAM_LEADS.push(leadItem);
          }
        } else if (roleLower === 'employee') {
          const empItem: EmployeeItem = {
            id: u.id,
            employeeId: u.id,
            name: u.name,
            role: u.designation || 'Support Specialist',
            teamLeadId: u.team_lead_id || u.team_lead || 'OKL001',
            departmentId: deptObj.id,
            departmentName: deptName,
            email: u.email,
          };
          const existingIdx = EMPLOYEES.findIndex(e => e.id === u.id || e.email === u.email);
          if (existingIdx >= 0) {
            EMPLOYEES[existingIdx] = empItem;
          } else {
            EMPLOYEES.push(empItem);
          }
        }
      }
    } catch (e) {
      console.warn('OrganizationService: syncFromDatabase error', e);
    }
  },
};

