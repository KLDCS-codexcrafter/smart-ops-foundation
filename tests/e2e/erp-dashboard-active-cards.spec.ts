/**
 * Playwright spec — iterates active cards from applications.ts
 * Phase 1: route smoke (load + no error boundary)
 * Phase 2: CRUD probe (find first "New / Create / Add" CTA, open form, cancel)
 *
 * Run with mock-auth credentials via storageState or in-test login.
 */
import { test, expect, Page } from '@playwright/test';
import { applications } from '../../src/components/operix-core/applications';

const MOCK_USER = process.env.E2E_USER ?? 'admin@operix.in';
const MOCK_PASS = process.env.E2E_PASS ?? 'password123';

const active = applications.filter((a) => a.status === 'active');

async function login(page: Page) {
  await page.goto('/auth/login');
  if (page.url().includes('/auth/login')) {
    await page.getByLabel(/email/i).fill(MOCK_USER);
    await page.getByLabel(/password/i).fill(MOCK_PASS);
    await page.getByRole('button', { name: /sign in|log in/i }).click();
    await page.waitForURL((u) => !u.toString().includes('/auth/login'), { timeout: 15_000 });
  }
}

test.describe('ERP Dashboard — active cards smoke', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  for (const app of active) {
    test(`route loads: ${app.id} → ${app.route}`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('console', (m) => {
        if (m.type() === 'error') errors.push(m.text());
      });

      const resp = await page.goto(app.route, { waitUntil: 'domcontentloaded' });
      expect(resp?.status() ?? 200, 'HTTP status').toBeLessThan(500);
      await expect(page).not.toHaveURL(/\/auth\/login/);
      await expect(page.locator('text=/Something went wrong|Failed to fetch/i')).toHaveCount(0);

      // Allow lazy chunks to settle
      await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});

      const fatal = errors.filter(
        (e) => !/manifest|favicon|gpteng|RESET_BLANK_CHECK|key prop/i.test(e),
      );
      expect(fatal, `console errors on ${app.id}`).toEqual([]);
    });
  }
});

test.describe('ERP Dashboard — CRUD probe (open create form & cancel)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  for (const app of active) {
    test(`CRUD probe: ${app.id}`, async ({ page }) => {
      await page.goto(app.route, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});

      const cta = page
        .getByRole('button', { name: /^(new|create|add|\+ new|\+ add)\b/i })
        .first();
      const count = await cta.count();
      test.skip(count === 0, `no Create CTA on ${app.id} landing`);

      await cta.click();
      // Expect a modal/sheet/form to appear
      const dialog = page.locator('[role="dialog"], form').first();
      await expect(dialog).toBeVisible({ timeout: 8_000 });

      // Cancel out — do not persist mock data
      const cancel = page.getByRole('button', { name: /cancel|close/i }).first();
      if (await cancel.count()) await cancel.click();
    });
  }
});
