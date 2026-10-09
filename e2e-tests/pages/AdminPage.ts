import { type Page, type Locator, expect } from '@playwright/test';

export class AdminPage {
  readonly page: Page;
  readonly baseURL: string = 'http://localhost:3000';

  constructor(page: Page) {
    this.page = page;
  }

  async authenticateAsAdmin() {
    await this.page.addInitScript(() => {
      localStorage.setItem('platform_current_user', JSON.stringify({
        id: 'ADM001',
        name: 'System Admin',
        email: 'admin@platform.local',
        role: 'admin',
        department: 'Management',
        status: 'Active',
      }));
    });
  }

  async gotoDashboard() {
    await this.authenticateAsAdmin();
    await this.page.goto(`${this.baseURL}/admin/dashboard`);
    await this.page.waitForLoadState('domcontentloaded');
  }

  async gotoAddUser() {
    await this.authenticateAsAdmin();
    await this.page.goto(`${this.baseURL}/admin/add-user`);
    await this.page.waitForLoadState('domcontentloaded');
  }

  async gotoLogin() {
    await this.page.goto(`${this.baseURL}/login`);
    await this.page.waitForLoadState('domcontentloaded');
  }

  get emailInput(): Locator {
    return this.page.getByRole('textbox', { name: /email/i }).or(this.page.getByPlaceholder(/name@company.com|email/i));
  }

  get passwordInput(): Locator {
    return this.page.locator('input[type="password"]');
  }

  get signInButton(): Locator {
    return this.page.getByRole('button', { name: 'Sign In to Workspace' });
  }

  get createTicketButton(): Locator {
    return this.page.getByRole('button', { name: /create ticket/i });
  }

  async fillLoginForm(email: string, pass: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(pass);
  }
}
