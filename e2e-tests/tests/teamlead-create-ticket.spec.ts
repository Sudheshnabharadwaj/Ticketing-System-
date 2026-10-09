import { test, expect } from '@playwright/test';

test.describe('Team Lead Portal — Create Ticket End-to-End Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Authenticate Team Lead in localStorage prior to navigation
    await page.addInitScript(() => {
      localStorage.setItem('itsm_teamlead_auth', 'true');
    });
    // Navigate to Team Lead dashboard
    await page.goto('http://localhost:5174/teamlead/dashboard');
    await page.waitForLoadState('domcontentloaded');
  });

  test('TC-TL-01: Team Lead Dashboard displays Department Selection with 6 department options matching Admin screen', async ({ page }) => {
    // Click "+ Create Ticket" button
    const createBtn = page.getByRole('button', { name: '+ Create Ticket' });
    await expect(createBtn).toBeVisible();
    await createBtn.click();

    const form = page.locator('form');
    await expect(form).toBeVisible();

    // Verify Department Selection heading and helper text
    await expect(form.getByText('Department Selection *')).toBeVisible();
    await expect(form.getByText('Select one or more departments')).toBeVisible();

    // Verify all 6 department options are present
    const departments = [
      'IT Support',
      'Finance',
      'HR Operations',
      'Facilities',
      'General Administration',
      'Other',
    ];
    for (const dept of departments) {
      await expect(form.getByRole('button', { name: dept, exact: true })).toBeVisible();
    }

    // Verify restricted banners are REMOVED
    await expect(form.locator('text=Restricted to your managed department')).not.toBeVisible();
    await expect(form.locator('text=Own Department')).not.toBeVisible();

    // Verify Team Lead Search input is visible with exact placeholder
    const tlSearch = form.getByPlaceholder('Search Team Lead by name or Employee ID');
    await expect(tlSearch).toBeVisible();

    // Verify Available Leads cards inside modal display Name, Employee ID, and Role
    const sarahCard = form.locator('.cursor-pointer').filter({ hasText: 'Sarah Connor' }).filter({ hasText: 'TL001' }).first();
    const alexCard = form.locator('.cursor-pointer').filter({ hasText: 'Alex Rivera' }).filter({ hasText: 'TL002' }).first();

    await expect(sarahCard).toBeVisible();
    await expect(alexCard).toBeVisible();
    await expect(sarahCard).toContainText('IT Support Team Lead');
    await expect(alexCard).toContainText('IT Infrastructure Lead');
  });

  test('TC-TL-02: Multi-department selection toggles sections and custom Other department', async ({ page }) => {
    await page.getByRole('button', { name: '+ Create Ticket' }).click();
    const form = page.locator('form');
    await expect(form).toBeVisible();

    // Select Finance department card
    const financeBtn = form.getByRole('button', { name: 'Finance', exact: true });
    await financeBtn.click();

    // Both IT Support and Finance Team Leads should be visible
    await expect(form.locator('text=IT Support Team Leads')).toBeVisible();
    await expect(form.locator('text=Finance Team Leads')).toBeVisible();
    await expect(form.locator('.cursor-pointer').filter({ hasText: 'David Miller' }).first()).toBeVisible();

    // Select "Other" department
    const otherBtn = form.getByRole('button', { name: 'Other', exact: true });
    await otherBtn.click();

    // Custom department input should appear
    const customDeptInput = form.getByPlaceholder('Type custom department name...');
    await expect(customDeptInput).toBeVisible();
    await customDeptInput.fill('Legal Operations');

    // Deselect Finance
    await financeBtn.click();
    await expect(form.locator('text=Finance Team Leads')).not.toBeVisible();
  });

  test('TC-TL-03: Team Lead search filters dynamically by name and ID, with empty state', async ({ page }) => {
    await page.getByRole('button', { name: '+ Create Ticket' }).click();
    const form = page.locator('form');
    await expect(form).toBeVisible();

    const tlSearch = form.getByPlaceholder('Search Team Lead by name or Employee ID').first();
    const sarahCard = form.locator('.cursor-pointer').filter({ hasText: 'Sarah Connor' }).filter({ hasText: 'TL001' }).first();
    const alexCard = form.locator('.cursor-pointer').filter({ hasText: 'Alex Rivera' }).filter({ hasText: 'TL002' }).first();

    // 1. Search by name "Alex"
    await tlSearch.fill('Alex');
    await expect(alexCard).toBeVisible();
    await expect(sarahCard).not.toBeVisible();

    // 2. Search by Employee ID "TL001"
    await tlSearch.fill('TL001');
    await expect(sarahCard).toBeVisible();
    await expect(alexCard).not.toBeVisible();

    // 3. Search nonexistent lead
    await tlSearch.fill('XYZ_NONEXISTENT');
    await expect(form.locator('text=No Team Leads found.').first()).toBeVisible();

    // 4. Clear search
    await tlSearch.clear();
    await expect(sarahCard).toBeVisible();
    await expect(alexCard).toBeVisible();
  });

  test('TC-TL-04: Team Lead selection displays team members with search and tagging', async ({ page }) => {
    await page.getByRole('button', { name: '+ Create Ticket' }).click();
    const form = page.locator('form');
    await expect(form).toBeVisible();

    // Select Sarah Connor by clicking her card
    const sarahCard = form.locator('.cursor-pointer').filter({ hasText: 'Sarah Connor' }).filter({ hasText: 'TL001' }).first();
    await sarahCard.click();

    // Team members under Sarah Connor should be visible
    await expect(form.getByText('John Smith', { exact: true })).toBeVisible();
    await expect(form.getByText('Priya Sharma', { exact: true })).toBeVisible();
    await expect(form.getByText('Rahul Kumar', { exact: true })).toBeVisible();

    // Filter employees by ID "EMP002"
    const searchInput = form.getByPlaceholder('Search employee by name or Employee ID');
    await searchInput.fill('EMP002');
    await expect(form.getByText('Priya Sharma', { exact: true })).toBeVisible();
    await expect(form.getByText('John Smith', { exact: true })).not.toBeVisible();

    // Tag Priya Sharma
    await form.getByText('Priya Sharma', { exact: true }).click();

    // Chip should appear
    const priyaChip = form.locator('span').filter({ hasText: 'Priya Sharma — EMP002' }).first();
    await expect(priyaChip).toBeVisible();
  });

  test('TC-TL-05: Multi-department ticket creation with custom category and notifications', async ({ page }) => {
    await page.getByRole('button', { name: '+ Create Ticket' }).click();
    const form = page.locator('form');
    await expect(form).toBeVisible();

    // Select Category "Other" -> custom input field should appear
    const categorySelect = form.locator('select').first();
    await categorySelect.selectOption('Other');

    const customCategoryInput = form.getByPlaceholder('Type custom category...');
    await expect(customCategoryInput).toBeVisible();
    await customCategoryInput.fill('VoIP Telecom Outage');

    // Select Finance as well as IT Support
    const financeBtn = form.getByRole('button', { name: 'Finance', exact: true });
    await financeBtn.click();

    // Select Sarah Connor under IT Support
    const sarahCard = form.locator('.cursor-pointer').filter({ hasText: 'Sarah Connor' }).filter({ hasText: 'TL001' }).first();
    await sarahCard.click();

    // Tag an employee
    await form.getByText('Rahul Kumar', { exact: true }).click();

    // Fill subject and description
    await page.getByPlaceholder(/brief summary of the issue/i).fill('TL E2E: Cisco VoIP Switch Crash');
    await page.getByPlaceholder(/detailed description of the issue/i).fill('Voice gateway core switch unresponsive after power glitch.');

    // Submit ticket
    await form.locator('button[type="submit"]').click();

    // Verify success banner & email notification message
    await expect(page.locator('text=Ticket created successfully.').first()).toBeVisible({ timeout: 5000 });
  });
});
