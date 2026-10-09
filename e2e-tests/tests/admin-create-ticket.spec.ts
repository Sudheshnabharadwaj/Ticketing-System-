import { test, expect } from '@playwright/test';

test.describe('Admin Portal — Create Ticket End-to-End Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to Admin dashboard
    await page.goto('http://localhost:5173/admin/dashboard');
    await page.waitForLoadState('domcontentloaded');
  });

  test('TC-ADMIN-01: Admin can open modal and verify full RBAC access', async ({ page }) => {
    // Click "+ Create Ticket" button
    const createBtn = page.getByRole('button', { name: 'Create Ticket', exact: true });
    await expect(createBtn).toBeVisible();
    await createBtn.click();

    // Verify modal is open
    await expect(page.locator('text=Create Ticket (Admin)')).toBeVisible();

    // Admin should see multiple departments
    await expect(page.getByRole('button', { name: 'IT Support' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Finance' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'HR Operations' })).toBeVisible();
  });

  test('TC-ADMIN-02: Team Lead Search by Name & ID, and Employee dynamic hierarchy', async ({ page }) => {
    await page.getByRole('button', { name: 'Create Ticket', exact: true }).click();
    await expect(page.locator('text=Create Ticket (Admin)')).toBeVisible();

    // Team Lead Search Input
    const tlSearch = page.getByPlaceholder('Search Team Lead by name or Employee ID').first();
    await expect(tlSearch).toBeVisible();

    // 1. Search Team Lead by partial name "Sarah"
    await tlSearch.fill('Sarah');
    await expect(page.getByText('Sarah Connor', { exact: true })).toBeVisible();
    await expect(page.getByText('Alex Rivera', { exact: true })).not.toBeVisible();

    // 2. Search Team Lead by Employee ID "TL001"
    await tlSearch.fill('TL001');
    await expect(page.getByText('Sarah Connor', { exact: true })).toBeVisible();
    await expect(page.getByText('Alex Rivera', { exact: true })).not.toBeVisible();

    // 3. Search Team Lead by "Alex"
    await tlSearch.fill('Alex');
    await expect(page.getByText('Alex Rivera', { exact: true })).toBeVisible();
    await expect(page.getByText('Sarah Connor', { exact: true })).not.toBeVisible();

    // 4. Search nonexistent Team Lead -> "No Team Leads found."
    await tlSearch.fill('NONEXISTENT_LEAD');
    await expect(page.locator('text=No Team Leads found.')).toBeVisible();

    // 5. Clear search -> both leads visible
    await tlSearch.clear();
    await expect(page.getByText('Sarah Connor', { exact: true })).toBeVisible();
    await expect(page.getByText('Alex Rivera', { exact: true })).toBeVisible();

    // 6. Select Sarah Connor (TL001)
    await page.getByText('Sarah Connor', { exact: true }).click();

    // Employees belonging to Sarah Connor should now be displayed
    await expect(page.getByText('John Smith', { exact: true })).toBeVisible();
    await expect(page.getByText('Priya Sharma', { exact: true })).toBeVisible();
    await expect(page.getByText('Rahul Kumar', { exact: true })).toBeVisible();

    // 7. Search employee by name (case-insensitive)
    const empSearch = page.getByPlaceholder('Search employee by name or Employee ID');
    await empSearch.fill('priya');
    await expect(page.getByText('Priya Sharma', { exact: true })).toBeVisible();
    await expect(page.getByText('John Smith', { exact: true })).not.toBeVisible();

    // 8. Search employee by ID
    await empSearch.fill('EMP001');
    await expect(page.getByText('John Smith', { exact: true })).toBeVisible();
    await expect(page.getByText('Priya Sharma', { exact: true })).not.toBeVisible();

    // 9. Search nonexistent employee -> "No employees found."
    await empSearch.fill('XYZ999');
    await expect(page.locator('text=No employees found.')).toBeVisible();

    // 10. Clear employee search
    await empSearch.clear();
    await expect(page.getByText('John Smith', { exact: true })).toBeVisible();

    // Tag John Smith and Priya Sharma
    await page.getByText('John Smith', { exact: true }).click();
    await page.getByText('Priya Sharma', { exact: true }).click();

    // Verify chips rendered
    const johnChip = page.locator('span').filter({ hasText: 'John Smith — EMP001' }).first();
    const priyaChip = page.locator('span').filter({ hasText: 'Priya Sharma — EMP002' }).first();
    await expect(johnChip).toBeVisible();
    await expect(priyaChip).toBeVisible();

    // Remove Priya Sharma via '×' button
    const removePriyaBtn = priyaChip.locator('button');
    await removePriyaBtn.click();
    await expect(priyaChip).not.toBeVisible();
    await expect(johnChip).toBeVisible();
  });

  test('TC-ADMIN-03: Multi-department Team Lead search isolation', async ({ page }) => {
    await page.getByRole('button', { name: 'Create Ticket', exact: true }).click();
    await expect(page.locator('text=Create Ticket (Admin)')).toBeVisible();

    // Select Finance in addition to IT Support
    await page.getByRole('button', { name: 'Finance' }).click();

    // Should now see two sections
    await expect(page.locator('text=IT Support Team Leads')).toBeVisible();
    await expect(page.locator('text=Finance Team Leads')).toBeVisible();

    // In IT Support section, search "Alex"
    const itTlSearch = page.locator('input[placeholder="Search Team Lead by name or Employee ID"]').first();
    await itTlSearch.fill('Alex');
    await expect(page.getByText('Alex Rivera', { exact: true })).toBeVisible();
    await expect(page.getByText('Sarah Connor', { exact: true })).not.toBeVisible();

    // In Finance section, David Miller should be untouched and visible
    await expect(page.getByText('David Miller', { exact: true })).toBeVisible();
  });

  test('TC-ADMIN-04: Deselecting Team Lead removes associated employees and chips', async ({ page }) => {
    await page.getByRole('button', { name: 'Create Ticket', exact: true }).click();
    await expect(page.locator('text=Create Ticket (Admin)')).toBeVisible();

    // Select Sarah Connor
    await page.getByText('Sarah Connor', { exact: true }).click();

    // Tag John Smith
    await page.getByText('John Smith', { exact: true }).click();
    const johnChip = page.locator('span').filter({ hasText: 'John Smith — EMP001' }).first();
    await expect(johnChip).toBeVisible();

    // Deselect Sarah Connor
    await page.getByText('Sarah Connor', { exact: true }).first().click();

    // Verify tagged employee chips and employee list are removed
    await expect(johnChip).not.toBeVisible();
    await expect(page.getByText('John Smith', { exact: true })).not.toBeVisible();
  });

  test('TC-ADMIN-05: Full Ticket Creation with Validation and Success Feedback', async ({ page }) => {
    await page.getByRole('button', { name: 'Create Ticket', exact: true }).click();
    await expect(page.locator('text=Create Ticket (Admin)')).toBeVisible();

    // Fill form fields
    await page.locator('input[placeholder="Ticket subject..."]').fill('Playwright Test: Server Room UPS Alert');
    await page.getByPlaceholder('Enter detailed ticket description...').fill('E2E testing ticket creation with tagged employees.');

    // Select Sarah Connor and tag John Smith
    await page.getByText('Sarah Connor', { exact: true }).click();
    await page.getByText('John Smith', { exact: true }).click();

    // Submit ticket
    await page.locator('form button[type="submit"]').click();

    // Verify modal closes and success toast appears
    await expect(page.locator('text=Ticket created successfully.')).toBeVisible({ timeout: 5000 });
  });
});
