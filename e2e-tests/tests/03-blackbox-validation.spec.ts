import { test, expect } from '../fixtures/testFixtures';

test.describe('Black Box Testing — Input Boundaries, Validation & Route Protection', () => {
  test('TC-BB-01: Admin Login rejects empty credentials with required field validations @sanity', async ({ adminPage }) => {
    await adminPage.gotoLogin();

    // Attempt to submit empty login form
    await adminPage.signInButton.click();

    // Verify error boundary messages are displayed
    await expect(adminPage.page.getByText('Email address is required')).toBeVisible();
    await expect(adminPage.page.getByText('Password is required')).toBeVisible();
  });

  test('TC-BB-02: Admin Login rejects invalid email formats @sanity', async ({ adminPage }) => {
    await adminPage.gotoLogin();

    // Fill email missing top-level domain to trigger application validation
    await adminPage.emailInput.fill('invalid@nodomain');
    await adminPage.passwordInput.fill('Password123');
    await adminPage.signInButton.click();

    // Verify format validation error
    await expect(adminPage.page.getByText('Enter a valid email address')).toBeVisible();
  });

  test('TC-BB-03: Protected Admin routes redirect unauthenticated users to login @sanity', async ({ page }) => {
    // Clear any active session
    await page.addInitScript(() => {
      localStorage.clear();
    });

    // Directly access protected URL
    await page.goto('http://localhost:3000/admin/dashboard');

    // Should be automatically redirected to /login
    await expect(page).toHaveURL(/.*login/);
    await expect(page.getByRole('button', { name: 'Sign In to Workspace' })).toBeVisible();
  });

  test('TC-BB-04: Protected Employee routes redirect unauthenticated users to signin @sanity', async ({ page }) => {
    // Clear any active session
    await page.addInitScript(() => {
      localStorage.clear();
    });

    // Directly access protected employee URL
    await page.goto('http://localhost:4173/dashboard');

    // Should be redirected to signin
    await expect(page).toHaveURL(/.*signin/);
  });
});
