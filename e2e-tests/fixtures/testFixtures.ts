import { test as base, expect } from '@playwright/test';
import { AdminPage } from '../pages/AdminPage';
import { EmployeePage } from '../pages/EmployeePage';
import { TeamLeadPage } from '../pages/TeamLeadPage';

type CustomFixtures = {
  adminPage: AdminPage;
  employeePage: EmployeePage;
  teamLeadPage: TeamLeadPage;
};

export const test = base.extend<CustomFixtures>({
  adminPage: async ({ page }, use) => {
    const admin = new AdminPage(page);
    await use(admin);
  },
  employeePage: async ({ page }, use) => {
    const employee = new EmployeePage(page);
    await use(employee);
  },
  teamLeadPage: async ({ page }, use) => {
    const teamLead = new TeamLeadPage(page);
    await use(teamLead);
  },
});

export { expect };
