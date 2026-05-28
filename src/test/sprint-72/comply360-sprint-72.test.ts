/**
 * @file        src/test/sprint-72/comply360-sprint-72.test.ts
 * @purpose     Sprint 72 institutional snapshot + engine smoke · Comply360 Main Arc 1.4 (TDS suite)
 * @sprint      Sprint 72 · T-Phase-5.A.1.4 · Block 10a
 * @disciplines FR-58 · FR-100 RECG · FR-43 · Lesson 24 (id-lookup + bounds-check)
 */
import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { SIBLINGS } from '@/lib/_institutional/sibling-register';
import { SPRINTS, getCurrentAStreak } from '@/lib/_institutional/sprint-history';
import { loadObligations } from '@/lib/comply360-statutory-memory';
import {
  aggregateTDSDeductions,
  computeTotalTDS,
  aggregateBySection,
  partyYTDGross,
} from '@/lib/comply360-tds-aggregator-engine';
import {
  build194QReturn,
  build194OReturn,
  check194QThreshold,
  resolve194ORate,
  THRESHOLD_194Q,
  RATE_194O,
} from '@/lib/comply360-tds-194q-engine';
import {
  detectSFTTransactions,
  buildSFTStatement,
  exceedsSFTThreshold,
  DEFAULT_SFT_SPECS,
} from '@/lib/comply360-sft-engine';
import {
  reconcile26AS,
  loadForm26AS,
  saveForm26AS,
  FORM26AS_STORAGE_KEY,
  DEFAULT_26AS_TOLERANCE,
  type Form26ASEntry,
} from '@/lib/comply360-form26as-reco-engine';

const SPRINT_72 = 72;

describe('Sprint 72 · institutional snapshot (FR-58 · Lesson 24)', () => {
  it('Sprint 72 entry exists with grade A · predecessor Sprint 71 SHA', () => {
    const e = SPRINTS.find((s) => s.sprintNumber === SPRINT_72 && s.code === 'T-Phase-5.A.1.4');
    expect(e).toBeDefined();
    expect(e?.grade?.startsWith('A')).toBe(true);
    expect(e?.predecessorSha).toBe('9d47ec68e75552e80363e1656523e6448be02a28');
  });

  it('4 NEW Sprint 72 SIBLINGs registered CONFIRMED', () => {
    for (const id of [
      'comply360-tds-aggregator-engine',
      'comply360-tds-194q-engine',
      'comply360-sft-engine',
      'comply360-form26as-reco-engine',
    ]) {
      const s = SIBLINGS.find((x) => x.id === id);
      expect(s, `missing SIBLING ${id}`).toBeDefined();
      expect(s?.provenance).toBe('CONFIRMED');
      expect(s?.sprintAdded).toBe(SPRINT_72);
    }
  });

  it('FR-100 RECG · Sprint 72 SIBLING backing files exist on disk', () => {
    const root = process.cwd();
    for (const id of [
      'comply360-tds-aggregator-engine',
      'comply360-tds-194q-engine',
      'comply360-sft-engine',
      'comply360-form26as-reco-engine',
    ]) {
      const s = SIBLINGS.find((x) => x.id === id);
      expect(s).toBeDefined();
      expect(fs.existsSync(path.join(root, s!.path!)), `missing ${s!.path}`).toBe(true);
    }
  });

  it('TdsPage shell + 4 surfaces exist on disk (Lesson 25 reachability)', () => {
    const root = process.cwd();
    for (const f of [
      'src/pages/erp/comply360/tds/TdsPage.tsx',
      'src/pages/erp/comply360/tds/TDS194QPage.tsx',
      'src/pages/erp/comply360/tds/TDS194OPage.tsx',
      'src/pages/erp/comply360/tds/SFTPage.tsx',
      'src/pages/erp/comply360/tds/Form26ASRecoPage.tsx',
    ]) {
      expect(fs.existsSync(path.join(root, f)), `missing ${f}`).toBe(true);
    }
  });

  it('Comply360Module union extended with `tds` (Option C ratified)', () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), 'src/pages/erp/comply360/Comply360Sidebar.types.ts'),
      'utf-8',
    );
    expect(src).toContain("'tds'");
  });

  it('Comply360Page router wires `tds` case → TdsPage', () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), 'src/pages/erp/comply360/Comply360Page.tsx'),
      'utf-8',
    );
    expect(src).toContain('TdsPage');
    expect(src).toContain("case 'tds'");
  });

  it('Sidebar config has 24 mega-menu groups (+1 `tds`, keyboard `c q`)', () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), 'src/apps/erp/configs/comply360-sidebar-config.ts'),
      'utf-8',
    );
    expect(src).toContain("id: 'tds'");
    expect(src).toContain("keyboard: 'c q'");
  });

  it('statutory-memory seed extended with 3 NEW Sprint 72 TDS obligations', () => {
    const obs = loadObligations();
    for (const id of ['tds-194q-q4', 'sft-fy25', 'form26as-reco-fy25']) {
      const o = obs.find((x) => x.id === id);
      expect(o, `missing seed ${id}`).toBeDefined();
      expect(o?.module).toBe('tds');
    }
  });

  it('A-streak ≥ 20 after Sprint 72 bank (Lesson 24 bounds-check)', () => {
    expect(getCurrentAStreak()).toBeGreaterThanOrEqual(20);
  });

  it('FR-19 SIBLING boundary preserved · 0-DIFF on tds-engine.ts (banner intact)', () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), 'src/lib/tds-engine.ts'),
      'utf-8',
    );
    expect(src).toContain('TDS auto-deduction engine');
    expect(src).toContain('TDL-03');
  });
});

describe('Sprint 72 · tds-aggregator engine (Block 3)', () => {
  beforeEach(() => { localStorage.clear(); });

  it('aggregateTDSDeductions returns [] for empty entity', () => {
    expect(aggregateTDSDeductions({ entity_code: 'ENT-X', fy: 'FY25-26' })).toEqual([]);
  });

  it('computeTotalTDS returns zeros for empty input', () => {
    const t = computeTotalTDS([]);
    expect(t.deduction_count).toBe(0);
    expect(t.gross_amount).toBe(0);
    expect(t.tds_amount).toBe(0);
    expect(t.by_section).toEqual([]);
  });

  it('aggregateBySection returns [] when no deductions', () => {
    expect(aggregateBySection({ entity_code: 'ENT-X', fy: 'FY25-26' })).toEqual([]);
  });

  it('partyYTDGross returns 0 when no party history', () => {
    expect(partyYTDGross({ entity_code: 'ENT-X', fy: 'FY25-26' }, 'party-1', '194Q')).toBe(0);
  });
});

describe('Sprint 72 · tds-194q engine (Block 4)', () => {
  it('build194QReturn returns valid empty payload', () => {
    const r = build194QReturn({ entity_code: 'ENT-X', fy: 'FY25-26' });
    expect(r.builder).toBe('194Q');
    expect(r.valid).toBe(true);
    expect(r.payload.return_type).toBe('194Q');
    expect(r.payload.totals.deduction_count).toBe(0);
  });

  it('build194OReturn returns valid empty payload', () => {
    const r = build194OReturn({ entity_code: 'ENT-X', fy: 'FY25-26' });
    expect(r.builder).toBe('194-O');
    expect(r.valid).toBe(true);
    expect(r.payload.return_type).toBe('194-O');
  });

  it('THRESHOLD_194Q is ₹50L', () => {
    expect(THRESHOLD_194Q).toBe(5000000);
  });

  it('check194QThreshold true above 50L', () => {
    expect(check194QThreshold(5000001)).toBe(true);
    expect(check194QThreshold(5000000)).toBe(false);
  });

  it('resolve194ORate · 1% with PAN, 5% without', () => {
    expect(resolve194ORate(true)).toBe(RATE_194O);
    expect(resolve194ORate(false)).toBe(5);
  });
});

describe('Sprint 72 · sft engine (Block 5)', () => {
  beforeEach(() => { localStorage.clear(); });

  it('detectSFTTransactions returns [] for empty entity', () => {
    expect(detectSFTTransactions({ entity_code: 'ENT-X', fy: 'FY25-26' })).toEqual([]);
  });

  it('buildSFTStatement returns empty statement structure', () => {
    const s = buildSFTStatement([], 'ENT-X', 'FY25-26');
    expect(s.entity_code).toBe('ENT-X');
    expect(s.rows).toEqual([]);
    expect(s.totals.transaction_count).toBe(0);
  });

  it('exceedsSFTThreshold strict-greater comparison', () => {
    const spec = DEFAULT_SFT_SPECS[0];
    expect(exceedsSFTThreshold(spec.threshold, spec)).toBe(false);
    expect(exceedsSFTThreshold(spec.threshold + 1, spec)).toBe(true);
  });

  it('DEFAULT_SFT_SPECS includes SFT-013 (cash receipt > ₹2L)', () => {
    expect(DEFAULT_SFT_SPECS.find((s) => s.code === 'SFT-013')).toBeDefined();
  });
});

describe('Sprint 72 · form26as-reco engine (Block 6)', () => {
  beforeEach(() => { localStorage.clear(); });

  it('reconcile26AS empty-vs-empty returns balanced result', () => {
    const r = reconcile26AS([], []);
    expect(r.matched).toEqual([]);
    expect(r.mismatched).toEqual([]);
    expect(r.totals.net_variance).toBe(0);
  });

  it('loadForm26AS returns [] when storage empty', () => {
    expect(loadForm26AS('ENT-X', 'FY25-26')).toEqual([]);
  });

  it('saveForm26AS then loadForm26AS round-trips', () => {
    const entry: Form26ASEntry = {
      tan_deductor: 'BLRT00001A',
      deductor_name: 'Acme Pvt Ltd',
      section: '194Q',
      amount_paid: 1000000,
      tds_deducted: 1000,
      tds_deposited: 1000,
      date_of_payment: '2026-04-15',
      date_of_booking: '2026-04-15',
      status: 'F',
    };
    saveForm26AS('ENT-X', 'FY25-26', [entry]);
    const back = loadForm26AS('ENT-X', 'FY25-26');
    expect(back).toEqual([entry]);
  });

  it('FORM26AS_STORAGE_KEY scopes by entity + fy', () => {
    const k = FORM26AS_STORAGE_KEY('ENT-X', 'FY25-26');
    expect(k).toContain('comply360.form26as.');
    expect(k).toContain('ENT-X');
    expect(k).toContain('FY25-26');
  });

  it('DEFAULT_26AS_TOLERANCE is ₹1 leeway', () => {
    expect(DEFAULT_26AS_TOLERANCE).toBe(1);
  });

  it('reconcile26AS matches exact and flags amount-mismatch', () => {
    const claimed = [{
      voucher_id: 'V1', voucher_date: '2026-04-15', party_id: 'BLRT00001A',
      party_name: 'Acme', section: '194Q', deductee_type: 'company' as const,
      gross_amount: 1000000, tds_amount: 1000, net_amount: 999000, rate: 0.1,
      threshold_crossed: true, source_card: 'procure360' as const,
    }];
    const reflected: Form26ASEntry[] = [{
      tan_deductor: 'BLRT00001A', deductor_name: 'Acme', section: '194Q',
      amount_paid: 1000000, tds_deducted: 1000, tds_deposited: 950,
      date_of_payment: '2026-04-15', date_of_booking: '2026-04-15', status: 'F',
    }];
    const r = reconcile26AS(claimed, reflected, { tolerance: 1 });
    expect(r.matched).toHaveLength(0);
    expect(r.mismatched).toHaveLength(1);
    expect(r.mismatched[0].side).toBe('amount-mismatch');
  });
});

describe('Sprint 72 · TdsPage component smoke (FR-43)', () => {
  it('TdsPage default-exports a function component', async () => {
    const mod = await import('@/pages/erp/comply360/tds/TdsPage');
    expect(typeof mod.default).toBe('function');
  });

  it('all 4 surfaces default-export function components', async () => {
    const q = await import('@/pages/erp/comply360/tds/TDS194QPage');
    const o = await import('@/pages/erp/comply360/tds/TDS194OPage');
    const s = await import('@/pages/erp/comply360/tds/SFTPage');
    const f = await import('@/pages/erp/comply360/tds/Form26ASRecoPage');
    expect(typeof q.default).toBe('function');
    expect(typeof o.default).toBe('function');
    expect(typeof s.default).toBe('function');
    expect(typeof f.default).toBe('function');
  });
});
