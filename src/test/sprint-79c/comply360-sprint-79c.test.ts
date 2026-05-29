/**
 * @file        src/test/sprint-79c/comply360-sprint-79c.test.ts
 * @purpose     Sprint 79c Pass C done-gate test pack · atomic 29-redirect sweep + 2 deep-links + Lesson 29 cascade.
 * @sprint      Sprint 79c · T-Phase-5.A.1.11-PASS-C · FLOOR 1 FINALE
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { SPRINTS, getSprintCount, getCurrentAStreak } from '@/lib/_institutional/sprint-history';
import { SIBLINGS, getSiblingCount } from '@/lib/_institutional/sibling-register';

const read = (rel: string): string => fs.readFileSync(path.join(process.cwd(), rel), 'utf-8');

describe('Sprint 79c · Pass C · atomic 29-redirect sweep', () => {
  it('sprint-history has Sprint 79c id-lookup entry · grade A · headSha backfilled by S79d (Lesson 24 bounds-check · S79d backfilled e3a0a7d3)', () => {
    const entry = SPRINTS.find(s => s.code === 'T-Phase-5.A.1.11-PASS-C');
    expect(entry).toBeDefined();
    expect(entry?.grade).toMatch(/^A/);
    expect(entry?.headSha).toBe('e3a0a7d36e2f3fc33e1062498d2959f49ee31caf');
    expect(entry?.predecessorSha).toBe('bf1eb97713eb5cfe5a87fecc302673df06b5bc1b');
    expect(entry?.newSiblings).toEqual([]);
  });

  it('sprint-history 79b SHA-fill landed (Lesson 26 · bookkeeping-FIRST)', () => {
    const b = SPRINTS.find(s => s.code === 'T-Phase-5.A.1.11-PASS-B');
    expect(b?.headSha).toBe('bf1eb97713eb5cfe5a87fecc302673df06b5bc1b');
  });

  it('A-streak bounds-check ≥ 34 (Lesson 24)', () => {
    expect(getCurrentAStreak()).toBeGreaterThanOrEqual(34);
  });

  it('SIBLINGS bounds-check ≥ 91 (no new siblings in Pass C)', () => {
    expect(getSiblingCount()).toBeGreaterThanOrEqual(91);
    expect(SIBLINGS.length).toBeGreaterThanOrEqual(91);
  });

  it('SPRINTS bounds-check ≥ 87', () => {
    expect(getSprintCount()).toBeGreaterThanOrEqual(87);
  });

  it('29 or more comply360 Navigate components present in src/', () => {
    const out = execSync(
      'grep -rE "<Navigate to=\\"/erp/comply360/" src/ | wc -l',
      { encoding: 'utf-8' },
    ).trim();
    expect(parseInt(out, 10)).toBeGreaterThanOrEqual(29);
  });

  it('every Navigate to /erp/comply360/ uses replace prop (browser-history correctness · DP-S79-3)', () => {
    const out = execSync(
      'grep -rE "<Navigate to=\\"/erp/comply360/" src/ | grep -v "replace" | wc -l',
      { encoding: 'utf-8' },
    ).trim();
    expect(parseInt(out, 10)).toBe(0);
  });

  it('Form3CEB redirect uses actual S77b path /exim/foreign-tax/form-3ceb (DP-S79-4 Option A)', () => {
    const out = execSync(
      'grep -rE "<Navigate to=\\"/erp/comply360/exim/foreign-tax/form-3ceb\\"" src/ | wc -l',
      { encoding: 'utf-8' },
    ).trim();
    expect(parseInt(out, 10)).toBeGreaterThanOrEqual(1);
  });

  it('FA-redirect lock executed (DP-S79-5 · 5 FA reports redirected atomically)', () => {
    const app = read('src/App.tsx');
    expect(app).toContain('/erp/fincore/statutory-fa-pack/CARO20Disclosure');
    expect(app).toContain('/erp/fincore/statutory-fa-pack/IndAS116ROUSchedule');
    expect(app).toContain('/erp/fincore/statutory-fa-pack/MSMECapitalBreaches');
    expect(app).toContain('/erp/fincore/statutory-fa-pack/EPCGStatusReport');
    expect(app).toContain('/erp/fincore/statutory-fa-pack/FALedgerPackReport');
  });

  it('PayHub StatutoryReturns redirect present', () => {
    const app = read('src/App.tsx');
    expect(app).toContain('/erp/pay-hub/transactions/StatutoryReturns');
    expect(app).toContain('/erp/comply360/payroll/statutory-returns');
  });

  it('EximX compliance 4 redirects present', () => {
    const app = read('src/App.tsx');
    expect(app).toContain('/erp/eximx/compliance/CAROTARRoOMatrix');
    expect(app).toContain('/erp/eximx/compliance/EWSDashboard');
    expect(app).toContain('/erp/eximx/compliance/AEOBenefitsDashboard');
    expect(app).toContain('/erp/eximx/compliance/Form3CEBDashboard');
  });

  it('Vendor Portal Msme43Bh redirect present', () => {
    const app = read('src/App.tsx');
    expect(app).toContain('/erp/vendor-portal/panels/Msme43BhTrackerPanel');
    expect(app).toContain('/erp/comply360/vendor/msme-43bh-tracker');
  });

  it('CFRPart11DeeplinkPage has window.location.href deep-link to QualiCheck viewer', () => {
    const src = read('src/pages/erp/comply360/companies/CFRPart11DeeplinkPage.tsx');
    expect(src).toContain("window.location.href = '/erp/qualicheck/reports/CFRPart11AuditTrailViewer'");
  });

  it('ScheduleMPage has window.location.href deep-link to QualiCheck dashboard', () => {
    const src = read('src/pages/erp/comply360/companies/ScheduleMPage.tsx');
    expect(src).toContain("window.location.href = '/erp/qualicheck/reports/ScheduleMComplianceDashboard'");
  });

  it('Lesson 29 cascade · scan banked tests for old card-route route-assertions (≤1 file-exists hit acceptable · documented)', () => {
    const out = execSync(
      'grep -rn "/erp/fincore/reports/gst\\|/erp/fincore/reports/Form\\|/erp/fincore/reports/TDS\\|/erp/fincore/reports/Audit\\|/erp/fincore/statutory-fa-pack\\|/erp/pay-hub/transactions/StatutoryReturns\\|/erp/eximx/compliance\\|/erp/vendor-portal/panels/Msme43BhTrackerPanel" src/test/ || true',
      { encoding: 'utf-8' },
    );
    // Only 1 acceptable hit: form-3ceb-ui.test.ts file-exists check (component file still present post-redirect).
    const hits = out.trim().split('\n').filter(l => l.length > 0 && !l.includes('comply360-sprint-79c.test.ts'));
    expect(hits.length).toBeLessThanOrEqual(1);
    if (hits.length === 1) {
      expect(hits[0]).toContain('fs.existsSync');
    }
  });

  it('FR-105 done-gate · no toBe-equality on registry counts in src/test/ (bounds-check only · string-concat trick · Lesson 29)', () => {
    const pat = 'getSiblingCount()'+').toBe('+'\\|getSprintCount()'+').toBe('+'\\|getCurrentAStreak()'+').toBe(';
    const out = execSync(
      'grep -rn --exclude=comply360-sprint-77b.test.ts --exclude=comply360-sprint-78b.test.ts --exclude=comply360-sprint-79c.test.ts "' + pat + '" src/test/ || true',
      { encoding: 'utf-8' },
    );
    expect(out.trim()).toBe('');
  });

  it('§H 0-DIFF · all 3 S79a engines + 11 S79a stubs + 3 S79b main surfaces still exist (read-only)', () => {
    for (const e of ['challan-vault', 'licenses-registry', 'esg-aggregator']) {
      expect(fs.existsSync(path.join(process.cwd(), `src/lib/comply360-${e}-engine.ts`))).toBe(true);
    }
    for (const f of [
      'src/pages/erp/comply360/fixed-assets/LedgerPackPage.tsx',
      'src/pages/erp/comply360/internal-audit/DashboardPage.tsx',
      'src/pages/erp/comply360/internal-audit/AuditTrailPage.tsx',
      'src/pages/erp/comply360/payroll/StatutoryReturnsPage.tsx',
      'src/pages/erp/comply360/companies/IndAS116Page.tsx',
      'src/pages/erp/comply360/vendor/MSMEBreachesPage.tsx',
      'src/pages/erp/comply360/vendor/MSME43BhTrackerPage.tsx',
      'src/pages/erp/comply360/exim/EPCGStatusPage.tsx',
      'src/pages/erp/comply360/exim/CAROTARRoOPage.tsx',
      'src/pages/erp/comply360/exim/EWSDashboardPage.tsx',
      'src/pages/erp/comply360/exim/AEOBenefitsPage.tsx',
      'src/pages/erp/comply360/challan-vault/ChallanVaultPage.tsx',
      'src/pages/erp/comply360/licenses/LicensesPage.tsx',
      'src/pages/erp/comply360/esg/ESGSafetyPage.tsx',
    ]) {
      expect(fs.existsSync(path.join(process.cwd(), f))).toBe(true);
    }
  });

  it('QualiCheck source pages (deep-link targets) still exist · CORR-5 read-only', () => {
    expect(fs.existsSync(path.join(process.cwd(), 'src/pages/erp/qualicheck/reports/CFRPart11AuditTrailViewer.tsx'))).toBe(true);
    expect(fs.existsSync(path.join(process.cwd(), 'src/pages/erp/qualicheck/reports/ScheduleMComplianceDashboard.tsx'))).toBe(true);
  });
});
