import { test, expect } from '@playwright/test';

test.describe('Employee Portal — Create Ticket End-to-End Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate directly to Employee Create Ticket page
    await page.goto('http://localhost:5180/create-ticket');
    await page.waitForLoadState('domcontentloaded');
  });

  test('TC-EMP-01: Employee Create Ticket page loads with all form sections', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /create new support ticket/i })).toBeVisible();

    // Verify Department selection cards
    await expect(page.locator('button', { hasText: 'IT Support' })).toBeVisible();
    await expect(page.locator('button', { hasText: 'Finance' })).toBeVisible();
    await expect(page.locator('button', { hasText: 'HR Operations' })).toBeVisible();
    await expect(page.locator('button', { hasText: 'Other' })).toBeVisible();

    // Verify Team Lead search input is visible above leads
    await expect(page.getByPlaceholder('Search Team Lead by name or Employee ID')).toBeVisible();
  });

  test('TC-EMP-02: Team Lead search by name and ID, dynamic selection, and employee tagging', async ({ page }) => {
    // IT Support is selected by default
    const tlSearch = page.getByPlaceholder('Search Team Lead by name or Employee ID');

    // 1. Search Team Lead by partial name "Alex"
    await tlSearch.fill('Alex');
    await expect(page.getByText('Alex Rivera', { exact: true })).toBeVisible();
    await expect(page.getByText('Sarah Connor', { exact: true })).not.toBeVisible();

    // 2. Search Team Lead by Employee ID "TL001"
    await tlSearch.fill('TL001');
    await expect(page.getByText('Sarah Connor', { exact: true })).toBeVisible();
    await expect(page.getByText('Alex Rivera', { exact: true })).not.toBeVisible();

    // 3. Search nonexistent lead -> "No Team Leads found."
    await tlSearch.fill('NONEXISTENT');
    await expect(page.locator('text=No Team Leads found.')).toBeVisible();

    // 4. Clear search
    await tlSearch.clear();
    await expect(page.getByText('Sarah Connor', { exact: true })).toBeVisible();
    await expect(page.getByText('Alex Rivera', { exact: true })).toBeVisible();

    // 5. Select Sarah Connor
    await page.getByText('Sarah Connor', { exact: true }).first().click();

    // Employee team list should appear
    await expect(page.getByText('John Smith', { exact: true })).toBeVisible();
    await expect(page.getByText('Priya Sharma', { exact: true })).toBeVisible();
    await expect(page.getByText('Rahul Kumar', { exact: true })).toBeVisible();

    // 6. Search Employee by Name
    const empSearch = page.getByPlaceholder('Search employee by name or Employee ID');
    await empSearch.fill('Rahul');
    await expect(page.getByText('Rahul Kumar', { exact: true })).toBeVisible();
    await expect(page.getByText('John Smith', { exact: true })).not.toBeVisible();

    // 7. Tag Rahul Kumar
    await page.getByText('Rahul Kumar', { exact: true }).click();

    // Chip appears
    const rahulChip = page.locator('span').filter({ hasText: 'Rahul Kumar — EMP003' }).first();
    await expect(rahulChip).toBeVisible();

    // Remove tag via ×
    await rahulChip.locator('button').click();
    await expect(rahulChip).not.toBeVisible();
  });

  test('TC-EMP-03: Full submission flow and verified email delivery confirmation', async ({ page }) => {
    // Fill subject
    await page.locator('input[placeholder*="summary of your issue"]').fill('Employee E2E: Docker daemon memory leak');

    // Select Sarah Connor and tag John Smith
    await page.getByText('Sarah Connor', { exact: true }).first().click();
    await page.getByText('John Smith', { exact: true }).click();

    // Fill description
    await page.locator('textarea[placeholder*="Provide clear steps"]').fill('Memory usage spikes to 100% after 20 minutes of running local dev containers.');

    // Click submit button
    const submitBtn = page.locator('form button[type="submit"]');
    await submitBtn.click();

    // Verify transition to success screen
    await expect(page.locator('text=Ticket created successfully.')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Email sent successfully.')).toBeVisible({ timeout: 5000 });
  });
});
