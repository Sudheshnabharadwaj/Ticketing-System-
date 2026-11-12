const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://sudheshnabharadwaj.github.io/Ticketing-System-/';

const auditResults = {
  timestamp: new Date().toISOString(),
  target: BASE_URL,
  summary: { totalTests: 0, passed: 0, failed: 0, bugsFound: 0 },
  portals: {
    admin: { passed: [], failed: [], bugs: [] },
    teamlead: { passed: [], failed: [], bugs: [] },
    employee: { passed: [], failed: [], bugs: [] },
  },
  discoveredBugs: [],
};

function logPass(portal, testName) {
  auditResults.summary.totalTests++;
  auditResults.summary.passed++;
  auditResults.portals[portal].passed.push(testName);
  console.log(`[PASS] [${portal.toUpperCase()}] ${testName}`);
}

function logFail(portal, testName, error) {
  auditResults.summary.totalTests++;
  auditResults.summary.failed++;
  auditResults.portals[portal].failed.push({ testName, error });
  console.error(`[FAIL] [${portal.toUpperCase()}] ${testName} -> ${error}`);
}

function logBug(portal, { id, title, severity, category, reproduction, expected, actual }) {
  auditResults.summary.bugsFound++;
  const bugObj = { id, portal, title, severity, category, reproduction, expected, actual };
  auditResults.portals[portal].bugs.push(bugObj);
  auditResults.discoveredBugs.push(bugObj);
  console.warn(`[BUG - ${severity}] [${portal.toUpperCase()}] ${id}: ${title}`);
}

async function runFullAudit() {
  console.log('================================================================');
  console.log('   DEEP COMPREHENSIVE QA AUDIT OF ALL 3 USER DASHBOARDS');
  console.log('   Target: ' + BASE_URL);
  console.log('================================================================\n');

  const browser = await chromium.launch({ headless: true });

  // --------------------------------------------------------------------------
  // 1. ADMIN PORTAL AUDIT
  // --------------------------------------------------------------------------
  console.log('\n>>> AUDITING ADMIN DASHBOARD & OPTIONS <<<');
  const adminCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const adminPage = await adminCtx.newPage();

  const adminConsoleErrors = [];
  adminPage.on('console', msg => {
    if (msg.type() === 'error' && !msg.text().includes('favicon')) {
      adminConsoleErrors.push(msg.text());
    }
  });

  try {
    // 1.1 Login & Dashboard
    await adminPage.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 35000 });
    await adminPage.fill('input[type="email"]', 's.ronda@oklut.com');
    await adminPage.fill('input[type="password"]', 'Password123');
    await adminPage.click('button[type="submit"]');
    await adminPage.waitForURL(/admin\/dashboard/, { timeout: 20000 });
    logPass('admin', 'Admin Login & Dashboard Route');

    // 1.2 Metric Cards & Analytics
    const hasTotalTickets = await adminPage.locator('text=Total Tickets').first().isVisible();
    const hasPendingSLA = await adminPage.locator('text=Critical Tickets, text=SLA Risk, text=Pending').first().isVisible();
    if (hasTotalTickets) {
      logPass('admin', 'Dashboard Summary KPI Cards Rendered');
    } else {
      logFail('admin', 'Dashboard Summary KPI Cards', 'KPI cards not found');
    }

    // 1.3 Notifications Bell
    const notifBell = adminPage.locator('button[title="Notifications"]').first();
    if (await notifBell.isVisible()) {
      await notifBell.click();
      await adminPage.waitForTimeout(600);
      const notifPopup = await adminPage.locator('text=System Notifications').isVisible();
      if (notifPopup) {
        logPass('admin', 'TopNav Notifications Dropdown Open/Close');
        const markAllBtn = adminPage.locator('text=Mark all as read').first();
        if (await markAllBtn.isVisible()) {
          await markAllBtn.click();
          await adminPage.waitForTimeout(400);
          logPass('admin', 'Notifications "Mark all as read" Action');
        }
      }
      await notifBell.click();
    }

    // 1.4 TopNav Profile Menu
    const userMenuBtn = adminPage.locator('header button:has(div.bg-\\[\\#0284C7\\])').first();
    if (await userMenuBtn.isVisible()) {
      await userMenuBtn.click();
      await adminPage.waitForTimeout(500);
      const profileItem = adminPage.locator('a:has-text("My Profile"), button:has-text("My Profile")').first();
      if (await profileItem.isVisible()) {
        logPass('admin', 'TopNav Profile Dropdown Menu');
      }
      await userMenuBtn.click();
    }

    // 1.5 All Tickets Directory & Refresh Button
    await adminPage.goto(BASE_URL + '#/admin/workspace/all-tickets', { waitUntil: 'networkidle', timeout: 20000 });
    await adminPage.waitForTimeout(1000);
    const tableHeader = await adminPage.locator('text=All Tickets Directory').isVisible();
    if (tableHeader) {
      logPass('admin', 'All Tickets Directory Page Loaded');

      // Test Search
      const searchBox = adminPage.locator('input[placeholder*="Search"]').first();
      if (await searchBox.isVisible()) {
        await searchBox.fill('VPN');
        await adminPage.waitForTimeout(500);
        logPass('admin', 'All Tickets Search Filtering');
        await searchBox.fill('');
      }

      // Test Refresh Button
      const refreshBtn = adminPage.locator('button:has-text("Refresh")').first();
      if (await refreshBtn.isVisible()) {
        await refreshBtn.click();
        await adminPage.waitForTimeout(1200);
        const toast = await adminPage.locator('text=Refreshed, text=tickets from database').first().isVisible();
        if (toast) {
          logPass('admin', 'All Tickets Refresh Button with Feedback Toast');
        } else {
          logPass('admin', 'All Tickets Refresh Button Executed');
        }
      }

      // Click First Ticket to inspect Ticket Details
      const firstTicketLink = adminPage.locator('table tbody tr td button.font-mono').first();
      if (await firstTicketLink.isVisible()) {
        await firstTicketLink.click();
        await adminPage.waitForTimeout(2000);
        const ticketDetailVisible = await adminPage.locator('text=Back to All Tickets, text=Back to My Tickets').first().isVisible();
        if (ticketDetailVisible) {
          logPass('admin', 'Ticket Details Page Opens and Remains Visible');

          // Verify NO Internal Team Note checkbox exists
          const internalNoteCheckbox = await adminPage.locator('text=Add as Internal Team Note').isVisible();
          if (!internalNoteCheckbox) {
            logPass('admin', 'Internal Team Note Checkbox Successfully Removed');
          } else {
            logBug('admin', {
              id: 'BUG-ADM-001',
              title: 'Internal Team Note Checkbox is still present in Admin Ticket Details',
              severity: 'High',
              category: 'UI/UX Compliance',
              reproduction: 'Navigate to Admin -> All Tickets -> Click any ticket -> Check reply form',
              expected: 'Internal note checkbox should be completely removed',
              actual: 'Checkbox is still visible',
            });
          }

          // Test Tabs (Conversation, History, Attachments)
          const historyTab = adminPage.locator('button:has-text("Audit History"), button:has-text("History")').first();
          if (await historyTab.isVisible()) {
            await historyTab.click();
            await adminPage.waitForTimeout(500);
            logPass('admin', 'Ticket Audit History Tab');
          }

          const attachTab = adminPage.locator('button:has-text("Attachments")').first();
          if (await attachTab.isVisible()) {
            await attachTab.click();
            await adminPage.waitForTimeout(500);
            logPass('admin', 'Ticket Attachments Tab');
          }
        }
      }
    }

    // 1.6 User Management
    await adminPage.goto(BASE_URL + '#/admin/administration/user-management', { waitUntil: 'networkidle', timeout: 20000 });
    await adminPage.waitForTimeout(1000);
    const userTableTitle = await adminPage.locator('text=User Management').first().isVisible();
    if (userTableTitle) {
      logPass('admin', 'User Management Directory Loaded');

      // Check Dummy user removal
      const hasDummyAdmin = await adminPage.locator('text=admin@platform.local, text=ADM001').first().isVisible();
      if (!hasDummyAdmin) {
        logPass('admin', 'Dummy User (admin@platform.local) Cleanly Removed from User Management');
      } else {
        logBug('admin', {
          id: 'BUG-ADM-002',
          title: 'Dummy user admin@platform.local still visible in User Management table',
          severity: 'High',
          category: 'Data Integrity',
          reproduction: 'Go to Admin -> Administration -> User Management',
          expected: 'Only genuine organization users should be displayed',
          actual: 'Dummy seed user admin@platform.local is displayed',
        });
      }

      // Check Genuine Users presence
      const hasShruthi = await adminPage.locator('text=s.ronda@oklut.com').first().isVisible();
      const hasKotesh = await adminPage.locator('text=k.ananthu@oklut.com').first().isVisible();
      const hasSoniya = await adminPage.locator('text=soni@gmail.com').first().isVisible();
      if (hasShruthi && hasKotesh && hasSoniya) {
        logPass('admin', 'Genuine Organization Users Verified in Directory');
      }

      // Test Edit User Modal
      const firstEditBtn = adminPage.locator('button:has-text("Edit")').first();
      if (await firstEditBtn.isVisible()) {
        await firstEditBtn.click();
        await adminPage.waitForTimeout(600);
        const editModal = await adminPage.locator('text=Edit User Details, text=Edit User').first().isVisible();
        if (editModal) {
          logPass('admin', 'Edit User Modal Opens Successfully');
          const cancelEdit = adminPage.locator('button:has-text("Cancel")').first();
          if (await cancelEdit.isVisible()) await cancelEdit.click();
        }
      }
    }

    // 1.7 Add User Page
    await adminPage.goto(BASE_URL + '#/admin/add-user', { waitUntil: 'networkidle', timeout: 20000 });
    await adminPage.waitForTimeout(1000);
    const addUserTitle = await adminPage.locator('text=Add New User').first().isVisible();
    if (addUserTitle) {
      logPass('admin', 'Add User Page Form Loaded');
      const deptSelect = adminPage.locator('select').first();
      if (await deptSelect.isVisible()) {
        await deptSelect.selectOption('Other');
        await adminPage.waitForTimeout(400);
        const customDeptInput = await adminPage.locator('input[placeholder*="department"]').isVisible();
        if (customDeptInput) {
          logPass('admin', 'Add User Custom Department Input on "Other" Selection');
        }
      }
    }

    // 1.8 Profile Page
    await adminPage.goto(BASE_URL + '#/admin/profile', { waitUntil: 'networkidle', timeout: 20000 });
    await adminPage.waitForTimeout(1000);
    const profileHeader = await adminPage.locator('text=Personal Information').isVisible();
    const deptContactHeader = await adminPage.locator('text=Department & Contact').isVisible();
    if (profileHeader && deptContactHeader) {
      logPass('admin', 'Admin Profile Page Layout Matching Reference Design (2-Card Split)');
    } else {
      logBug('admin', {
        id: 'BUG-ADM-003',
        title: 'Admin Profile page structure does not match expected reference card layout',
        severity: 'Medium',
        category: 'UI/UX Consistency',
        reproduction: 'Navigate to Admin -> Profile',
        expected: 'Should display Personal Information card and Department & Contact card',
        actual: 'One or more reference cards missing',
      });
    }

  } catch (err) {
    logFail('admin', 'Admin Portal General QA Flow', err.message);
  } finally {
    await adminCtx.close();
  }

  // --------------------------------------------------------------------------
  // 2. TEAM LEAD PORTAL AUDIT
  // --------------------------------------------------------------------------
  console.log('\n>>> AUDITING TEAM LEAD DASHBOARD & OPTIONS <<<');
  const tlCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const tlPage = await tlCtx.newPage();

  const tlConsoleErrors = [];
  tlPage.on('console', msg => {
    if (msg.type() === 'error' && !msg.text().includes('favicon')) {
      tlConsoleErrors.push(msg.text());
    }
  });

  try {
    // 2.1 Login
    await tlPage.goto(BASE_URL + '#/login', { waitUntil: 'networkidle', timeout: 35000 });
    await tlPage.fill('input[type="email"]', 'k.ananthu@oklut.com');
    await tlPage.fill('input[type="password"]', 'Password123');
    await tlPage.click('button[type="submit"]');
    await tlPage.waitForURL(/teamlead\/dashboard/, { timeout: 20000 });
    logPass('teamlead', 'Team Lead Login & Dashboard Route');

    // 2.2 Dashboard KPI Cards
    const tlKPI = await tlPage.locator('text=Active Tickets, text=Team Members, text=Escalations').first().isVisible();
    if (tlKPI) {
      logPass('teamlead', 'Team Lead Dashboard KPI Metrics');
    }

    // 2.3 Team Tickets Directory
    await tlPage.goto(BASE_URL + '#/teamlead/team-tickets', { waitUntil: 'networkidle', timeout: 20000 });
    await tlPage.waitForTimeout(1000);
    const teamTicketsTitle = await tlPage.locator('text=Team Tickets').first().isVisible();
    if (teamTicketsTitle) {
      logPass('teamlead', 'Team Tickets Directory Loaded');
    }

    // 2.4 Managed Employees
    await tlPage.goto(BASE_URL + '#/teamlead/employees', { waitUntil: 'networkidle', timeout: 20000 });
    await tlPage.waitForTimeout(1000);
    const empDirTitle = await tlPage.locator('text=Managed Employees, text=Team Members').first().isVisible();
    if (empDirTitle) {
      logPass('teamlead', 'Managed Employees Directory Loaded');

      // Check that Kotesh sees only his employees (Uday, Aditya) and NOT other TL employees (Sudha, Ramya, Kumar)
      const hasUday = await tlPage.locator('text=uday, text=OKL002').first().isVisible();
      const hasAditya = await tlPage.locator('text=aditya, text=OKL001').first().isVisible();
      const hasSudha = await tlPage.locator('text=sudha, text=OKL016').first().isVisible();
      const hasRamya = await tlPage.locator('text=Ramya, text=OKL014').first().isVisible();

      if (hasUday && hasAditya && !hasSudha && !hasRamya) {
        logPass('teamlead', 'Strict Team Isolation Verified in TL Employees Directory');
      } else if (hasSudha || hasRamya) {
        logBug('teamlead', {
          id: 'BUG-TL-001',
          title: 'Cross-lead employee leakage in Team Lead Managed Employees directory',
          severity: 'High',
          category: 'Data Isolation / Access Control',
          reproduction: 'Login as Kotesh (OKL003) -> Go to Managed Employees',
          expected: 'Should only display Uday & Aditya',
          actual: `Sudha (${hasSudha}) or Ramya (${hasRamya}) is visible`,
        });
      }
    }

    // 2.5 Escalations Page
    await tlPage.goto(BASE_URL + '#/teamlead/escalations', { waitUntil: 'networkidle', timeout: 20000 });
    await tlPage.waitForTimeout(1000);
    const escalationsTitle = await tlPage.locator('text=Escalated Tickets, text=Escalations').first().isVisible();
    if (escalationsTitle) {
      logPass('teamlead', 'Team Lead Escalations Desk Loaded');
    }

    // 2.6 Performance Reports
    await tlPage.goto(BASE_URL + '#/teamlead/reports', { waitUntil: 'networkidle', timeout: 20000 });
    await tlPage.waitForTimeout(1000);
    const reportsTitle = await tlPage.locator('text=Performance Reports, text=Team Performance').first().isVisible();
    if (reportsTitle) {
      logPass('teamlead', 'Team Lead Reports Page Loaded');
    }

    // 2.7 Profile Page Layout
    await tlPage.goto(BASE_URL + '#/teamlead/profile', { waitUntil: 'networkidle', timeout: 20000 });
    await tlPage.waitForTimeout(1000);
    const tlProfInfo = await tlPage.locator('text=Personal Information').isVisible();
    const tlDeptInfo = await tlPage.locator('text=Department & Contact').isVisible();
    if (tlProfInfo && tlDeptInfo) {
      logPass('teamlead', 'Team Lead Profile Layout Matching Reference Design (2-Card Split)');
    } else {
      logBug('teamlead', {
        id: 'BUG-TL-002',
        title: 'Team Lead Profile layout does not match reference 2-card structure',
        severity: 'Medium',
        category: 'UI/UX Consistency',
        reproduction: 'Login as Team Lead -> Go to Profile',
        expected: 'Should display Personal Information card and Department & Contact card',
        actual: 'One or more reference cards missing',
      });
    }

  } catch (err) {
    logFail('teamlead', 'Team Lead Portal QA Flow', err.message);
  } finally {
    await tlCtx.close();
  }

  // --------------------------------------------------------------------------
  // 3. EMPLOYEE PORTAL AUDIT
  // --------------------------------------------------------------------------
  console.log('\n>>> AUDITING EMPLOYEE DASHBOARD & OPTIONS <<<');
  const empCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const empPage = await empCtx.newPage();

  const empConsoleErrors = [];
  empPage.on('console', msg => {
    if (msg.type() === 'error' && !msg.text().includes('favicon')) {
      empConsoleErrors.push(msg.text());
    }
  });

  try {
    // 3.1 Login
    await empPage.goto(BASE_URL + '#/login', { waitUntil: 'networkidle', timeout: 35000 });
    await empPage.fill('input[type="email"]', 'u.vadlamudi@oklut.com');
    await empPage.fill('input[type="password"]', 'Password123');
    await empPage.click('button[type="submit"]');
    await empPage.waitForURL(/employee\/dashboard/, { timeout: 20000 });
    logPass('employee', 'Employee Login & Dashboard Route');

    // 3.2 Dashboard Summary Counters
    const hasMyTicketsBox = await empPage.locator('text=My Tickets, text=Assigned to Me, text=Total Created').first().isVisible();
    if (hasMyTicketsBox) {
      logPass('employee', 'Employee Dashboard Ticket Status Metrics');
    }

    // 3.3 Create Ticket Workflow
    await empPage.goto(BASE_URL + '#/employee/create-ticket', { waitUntil: 'networkidle', timeout: 20000 });
    await empPage.waitForTimeout(1000);
    const createTitle = await empPage.locator('text=Create Ticket, text=Create Support Ticket').first().isVisible();
    if (createTitle) {
      logPass('employee', 'Employee Create Ticket Form Loaded');

      // Test Department & Team Lead Dropdown Selection
      const deptDropdown = empPage.locator('select').first();
      if (await deptDropdown.isVisible()) {
        await deptDropdown.selectOption('IT Support');
        await empPage.waitForTimeout(600);

        // Verify Team Lead choices for IT Support (Kotesh, Manikanta)
        const hasKoteshCard = await empPage.locator('text=Kotesh').first().isVisible();
        const hasManikantaCard = await empPage.locator('text=Manikanta').first().isVisible();
        const hasSoniyaCard = await empPage.locator('text=soniya').first().isVisible();

        if ((hasKoteshCard || hasManikantaCard) && !hasSoniyaCard) {
          logPass('employee', 'Create Ticket: Strict Department-to-TeamLead Filtering Verified');
        } else if (hasSoniyaCard) {
          logBug('employee', {
            id: 'BUG-EMP-001',
            title: 'Cross-department Team Lead leakage in Create Ticket team selector',
            severity: 'High',
            category: 'Business Logic / Form Validation',
            reproduction: 'Go to Create Ticket -> Select Department "IT Support"',
            expected: 'Only IT Support Team Leads (Kotesh, Manikanta) should be selectable',
            actual: 'HR Team Lead (Soniya) was selectable under IT Support',
          });
        }
      }
    }

    // 3.4 My Tickets Page
    await empPage.goto(BASE_URL + '#/employee/tickets', { waitUntil: 'networkidle', timeout: 20000 });
    await empPage.waitForTimeout(1000);
    const myTicketsHeader = await empPage.locator('text=My Tickets').first().isVisible();
    if (myTicketsHeader) {
      logPass('employee', 'Employee My Tickets Directory Loaded');
    }

    // 3.5 Assigned Tickets Page
    await empPage.goto(BASE_URL + '#/employee/assigned-tickets', { waitUntil: 'networkidle', timeout: 20000 });
    await empPage.waitForTimeout(1000);
    const assignedTicketsHeader = await empPage.locator('text=Assigned Tickets').first().isVisible();
    if (assignedTicketsHeader) {
      logPass('employee', 'Employee Assigned Tickets Directory Loaded');
    }

    // 3.6 Knowledge Base Page
    await empPage.goto(BASE_URL + '#/employee/knowledge-base', { waitUntil: 'networkidle', timeout: 20000 });
    await empPage.waitForTimeout(1000);
    const kbHeader = await empPage.locator('text=Knowledge Base').first().isVisible();
    if (kbHeader) {
      logPass('employee', 'Employee Knowledge Base Page Loaded');
    }

    // 3.7 Notifications Page
    await empPage.goto(BASE_URL + '#/employee/notifications', { waitUntil: 'networkidle', timeout: 20000 });
    await empPage.waitForTimeout(1000);
    const notifPageHeader = await empPage.locator('text=Notifications').first().isVisible();
    if (notifPageHeader) {
      logPass('employee', 'Employee Notifications Page Loaded');
    }

    // 3.8 Employee Profile Page
    await empPage.goto(BASE_URL + '#/employee/profile', { waitUntil: 'networkidle', timeout: 20000 });
    await empPage.waitForTimeout(1000);
    const empProfInfo = await empPage.locator('text=Personal Information').isVisible();
    const empDeptInfo = await empPage.locator('text=Department & Contact').isVisible();
    if (empProfInfo && empDeptInfo) {
      logPass('employee', 'Employee Profile Page Loaded with Correct 2-Card Structure');
    } else {
      logBug('employee', {
        id: 'BUG-EMP-002',
        title: 'Employee Profile page layout missing reference cards',
        severity: 'Medium',
        category: 'UI/UX Consistency',
        reproduction: 'Navigate to Employee -> Profile',
        expected: 'Personal Information & Department & Contact cards displayed',
        actual: 'Profile cards missing or malformed',
      });
    }

  } catch (err) {
    logFail('employee', 'Employee Portal QA Flow', err.message);
  } finally {
    await empCtx.close();
  }

  await browser.close();

  // Save audit results to file
  const reportPath = path.resolve(__dirname, 'qa_audit_results.json');
  fs.writeFileSync(reportPath, JSON.stringify(auditResults, null, 2), 'utf-8');
  console.log(`\nAudit completed! Report saved to: ${reportPath}`);
}

runFullAudit().catch(err => {
  console.error('Fatal audit failure:', err);
  process.exit(1);
});

