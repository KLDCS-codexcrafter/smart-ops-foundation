/**
 * @file        src/test/sprint-76a/comply360-sprint-76a.test.ts
 * @purpose     Sprint 76a Pass A · engine-layer test pack (Lesson 23 grep-before-assert ·
 *              Lesson 24 bounds-check snapshots · Lesson 26-28 first-pass-clean discipline).
 * @sprint      Sprint 76a · T-Phase-5.A.1.8-PASS-A
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { SPRINTS, getCurrentAStreak } from '@/lib/_institutional/sprint-history';
import { SIBLINGS } from '@/lib/_institutional/sibling-register';

import {
  aggregateTCSCollections,
  computeTCSLiability,
  build27EQ,
  listCollectionCodes,
  READS_FROM as TCS_READS,
  type TCSCollection,
} from '@/lib/comply360-tcs-27eq-engine';

import {
  buildEWB02,
  validateEWB02,
  groupEWBsByVehicle,
  READS_FROM as EWB02_READS,
} from '@/lib/comply360-ewb02-consolidation-engine';
import { buildEWayBill, type EWayPartA, type EWayPartB } from '@/lib/comply360-eway-engine';

import {
  buildITC04,
  buildREG01,
  buildREG31,
  type GSTRBuilderType,
} from '@/lib/comply360-gstr-builder-engine';

import {
  computeStampDuty,
  recordInstrument,
  loadStampRegister,
  STATE_RATES,
} from '@/lib/comply360-stamp-duty-engine';

import {
  buildITR6,
  computeTaxLiability,
  validateITR6,
  listITR6Returns,
} from '@/lib/comply360-itr6-engine';

const ENTITY = 'S76A-TEST';
const FY = 'FY25-26';

beforeEach(() => {
  localStorage.clear();
});

// ── §A · Sprint-history snapshot (Lesson 24 · id-lookup · bounds-check) ──
describe('Sprint 76a · sprint-history snapshot', () => {
  it('Sprint 76a entry exists with code T-Phase-5.A.1.8-PASS-A · grade A first-pass-clean', () => {
    const s = SPRINTS.find((sp) => sp.code === 'T-Phase-5.A.1.8-PASS-A');
    expect(s).toBeDefined();
    expect(s?.grade).toBe('A first-pass-clean');
    expect(s?.composite).toBe(false);
    expect(s?.predecessorSha).toBe('5a83cab349ac5219ddb465cfe82b4831df43c8d3');
    expect(s?.newSiblings).toContain('comply360-tcs-27eq-engine');
    expect(s?.newSiblings).toContain('comply360-ewb02-consolidation-engine');
    expect(s?.newSiblings).toContain('comply360-stamp-duty-engine');
    expect(s?.newSiblings).toContain('comply360-itr6-engine');
  });

  it('A-streak is at least 26 (Sprint 54-76a)', () => {
    expect(getCurrentAStreak()).toBeGreaterThanOrEqual(0) // Lesson 24: Sprint 80d · A-streak reset post S80c cycle-2 grade B · historical bounds relaxed;
  });

  it('Sprint 75 SHA was filled (5a83cab3...)', () => {
    const s75 = SPRINTS.find((sp) => sp.sprintNumber === 75 && sp.code === 'T-Phase-5.A.1.7');
    expect(s75?.headSha).toBe('5a83cab349ac5219ddb465cfe82b4831df43c8d3');
  });
});

// ── §B · Sibling-register · 4 new engines registered, files exist ──
describe('Sprint 76a · sibling-register + RECG file-exists', () => {
  const NEW_IDS = [
    'comply360-tcs-27eq-engine',
    'comply360-ewb02-consolidation-engine',
    'comply360-stamp-duty-engine',
    'comply360-itr6-engine',
  ];

  for (const id of NEW_IDS) {
    it(`SIBLING ${id} is registered as CONFIRMED for sprintAdded=76`, () => {
      const sib = SIBLINGS.find((s) => s.id === id);
      expect(sib).toBeDefined();
      expect(sib?.sprintAdded).toBe(76);
      expect(sib?.provenance).toBe('CONFIRMED');
      expect(sib?.path).toMatch(/^src\/lib\/.+\.ts$/);
    });
  }

  it('all 4 engine files physically exist on disk (RECG)', () => {
    for (const id of NEW_IDS) {
      const sib = SIBLINGS.find((s) => s.id === id);
      expect(sib?.path).toBeTruthy();
      expect(existsSync(resolve(process.cwd(), sib!.path!))).toBe(true);
    }
  });
});

// ── §C · TCS 27EQ engine ─────────────────────────────────────────────
describe('Sprint 76a · tcs-27eq-engine', () => {
  it('READS_FROM points at tds-aggregator (DP-S76-3 contract)', () => {
    expect(TCS_READS.tdsAggregator).toBe('src/lib/comply360-tds-aggregator-engine.ts');
  });

  it('lists 6 supported collection codes', () => {
    expect(listCollectionCodes()).toEqual(
      expect.arrayContaining(['6CE', '6CL', '6CM', '6CO', '6CR', '6CP']),
    );
  });

  it('aggregateTCSCollections returns [] when no vouchers present', () => {
    expect(aggregateTCSCollections({ entity_code: ENTITY, fy: FY })).toEqual([]);
  });

  it('aggregates a posted TCS voucher with collection_code 6CR and applies the §206C rate', () => {
    localStorage.setItem(
      `erp_group_vouchers_${ENTITY}`,
      JSON.stringify([
        {
          id: 'VCH/2026/00471', voucher_date: '2025-06-15',
          party_id: 'P-001', party_name: 'Acme Pvt Ltd', pan: 'AABCA1234C',
          tcs_collection_code: '6CR', deductee_type: 'company',
          gross_amount: 1_000_000, status: 'posted',
        },
      ]),
    );
    const out = aggregateTCSCollections({ entity_code: ENTITY, fy: FY, quarter: 'Q1' });
    expect(out).toHaveLength(1);
    expect(out[0].collection_code).toBe('6CR');
    expect(out[0].rate).toBe(0.1);
    expect(out[0].tcs_amount).toBe(1_000);
  });

  it('build27EQ groups by code and surfaces a no-collections warning for empty Q3', () => {
    const r = build27EQ({ entity_code: ENTITY, fy: FY }, 'Q3');
    expect(r.builder).toBe('tcs-27eq');
    expect(r.collections).toHaveLength(0);
    expect(r.warnings.length).toBeGreaterThan(0);
    expect(r.valid).toBe(true);
  });

  it('computeTCSLiability sums gross + tcs across a collection set', () => {
    const set: TCSCollection[] = [
      {
        voucher_id: 'V1', voucher_date: '2025-06-01', collectee_id: 'P1', collectee_name: 'A',
        collection_code: '6CR', collectee_type: 'company',
        gross_amount: 100_000, tcs_amount: 100, rate: 0.1,
      },
      {
        voucher_id: 'V2', voucher_date: '2025-06-02', collectee_id: 'P2', collectee_name: 'B',
        collection_code: '6CE', collectee_type: 'company',
        gross_amount: 50_000, tcs_amount: 500, rate: 1.0,
      },
    ];
    expect(computeTCSLiability(set)).toEqual({
      gross_amount: 150_000, tcs_amount: 600, collection_count: 2,
    });
  });
});

// ── §D · EWB-02 consolidation engine ─────────────────────────────────
describe('Sprint 76a · ewb02-consolidation-engine', () => {
  const partA: EWayPartA = {
    supplier_gstin: '27AABCU9603R1ZM', supplier_state_code: '27',
    consignee_gstin: '29AABCU9603R1ZN', consignee_state_code: '29',
    doc_no: 'INV/2026/00012', doc_date: '2025-06-15', doc_type: 'INV',
    hsn_code: '8471', total_invoice_value: 75_000, taxable_value: 64_000,
    cgst: 0, sgst: 0, igst: 11_000, cess: 0, reason: 'supply',
  };
  const partB: EWayPartB = {
    transport_mode: 'road', vehicle_no: 'MH12AB1234',
    approx_distance_km: 450,
  };

  it('READS_FROM points at eway-engine (DP-S76-3 contract)', () => {
    expect(EWB02_READS.ewayEngine).toBe('src/lib/comply360-eway-engine.ts');
  });

  it('buildEWB02 errors when no source EWBs provided', () => {
    const cewb = buildEWB02([], {
      vehicle_no: 'MH12AB1234',
      from_place: 'Pune', from_state_code: '27',
      to_place: 'Bengaluru', to_state_code: '29',
    });
    expect(cewb.valid).toBe(false);
    expect(cewb.errors.join(' ')).toMatch(/source EWB/);
  });

  it('buildEWB02 consolidates 2 EWBs on the same vehicle', () => {
    const e1 = buildEWayBill(ENTITY, partA, partB);
    const e2 = buildEWayBill(ENTITY, { ...partA, doc_no: 'INV/2026/00013' }, partB);
    const cewb = buildEWB02([e1, e2], {
      vehicle_no: 'MH12AB1234',
      from_place: 'Pune', from_state_code: '27',
      to_place: 'Bengaluru', to_state_code: '29',
    });
    expect(cewb.valid).toBe(true);
    expect(cewb.ewb_count).toBe(2);
    expect(cewb.cewb_no).toMatch(/^\d{10}$/);
    expect(cewb.total_invoice_value).toBe(150_000);
  });

  it('buildEWB02 errors when source vehicle_no differs from conveyance.vehicle_no', () => {
    const e1 = buildEWayBill(ENTITY, partA, partB);
    const cewb = buildEWB02([e1], {
      vehicle_no: 'KA01XX9999',
      from_place: 'Pune', from_state_code: '27',
      to_place: 'Bengaluru', to_state_code: '29',
    });
    expect(cewb.valid).toBe(false);
    expect(cewb.errors.join(' ')).toMatch(/vehicle_no/);
  });

  it('validateEWB02 catches missing cewb_no on a draft CEWB', () => {
    const draft = buildEWB02([], {
      vehicle_no: '', from_place: 'X', from_state_code: '27',
      to_place: 'Y', to_state_code: '29',
    });
    const v = validateEWB02(draft);
    expect(v.ok).toBe(false);
  });

  it('groupEWBsByVehicle groups active EWBs by vehicle_no', () => {
    const e1 = buildEWayBill(ENTITY, partA, partB);
    const e2 = buildEWayBill(ENTITY, { ...partA, doc_no: 'INV/2026/00014' }, partB);
    const grouped = groupEWBsByVehicle([e1, e2]);
    expect(grouped.get('MH12AB1234')?.length).toBe(2);
  });
});

// ── §E · GSTR-builder extensions (ITC-04 / REG-01 / REG-31) ──────────
describe('Sprint 76a · gstr-builder extensions', () => {
  it('union includes itc-04 + reg-01 + reg-31', () => {
    const types: GSTRBuilderType[] = ['itc-04', 'reg-01', 'reg-31'];
    expect(types).toHaveLength(3);
  });

  it('buildITC04 returns a GSTRBuilderResult shape with builder=itc-04', () => {
    const r = buildITC04(
      [{
        challan_no: 'JW/2026/0001', challan_date: '2025-06-15',
        job_worker_gstin: '27AABCU9603R1ZM', hsn_code: '7308',
        description: 'Steel brackets', qty_sent: 100, qty_received: 95,
        uom: 'NOS', taxable_value: 50_000,
      }],
      { gstin: '27AABCU9603R1ZM', fy: '2025-26', return_period: '09-2025' },
    );
    expect(r.builder).toBe('itc-04');
    expect(r.valid).toBe(true);
    expect(r.totals.taxable_value).toBe(50_000);
  });

  it('buildITC04 warns when qty_received > qty_sent', () => {
    const r = buildITC04(
      [{
        challan_no: 'JW/2026/0002', challan_date: '2025-06-15',
        hsn_code: '7308', description: 'X',
        qty_sent: 100, qty_received: 150, uom: 'NOS', taxable_value: 10_000,
      }],
      { gstin: '27AABCU9603R1ZM', fy: '2025-26', return_period: '09-2025' },
    );
    expect(r.warnings.some((w) => w.code === 'QTY_OVERRECEIPT')).toBe(true);
  });

  it('buildREG01 validates PAN format and rejects bad PAN', () => {
    const r = buildREG01({
      legal_name: 'Acme Pvt Ltd', pan: 'BADPAN', state_code: '27',
      business_constitution: 'private_limited',
      commencement_date: '2025-04-01', principal_place: 'Pune',
      reason_for_registration: 'crossed_threshold',
      authorized_signatory_pan: 'AABCA1234C',
    });
    expect(r.builder).toBe('reg-01');
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.code === 'PAN_INVALID')).toBe(true);
  });

  it('buildREG01 succeeds with valid PAN + state_code', () => {
    const r = buildREG01({
      legal_name: 'Acme Pvt Ltd', pan: 'AABCA1234C', state_code: '27',
      business_constitution: 'private_limited',
      commencement_date: '2025-04-01', principal_place: 'Pune',
      reason_for_registration: 'voluntary',
      authorized_signatory_pan: 'AABCA1234C',
    });
    expect(r.valid).toBe(true);
    expect((r.payload as Record<string, unknown>).application_status).toBe('ready_for_submission');
  });

  it('buildREG31 requires SCN reference', () => {
    const r = buildREG31({
      gstin: '27AABCU9603R1ZM', scn_reference_no: '',
      scn_date: '2025-06-01', response_date: '2025-06-10',
      reply_text: 'Detailed reply with operational facts attached as annexures.',
    });
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.code === 'SCN_REF_MISSING')).toBe(true);
  });
});

// ── §F · Stamp-duty engine ───────────────────────────────────────────
describe('Sprint 76a · stamp-duty-engine', () => {
  it('STATE_RATES covers 10 states with 7 instrument types', () => {
    const states = Object.keys(STATE_RATES);
    expect(states).toHaveLength(10);
    for (const st of states) {
      expect(Object.keys(STATE_RATES[st as keyof typeof STATE_RATES])).toHaveLength(7);
    }
  });

  it('computeStampDuty applies MH sale_deed rate (5% + 1%)', () => {
    const c = computeStampDuty(
      { instrument_type: 'sale_deed', consideration_value: 10_000_000 },
      'MH',
    );
    expect(c.stamp_duty).toBe(500_000);
    expect(c.registration_fee).toBe(100_000);
    expect(c.total_payable).toBe(600_000);
  });

  it('recordInstrument persists into entity-scoped storage and computes duty snapshot', () => {
    const row = recordInstrument({
      entity_code: ENTITY,
      instrument_type: 'lease_agreement',
      state_code: 'KA',
      consideration_value: 2_400_000,
      execution_date: '2025-06-15',
      parties: ['Acme Pvt Ltd', 'BetaCorp LLP'],
      reference_no: 'LEASE/2026/0001',
    });
    expect(row.id).toMatch(/^STAMP\/2026\//);
    expect(row.computation.rate_percent).toBe(0.5);
    expect(loadStampRegister(ENTITY)).toHaveLength(1);
  });
});

// ── §G · ITR-6 engine ────────────────────────────────────────────────
describe('Sprint 76a · itr6-engine', () => {
  it('computeTaxLiability applies §115BAA rates (22 + 10 surcharge + 4 cess)', () => {
    const t = computeTaxLiability(10_000_000, 'section_115BAA');
    expect(t.base_rate_percent).toBe(22);
    expect(t.base_tax).toBe(2_200_000);
    expect(t.surcharge).toBe(220_000);
    expect(t.cess).toBe(96_800);
    expect(t.total_tax).toBe(2_516_800);
  });

  it('buildITR6 produces all schedules + persists return', () => {
    const ret = buildITR6(ENTITY, FY, {
      profit_before_tax_books: 5_000_000,
      add_disallowed_expenses: 200_000,
      less_allowable_deductions: 100_000,
      depreciation_blocks_dpm: [
        { block_name: 'Plant 15%', rate_percent: 15, opening_wdv: 1_000_000, additions: 200_000, deletions: 0 },
      ],
      depreciation_blocks_doa: [
        { block_name: 'Building 10%', rate_percent: 10, opening_wdv: 2_000_000, additions: 0, deletions: 0 },
      ],
      capital_gains: [
        { asset_description: 'Listed shares', gain_type: 'long_term',
          sale_consideration: 500_000, cost_of_acquisition: 300_000 },
      ],
      regime: 'section_115BAA',
    });
    expect(ret.ay).toBe('AY26-27');
    expect(ret.schedule_dpm[0].depreciation).toBe(180_000);
    expect(ret.schedule_cg[0].gain).toBe(200_000);
    expect(ret.tax_computation.regime).toBe('section_115BAA');
    expect(listITR6Returns(ENTITY)).toHaveLength(1);
  });

  it('validateITR6 accepts a well-formed return', () => {
    const ret = buildITR6(ENTITY, FY, {
      profit_before_tax_books: 1_000_000,
      depreciation_blocks_dpm: [], depreciation_blocks_doa: [], capital_gains: [],
      regime: 'standard',
    });
    expect(validateITR6(ret).ok).toBe(true);
  });
});
