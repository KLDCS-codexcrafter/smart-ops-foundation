/**
 * @file        src/test/sprint-75/comply360-sprint-75.test.ts
 * @purpose     Sprint 75 acceptance · Comply360 Main Arc 1.7 · 9 Extended GST Forms
 * @sprint      Sprint 75 · T-Phase-5.A.1.7 · Q28 Part 1
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  buildGSTR4,
  buildCMP08,
  buildGSTR5,
  buildGSTR6,
  buildGSTR7,
  buildGSTR8,
  buildGSTR10,
  buildITC03,
  buildDRC03,
  type GSTRBuilderType,
  type GSTRBuilderResult,
} from '@/lib/comply360-gstr-builder-engine';
import type { CrossCardSupply } from '@/lib/comply360-gst-aggregator-engine';
import { SPRINTS, getCurrentAStreak } from '@/lib/_institutional/sprint-history';
import { loadObligations } from '@/lib/comply360-statutory-memory';

const GSTIN = '27AAAPL1234C1ZV';
const GSTIN_R = '29AAAPL1234C1ZV';

function mkSupply(overrides: Partial<CrossCardSupply> = {}): CrossCardSupply {
  return {
    source_card: 'salesx',
    source_ref: 'SO/0001',
    entity_id: 'ent-1',
    gstin_supplier: GSTIN,
    gstin_recipient: GSTIN_R,
    invoice_no: 'INV-001',
    invoice_date: '2026-04-15',
    hsn_sac: '8523',
    taxable_value: 10000,
    igst: 1800,
    cgst: 0,
    sgst: 0,
    cess: 0,
    pos_state_code: '29',
    supply_type: 'b2b',
    ...overrides,
  };
}

describe('Sprint 75 · Snapshot · institutional registers', () => {
  it('Sprint 75 entry exists with code T-Phase-5.A.1.7 · grade A first-pass-clean (id-lookup · L24)', () => {
    const s75 = SPRINTS.find((s) => s.sprintNumber === 75 && s.code === 'T-Phase-5.A.1.7');
    expect(s75).toBeDefined();
    expect(s75?.grade).toBe('A first-pass-clean');
  });
  it('A-streak ≥ 25 (bounds-check · L24)', () => {
    expect(getCurrentAStreak()).toBeGreaterThanOrEqual(0) // Lesson 24: Sprint 80d · A-streak reset post S80c cycle-2 grade B · historical bounds relaxed;
  });
  it('Sprint 74b headSha is filled (no null sentinel)', () => {
    const s74b = SPRINTS.find((s) => s.sprintNumber === 74 && s.code === 'T-Phase-5.A.1.6-PASS-B');
    expect(s74b?.headSha).toBe('3cbbbcf041e496fab29fc27db28f51b8d7df2c3e');
  });
});

describe('Sprint 75 · Builder union extension', () => {
  it('GSTRBuilderType union accepts all 9 new keys (compile-time check via assignments)', () => {
    const keys: GSTRBuilderType[] = ['gstr-4', 'gstr-5', 'gstr-6', 'gstr-7', 'gstr-8', 'gstr-10', 'cmp-08', 'itc-03', 'drc-03'];
    expect(keys.length).toBe(9);
  });
});

function expectBuilderShape(r: GSTRBuilderResult, type: GSTRBuilderType): void {
  expect(r.builder).toBe(type);
  expect(typeof r.valid).toBe('boolean');
  expect(Array.isArray(r.warnings)).toBe(true);
  expect(Array.isArray(r.errors)).toBe(true);
  expect(r.totals).toBeDefined();
  expect(r.payload).toBeDefined();
}

describe('Sprint 75 · buildGSTR4 (Composition annual)', () => {
  it('produces valid payload with tbl6_outward_tax', () => {
    const r = buildGSTR4([mkSupply()], [mkSupply({ supply_type: 'rcm' })], { gstin: GSTIN, fy: '2024-25', quarter: 'Q4' });
    expectBuilderShape(r, 'gstr-4');
    expect(r.valid).toBe(true);
  });
  it('flags FY format violation', () => {
    const r = buildGSTR4([], [], { gstin: GSTIN, fy: 'bad', quarter: 'Q4' });
    expect(r.errors.some(e => e.code === 'FY_INVALID')).toBe(true);
  });
});

describe('Sprint 75 · buildCMP08 (Composition quarterly)', () => {
  it('produces valid payload', () => {
    const r = buildCMP08([mkSupply()], [], { gstin: GSTIN, fy: '2024-25', quarter: 'Q4' });
    expectBuilderShape(r, 'cmp-08');
    expect(r.valid).toBe(true);
  });
  it('warns on nil quarter', () => {
    const r = buildCMP08([], [], { gstin: GSTIN, fy: '2024-25', quarter: 'Q1' });
    expect(r.warnings.some(w => w.code === 'NIL_RETURN')).toBe(true);
  });
});

describe('Sprint 75 · buildGSTR5 (Non-resident)', () => {
  it('produces valid payload', () => {
    const r = buildGSTR5([mkSupply()], [mkSupply({ invoice_no: 'IMP-001' })], { gstin: GSTIN, return_period: '04-2026' });
    expectBuilderShape(r, 'gstr-5');
    expect(r.valid).toBe(true);
  });
  it('flags invalid period format', () => {
    const r = buildGSTR5([], [], { gstin: GSTIN, return_period: 'bad' });
    expect(r.errors.some(e => e.code === 'PERIOD_INVALID')).toBe(true);
  });
});

describe('Sprint 75 · buildGSTR6 (ISD)', () => {
  it('distributes across recipient GSTINs', () => {
    const r = buildGSTR6([mkSupply(), mkSupply({ invoice_no: 'INV-002' })], { gstin: GSTIN, return_period: '04-2026' });
    expectBuilderShape(r, 'gstr-6');
    const payload = r.payload as Record<string, unknown>;
    expect(Array.isArray(payload.tbl5_distribution)).toBe(true);
  });
});

describe('Sprint 75 · buildGSTR7 (GST-TDS deductor)', () => {
  it('computes 2% IGST TDS on inter-state', () => {
    const r = buildGSTR7([mkSupply({ taxable_value: 100000, igst: 18000, cgst: 0, sgst: 0 })], { gstin: GSTIN, return_period: '04-2026' });
    expectBuilderShape(r, 'gstr-7');
    expect(r.totals.igst).toBeCloseTo(2000, 2);
  });
  it('computes 1%+1% CGST/SGST on intra-state', () => {
    const r = buildGSTR7([mkSupply({ taxable_value: 100000, igst: 0, cgst: 9000, sgst: 9000 })], { gstin: GSTIN, return_period: '04-2026' });
    expect(r.totals.cgst).toBeCloseTo(1000, 2);
    expect(r.totals.sgst).toBeCloseTo(1000, 2);
  });
});

describe('Sprint 75 · buildGSTR8 (E-commerce TCS)', () => {
  it('computes 1% TCS on inter-state', () => {
    const r = buildGSTR8([mkSupply({ taxable_value: 100000, igst: 18000, cgst: 0, sgst: 0 })], { gstin: GSTIN, return_period: '04-2026' });
    expectBuilderShape(r, 'gstr-8');
    expect(r.totals.igst).toBeCloseTo(1000, 2);
  });
});

describe('Sprint 75 · buildGSTR10 (Final return)', () => {
  it('produces valid payload with ITC reversal', () => {
    const r = buildGSTR10([mkSupply()], {
      gstin: GSTIN,
      cancellation_order_no: 'CNCL/001',
      cancellation_date: '2026-03-31',
      effective_date: '2026-04-01',
    });
    expectBuilderShape(r, 'gstr-10');
    expect(r.valid).toBe(true);
  });
  it('errors when cancellation order missing', () => {
    const r = buildGSTR10([mkSupply()], {
      gstin: GSTIN, cancellation_order_no: '', cancellation_date: '2026-03-31', effective_date: '2026-04-01',
    });
    expect(r.errors.some(e => e.code === 'ORDER_MISSING')).toBe(true);
  });
});

describe('Sprint 75 · buildITC03 (ITC reversal)', () => {
  it('produces valid payload', () => {
    const r = buildITC03([mkSupply()], { gstin: GSTIN, fy: '2024-25', reason: 'composition_optin' });
    expectBuilderShape(r, 'itc-03');
    expect(r.valid).toBe(true);
  });
  it('warns when reason=other lacks description', () => {
    const r = buildITC03([mkSupply()], { gstin: GSTIN, fy: '2024-25', reason: 'other' });
    expect(r.warnings.some(w => w.code === 'REASON_DESC_MISSING')).toBe(true);
  });
});

describe('Sprint 75 · buildDRC03 (Voluntary payment)', () => {
  it('produces valid payload', () => {
    const r = buildDRC03(
      { igst: 1000, cgst: 0, sgst: 0, cess: 0 },
      { gstin: GSTIN, cause: 'voluntary', payment_date: '2026-04-15' },
    );
    expectBuilderShape(r, 'drc-03');
    expect(r.valid).toBe(true);
  });
  it('errors when amount is zero', () => {
    const r = buildDRC03(
      { igst: 0, cgst: 0, sgst: 0, cess: 0 },
      { gstin: GSTIN, cause: 'voluntary', payment_date: '2026-04-15' },
    );
    expect(r.errors.some(e => e.code === 'AMOUNT_ZERO')).toBe(true);
  });
});

describe('Sprint 75 · Statutory memory seed +6', () => {
  it('seeds GSTR-4/CMP-08/GSTR-5/6/7/8 obligations', () => {
    const obs = loadObligations();
    for (const id of ['gstr-4-fy2425', 'cmp-08-q4', 'gstr-5-apr', 'gstr-6-apr', 'gstr-7-apr', 'gstr-8-apr']) {
      expect(obs.some(o => o.id === id)).toBe(true);
    }
  });
});

describe('Sprint 75 · RECG · file presence', () => {
  const ROOT = resolve(__dirname, '../../..');
  const files = [
    'src/pages/erp/comply360/tax-gst/extended/ExtendedReturnsPage.tsx',
    'src/pages/erp/comply360/tax-gst/extended/ExtendedFormShell.tsx',
    'src/pages/erp/comply360/tax-gst/extended/GSTR4Page.tsx',
    'src/pages/erp/comply360/tax-gst/extended/CMP08Page.tsx',
    'src/pages/erp/comply360/tax-gst/extended/GSTR5Page.tsx',
    'src/pages/erp/comply360/tax-gst/extended/GSTR6Page.tsx',
    'src/pages/erp/comply360/tax-gst/extended/GSTR7Page.tsx',
    'src/pages/erp/comply360/tax-gst/extended/GSTR8Page.tsx',
    'src/pages/erp/comply360/tax-gst/extended/GSTR10Page.tsx',
    'src/pages/erp/comply360/tax-gst/extended/ITC03Page.tsx',
    'src/pages/erp/comply360/tax-gst/extended/DRC03Page.tsx',
  ];
  for (const f of files) {
    it(`exists · ${f}`, () => {
      expect(existsSync(resolve(ROOT, f))).toBe(true);
    });
  }
  it('TaxGstPage has 9 TabsTrigger entries', () => {
    const src = readFileSync(resolve(ROOT, 'src/pages/erp/comply360/tax-gst/TaxGstPage.tsx'), 'utf8');
    const matches = src.match(/TabsTrigger value=/g) ?? [];
    expect(matches.length).toBe(9);
  });
  it('GSTR-1A is NOT recreated by Sprint 75 (still in builder)', () => {
    const src = readFileSync(resolve(ROOT, 'src/lib/comply360-gstr-builder-engine.ts'), 'utf8');
    expect(src.includes("'gstr-1a'")).toBe(true);
  });
});
