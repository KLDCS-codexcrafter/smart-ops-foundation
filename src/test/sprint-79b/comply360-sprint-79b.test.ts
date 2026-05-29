/**
 * @file        src/test/sprint-79b/comply360-sprint-79b.test.ts
 * @purpose     Sprint 79b Pass B · 3 main surfaces + 2 router cases + EsgPage 3rd tab.
 *              Snapshot · RECG · router wiring · 3-page smokes · deep-links · Lesson 23/24/29.
 * @sprint      Sprint 79b · T-Phase-5.A.1.11-PASS-B
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execSync } from 'node:child_process';
import { SIBLINGS, getSiblingCount } from '@/lib/_institutional/sibling-register';
import { SPRINTS, getSprintCount, getCurrentAStreak } from '@/lib/_institutional/sprint-history';

const read = (rel: string): string => readFileSync(resolve(process.cwd(), rel), 'utf-8');
const exists = (rel: string): boolean => existsSync(resolve(process.cwd(), rel));

describe('Sprint 79b · Pass B · institutional snapshot', () => {
  it('sprint-history has Sprint 79b entry (id-lookup, Lesson 23)', () => {
    const e = SPRINTS.find((s) => s.code === 'T-Phase-5.A.1.11-PASS-B');
    expect(e).toBeDefined();
    expect(e?.grade).toBe('A first-pass-clean');
    expect(e?.predecessorSha).toBe('99a163a8c4fbfb966fd651d5afbc88f381a6a2ab');
  });

  it('Sprint 79a SHA backfilled (Lesson 26)', () => {
    const e = SPRINTS.find((s) => s.code === 'T-Phase-5.A.1.11-PASS-A');
    expect(e?.headSha).toBe('99a163a8c4fbfb966fd651d5afbc88f381a6a2ab');
  });

  it('A-streak ≥ 33 (bounds-check, Lesson 24)', () => {
    expect(getCurrentAStreak()).toBeGreaterThanOrEqual(33);
  });

  it('sprint count ≥ 87 (bounds-check, Lesson 24)', () => {
    expect(getSprintCount()).toBeGreaterThanOrEqual(87);
  });

  it('sibling count ≥ 91 (bounds-check · Pass B adds 0 SIBLINGs)', () => {
    expect(getSiblingCount()).toBeGreaterThanOrEqual(91);
    // 3 S79a engines remain registered · not duplicated
    expect(SIBLINGS.filter((s) => s === 'comply360-challan-vault-engine').length).toBe(1);
  });
});

describe('Sprint 79b · RECG · 3 new surface files exist', () => {
  for (const p of [
    'src/pages/erp/comply360/challan-vault/ChallanVaultPage.tsx',
    'src/pages/erp/comply360/licenses/LicensesPage.tsx',
    'src/pages/erp/comply360/esg/ESGSafetyPage.tsx',
  ]) {
    it(p, () => { expect(exists(p)).toBe(true); });
  }
});

describe('Sprint 79b · router wiring · 2 new cases + EsgPage 3-tab', () => {
  const router = read('src/pages/erp/comply360/Comply360Page.tsx');
  const esg = read('src/pages/erp/comply360/esg/EsgPage.tsx');

  it('Comply360Page has challan-vault router case', () => {
    expect(router).toMatch(/case 'challan-vault'/);
    expect(router).toContain('ChallanVaultPage');
  });
  it('Comply360Page has licenses router case', () => {
    expect(router).toMatch(/case 'licenses'/);
    expect(router).toContain('LicensesPage');
  });
  it('EsgPage has ≥3 TabsTrigger (Welcome/BRSR + ESG/Safety · FR-106 9th scenario)', () => {
    const triggers = (esg.match(/TabsTrigger/g) ?? []).length;
    // Lesson 24 bounds-check · future sprints may extend
    expect(triggers).toBeGreaterThanOrEqual(3);
    expect(esg).toContain('ESGSafetyPage');
  });
});

describe('Sprint 79b · ChallanVaultPage smoke', () => {
  const src = read('src/pages/erp/comply360/challan-vault/ChallanVaultPage.tsx');
  it('consumes challan-vault-engine', () => {
    expect(src).toContain('@/lib/comply360-challan-vault-engine');
    expect(src).toContain('uploadChallanStub');
    expect(src).toContain('exportChallansCsv');
    expect(src).toContain('reconcileChallan');
  });
  it('exposes Upload Challan button (DP-S79-7)', () => {
    expect(src).toContain('Upload Challan');
  });
  it('renders status filter list', () => {
    expect(src).toContain('pending-recon');
    expect(src).toContain('matched');
  });
});

describe('Sprint 79b · LicensesPage smoke', () => {
  const src = read('src/pages/erp/comply360/licenses/LicensesPage.tsx');
  it('consumes licenses-registry-engine', () => {
    expect(src).toContain('@/lib/comply360-licenses-registry-engine');
    expect(src).toContain('aggregateLicenses');
    expect(src).toContain('renewLicense');
    expect(src).toContain('classifyExpiry');
  });
  it('declares all 13 license types in filter', () => {
    for (const t of [
      'iec', 'lut', 'aeo', 'rcmc', 'schedule-h', 'schedule-h1',
      'cth-auth', 'fta-cert', 'epcg', 'advance-auth', 'dgft-other',
      'trademark', 'patent',
    ]) {
      expect(src).toContain(`'${t}'`);
    }
  });
  it('renders 12-month expiry timeline', () => {
    expect(src).toContain('Expiry Timeline');
  });
});

describe('Sprint 79b · ESGSafetyPage smoke + DP-S79-6 deep-links', () => {
  const src = read('src/pages/erp/comply360/esg/ESGSafetyPage.tsx');
  it('consumes esg-aggregator-engine', () => {
    expect(src).toContain('@/lib/comply360-esg-aggregator-engine');
    expect(src).toContain('aggregateESGSafety');
    expect(src).toContain('getEnergyTrend');
    expect(src).toContain('getIncidentTrend');
  });
  it('declares 4 deep-link buttons to MaintainPro + SiteX (DP-S79-6)', () => {
    expect(src).toContain('/erp/maintainpro/esg/energy');
    expect(src).toContain('/erp/maintainpro/fire-safety');
    expect(src).toContain('/erp/sitex/permit-to-work');
    expect(src).toContain('/erp/sitex/incidents');
  });
});

describe('Sprint 79b · §H 0-DIFF guard · 3 S79a engines untouched in shape', () => {
  it('3 S79a engine files still export their READS_FROM contract', () => {
    for (const e of ['challan-vault', 'licenses-registry', 'esg-aggregator']) {
      const src = read(`src/lib/comply360-${e}-engine.ts`);
      expect(src).toContain('export const READS_FROM');
    }
  });
});

describe('Sprint 79b · FR-105 done-gate · no toBe-equality on registry counts in src/test/', () => {
  beforeEach(() => { /* noop */ });
  it('no banked test asserts equality on getSiblingCount/getSprintCount/getCurrentAStreak', () => {
    const out = execSync(
      'grep -rn --exclude=comply360-sprint-77b.test.ts --exclude=comply360-sprint-78b.test.ts --exclude=comply360-sprint-79a.test.ts --exclude=comply360-sprint-79b.test.ts "getSiblingCount()).toBe(\\|getSprintCount()).toBe(\\|getCurrentAStreak()).toBe(" src/test/ || true',
      { encoding: 'utf-8' },
    );
    expect(out.trim()).toBe('');
  });
});
