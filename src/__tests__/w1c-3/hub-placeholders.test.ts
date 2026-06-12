/**
 * @sprint W1C-3 Block 2 — hub placeholder fills/rephrases
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (p: string) => readFileSync(p, 'utf8');

describe('W1C-3 · hub placeholders are honest', () => {
  it('AccountingHub: stale "Coming Soon" tile sections removed', () => {
    const src = read('src/pages/erp/accounting/AccountingHub.tsx');
    expect(src).not.toMatch(/PAYROLL_COMING_SOON/);
    expect(src).not.toMatch(/COMING_SOON_CARDS/);
    expect(src).not.toMatch(/>Coming Soon</);
  });

  it('hub fallback panels no longer say "Coming Soon"', () => {
    for (const f of [
      'src/pages/erp/customer-hub/CustomerHubPage.tsx',
      'src/pages/erp/distributor-hub/DistributorHubPage.tsx',
      'src/features/salesx/SalesXPage.tsx',
      'src/features/pay-hub/PayHubPage.tsx',
      'src/pages/erp/dispatch/DispatchOpsPage.tsx',
      'src/pages/erp/dispatch/DispatchHubPage.tsx',
    ]) {
      const src = read(f);
      expect(src, f).not.toMatch(/Coming Soon/);
      expect(src, f).toMatch(/Module not yet wired/);
    }
  });

  it('erp/Dashboard toast/badge reworded honestly to Wave-2', () => {
    const src = read('src/pages/erp/Dashboard.tsx');
    expect(src).toMatch(/arrives with Wave-2/);
    expect(src).toMatch(/Wave-2/);
    expect(src).not.toMatch(/coming soon/);
  });

  it('CalendarPage comment tidied (no stale Coming Soon marker)', () => {
    const src = read('src/pages/erp/comply360/calendar/CalendarPage.tsx');
    expect(src).not.toMatch(/Coming Soon since S69/);
  });
});
