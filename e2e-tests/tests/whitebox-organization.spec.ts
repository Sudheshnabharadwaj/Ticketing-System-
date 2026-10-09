import { test, expect } from '@playwright/test';

// Import canonical service implementation logic directly for White Box testing
import { OrganizationService } from '../../frontend/admin/src/services/organizationService';

test.describe('White Box Testing — OrganizationService Internal Logic & State', () => {
  test('WB-01: Department retrieval and structure verification', () => {
    const depts = OrganizationService.getDepartments();
    expect(depts.length).toBeGreaterThanOrEqual(5);
    const deptNames = depts.map((d) => d.name);
    expect(deptNames).toContain('IT Support');
    expect(deptNames).toContain('Finance');
    expect(deptNames).toContain('HR Operations');
    expect(deptNames).toContain('Facilities');
    expect(deptNames).toContain('General Administration');
  });

  test('WB-02: Team Lead mapping branch logic and Sarah Connor (TL001) definition', () => {
    const itLeads = OrganizationService.getTeamLeadsByDepartment('IT Support');
    expect(itLeads.length).toBe(2);

    const sarah = itLeads.find((l) => l.employeeId === 'TL001');
    expect(sarah).toBeDefined();
    expect(sarah?.name).toBe('Sarah Connor');
    expect(sarah?.role).toBe('IT Support Team Lead');
    expect(sarah?.departmentName).toBe('IT Support');
    expect(sarah?.email).toBe('sarah.connor@company.com');
  });

  test('WB-03: Team Lead isolation — Sarah Connor (TL001) has exactly John, Priya, Rahul', () => {
    const teamMembers = OrganizationService.getEmployeesByTeamLead('TL001');
    expect(teamMembers.length).toBe(3);

    const ids = teamMembers.map((e) => e.employeeId);
    expect(ids).toContain('EMP001');
    expect(ids).toContain('EMP002');
    expect(ids).toContain('EMP003');

    const emp001 = teamMembers.find((e) => e.employeeId === 'EMP001');
    expect(emp001?.name).toBe('John Smith');
    expect(emp001?.role).toBe('Senior L2 Support Specialist');

    const emp002 = teamMembers.find((e) => e.employeeId === 'EMP002');
    expect(emp002?.name).toBe('Priya Sharma');
    expect(emp002?.role).toBe('IT Systems Analyst');

    const emp003 = teamMembers.find((e) => e.employeeId === 'EMP003');
    expect(emp003?.name).toBe('Rahul Kumar');
    expect(emp003?.role).toBe('Network Engineer');
  });

  test('WB-04: Dynamic Search algorithm — Case-insensitive Name & ID matching', () => {
    // 1. Partial uppercase name search
    const results1 = OrganizationService.searchEmployees('TL001', 'PRIYA');
    expect(results1.length).toBe(1);
    expect(results1[0].name).toBe('Priya Sharma');

    // 2. Partial lowercase employeeId search
    const results2 = OrganizationService.searchEmployees('TL001', 'emp003');
    expect(results2.length).toBe(1);
    expect(results2[0].name).toBe('Rahul Kumar');

    // 3. Empty query returns all members of the team
    const allMembers = OrganizationService.searchEmployees('TL001', '   ');
    expect(allMembers.length).toBe(3);

    // 4. Non-matching query returns empty array
    const emptyResults = OrganizationService.searchEmployees('TL001', 'nonexistent_person');
    expect(emptyResults.length).toBe(0);
  });

  test('WB-05: Fallback handling for dynamic custom departments', () => {
    const customLeads = OrganizationService.getTeamLeadsByDepartment('Legal & Compliance');
    expect(customLeads.length).toBe(1);
    expect(customLeads[0].departmentName).toBe('Legal & Compliance');
    expect(customLeads[0].name).toBe('Legal & Compliance Team Lead');
  });
});
