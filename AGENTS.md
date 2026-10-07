# QA Automation Skills & Agents

This workspace is configured with [test-automation-skills-agents](https://github.com/fugazi/test-automation-skills-agents.git) for QA test automation, E2E testing, API testing, accessibility, and test maintenance.

## Customizations Layout

- **Skills**: `.agents/skills/<skill_name>/SKILL.md`
- **Rules / Instructions**: `.agents/rules/*.md`
- **Specialist Agents**: `.agents/agents/*.agent.md`
- **Shared References**: `.agents/references/`

---

## Available Skills

| Skill | Description & When to Activate |
| :--- | :--- |
| **`playwright-e2e-testing`** | Author and maintain Playwright TypeScript UI specs for browser flows, Page Object Model (POM), custom fixtures, network mocking, and visual comparisons. |
| **`playwright-cli`** | Drive interactive browser sessions, inspection, and verification directly using Playwright CLI. |
| **`playwright-regression-testing`** | Govern test suites, tagging taxonomy (`@smoke`, `@sanity`, `@regression`, `@destructive`), CI sharding, and flaky quarantine. |
| **`api-testing`** | Design and implement REST / GraphQL automated tests with contract validation, schema checks, and payload assertions. |
| **`a11y-playwright-testing`** | Automated accessibility auditing with `@axe-core/playwright`, WCAG 2.2 AA rule checks, color contrast, and a11y reporting. |
| **`accessibility-selenium-testing`** | Accessibility testing for Java Selenium test suites via axe-core. |
| **`webapp-selenium-testing`** | End-to-end browser automation in Java with Selenium WebDriver, explicit waits (`WebDriverWait`), and POM. |
| **`qa-investigation`** | Triage and systematically debug flaky tests, timing discrepancies, and root causes. |
| **`qa-manual-istqb`** | ISTQB-aligned test analysis, boundary value analysis, equivalence partitioning, test case design, and traceability matrix. |
| **`grill-me-qa`** | Adversarial review and risk-based probing of QA strategies, test plans, and architectural test decisions. |

---

## Available Specialist Agents (`.agents/agents/`)

| Agent | Purpose |
| :--- | :--- |
| **`qa-orchestrator`** | Master test architect that coordinates end-to-end testing workflows, delegates to specialists, and enforces quality gates. |
| **`playwright-test-planner`** | Generates detailed test plans and scenario matrices aligned with user stories and requirements. |
| **`playwright-test-generator`** | Implements clean, maintainable Playwright TypeScript tests adhering to POM and custom fixture patterns. |
| **`playwright-test-healer`** | Diagnoses test failures, identifies root causes (timing vs DOM changes vs app bugs), and repairs flaky specs. |
| **`api-tester-specialist`** | Designs resilient API test suites, validates payloads, authentication tokens, and edge-case contracts. |
| **`selenium-test-specialist`** | Implements and refactors Java/Selenium WebDriver tests following POM and explicit wait conventions. |
| **`test-refactor-specialist`** | Refactors existing test suites to remove code smells, eliminate hardcoded waits, and optimize execution speed. |

---

## Core Non-Negotiable Test Rules

1. **Locator Priority**: `getByRole()` with accessible name $\rightarrow$ `getByLabel()` $\rightarrow$ `getByPlaceholder()` $\rightarrow$ `getByText()` $\rightarrow$ `getByTestId()` $\rightarrow$ CSS (last resort). Avoid XPath.
2. **Web-first Assertions**: Always use auto-retrying assertions like `await expect(locator).toBeVisible()`. Never use throw-based checks or raw boolean assertions.
3. **No Hard Waits**: `waitForTimeout()` and `Thread.sleep()` are strictly forbidden. Always wait for specific state or web element conditions.
4. **Single-Tag Taxonomy**: Exactly one primary tag per test: `@smoke`, `@sanity`, `@regression`, `@e2e`, `@api`, or `@destructive`. `@destructive` tests must run isolated without concurrency.
5. **Page Object Model (POM)**: Keep test specs lean by encapsulating selectors and page interactions in typed Page Objects injected through custom fixtures.
