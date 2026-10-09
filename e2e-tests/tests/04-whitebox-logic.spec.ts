import { test, expect } from '@playwright/test';
import { OrganizationService } from '../../frontend/admin/src/services/organizationService';

test.describe('White Box Testing — Core Service Logic, State Branches & Algorithmic Verification', () => {
  test('WB-01: Department retrieval returns all core company business units @regression', () => {
    const departments = OrganizationService.getDepartments();
    expect(departments.length).toBeGreaterThanOrEqual(5);

    const names = departments.map((d) => d.name);
    expect(names).toContain('IT Support');
    expect(names).toContain('Finance');
    expect(names).toContain('HR Operations');
    expect(names).toContain('Facilities');
    expect(names).toContain('General Administration');
  });

  test('WB-02: Team Lead mapping branch logic returns defined leads for IT Support @regression', () => {
    const itLeads = OrganizationService.getTeamLeadsByDepartment('IT Support');
    expect(itLeads.length).toBe(2);

    const sarah = itLeads.find((l) => l.employeeId === 'TL001');
    expect(sarah).toBeDefined();
    expect(sarah?.name).toBe('Sarah Connor');
    expect(sarah?.email).toBe('sarah.connor@company.com');
  });

  test('WB-03: Team hierarchy isolation maps assigned employees exclusively @regression', () => {
    const teamMembers = OrganizationService.getEmployeesByTeamLead('TL001');
    expect(teamMembers.length).toBe(3);

    const memberIds = teamMembers.map((e) => e.employeeId);
    expect(memberIds).toContain('EMP001');
    expect(memberIds).toContain('EMP002');
    expect(memberIds).toContain('EMP003');
  });

  test('WB-04: Dynamic Search algorithm performs case-insensitive name & ID queries @regression', () => {
    // Case-insensitive query
    const resultsName = OrganizationService.searchEmployees('TL001', 'PRIYA');
    expect(resultsName.length).toBe(1);
    expect(resultsName[0].name).toBe('Priya Sharma');

    // Case-insensitive ID query
    const resultsId = OrganizationService.searchEmployees('TL001', 'emp003');
    expect(resultsId.length).toBe(1);
    expect(resultsId[0].employeeId).toBe('EMP003');
  });

  test('WB-05: Fallback handling for dynamic custom departments @regression', () => {
    const customLeads = OrganizationService.getTeamLeadsByDepartment('Legal & Compliance');
    expect(customLeads.length).toBe(1);
    expect(customLeads[0].departmentName).toBe('Legal & Compliance');
    expect(customLeads[0].name).toBe('Legal & Compliance Team Lead');
  });
});
