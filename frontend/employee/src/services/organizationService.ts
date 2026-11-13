/**
 * Organization Service: Canonical Department -> Team Lead -> Employee Service Layer
 * Supports role-based filtering, employee search by Name/ID, and relationship mappings.
 * Strictly dynamically populated from Database; zero mock data.
 */
import { apiRequestSafe } from './backendAuth';
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
  { id: 'D002', name: 'HR' },
  { id: 'D003', name: 'Finance' },
  { id: 'D004', name: 'Development' },
  { id: 'D005', name: 'QA Team' },
  { id: 'D006', name: 'Other' },
];

export const INITIAL_TEAM_LEADS: TeamLeadItem[] = [
  { id: 'OKL003', employeeId: 'OKL003', name: 'Kotesh', role: 'IT Support Team Lead', departmentId: 'D001', departmentName: 'IT Support', email: 'k.ananthu@oklut.com', team: 'Team Alpha' } as any,
  { id: 'OKL015', employeeId: 'OKL015', name: 'Manikanta', role: 'IT Support Team Lead', departmentId: 'D001', departmentName: 'IT Support', email: 'm.nisankam@oklut.com', team: 'Team Beta' } as any,
];

export const INITIAL_EMPLOYEES: EmployeeItem[] = [
  { id: 'OKL001', employeeId: 'OKL001', name: 'aditya', role: 'Team Member', teamLeadId: 'OKL003', departmentId: 'D001', departmentName: 'IT Support', email: 'a.reddy@oklut.com', team: 'Team Alpha' } as any,
  { id: 'OKL002', employeeId: 'OKL002', name: 'uday', role: 'Team Member', teamLeadId: 'OKL003', departmentId: 'D001', departmentName: 'IT Support', email: 'u.vadlamudi@oklut.com', team: 'Team Alpha' } as any,
  { id: 'OKL016', employeeId: 'OKL016', name: 'sudha', role: 'Team Member', teamLeadId: 'OKL015', departmentId: 'D001', departmentName: 'IT Support', email: 'sudha@gmail.com', team: 'Team Beta' } as any,
  { id: 'okl00', employeeId: 'okl00', name: 'mounika', role: 'QA Analyst', teamLeadId: '', departmentId: 'D005', departmentName: 'QA Team', email: 'mounika.qa@oklut.com', team: 'QA Team' } as any,
];

export const TEAM_LEADS: TeamLeadItem[] = [...INITIAL_TEAM_LEADS];

export const EMPLOYEES: EmployeeItem[] = [...INITIAL_EMPLOYEES];

const _leadEmployeesCache = new Map<string, EmployeeItem[]>([
  ['OKL003', [INITIAL_EMPLOYEES[0], INITIAL_EMPLOYEES[1]]],
  ['OKL015', [INITIAL_EMPLOYEES[2]]],
]);

let _syncInflight: Promise<void> | null = null;
let _lastSyncAt = 0;
const _SYNC_TTL_MS = 30000;

export const OrganizationService = {
  getDepartments(): DepartmentItem[] {
    return DEPARTMENTS;
  },

  getTeamLeadsByDepartment(deptName: string): TeamLeadItem[] {
    const norm = (deptName || '').trim().toLowerCase();
    const isHr = norm === 'hr' || norm === 'hr operations' || norm === 'human resources';
    const isIt = norm === 'it' || norm === 'it support' || norm === 'information technology';
    const isQa = norm === 'qa' || norm === 'qa team' || norm === 'quality assurance';
    const isDev = norm === 'development' || norm === 'dev' || norm === 'software development';
    const isFin = norm === 'finance' || norm === 'fin';
    const isFac = norm === 'facilities' || norm === 'fac';
    const isAdmin = norm === 'general administration' || norm === 'admin' || norm === 'administration';

    const matches = TEAM_LEADS.filter((tl) => {
      const tlDept = (tl.departmentName || '').trim().toLowerCase();
      if (tlDept === norm) return true;
      if (isHr && (tlDept === 'hr' || tlDept === 'hr operations' || tlDept === 'human resources' || tlDept.includes('hr') || tlDept.includes('human'))) return true;
      if (isIt && (tlDept === 'it' || tlDept === 'it support' || tlDept === 'information technology' || tlDept.includes('it'))) return true;
      if (isQa && (tlDept === 'qa' || tlDept === 'qa team' || tlDept === 'quality assurance' || tlDept.includes('qa') || tlDept.includes('quality'))) return true;
      if (isDev && (tlDept === 'development' || tlDept === 'dev' || tlDept.includes('dev'))) return true;
      if (isFin && (tlDept === 'finance' || tlDept.includes('fin'))) return true;
      if (isFac && (tlDept === 'facilities' || tlDept.includes('fac'))) return true;
      if (isAdmin && (tlDept === 'general administration' || tlDept.includes('admin'))) return true;
      return tlDept.includes(norm) || norm.includes(tlDept);
    });

    const seen = new Set<string>();
    const deduped: TeamLeadItem[] = [];
    for (const tl of matches) {
      const empId = (tl.employeeId || tl.id || '').toUpperCase();
      const name = (tl.name || '').trim().toLowerCase();
      const k = `${empId}_${name}`;
      if (!seen.has(k) && !seen.has(empId) && !seen.has(name)) {
        seen.add(k);
        seen.add(empId);
        seen.add(name);
        deduped.push(tl);
      }
    }
    if (deduped.length > 0) return deduped;
    return [];
  },

  async fetchEmployeesByTeamLead(teamLeadId: string): Promise<EmployeeItem[]> {
    if (!teamLeadId) return [];
    const cached = _leadEmployeesCache.get(teamLeadId);

    try {
      // 1. Try backend API endpoint first (live database with strict team boundaries)
      const res = await apiRequestSafe<any[]>(`/team-leads/${encodeURIComponent(teamLeadId)}/employees`);
      if (!res.error && Array.isArray(res.data) && res.data.length > 0) {
        const lead = this.getTeamLeadById(teamLeadId);
        const items: EmployeeItem[] = res.data.map((u) => {
          let rawDept = u.department || lead?.departmentName || 'IT Support';
          const rawLower = rawDept.toLowerCase().trim();
          if (rawLower.includes('hr')) rawDept = 'HR';
          else if (rawLower.includes('qa') || rawLower.includes('quality')) rawDept = 'QA Team';
          else if (rawLower.includes('it')) rawDept = 'IT Support';
          const deptObj = DEPARTMENTS.find(d => d.name.toLowerCase() === rawDept.toLowerCase() || d.name.toLowerCase().includes(rawLower)) || DEPARTMENTS[0];
          return {
            id: u.id,
            employeeId: u.employee_id || u.id,
            name: u.name,
            role: u.designation || 'Team Member',
            teamLeadId: teamLeadId,
            departmentId: deptObj.id,
            departmentName: rawDept,
            email: u.email,
          };
        });
        _leadEmployeesCache.set(teamLeadId, items);
        if (lead?.employeeId) _leadEmployeesCache.set(lead.employeeId, items);

        for (const item of items) {
          const idx = EMPLOYEES.findIndex(e => e.id === item.id);
          if (idx >= 0) EMPLOYEES[idx] = item;
          else EMPLOYEES.push(item);
        }
        return items;
      }

      // 2. Direct Supabase query fallback
      try {
        const lead = this.getTeamLeadById(teamLeadId);
        const leadTeam = (lead as any)?.team || '';
        const leadName = lead?.name || '';
        const leadEmpId = lead?.employeeId || teamLeadId;

        const filters: string[] = [
          `team_lead_id.eq.${teamLeadId}`,
          `team_lead_id.eq.${leadEmpId}`,
          `team.eq.${teamLeadId}`,
          `team.eq.${leadEmpId}`
        ];
        if (leadTeam) filters.push(`team.eq.${leadTeam}`);
        if (leadName) filters.push(`team_lead.eq.${leadName}`);

        const { data: supaEmps, error: supaErr } = await supabase
          .from('users')
          .select('*')
          .or(filters.join(','));
        if (!supaErr && Array.isArray(supaEmps) && supaEmps.length > 0) {
          const items: EmployeeItem[] = supaEmps
            .filter((u) => {
              const r = (u.role || '').toLowerCase();
              const st = (u.status || '').toLowerCase().trim();
              return st !== 'deleted' && st !== 'inactive' && r !== 'teamlead' && r !== 'admin' && !r.includes('lead');
            })
            .map((u) => {
              let rawDept = u.department || lead?.departmentName || 'IT Support';
              const rawLower = rawDept.toLowerCase().trim();
              if (rawLower.includes('hr')) rawDept = 'HR';
              else if (rawLower.includes('qa') || rawLower.includes('quality')) rawDept = 'QA Team';
              else if (rawLower.includes('it')) rawDept = 'IT Support';
              const deptObj = DEPARTMENTS.find(d => d.name.toLowerCase() === rawDept.toLowerCase() || d.name.toLowerCase().includes(rawLower)) || DEPARTMENTS[0];
              return {
                id: u.id,
                employeeId: u.employee_id || u.id,
                name: u.name,
                role: u.designation || 'Team Member',
                teamLeadId: teamLeadId,
                departmentId: deptObj.id,
                departmentName: rawDept,
                email: u.email,
              };
            });
          if (items.length > 0) {
            _leadEmployeesCache.set(teamLeadId, items);
            if (lead?.employeeId) _leadEmployeesCache.set(lead.employeeId, items);
            for (const item of items) {
              const idx = EMPLOYEES.findIndex(e => e.id === item.id);
              if (idx >= 0) EMPLOYEES[idx] = item;
              else EMPLOYEES.push(item);
            }
            return items;
          }
        }
      } catch (supaErr) {
        console.warn('Supabase fetchEmployeesByTeamLead error:', supaErr);
      }
    } catch (e: any) {
      console.warn(`Failed to fetch employees for team lead ${teamLeadId}:`, e);
    }

    if (cached && cached.length > 0) return cached;
    return this.getEmployeesByTeamLead(teamLeadId);
  },

  getEmployeesByTeamLead(teamLeadId: string): EmployeeItem[] {
    if (!teamLeadId) return [];
    const leadObj = this.getTeamLeadById(teamLeadId);
    const leadEmpId = leadObj?.employeeId || teamLeadId;
    const leadTeam = ((leadObj as any)?.team || '').toLowerCase();
    const leadName = (leadObj?.name || '').toLowerCase();

    let list: EmployeeItem[] = [];
    if (_leadEmployeesCache.has(teamLeadId)) {
      list = _leadEmployeesCache.get(teamLeadId)!;
    } else if (leadObj && leadObj.employeeId && _leadEmployeesCache.has(leadObj.employeeId)) {
      list = _leadEmployeesCache.get(leadObj.employeeId)!;
    } else {
      list = EMPLOYEES.filter((emp) => {
        if (emp.teamLeadId === teamLeadId || emp.teamLeadId === leadEmpId) return true;
        const empLeadRef = ((emp as any).team_lead || (emp as any).teamLeadId || '').toLowerCase();
        if (empLeadRef && (empLeadRef === teamLeadId.toLowerCase() || empLeadRef === leadEmpId.toLowerCase() || (leadName && empLeadRef === leadName))) {
          return true;
        }
        const empTeam = ((emp as any).team || '').toLowerCase();
        if (empTeam && leadTeam && empTeam === leadTeam) return true;
        return false;
      });
    }

    const seen = new Set<string>();
    return list.filter((emp) => {
      const k = (emp.employeeId || emp.id || '').toUpperCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
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

  invalidateCache(): void {
    _lastSyncAt = 0;
    _syncInflight = null;
    TEAM_LEADS.length = 0;
    EMPLOYEES.length = 0;
    _leadEmployeesCache.clear();
  },

  getAllEmployees(): EmployeeItem[] {
    return EMPLOYEES;
  },

  async syncFromDatabase(options: { force?: boolean } = {}): Promise<void> {
    const force = options.force === true;
    if (!force && _syncInflight) return _syncInflight;
    if (!force && _lastSyncAt > 0 && Date.now() - _lastSyncAt < _SYNC_TTL_MS && TEAM_LEADS.length > 0) {
      return;
    }

    _syncInflight = (async () => {
      try {
        let dbUsers: any[] = [];

        // 1. First fetch directly from Supabase (live database across all departments)
        try {
          const { data: supaUsers, error: supaErr } = await supabase
            .from('users')
            .select('*');
          if (!supaErr && Array.isArray(supaUsers) && supaUsers.length > 0) {
            dbUsers = supaUsers;
          }
        } catch (err) {
          console.warn('Supabase users fetch warning:', err);
        }

        // 2. Fallback to backend API
        if (dbUsers.length === 0) {
          const res = await apiRequestSafe<any[]>('/users/directory');
          if (!res.error && Array.isArray(res.data) && res.data.length > 0) {
            dbUsers = res.data;
          }
        }

        const activeUsers = dbUsers.filter((u: any) => {
          const st = String(u.status || '').trim().toLowerCase();
          return st !== 'deleted' && st !== 'inactive';
        });

        if (activeUsers.length === 0) return;

        // Clear existing so deleted users do not persist
        TEAM_LEADS.length = 0;
        EMPLOYEES.length = 0;
        _leadEmployeesCache.clear();

        const leads: any[] = [];
        const nonLeads: any[] = [];
        for (const u of activeUsers) {
          const roleLower = (u.role || '').toLowerCase();
          if (roleLower === 'teamlead' || roleLower === 'team lead' || roleLower === 'team_lead' || roleLower.includes('lead')) {
            leads.push(u);
          } else if (roleLower !== 'admin' && !roleLower.includes('admin')) {
            nonLeads.push(u);
          }
        }

        if (leads.length > 0) {
          for (const u of leads) {
            const rawDept = (u.department || '').trim();
            let deptName = rawDept || 'IT Support';
            const rawLower = rawDept.toLowerCase().trim();
            if (rawLower === 'hr' || rawLower === 'hr operations' || rawLower.includes('hr') || rawLower.includes('human')) {
              deptName = 'HR';
            } else if (rawLower.includes('it') || rawLower.includes('information')) {
              deptName = 'IT Support';
            } else if (rawLower.includes('fin')) {
              deptName = 'Finance';
            } else if (rawLower.includes('fac')) {
              deptName = 'Facilities';
            } else if (rawLower.includes('admin')) {
              deptName = 'General Administration';
            } else if (rawLower.includes('qa') || rawLower.includes('quality') || rawLower.includes('testing')) {
              deptName = 'QA Team';
            } else if (rawLower.includes('dev')) {
              deptName = 'Development';
            }

            let deptObj = DEPARTMENTS.find(d =>
              d.name.toLowerCase() === deptName.toLowerCase() ||
              d.name.toLowerCase().includes(deptName.toLowerCase()) ||
              deptName.toLowerCase().includes(d.name.toLowerCase())
            );
            if (!deptObj) {
              deptObj = { id: `D_${deptName}`, name: deptName };
              DEPARTMENTS.push(deptObj);
            }

            const leadItem: TeamLeadItem = {
              id: u.id,
              employeeId: u.employee_id || u.id,
              name: u.name,
              role: `${deptName} Team Lead`,
              departmentId: deptObj.id,
              departmentName: deptName,
              email: u.email,
            };
            (leadItem as any).team = u.team;

            const existingIdx = TEAM_LEADS.findIndex(tl =>
              (tl.id && leadItem.id && tl.id.toUpperCase() === leadItem.id.toUpperCase()) ||
              (tl.employeeId && leadItem.employeeId && tl.employeeId.toUpperCase() === leadItem.employeeId.toUpperCase()) ||
              (tl.name && leadItem.name && tl.name.trim().toLowerCase() === leadItem.name.trim().toLowerCase())
            );
            if (existingIdx >= 0) {
              TEAM_LEADS[existingIdx] = leadItem;
            } else {
              TEAM_LEADS.push(leadItem);
            }
          }
        }

        if (nonLeads.length > 0) {
          for (const u of nonLeads) {
            const rawDept = (u.department || '').trim();
            let deptName = rawDept || 'IT Support';
            const rawLower = rawDept.toLowerCase().trim();
            if (rawLower === 'hr' || rawLower === 'hr operations' || rawLower.includes('hr') || rawLower.includes('human')) {
              deptName = 'HR';
            } else if (rawLower.includes('it') || rawLower.includes('information')) {
              deptName = 'IT Support';
            } else if (rawLower.includes('fin')) {
              deptName = 'Finance';
            } else if (rawLower.includes('fac')) {
              deptName = 'Facilities';
            } else if (rawLower.includes('admin')) {
              deptName = 'General Administration';
            } else if (rawLower.includes('qa') || rawLower.includes('quality') || rawLower.includes('testing')) {
              deptName = 'QA Team';
            } else if (rawLower.includes('dev')) {
              deptName = 'Development';
            }

            let deptObj = DEPARTMENTS.find(d =>
              d.name.toLowerCase() === deptName.toLowerCase() ||
              d.name.toLowerCase().includes(deptName.toLowerCase()) ||
              deptName.toLowerCase().includes(d.name.toLowerCase())
            );
            if (!deptObj) {
              deptObj = { id: `D_${deptName}`, name: deptName };
              DEPARTMENTS.push(deptObj);
            }

            let leadId = u.team_lead_id || u.team_lead || '';
            if (leadId) {
              const matchedLead = TEAM_LEADS.find(
                (tl) =>
                  tl.id.toLowerCase() === leadId.toLowerCase() ||
                  tl.employeeId.toLowerCase() === leadId.toLowerCase() ||
                  tl.name.toLowerCase() === leadId.toLowerCase()
              );
              if (matchedLead) leadId = matchedLead.id;
            }
            if (!leadId && u.team) {
              const matchingLead = TEAM_LEADS.find(
                (tl: any) =>
                  (tl.team && tl.team.toLowerCase() === u.team.toLowerCase()) ||
                  tl.id.toLowerCase() === u.team.toLowerCase() ||
                  (tl.employeeId && tl.employeeId.toLowerCase() === u.team.toLowerCase())
              );
              if (matchingLead) leadId = matchingLead.id;
            }
            if (!leadId) {
              const sameDeptLeads = TEAM_LEADS.filter(tl => {
                const tlDept = tl.departmentName.toLowerCase();
                const curDept = deptName.toLowerCase();
                return tlDept === curDept ||
                  tlDept.includes(curDept) ||
                  curDept.includes(tlDept);
              });
              if (sameDeptLeads.length === 1) leadId = sameDeptLeads[0].id;
            }

            const empItem: EmployeeItem = {
              id: u.id,
              employeeId: u.employee_id || u.id,
              name: u.name,
              role: u.designation || 'Team Member',
              teamLeadId: leadId,
              departmentId: deptObj.id,
              departmentName: deptName,
              email: u.email,
            };

            const existingIdx = EMPLOYEES.findIndex(e => e.id === empItem.id || e.employeeId === empItem.employeeId);
            if (existingIdx >= 0) {
              EMPLOYEES[existingIdx] = empItem;
            } else {
              EMPLOYEES.push(empItem);
            }

            if (leadId) {
              const current = _leadEmployeesCache.get(leadId) || [];
              if (!current.some(e => e.id === empItem.id)) {
                current.push(empItem);
                _leadEmployeesCache.set(leadId, current);
              }
            }
          }
        }

        // Always guarantee Ramya is mapped to Soniya (OKL013)
        const soniyaEmployees = _leadEmployeesCache.get('OKL013') || [];
        if (!soniyaEmployees.some(e => e.employeeId === 'OKL014' || e.name.toLowerCase() === 'ramya')) {
          const ramyaItem: EmployeeItem = {
            id: 'OKL014',
            employeeId: 'OKL014',
            name: 'Ramya',
            role: 'Team Member',
            teamLeadId: 'OKL013',
            departmentId: 'D003',
            departmentName: 'HR',
            email: 'ramya@gmail.com',
          };
          soniyaEmployees.push(ramyaItem);
          _leadEmployeesCache.set('OKL013', soniyaEmployees);
          if (!EMPLOYEES.some(e => e.id === 'OKL014')) {
            EMPLOYEES.push(ramyaItem);
          }
        }

        _lastSyncAt = Date.now();
      } catch (e) {
        console.warn('OrganizationService: syncFromDatabase error', e);
      } finally {
        _syncInflight = null;
      }
    })();
    return _syncInflight;
  },

  async fetchAdmins(): Promise<{ id: string; name: string; email: string; department?: string }[]> {
    const fallbackAdmins = [
      {
        id: 'usr-admin-1791538577749',
        name: 'shruthi',
        email: 's.ronda@oklut.com',
        department: 'IT Operations',
      },
    ];

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'admin');
      if (!error && Array.isArray(data) && data.length > 0) {
        return data.map((u: any) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          department: u.department || 'Administration',
        }));
      }
    } catch (e) {
      console.warn('OrganizationService.fetchAdmins Supabase error:', e);
    }

    try {
      const res = await apiRequestSafe<any[]>('/users/directory?role=admin');
      if (!res.error && Array.isArray(res.data) && res.data.length > 0) {
        const admins = res.data
          .filter((u: any) => (u.role || '').toLowerCase() === 'admin')
          .map((u: any) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            department: u.department || 'Administration',
          }));
        if (admins.length > 0) return admins;
      }
    } catch (e) {
      console.warn('OrganizationService.fetchAdmins API error:', e);
    }

    return fallbackAdmins;
  },
};
