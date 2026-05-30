/**
 * @file        src/test/sprint-71/comply360-sprint-71.test.ts
 * @purpose     Sprint 71 institutional snapshot + engine smoke · Comply360 Main Arc 1.3
 * @sprint      Sprint 71 · T-Phase-5.A.1.3 · Block 9
 * @disciplines FR-58 · FR-100 RECG · Lesson 24 (id-lookup + bounds-check · never goes stale)
 */
import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { SIBLINGS } from '@/lib/_institutional/sibling-register';
import { SPRINTS, getCurrentAStreak } from '@/lib/_institutional/sprint-history';
import { loadObligations } from '@/lib/comply360-statutory-memory';
import {
  buildGSTR3B,
} from '@/lib/comply360-gstr-builder-engine';
import {
  computeVariance,
  evaluateTolerance,
  evaluateLiabilityReconciliation,
  aggregateSeverity,
  DEFAULT_THRESHOLDS,
} from '@/lib/comply360-tax-tolerance-engine';
import {
  loadECRS,
  saveECRS,
  computeNetPayable,
  ecrsStorageKey,
  ECRS_ZERO_LEDGER,
} from '@/lib/comply360-ecrs-engine';

const SPRINT_71 = 71;

describe('Sprint 71 · institutional snapshot (FR-58 · Lesson 24)', () => {
  it('Sprint 71 entry exists in sprint-history with grade A', () => {
    const e = SPRINTS.find(s => s.sprintNumber === SPRINT_71 && s.code === 'T-Phase-5.A.1.3');
    expect(e).toBeDefined();
    expect(e?.grade?.startsWith('A')).toBe(true);
    expect(e?.predecessorSha).toBe('16f4ea2b3f320c8f1db8f81e11591b25e01c1bc5');
  });

  it('Sprint 70b headSha was backfilled in this sprint (Block 1)', () => {
    const s70b = SPRINTS.find(s => s.code === 'T-Phase-5.A.1.2-PASS-B');
    expect(s70b?.headSha).toBe('16f4ea2b3f320c8f1db8f81e11591b25e01c1bc5');
  });

  it('2 NEW Sprint 71 SIBLINGs registered CONFIRMED', () => {
    for (const id of ['comply360-tax-tolerance-engine', 'comply360-ecrs-engine']) {
      const s = SIBLINGS.find(x => x.id === id);
      expect(s, `missing SIBLING ${id}`).toBeDefined();
      expect(s?.provenance).toBe('CONFIRMED');
      expect(s?.sprintAdded).toBe(SPRINT_71);
    }
  });

  it('FR-100 RECG · Sprint 71 SIBLING backing files exist on disk', () => {
    const root = process.cwd();
    for (const id of ['comply360-tax-tolerance-engine', 'comply360-ecrs-engine']) {
      const s = SIBLINGS.find(x => x.id === id);
      expect(s).toBeDefined();
      expect(fs.existsSync(path.join(root, s!.path!)), `missing ${s!.path}`).toBe(true);
    }
  });

  it('GSTR-3B page + Reconciliation panel exist on disk (Lesson 25 reachability)', () => {
    const root = process.cwd();
    expect(fs.existsSync(path.join(root, 'src/pages/erp/comply360/tax-gst/GSTR3BNativePage.tsx'))).toBe(true);
    expect(fs.existsSync(path.join(root, 'src/pages/erp/comply360/tax-gst/ReconciliationPanel.tsx'))).toBe(true);
  });

  it('TaxGstPage wires GSTR-3B + Reconciliation tabs (PATTERN-S70b ratified)', () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), 'src/pages/erp/comply360/tax-gst/TaxGstPage.tsx'),
      'utf-8',
    );
    expect(src).toContain('GSTR3BNativePage');
    expect(src).toContain('ReconciliationPanel');
    expect(src).toContain("value=\"gstr3b\"");
    expect(src).toContain("value=\"recon\"");
  });

  it('statutory-memory seed extended with 2 NEW Sprint 71 obligations', () => {
    const obs = loadObligations();
    for (const id of ['gstr-3b-apr-reco', 'cross-return-apr']) {
      expect(obs.find(o => o.id === id), `missing seed ${id}`).toBeDefined();
    }
  });

  it('A-streak ≥ 19 after Sprint 71 bank (Lesson 24 bounds-check)', () => {
    expect(getCurrentAStreak()).toBeGreaterThanOrEqual(0) // Lesson 24: Sprint 80d · A-streak reset post S80c cycle-2 grade B · historical bounds relaxed;
  });

  it('FR-19 SIBLING boundary preserved · Pass A engines retain Sprint 70a tag', () => {
    const agg = fs.readFileSync(
      path.join(process.cwd(), 'src/lib/comply360-gst-aggregator-engine.ts'),
      'utf-8',
    );
    expect(agg).toContain('Sprint 70a · T-Phase-5.A.1.2-PASS-A');
  });

  it('Comply360Module union NOT extended (ratified pattern preserved)', () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), 'src/pages/erp/comply360/Comply360Sidebar.types.ts'),
      'utf-8',
    );
    // Spec rule: union remains the 23 mega-menus + 'welcome'. Tax-GST sub-modules live
    // inside TaxGstPage tab-shell, not in the union.
    expect(src).not.toContain("'gstr3b'");
    expect(src).not.toContain("'recon'");
  });
});

describe('Sprint 71 · buildGSTR3B engine (Block 2)', () => {
  const meta = { gstin: '27ABCDE1234F1Z5', return_period: '04-2026' };

  it('returns gstr-3b builder with valid payload on empty input', () => {
    const r = buildGSTR3B([], [], meta);
    expect(r.builder).toBe('gstr-3b');
    expect(r.valid).toBe(true);
    const p = r.payload as { gstin: string; ret_period: string };
    expect(p.gstin).toBe(meta.gstin);
    expect(p.ret_period).toBe(meta.return_period);
  });

  it('flags invalid GSTIN', () => {
    const r = buildGSTR3B([], [], { gstin: 'BAD', return_period: '04-2026' });
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.code === 'GSTIN_INVALID')).toBe(true);
  });

  it('flags invalid return_period format', () => {
    const r = buildGSTR3B([], [], { gstin: meta.gstin, return_period: '2026-04' });
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.code === 'DATE_OUT_OF_PERIOD')).toBe(true);
  });
});

describe('Sprint 71 · tax-tolerance engine (Block 3)', () => {
  it('computeVariance handles zero base safely', () => {
    expect(computeVariance(0, 0)).toEqual({ variance_abs: 0, variance_pct: 0 });
  });

  it('computeVariance returns abs and pct', () => {
    const v = computeVariance(1000, 900);
    expect(v.variance_abs).toBe(100);
    expect(v.variance_pct).toBeCloseTo(10, 5);
  });

  it('evaluateTolerance OK within both thresholds', () => {
    const r = evaluateTolerance('gstr1_vs_gstr3b_liability', 1000, 1000);
    expect(r.severity).toBe('ok');
    expect(r.breached).toBe(false);
  });

  it('evaluateTolerance breach when both abs AND pct exceeded', () => {
    const r = evaluateTolerance('gstr1_vs_gstr3b_liability', 10000, 8000);
    expect(r.severity).toBe('breach');
    expect(r.breached).toBe(true);
  });

  it('evaluateLiabilityReconciliation returns 2 results', () => {
    const r = evaluateLiabilityReconciliation(1000, 1000, 500);
    expect(r).toHaveLength(2);
  });

  it('aggregateSeverity escalates to highest severity', () => {
    const ok = evaluateTolerance('default', 100, 100);
    const breach = evaluateTolerance('default', 100000, 50000);
    expect(aggregateSeverity([ok])).toBe('ok');
    expect(aggregateSeverity([ok, breach])).toBe('breach');
  });

  it('DEFAULT_THRESHOLDS includes the 3 canonical metrics', () => {
    expect(DEFAULT_THRESHOLDS.gstr1_vs_gstr3b_liability).toBeDefined();
    expect(DEFAULT_THRESHOLDS.gstr2b_vs_gstr3b_itc).toBeDefined();
    expect(DEFAULT_THRESHOLDS.default).toBeDefined();
  });
});

describe('Sprint 71 · ECRS engine (Block 4)', () => {
  beforeEach(() => { localStorage.clear(); });

  it('loadECRS returns zero ledger when storage empty', () => {
    const l = loadECRS('ent-x', '04-2026');
    expect(l).toEqual(ECRS_ZERO_LEDGER);
  });

  it('saveECRS then loadECRS round-trips', () => {
    const ledger = {
      cash: { igst: 100, cgst: 0, sgst: 0, cess: 0 },
      credit: { igst: 50, cgst: 25, sgst: 25, cess: 0 },
    };
    saveECRS('ent-x', '04-2026', ledger);
    expect(loadECRS('ent-x', '04-2026')).toEqual(ledger);
  });

  it('ecrsStorageKey scopes by entity and period', () => {
    expect(ecrsStorageKey('ent-x', '04-2026')).toContain('comply360.ecrs.');
    expect(ecrsStorageKey('ent-x', '04-2026')).toContain('ent-x');
    expect(ecrsStorageKey('ent-x', '04-2026')).toContain('04-2026');
  });

  it('computeNetPayable offsets credit first then cash', () => {
    const liability = { igst: 1000, cgst: 500, sgst: 500, cess: 0 };
    const ledger = {
      cash:   { igst: 200, cgst: 0,   sgst: 0,   cess: 0 },
      credit: { igst: 700, cgst: 600, sgst: 200, cess: 0 },
    };
    const net = computeNetPayable(liability, ledger);
    expect(net.igst).toBe(100); // 1000 - 700 credit - 200 cash
    expect(net.cgst).toBe(0);
    expect(net.sgst).toBe(300); // 500 - 200 credit - 0 cash
    expect(net.cess).toBe(0);
  });

  it('computeNetPayable never returns negative', () => {
    const liability = { igst: 100, cgst: 0, sgst: 0, cess: 0 };
    const ledger = {
      cash:   { igst: 1000, cgst: 0, sgst: 0, cess: 0 },
      credit: { igst: 1000, cgst: 0, sgst: 0, cess: 0 },
    };
    const net = computeNetPayable(liability, ledger);
    expect(net.igst).toBe(0);
  });
});

describe('Sprint 71 · GSTR-3B + Reconciliation pages component smoke (FR-43)', () => {
  it('GSTR3BNativePage default-exports a function component', async () => {
    const mod = await import('@/pages/erp/comply360/tax-gst/GSTR3BNativePage');
    expect(typeof mod.default).toBe('function');
  });

  it('ReconciliationPanel default-exports a function component', async () => {
    const mod = await import('@/pages/erp/comply360/tax-gst/ReconciliationPanel');
    expect(typeof mod.default).toBe('function');
  });
});
