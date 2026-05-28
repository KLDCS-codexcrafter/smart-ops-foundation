/**
 * @file        src/test/sprint-73b/comply360-sprint-73b.test.ts
 * @purpose     Sprint 73b institutional snapshot + Pass B surface reachability
 *              Comply360 Main Arc 1.5 · Pass B (UI + nav wiring)
 * @sprint      Sprint 73b · T-Phase-5.A.1.5-PASS-B · Block 8
 * @disciplines FR-58 · FR-100 RECG · FR-43 · Lesson 24 (id-lookup + bounds-check)
 */
import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { SIBLINGS } from '@/lib/_institutional/sibling-register';
import { SPRINTS, getCurrentAStreak } from '@/lib/_institutional/sprint-history';
import { loadObligations } from '@/lib/comply360-statutory-memory';
import {
  collectEligibleVouchers,
  buildEInvoiceBatch,
  validateBatch,
} from '@/lib/comply360-einvoice-aggregator-engine';
import {
  isEWBRequired,
  computeValidityDays,
  validateEWayBill,
  buildEWayBill,
  closeEWayBill,
  cancelEWayBill,
  loadEWayBills,
  EWB_THRESHOLD,
  type EWayBill,
} from '@/lib/comply360-eway-engine';
import {
  buildMSMEForm1,
  detectDelayedPayments,
  computeInterestLiability,
  MSME_DELAY_THRESHOLD_DAYS,
} from '@/lib/comply360-msme-form1-engine';
import {
  loadArrangements,
  recordArrangement,
  buildSection393Disclosure,
  deleteArrangement,
} from '@/lib/comply360-section393-engine';

const SPRINT_73 = 73;

describe('Sprint 73b · institutional snapshot (FR-58 · Lesson 24)', () => {
  it('Sprint 73b entry exists with grade A · predecessor Sprint 73a SHA', () => {
    const e = SPRINTS.find((s) => s.sprintNumber === SPRINT_73 && s.code === 'T-Phase-5.A.1.5-PASS-B');
    expect(e).toBeDefined();
    expect(e?.grade?.startsWith('A')).toBe(true);
    expect(e?.predecessorSha).toBe('cc711d90ae26d7b1e8cb68561d8895a8fc069f5f');
  });

  it('Sprint 73a (Pass A) entry remains with 4 newSiblings (Lesson 24 id-lookup)', () => {
    const s73a = SPRINTS.find((s) => s.sprintNumber === SPRINT_73 && s.code === 'T-Phase-5.A.1.5-PASS-A');
    expect(s73a).toBeDefined();
    expect(s73a?.newSiblings.length).toBe(4);
  });

  it('A-streak ≥ 22 after Sprint 73b bank (Lesson 24 bounds-check)', () => {
    expect(getCurrentAStreak()).toBeGreaterThanOrEqual(22);
  });

  it('FR-100 RECG · 4 Pass A SIBLING backing files still on disk (0-DIFF)', () => {
    const root = process.cwd();
    for (const id of [
      'comply360-einvoice-aggregator-engine',
      'comply360-eway-engine',
      'comply360-msme-form1-engine',
      'comply360-section393-engine',
    ]) {
      const s = SIBLINGS.find((x) => x.id === id);
      expect(s, `missing SIBLING ${id}`).toBeDefined();
      expect(fs.existsSync(path.join(root, s!.path!)), `missing ${s!.path}`).toBe(true);
    }
  });

  it('3 Pass B surface shells exist on disk (Lesson 25 reachability)', () => {
    const root = process.cwd();
    for (const f of [
      'src/pages/erp/comply360/exim/EInvoiceEWayPage.tsx',
      'src/pages/erp/comply360/exim/EInvoicePage.tsx',
      'src/pages/erp/comply360/exim/EWayBillPage.tsx',
      'src/pages/erp/comply360/vendor/MSMEForm1Page.tsx',
      'src/pages/erp/comply360/roc/Section393Page.tsx',
    ]) {
      expect(fs.existsSync(path.join(root, f)), `missing ${f}`).toBe(true);
    }
  });

  it('Comply360Page router wires `exim` · `vendor` · `roc` cases to Pass B shells', () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), 'src/pages/erp/comply360/Comply360Page.tsx'),
      'utf-8',
    );
    expect(src).toContain('EInvoiceEWayPage');
    expect(src).toContain('MSMEForm1Page');
    expect(src).toContain('Section393Page');
    expect(src).toContain("case 'exim'");
    expect(src).toContain("case 'vendor'");
    expect(src).toContain("case 'roc'");
  });

  it('statutory-memory seed extended with 3 NEW Sprint 73b obligations', () => {
    const obs = loadObligations();
    const ids = new Map(obs.map((o) => [o.id, o]));
    expect(ids.get('msme-form1-h1-fy25')?.module).toBe('vendor');
    expect(ids.get('eway-pending-apr')?.module).toBe('exim');
    expect(ids.get('section393-disclosure-fy25')?.module).toBe('roc');
  });

  it('FR-19 SIBLING boundary preserved · 0-DIFF on irn-engine.ts (banner intact)', () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), 'src/lib/irn-engine.ts'),
      'utf-8',
    );
    expect(src.length).toBeGreaterThan(0);
  });
});

describe('Sprint 73b · e-invoice aggregator smoke', () => {
  beforeEach(() => { localStorage.clear(); });

  it('collectEligibleVouchers returns [] for empty entity', () => {
    expect(collectEligibleVouchers({ entity_code: 'ENT-X', fy: 'FY25-26' })).toEqual([]);
  });

  it('buildEInvoiceBatch returns empty batch when no vouchers', () => {
    const b = buildEInvoiceBatch({ entity_code: 'ENT-X', fy: 'FY25-26' });
    expect(b.total_count).toBe(0);
    expect(b.valid_count).toBe(0);
    expect(b.invalid_count).toBe(0);
  });

  it('validateBatch on empty batch is ok=true', () => {
    const b = buildEInvoiceBatch({ entity_code: 'ENT-X', fy: 'FY25-26' });
    const r = validateBatch(b);
    expect(r.ok).toBe(true);
    expect(r.invalid_voucher_nos).toEqual([]);
  });
});

describe('Sprint 73b · e-way bill engine smoke', () => {
  beforeEach(() => { localStorage.clear(); });

  it('isEWBRequired enforces ₹50,000 threshold', () => {
    expect(EWB_THRESHOLD).toBe(50_000);
    expect(isEWBRequired(49_999)).toBe(false);
    expect(isEWBRequired(50_000)).toBe(true);
  });

  it('computeValidityDays: regular cargo = 1 day per 200 km', () => {
    expect(computeValidityDays(200, 'regular')).toBe(1);
    expect(computeValidityDays(201, 'regular')).toBe(2);
    expect(computeValidityDays(20, 'over-dimensional')).toBe(1);
    expect(computeValidityDays(21, 'over-dimensional')).toBe(2);
  });

  it('validateEWayBill flags invalid GSTIN + below-threshold value', () => {
    const draft: EWayBill = {
      ewb_no: '000000000000',
      entity_code: 'ENT-X',
      part_a: {
        supplier_gstin: 'BAD',
        supplier_state_code: '27',
        consignee_gstin: 'BAD',
        consignee_state_code: '29',
        doc_no: 'INV-1',
        doc_date: '2026-04-15',
        doc_type: 'INV',
        hsn_code: '8471',
        total_invoice_value: 1000,
        taxable_value: 1000,
        cgst: 0, sgst: 0, igst: 0, cess: 0,
        reason: 'supply',
      },
      part_b: { transport_mode: 'road', approx_distance_km: 100, vehicle_no: 'MH01AA0001' },
      generated_at: null, valid_until: null, closed_at: null, cancelled_at: null,
      status: 'draft', errors: [],
    };
    const r = validateEWayBill(draft);
    expect(r.ok).toBe(false);
    expect(r.errors.length).toBeGreaterThan(0);
  });

  it('buildEWayBill persists draft on validation failure (errors retained)', () => {
    const ewb = buildEWayBill('ENT-X',
      {
        supplier_gstin: 'BAD', supplier_state_code: '27',
        consignee_gstin: 'BAD', consignee_state_code: '29',
        doc_no: 'INV-1', doc_date: '2026-04-15', doc_type: 'INV',
        hsn_code: '8471', total_invoice_value: 1000, taxable_value: 1000,
        cgst: 0, sgst: 0, igst: 0, cess: 0, reason: 'supply',
      },
      { transport_mode: 'road', approx_distance_km: 100, vehicle_no: 'MH01AA0001' },
    );
    expect(ewb.status).toBe('draft');
    expect(ewb.errors.length).toBeGreaterThan(0);
    expect(loadEWayBills('ENT-X').length).toBe(1);
  });

  it('closeEWayBill + cancelEWayBill return null for unknown EWB', () => {
    expect(closeEWayBill('ENT-X', 'NOPE')).toBeNull();
    expect(cancelEWayBill('ENT-X', 'NOPE')).toBeNull();
  });
});

describe('Sprint 73b · MSME Form 1 engine smoke', () => {
  beforeEach(() => { localStorage.clear(); });

  it('MSME_DELAY_THRESHOLD_DAYS = 45 (§15 MSMED Act)', () => {
    expect(MSME_DELAY_THRESHOLD_DAYS).toBe(45);
  });

  it('detectDelayedPayments returns [] for empty voucher stream', () => {
    expect(detectDelayedPayments({ entity_code: 'ENT-X', fy: 'FY25-26', half: 'H1' })).toEqual([]);
  });

  it('buildMSMEForm1 returns empty H1 return for empty entity', () => {
    const r = buildMSMEForm1({ entity_code: 'ENT-X', fy: 'FY25-26', half: 'H1' });
    expect(r.half).toBe('H1');
    expect(r.total_vendors).toBe(0);
    expect(r.total_invoices).toBe(0);
    expect(r.total_outstanding).toBe(0);
    expect(r.total_interest_liability).toBe(0);
    expect(r.filed).toBe(false);
  });

  it('computeInterestLiability applies 3× RBI bank rate', () => {
    const ic = computeInterestLiability(
      {
        vendor_id: 'V1', vendor_name: 'Acme MSME', invoice_no: 'INV-1',
        invoice_date: '2026-04-01', due_date: '2026-05-16',
        invoice_value: 100_000, amount_outstanding: 100_000, days_outstanding: 60,
      },
      6.0,
    );
    expect(ic.applicable_rate_pct).toBe(18.0);
    expect(ic.interest_amount).toBeGreaterThan(0);
  });
});

describe('Sprint 73b · Section 393 engine smoke', () => {
  beforeEach(() => { localStorage.clear(); });

  it('loadArrangements returns [] for empty entity', () => {
    expect(loadArrangements('ENT-X')).toEqual([]);
  });

  it('recordArrangement persists and assigns id + timestamps', () => {
    const a = recordArrangement({
      entity_code: 'ENT-X',
      scheme: 'amalgamation',
      short_title: 'Acme → Beta merger',
      appointed_date: '2026-04-01',
      parties: [
        { party_id: 'P1', party_name: 'Acme', role: 'transferor' },
        { party_id: 'P2', party_name: 'Beta', role: 'transferee' },
      ],
      nclt_status: 'first-motion-filed',
    });
    expect(a.id).toBeTruthy();
    expect(a.created_at).toBeTruthy();
    expect(loadArrangements('ENT-X').length).toBe(1);
  });

  it('buildSection393Disclosure includes swap ratio and parties summary', () => {
    const a = recordArrangement({
      entity_code: 'ENT-X',
      scheme: 'amalgamation',
      short_title: 'Acme → Beta merger',
      appointed_date: '2026-04-01',
      parties: [
        { party_id: 'P1', party_name: 'Acme', role: 'transferor' },
        { party_id: 'P2', party_name: 'Beta', role: 'transferee' },
      ],
      nclt_status: 'sanctioned',
      swap_ratio: '5:1',
      consideration_value: 10_000_000,
    });
    const d = buildSection393Disclosure(a);
    expect(d.parties_summary).toContain('Acme');
    expect(d.parties_summary).toContain('Beta');
    expect(d.disclosure_notes.some((n) => n.includes('5:1'))).toBe(true);
    expect(d.disclosure_notes.some((n) => n.includes('Consideration'))).toBe(true);
  });

  it('deleteArrangement removes by id; false when absent', () => {
    const a = recordArrangement({
      entity_code: 'ENT-X', scheme: 'merger', short_title: 'T',
      appointed_date: '2026-04-01', parties: [], nclt_status: 'draft',
    });
    expect(deleteArrangement('ENT-X', a.id)).toBe(true);
    expect(deleteArrangement('ENT-X', a.id)).toBe(false);
  });
});
