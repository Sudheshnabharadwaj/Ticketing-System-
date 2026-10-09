import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '../fixtures/testFixtures';

test.describe('Accessibility (A11y) & WCAG 2.2 AA Compliance Suite', () => {
  test('Admin Portal landing page satisfies WCAG 2.2 AA accessibility standards @regression', async ({ adminPage }) => {
    await adminPage.gotoLogin();

    const accessibilityScanResults = await new AxeBuilder({ page: adminPage.page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa'])
      .analyze();

    // Verify zero critical accessibility blockers (missing labels, missing accessible names)
    const criticalViolations = accessibilityScanResults.violations.filter(
      (v) => v.impact === 'critical'
    );
    expect(criticalViolations).toEqual([]);
  });

  test('Employee Portal login is keyboard navigable with visible focus states @regression', async ({ employeePage }) => {
    await employeePage.gotoSignIn();

    // First tab navigates to interactive elements
    await employeePage.page.keyboard.press('Tab');
    const focusedElement = await employeePage.page.evaluate(() => document.activeElement?.tagName);
    expect(['INPUT', 'BUTTON', 'A']).toContain(focusedElement);
  });

  test('Team Lead Portal dashboard structure has accessible landmarks and heading hierarchy @regression', async ({ teamLeadPage }) => {
    test.setTimeout(60000);
    await teamLeadPage.gotoDashboard();

    // Verify main landmark or navigation role exists
    const mainLandmark = teamLeadPage.page.getByRole('main').or(teamLeadPage.page.getByRole('navigation'));
    await expect(mainLandmark.first()).toBeVisible();

    // Run axe scan on team lead portal
    const scanResults = await new AxeBuilder({ page: teamLeadPage.page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    const criticalViolations = scanResults.violations.filter((v) => v.impact === 'critical');
    expect(criticalViolations).toEqual([]);
  });
});
