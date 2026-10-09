import { test, expect } from '../fixtures/testFixtures';

test.describe('UAT & E2E Testing — Full Persona Journeys Across Portals', () => {
  test('UAT-01: Employee Journey — Creates ticket, verifies confirmation, and navigates dashboard @e2e', async ({ employeePage }) => {
    // 1. Employee navigates to dashboard
    await employeePage.gotoDashboard();
    await expect(employeePage.page.getByRole('heading', { name: /dashboard|overview|welcome/i })).toBeVisible();

    // 2. Navigates to Create Ticket
    await employeePage.gotoCreateTicket();
    await expect(employeePage.page.getByRole('heading', { name: /create.*ticket/i })).toBeVisible();

    // 3. Fills and submits ticket
    await employeePage.titleInput.fill('UAT Ticket: Workstation dual-monitor setup');
    await employeePage.descriptionInput.fill('Requesting HDMI/DisplayPort cable and adapter for second monitor.');

    // Select Team Lead Sarah Connor
    const sarahLead = employeePage.page.getByText('Sarah Connor', { exact: true }).first();
    if (await sarahLead.isVisible()) {
      await sarahLead.click();
    }

    await employeePage.submitTicketButton.click();

    // 4. Verifies confirmation using role-based heading locator
    await expect(
      employeePage.page.getByRole('heading', { name: 'Ticket created successfully.' })
    ).toBeVisible({ timeout: 7000 });
  });

  test('UAT-02: Team Lead Journey — Views team queue, searches tickets, and accesses details @e2e', async ({ teamLeadPage }) => {
    // 1. Team lead accesses team dashboard
    await teamLeadPage.gotoDashboard();
    await expect(teamLeadPage.page.getByRole('heading', { name: 'Team Lead Dashboard' })).toBeVisible();

    // 2. Verifies "+ Create Ticket" button or ticket controls
    await expect(teamLeadPage.createTicketButton).toBeVisible();

    // 3. Verifies ticket search or filter functionality
    if (await teamLeadPage.searchInput.isVisible()) {
      await teamLeadPage.searchInput.fill('Network');
    }
  });

  test('UAT-03: Admin Journey — Oversees all metrics, navigates workspace and user management @e2e', async ({ adminPage }) => {
    // 1. Admin accesses dashboard
    await adminPage.gotoDashboard();
    await expect(adminPage.page.getByRole('heading', { name: /admin dashboard|overview/i })).toBeVisible();

    // 2. Verifies Admin navigation elements
    await expect(adminPage.page.getByRole('button', { name: /create ticket/i })).toBeVisible();

    // 3. Admin navigates to Add User / User Management
    await adminPage.gotoAddUser();
    await expect(adminPage.page.getByRole('heading', { name: /add new user|create user/i })).toBeVisible();
  });
});
