const { chromium } = require('playwright');

async function runAuthTests() {
  console.log('=== STARTING PLAYWRIGHT BROWSER E2E TESTS ===\n');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // 1. First-time website visit
    console.log('Test 1: First-time website visit to http://localhost:3000/');
    await page.goto('http://localhost:3000/');
    await page.waitForURL(/#\/login/);
    console.log('   URL redirected to:', page.url());
    const loginHeader = await page.textContent('h2');
    console.log('   Header text:', loginHeader?.trim());
    if (page.url().includes('#/login') && loginHeader?.includes('Sign In to Workspace')) {
      console.log('   -> TEST 1 PASSED: First visit redirects to Login page\n');
    } else {
      throw new Error('Test 1 Failed: Not on login page');
    }

    // 2. Direct access to dashboard without login
    console.log('Test 2: Direct URL access to #/admin/dashboard without auth');
    await page.goto('http://localhost:3000/#/admin/dashboard');
    await page.waitForURL(/#\/login/);
    console.log('   URL redirected to:', page.url());
    if (page.url().includes('#/login')) {
      console.log('   -> TEST 2 PASSED: Direct dashboard access redirects to Login page\n');
    } else {
      throw new Error('Test 2 Failed: Did not redirect to login');
    }

    // 3. Admin login
    console.log('Test 3: Admin login with valid credentials');
    await page.goto('http://localhost:3000/#/login');
    await page.fill('input[type="email"]', 's.ronda@oklut.com');
    await page.fill('input[placeholder="••••••••"]', 'Shruthi@123');
    await page.click('button[type="submit"]');

    await page.waitForURL(/#\/admin\/dashboard/, { timeout: 10000 });
    console.log('   URL after admin login:', page.url());
    await page.waitForSelector('text=Total Tickets', { timeout: 10000 });
    console.log('   Admin dashboard mounted and loaded successfully.');
    console.log('   -> TEST 3 PASSED: Admin login immediately opens Admin Dashboard\n');

    // 4. Page refresh with existing session
    console.log('Test 4: Page refresh with existing session');
    await page.reload();
    await page.waitForURL(/#\/admin\/dashboard/, { timeout: 10000 });
    await page.waitForSelector('text=Total Tickets', { timeout: 10000 });
    console.log('   URL after refresh:', page.url());
    console.log('   -> TEST 4 PASSED: Page refresh maintains session on Admin Dashboard\n');

    // 5. Logout and back button protection
    console.log('Test 5: Logout and browser back-button protection');
    // Open profile menu
    const profileBtn = page.locator('header button:has(svg.lucide-chevron-down)').last();
    await profileBtn.click();
    await page.waitForSelector('text=Logout', { timeout: 5000 });
    await page.click('text=Logout');
    await page.waitForURL(/#\/login/, { timeout: 10000 });
    console.log('   URL after logout:', page.url());

    // Click browser back button
    console.log('   Clicking browser Back button...');
    await page.goBack();
    await page.waitForTimeout(1000);
    console.log('   URL after clicking Back:', page.url());
    if (page.url().includes('#/login')) {
      console.log('   -> TEST 5 PASSED: Back button blocked; user remains on Login page\n');
    } else {
      throw new Error(`Test 5 Failed: Back button allowed entry to ${page.url()}`);
    }

    // 6. Team Lead login
    console.log('Test 6: Team Lead login');
    page.on('console', (msg) => console.log('   [Browser Console]:', msg.text()));
    await page.fill('input[type="email"]', 'k.ananthu@oklut.com');
    await page.fill('input[placeholder="••••••••"]', 'Kotesh@123');
    await page.click('button[type="submit"]');
    try {
      await page.waitForURL(/#\/teamlead\/dashboard/, { timeout: 10000 });
      console.log('   URL after Team Lead login:', page.url());
      await page.waitForSelector('text=Team Lead Dashboard', { timeout: 10000 });
      console.log('   Team Lead dashboard mounted successfully.');
    } catch (e) {
      const errorText = await page.locator('.bg-rose-50, .text-rose-700').textContent().catch(() => null);
      console.log('   Page error banner:', errorText);
      console.log('   Current page URL:', page.url());
      throw e;
    }

    // Logout Team Lead
    console.log('   Logging out Team Lead...');
    const tlLogoutBtn = page.locator('aside button[title="Logout"]').first();
    await tlLogoutBtn.click();
    await page.waitForSelector('text=Sign Out, text=Confirm', { timeout: 5000 }).catch(() => {});
    const confirmLogout = page.locator('button:has-text("Sign Out"), button:has-text("Logout"), button:has-text("Confirm")').last();
    if (await confirmLogout.isVisible()) {
      await confirmLogout.click();
    }
    await page.waitForURL(/#\/login/, { timeout: 10000 });
    console.log('   URL after Team Lead logout:', page.url());
    console.log('   -> TEST 6 PASSED: Team Lead login opens dashboard and logs out cleanly\n');

    // 7. Employee login
    console.log('Test 7: Employee login');
    await page.fill('input[type="email"]', 'u.vadlamudi@oklut.com');
    await page.fill('input[placeholder="••••••••"]', 'Password123');
    await page.click('button[type="submit"]');
    await page.waitForURL(/#\/employee\/dashboard/, { timeout: 10000 });
    console.log('   URL after Employee login:', page.url());
    await page.waitForSelector('text=Create Ticket', { timeout: 10000 });
    console.log('   Employee dashboard mounted successfully.');

    // Logout Employee
    console.log('   Logging out Employee...');
    const empSignOutBtn = page.locator('aside button:has-text("Sign Out")').first();
    await empSignOutBtn.click();
    await page.waitForURL(/#\/login/, { timeout: 10000 });
    console.log('   URL after Employee logout:', page.url());
    console.log('   -> TEST 7 PASSED: Employee login opens dashboard and logs out cleanly\n');

    console.log('==============================================');
    console.log('ALL BROWSER E2E FLOW TESTS PASSED SUCCESSFULLY');
    console.log('==============================================');
  } finally {
    await browser.close();
  }
}

runAuthTests().catch((err) => {
  console.error('\nTEST FAILED WITH ERROR:', err);
  process.exit(1);
});
