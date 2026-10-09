import { test, expect } from '../fixtures/testFixtures';

test.describe('Smoke Regression Suite — Rapid Portal Availability & Health', () => {
  test('SMOKE-01: Admin portal responds and renders core layout @smoke', async ({ adminPage }) => {
    await adminPage.gotoLogin();
    await expect(adminPage.signInButton).toBeVisible();
  });

  test('SMOKE-02: Employee portal responds and renders core layout @smoke', async ({ employeePage }) => {
    await employeePage.gotoSignIn();
    await expect(employeePage.page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('SMOKE-03: Team Lead portal responds and renders core layout @smoke', async ({ teamLeadPage }) => {
    await teamLeadPage.gotoLogin();
    await expect(teamLeadPage.page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('SMOKE-04: Backend live database probe returns healthy status 200 @smoke', async ({ request }) => {
    const response = await request.get('http://localhost:8000/api/health/db');
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.status).toBe('healthy');
  });
});
