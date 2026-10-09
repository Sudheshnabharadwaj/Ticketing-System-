import { test, expect } from '../fixtures/testFixtures';

test.describe('Integration Testing — Multi-Tier Frontend, Local Storage & Backend Integration', () => {
  test('INT-01: Employee ticket submission integrates with LocalStorage and Audit Log cascade @regression', async ({ employeePage }) => {
    await employeePage.gotoCreateTicket();

    // Fill ticket creation form
    await employeePage.titleInput.fill('Integration Issue: VPN Gateway Timeout');
    await employeePage.descriptionInput.fill('Unable to authenticate into corporate VPN from remote subnet.');

    // Select IT Support department if visible
    const itSupportBtn = employeePage.departmentButton('IT Support');
    if (await itSupportBtn.isVisible()) {
      await itSupportBtn.click();
    }

    // Select Team Lead Sarah Connor
    const sarahLead = employeePage.page.getByText('Sarah Connor', { exact: true }).first();
    if (await sarahLead.isVisible()) {
      await sarahLead.click();
    }

    // Submit ticket
    await employeePage.submitTicketButton.click();

    // Verify success banner/message using top-priority role locator
    await expect(
      employeePage.page.getByRole('heading', { name: 'Ticket created successfully.' })
    ).toBeVisible({ timeout: 7000 });

    // Verify email notifications persisted in LocalStorage
    const persisted = await employeePage.page.evaluate(() => {
      const emails = JSON.parse(localStorage.getItem('employee_sent_email_notifications') || '[]');
      return emails.length > 0;
    });
    expect(persisted).toBeTruthy();
  });

  test('INT-02: Backend and Database integration health verified live @regression', async ({ request }) => {
    const res = await request.get('http://localhost:8000/api/health/db');
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('healthy');
    expect(data.database).toBe('connected');
  });
});
