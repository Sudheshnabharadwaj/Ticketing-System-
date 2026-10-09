import { type Page, type Locator } from '@playwright/test';

export class EmployeePage {
  readonly page: Page;
  readonly baseURL: string = 'http://localhost:4173';

  constructor(page: Page) {
    this.page = page;
  }

  async authenticateAsEmployee() {
    await this.page.addInitScript(() => {
      localStorage.setItem('platform_current_user', JSON.stringify({
        id: 'EMP001',
        name: 'Sudha',
        email: 'sudha@company.com',
        role: 'employee',
        department: 'Operations',
        status: 'Active',
      }));
    });
  }

  async gotoDashboard() {
    await this.authenticateAsEmployee();
    await this.page.goto(`${this.baseURL}/dashboard`);
    await this.page.waitForLoadState('domcontentloaded');
  }

  async gotoCreateTicket() {
    await this.authenticateAsEmployee();
    await this.page.goto(`${this.baseURL}/create-ticket`);
    await this.page.waitForLoadState('domcontentloaded');
  }

  async gotoSignIn() {
    await this.page.goto(`${this.baseURL}/signin`);
    await this.page.waitForLoadState('domcontentloaded');
  }

  get titleInput(): Locator {
    return this.page.getByRole('textbox', { name: /ticket title|summary/i }).or(
      this.page.getByPlaceholder(/summary of your issue/i)
    );
  }

  get descriptionInput(): Locator {
    return this.page.getByRole('textbox', { name: /description|steps/i }).or(
      this.page.getByPlaceholder(/provide clear steps/i)
    );
  }

  get submitTicketButton(): Locator {
    return this.page.getByRole('button', { name: /submit ticket|create ticket/i });
  }

  departmentButton(name: string): Locator {
    return this.page.getByRole('button', { name: new RegExp(name, 'i') });
  }
}
