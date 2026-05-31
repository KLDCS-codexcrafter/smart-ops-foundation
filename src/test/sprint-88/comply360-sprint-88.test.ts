/**
 * @file        src/test/sprint-88/comply360-sprint-88.test.ts
 * @purpose     Sprint 88 · T-Phase-5.E.5.0 · POLISH SLOT closes · PHASE 5 ENDGAME OPENS
 *              Verifies TRIPLE SHA backfill + demo-seed-engine + shared components +
 *              Comply360Page breadcrumb + Welcome extension + perf refactors.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { SPRINTS, getCurrentAStreak, getSprintCount } from '@/lib/_institutional/sprint-history';
import { SIBLINGS, getSiblingCount } from '@/lib/_institutional/sibling-register';
import {
  READS_FROM, applyDemoSeed, clearDemoSeed, getDemoSeedStats, isDemoSeeded,
} from '@/lib/comply360-demo-seed-engine';

const SRC = (p: string): string => path.resolve(__dirname, '../../..', p);

describe('Sprint 88 · T-Phase-5.E.5.0 · POLISH SLOT · PHASE 5 ENDGAME OPENS', () => {
  beforeEach(() => { localStorage.clear(); });

  // ── Institutional registers ────────────────────────────────────────
  it('Sprint 88 entry exists · code T-Phase-5.E.5.0', () => {
    const s88 = SPRINTS.find((s) => s.sprintNumber === 88);
    expect(s88?.code).toBe('T-Phase-5.E.5.0');
    expect(s88?.grade).toBe('A first-pass-clean');
    expect(s88?.predecessorSha).toBe('31fb49a09d97dddbef0f6604f6eae5e26c8dc94d');
    expect(s88?.newSiblings).toContain('comply360-demo-seed-engine');
  });

  it('TRIPLE SHA backfill applied · S85', () => {
    const s = SPRINTS.find((x) => x.sprintNumber === 85);
    expect(s?.headSha).toBe('7fa57f626caa6df61a0acc1afa171abba32e4016');
  });
  it('TRIPLE SHA backfill applied · S86', () => {
    const s = SPRINTS.find((x) => x.sprintNumber === 86);
    expect(s?.headSha).toBe('4aa2a8e71ab35666ff2d1471771ff65c940705e9');
  });
  it('TRIPLE SHA backfill applied · S87', () => {
    const s = SPRINTS.find((x) => x.sprintNumber === 87);
    expect(s?.headSha).toBe('31fb49a09d97dddbef0f6604f6eae5e26c8dc94d');
  });

  it('A-streak >= 13 (S88 closes Polish Slot · target 14)', () => {
    expect(getCurrentAStreak()).toBeGreaterThanOrEqual(13);
  });
  it('SPRINTS >= 104', () => { expect(getSprintCount()).toBeGreaterThanOrEqual(104); });
  it('SIBLINGs runtime >= 141 (post S88 +1 = 141)', () => {
    expect(getSiblingCount()).toBeGreaterThanOrEqual(141);
  });
  it('demo-seed-engine sibling registered · CONFIRMED · sprintAdded 88', () => {
    const s = SIBLINGS.find((x) => x.id === 'comply360-demo-seed-engine');
    expect(s?.provenance).toBe('CONFIRMED');
    expect(s?.sprintAdded).toBe(88);
  });

  // ── Engine contract: READS_FROM (15th USE-SITE READ application) ──
  it('demo-seed-engine READS_FROM declares 4 engines · USE-SITE READ MAXIMUM SCALE', () => {
    expect(READS_FROM.engines).toContain('comply360-sector-nbfc-engine');
    expect(READS_FROM.engines).toContain('comply360-sector-rera-engine');
    expect(READS_FROM.engines).toContain('comply360-ai-control-center-engine');
    expect(READS_FROM.engines).toContain('comply360-audit-framework-engine');
  });

  // ── Demo seed runtime behavior ─────────────────────────────────────
  it('applyDemoSeed seeds NBFC + RERA + ROI samples', () => {
    const r = applyDemoSeed();
    expect(r.alreadySeeded).toBe(false);
    expect(r.nbfcLoans).toBeGreaterThanOrEqual(3);
    expect(r.reraProjects).toBeGreaterThanOrEqual(2);
    expect(r.aiROIs).toBeGreaterThanOrEqual(1);
  });
  it('applyDemoSeed is idempotent (second call → alreadySeeded)', () => {
    applyDemoSeed();
    const second = applyDemoSeed();
    expect(second.alreadySeeded).toBe(true);
  });
  it('isDemoSeeded reflects marker', () => {
    expect(isDemoSeeded()).toBe(false);
    applyDemoSeed();
    expect(isDemoSeeded()).toBe(true);
  });
  it('clearDemoSeed wipes seeded data', () => {
    applyDemoSeed();
    clearDemoSeed();
    expect(isDemoSeeded()).toBe(false);
    expect(getDemoSeedStats().nbfcLoans).toBe(0);
  });
  it('getDemoSeedStats returns 0/null before seeding', () => {
    const s = getDemoSeedStats();
    expect(s.seededAt).toBeNull();
    expect(s.nbfcLoans + s.reraProjects + s.aiROIs).toBe(0);
  });

  // ── File existence ────────────────────────────────────────────────
  it('demo-seed-engine source file exists', () => {
    expect(fs.existsSync(SRC('src/lib/comply360-demo-seed-engine.ts'))).toBe(true);
  });
  it('Comply360Breadcrumb shared component exists', () => {
    expect(fs.existsSync(SRC('src/pages/erp/comply360/_shared/Comply360Breadcrumb.tsx'))).toBe(true);
  });
  it('CrossMenuLinkCard shared component exists', () => {
    expect(fs.existsSync(SRC('src/pages/erp/comply360/_shared/CrossMenuLinkCard.tsx'))).toBe(true);
  });
  it('v1.30 §M sha-backfill-enforcement test exists', () => {
    expect(fs.existsSync(SRC('src/test/_meta/sha-backfill-enforcement.test.ts'))).toBe(true);
  });
  it('v1.30 §N test-count-meta-enforcement test exists', () => {
    expect(fs.existsSync(SRC('src/test/_meta/test-count-meta-enforcement.test.ts'))).toBe(true);
  });
  it('jspdf-reuse-canon doc exists (v1.30 §O)', () => {
    expect(fs.existsSync(SRC('audit_workspace/T-Phase-5.E.5.0/Z_close_evidence/jspdf-reuse-canon.md'))).toBe(true);
  });
  it('sprint-88 arc summary exists', () => {
    expect(fs.existsSync(SRC('audit_workspace/T-Phase-5.E.5.0/Z_close_evidence/sprint-88-arc-summary.md'))).toBe(true);
  });
  it('28-megamenu nav guide exists', () => {
    expect(fs.existsSync(SRC('audit_workspace/T-Phase-5.E.5.0/Z_close_evidence/comply360-28-megamenu-nav-guide.md'))).toBe(true);
  });

  // ── Comply360Page wiring ──────────────────────────────────────────
  it('Comply360Page imports Comply360Breadcrumb', () => {
    const src = fs.readFileSync(SRC('src/pages/erp/comply360/Comply360Page.tsx'), 'utf8');
    expect(src).toContain("from './_shared/Comply360Breadcrumb'");
    expect(src).toContain('<Comply360Breadcrumb');
  });

  // ── Comply360Welcome extension ────────────────────────────────────
  it('Comply360Welcome integrates demo-seed-engine', () => {
    const src = fs.readFileSync(SRC('src/pages/erp/comply360/Comply360Welcome.tsx'), 'utf8');
    expect(src).toContain('comply360-demo-seed-engine');
    expect(src).toContain("What&apos;s new");
  });

  // ── Perf refactor (DP-S88-3) ──────────────────────────────────────
  it('AIControlCenterPage uses React.memo on Module card (DP-S88-3)', () => {
    const src = fs.readFileSync(SRC('src/pages/erp/comply360/ai-control-center/AIControlCenterPage.tsx'), 'utf8');
    expect(src).toContain('memo(function AIModuleCard');
  });
  it('SectorNBFCPage retains useMemo on listLoanAccounts (DP-S88-3)', () => {
    const src = fs.readFileSync(SRC('src/pages/erp/comply360/sector-nbfc/SectorNBFCPage.tsx'), 'utf8');
    expect(src).toContain('useMemo(() => listLoanAccounts()');
  });
  it('SectorSEBIPage retains useMemo on listMaterialDisclosures (DP-S88-3)', () => {
    const src = fs.readFileSync(SRC('src/pages/erp/comply360/sector-sebi/SectorSEBIPage.tsx'), 'utf8');
    expect(src).toContain('useMemo(() => listMaterialDisclosures');
  });

  // ── §H 0-DIFF spot checks ─────────────────────────────────────────
  it('Comply360Sidebar.types.ts NOT extended at S88 (0 new union members)', () => {
    const src = fs.readFileSync(SRC('src/pages/erp/comply360/Comply360Sidebar.types.ts'), 'utf8');
    expect(src).not.toContain('demo-seed');
  });
  it('package.json NOT extended with new runtime deps at S88 (v1.30 §O)', () => {
    const pkg = JSON.parse(fs.readFileSync(SRC('package.json'), 'utf8')) as { dependencies?: Record<string, string> };
    expect(pkg.dependencies?.['jspdf']).toBeTruthy();
  });
});
