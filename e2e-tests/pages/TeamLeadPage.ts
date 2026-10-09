import { type Page, type Locator } from '@playwright/test';

export class TeamLeadPage {
  readonly page: Page;
  readonly baseURL: string = 'http://localhost:4174';

  constructor(page: Page) {
    this.page = page;
  }

  async authenticateAsTeamLead() {
    await this.page.addInitScript(() => {
      localStorage.setItem('platform_current_user', JSON.stringify({
        id: 'TL001',
        name: 'Manikanta',
        email: 'manikanta@company.com',
        role: 'teamlead',
        department: 'IT Support',
        status: 'Active',
      }));
      localStorage.setItem('itsm_teamlead_auth', 'true');
    });
  }

  async gotoDashboard() {
    await this.authenticateAsTeamLead();
    await this.page.goto(`${this.baseURL}/teamlead/dashboard`);
    await this.page.waitForLoadState('domcontentloaded');
  }

  async gotoLogin() {
    await this.page.goto(`${this.baseURL}/login`);
    await this.page.waitForLoadState('domcontentloaded');
  }

  get createTicketButton(): Locator {
    return this.page.getByRole('button', { name: /\+ create ticket/i });
  }

  get searchInput(): Locator {
    return this.page.getByPlaceholder(/search tickets/i);
  }
}
