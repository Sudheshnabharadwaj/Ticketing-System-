import { test, expect } from '@playwright/test';

test.describe('Admin Portal — Add User End-to-End Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/admin/add-user');
    await page.waitForLoadState('domcontentloaded');
  });

  test('TC-USER-01: Employee ID is required and duplicate ID shows error', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /add new user/i })).toBeVisible();

    // Verify Employee ID input is rendered
    const empIdInput = page.getByPlaceholder('e.g. TL001 or EMP001');
    await expect(empIdInput).toBeVisible();

    // Fill existing taken Employee ID (TL001 belongs to Sarah Connor)
    await page.getByPlaceholder('e.g. John Doe').fill('Duplicate Test Lead');
    await empIdInput.fill('TL001');
    await page.getByPlaceholder('john.doe@company.com').fill('dup.lead@company.com');
    await page.getByPlaceholder('+1 (555) 000-0000').fill('+1 555-019-2834');

    // Select Department: IT Support
    await page.locator('select').nth(0).selectOption('IT Support');

    // Select Role: Team Lead
    await page.locator('select').nth(1).selectOption('Team Lead');

    // Submit form
    await page.locator('button[type="submit"]').click();

    // Assert validation error "Employee ID already exists."
    await expect(page.locator('text=Employee ID already exists.')).toBeVisible();
  });

  test('TC-USER-02: Team Lead role requires Employee ID and hides Team Lead field', async ({ page }) => {
    // Select Role: Team Lead
    await page.locator('select').nth(1).selectOption('Team Lead');

    // Team Lead field should NOT be shown
    await expect(page.locator('label', { hasText: 'Team Lead *' })).not.toBeVisible();

    // Fill form with a unique ID
    const uniqueLeadId = `TL9${Math.floor(10 + Math.random() * 89)}`;
    await page.getByPlaceholder('e.g. John Doe').fill('Marcus Vance');
    await page.getByPlaceholder('e.g. TL001 or EMP001').fill(uniqueLeadId);
    await page.getByPlaceholder('john.doe@company.com').fill(`marcus.${uniqueLeadId.toLowerCase()}@company.com`);
    await page.getByPlaceholder('+1 (555) 000-0000').fill('+1 555-883-2940');
    await page.locator('select').nth(0).selectOption('IT Support');

    // Submit form
    await page.locator('button[type="submit"]').click();

    // Success screen with invitation link
    await expect(page.locator('text=User Successfully Created')).toBeVisible({ timeout: 5000 });
    await expect(page.locator(`text=${uniqueLeadId}`)).toBeVisible();
  });

  test('TC-USER-03: Employee role requires Employee ID and Team Lead filtered by department', async ({ page }) => {
    // Select Department: IT Support
    await page.locator('select').nth(0).selectOption('IT Support');

    // Select Role: Employee
    await page.locator('select').nth(1).selectOption('Employee');

    // Team Lead field should now be visible and contain Sarah Connor and Alex Rivera
    const teamLeadSelect = page.locator('select').nth(2);
    await expect(teamLeadSelect).toBeVisible();
    await expect(page.locator('label', { hasText: 'Team Lead *' })).toBeVisible();

    // Verify IT Support leads are listed in options
    await expect(teamLeadSelect).toContainText('Sarah Connor — TL001');
    await expect(teamLeadSelect).toContainText('Alex Rivera — TL002');

    // Switch Department to Finance -> Team Lead select should update to Finance leads
    await page.locator('select').nth(0).selectOption('Finance');
    await expect(teamLeadSelect).toContainText('David Miller — TL003');
    await expect(teamLeadSelect).not.toContainText('Sarah Connor — TL001');

    // Fill required details
    const uniqueEmpId = `EMP9${Math.floor(10 + Math.random() * 89)}`;
    await page.getByPlaceholder('e.g. John Doe').fill('Elena Rostova');
    await page.getByPlaceholder('e.g. TL001 or EMP001').fill(uniqueEmpId);
    await page.getByPlaceholder('john.doe@company.com').fill(`elena.${uniqueEmpId.toLowerCase()}@company.com`);
    await page.getByPlaceholder('+1 (555) 000-0000').fill('+1 555-442-1199');

    // Select David Miller
    await teamLeadSelect.selectOption({ label: 'David Miller — TL003 (Finance Team Lead)' });

    // Submit form
    await page.locator('button[type="submit"]').click();

    // Verify success
    await expect(page.locator('text=User Successfully Created')).toBeVisible({ timeout: 5000 });
    await expect(page.locator(`text=${uniqueEmpId}`)).toBeVisible();
  });
});
