import { test, expect } from '@playwright/test';

test.describe('Integration Testing — Selector Component & Storage / Email Service Cascade', () => {
  test('INT-01: Employee creation integrates with LocalStorage and Email Service', async ({ page }) => {
    // Navigate to Employee Create Ticket page
    await page.goto('http://localhost:5180/create-ticket');
    await page.waitForLoadState('domcontentloaded');

    // Fill form
    await page.locator('input[placeholder*="summary of your issue"]').fill('Integration Test Ticket: Network latency spikes');
    await page.locator('textarea[placeholder*="Provide clear steps"]').fill('Pings to DNS servers timing out every 10 seconds.');

    // Select Sarah Connor (TL001)
    await page.getByText('Sarah Connor', { exact: true }).first().click();

    // Tag John Smith (EMP001)
    await page.getByText('John Smith', { exact: true }).click();

    // Submit form
    await page.locator('form button[type="submit"]').click();

    // Wait for success screen
    await expect(page.locator('text=Ticket created successfully.')).toBeVisible({ timeout: 5000 });

    // Verify localStorage persistence for created ticket and emails
    const storageData = await page.evaluate(() => {
      const tickets = JSON.parse(localStorage.getItem('employee_standalone_tickets') || '[]');
      const emails = JSON.parse(localStorage.getItem('employee_sent_email_notifications') || '[]');
      return { tickets, emails };
    });

    // Assert ticket saved with tagged employees
    expect(storageData.tickets.length).toBeGreaterThan(0);
    const createdTicket = storageData.tickets[0];
    expect(createdTicket.title).toBe('Integration Test Ticket: Network latency spikes');
    expect(createdTicket.employees).toBeDefined();
    expect(createdTicket.employees.length).toBe(1);
    expect(createdTicket.employees[0].employeeId).toBe('EMP001');

    // Assert audit / routing history log created
    const routingHistory = createdTicket.history.find((h: any) => h.author === 'System Routing Engine');
    expect(routingHistory).toBeDefined();
    expect(routingHistory.text).toContain('Sarah Connor');
    expect(routingHistory.text).toContain('John Smith (EMP001)');

    // Assert email sent to both Team Lead and tagged Employee
    expect(storageData.emails.length).toBeGreaterThanOrEqual(2);
    const leadEmail = storageData.emails.find((e: any) => e.recipientEmail === 'sarah.connor@company.com');
    const empEmail = storageData.emails.find((e: any) => e.recipientEmail === 'john.smith@company.com');
    expect(leadEmail).toBeDefined();
    expect(empEmail).toBeDefined();
  });
});
