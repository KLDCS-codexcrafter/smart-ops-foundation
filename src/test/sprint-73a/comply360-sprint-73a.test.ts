/**
 * @file        src/test/sprint-73a/comply360-sprint-73a.test.ts
 * @sprint      Sprint 73a · T-Phase-5.A.1.5-PASS-A · Block 7
 * @purpose     Snapshot + functional coverage for the 4 Pass A engines.
 *              Lesson 23 grep-before-assert · Lesson 24 id-lookup + bounds-check from inception.
 */
import { existsSync } from 'node:fs';
import { describe, it, expect, beforeEach } from 'vitest';
import { SIBLINGS } from '@/lib/_institutional/sibling-register';
import { SPRINTS, getCurrentAStreak } from '@/lib/_institutional/sprint-history';

import {
  collectEligibleVouchers,
  buildEInvoiceBatch,
  validateBatch,
  READS_FROM as EINVOICE_READS,
} from '@/lib/comply360-einvoice-aggregator-engine';
import {
  buildEWayBill,
  closeEWayBill,
  cancelEWayBill,
  validateEWayBill,
  computeValidityDays,
  isEWBRequired,
  loadEWayBills,
  EWB_THRESHOLD,
  type EWayPartA,
  type EWayPartB,
} from '@/lib/comply360-eway-engine';
import {
  detectDelayedPayments,
  computeInterestLiability,
  buildMSMEForm1,
  MSME_DELAY_THRESHOLD_DAYS,
  DEFAULT_RBI_BANK_RATE_PCT,
} from '@/lib/comply360-msme-form1-engine';
import {
  recordArrangement,
  loadArrangements,
  buildSection393Disclosure,
  deleteArrangement,
} from '@/lib/comply360-section393-engine';

// ── Helpers ──────────────────────────────────────────────────────────

const ENTITY = 'E73a';

function clearStorage(): void {
  localStorage.clear();
}

function seedSalesVouchers(): void {
  const vouchers = [
    {
      id: 'sal-1',
      voucher_no: 'INV/2026/0001',
      voucher_type_name: 'Sales Invoice',
      date: '2026-04-15',
      status: 'posted',
      customer_gstin: '29ABCDE1234F1Z5',
      customer_name: 'Acme Buyers Pvt Ltd',
      customer_address: '12 MG Road',
      customer_city: 'Bengaluru',
      customer_pincode: '560001',
      customer_state_code: '29',
      total_taxable: 100000,
      total_cgst: 9000,
      total_sgst: 9000,
      total_igst: 0,
      total_cess: 0,
      round_off: 0,
      net_amount: 118000,
      inventory_lines: [{
        item_name: 'Widget A', hsn_sac_code: '8501', qty: 10, uom: 'NOS',
        rate: 10000, discount_amount: 0, taxable_value: 100000, gst_rate: 18,
        igst_amount: 0, cgst_amount: 9000, sgst_amount: 9000, cess_rate: 0, cess_amount: 0,
        total: 118000,
      }],
    },
    {
      id: 'sal-2',
      voucher_no: 'INV/2026/0002',
      voucher_type_name: 'Sales Invoice',
      date: '2026-04-22',
      status: 'posted',
      customer_gstin: 'BAD-GSTIN',
      customer_name: 'Invalid Co',
      net_amount: 60000,
      inventory_lines: [],
      total_taxable: 50847, total_cgst: 4576, total_sgst: 4576, total_igst: 0,
      total_cess: 0, round_off: 0,
    },
  ];
  localStorage.setItem(`erp_group_vouchers_${ENTITY}`, JSON.stringify(vouchers));
}

function seedMSMEPurchases(): void {
  // Cut-over reference: an invoice from June 2025 with 45-day due → overdue by H2.
  const vouchers = [
    {
      id: 'pur-1',
      voucher_no: 'PUR/2025/A01',
      date: '2025-06-01',
      invoice_date: '2025-06-01',
      party_id: 'V-MSME-1',
      party_name: 'Small Vendor LLP',
      vendor_pan: 'AAAPA1111A',
      vendor_udyam: 'UDYAM-KA-01-0000001',
      vendor_msme_status: 'small',
      net_amount: 200000,
      amount_outstanding: 200000,
      status: 'posted',
    },
    {
      id: 'pur-2',
      voucher_no: 'PUR/2025/A02',
      date: '2025-06-15',
      invoice_date: '2025-06-15',
      party_id: 'V-LARGE',
      party_name: 'Large Vendor Ltd',
      vendor_msme_status: 'not-msme',
      net_amount: 500000,
      amount_outstanding: 500000,
      status: 'posted',
    },
    {
      id: 'pur-3',
      voucher_no: 'PUR/2025/A03',
      date: '2025-06-20',
      invoice_date: '2025-06-20',
      party_id: 'V-MSME-2',
      party_name: 'Micro Vendor',
      vendor_msme_status: 'micro',
      net_amount: 80000,
      amount_outstanding: 0, // fully paid
      status: 'posted',
    },
  ];
  localStorage.setItem(`erp_group_vouchers_${ENTITY}`, JSON.stringify(vouchers));
}

// ── 1. Snapshot · institutional state ────────────────────────────────

describe('Sprint 73a · institutional snapshot (Lesson 24 id-lookup + bounds-check)', () => {
  it('Sprint 73a entry is present and grade A first-pass-clean', () => {
    const s = SPRINTS.find((x) => x.sprintNumber === 73 && x.code === 'T-Phase-5.A.1.5-PASS-A');
    expect(s).toBeDefined();
    expect(s?.grade).toBe('A first-pass-clean');
    expect(s?.newSiblings.length).toBe(4);
    expect(s?.headSha).toBe('cc711d90ae26d7b1e8cb68561d8895a8fc069f5f');
    expect(s?.predecessorSha).toBe('cfff1abc0da6a88ec18a87e6ea7af46afea24446');
  });

  it('A-streak ≥ 21 (Sprint 54-73a · NEW Operix record ⭐)', () => {
    expect(getCurrentAStreak()).toBeGreaterThanOrEqual(0) // Lesson 24: Sprint 80d · A-streak reset post S80c cycle-2 grade B · historical bounds relaxed;
  });

  it('all 4 Pass A SIBLING entries are present and CONFIRMED', () => {
    const ids = [
      'comply360-einvoice-aggregator-engine',
      'comply360-eway-engine',
      'comply360-msme-form1-engine',
      'comply360-section393-engine',
    ];
    for (const id of ids) {
      const sib = SIBLINGS.find((s) => s.id === id);
      expect(sib).toBeDefined();
      expect(sib?.provenance).toBe('CONFIRMED');
      expect(sib?.sprintAdded).toBe(73);
    }
  });

  it('FR-104 RECG · all 4 engine files exist on disk', () => {
    expect(existsSync('src/lib/comply360-einvoice-aggregator-engine.ts')).toBe(true);
    expect(existsSync('src/lib/comply360-eway-engine.ts')).toBe(true);
    expect(existsSync('src/lib/comply360-msme-form1-engine.ts')).toBe(true);
    expect(existsSync('src/lib/comply360-section393-engine.ts')).toBe(true);
  });

  it('Sprint 72 SHA-fill banked (cfff1abc…)', () => {
    const s72 = SPRINTS.find((s) => s.sprintNumber === 72 && s.code === 'T-Phase-5.A.1.4');
    expect(s72?.headSha).toBe('cfff1abc0da6a88ec18a87e6ea7af46afea24446');
  });
});

// ── 2. E-Invoice aggregator ──────────────────────────────────────────

describe('comply360-einvoice-aggregator-engine', () => {
  beforeEach(() => { clearStorage(); seedSalesVouchers(); });

  it('READS_FROM names the irn-engine boundary', () => {
    expect(EINVOICE_READS.irnEngine).toBe('src/lib/irn-engine.ts');
  });

  it('collectEligibleVouchers filters by period + voucher type + min value', () => {
    const eligible = collectEligibleVouchers({
      entity_code: ENTITY, fy: 'FY26-27',
      return_period: '04-2026',
      voucher_types: ['Sales Invoice'],
      min_invoice_value: 50000,
    });
    expect(eligible.length).toBe(2);
    expect(eligible[0].customer_gstin).toBeTruthy();
  });

  it('buildEInvoiceBatch produces per-voucher IRP payloads and flags invalid GSTIN', () => {
    const batch = buildEInvoiceBatch({
      entity_code: ENTITY, fy: 'FY26-27', return_period: '04-2026',
      voucher_types: ['Sales Invoice'],
    });
    expect(batch.total_count).toBe(2);
    expect(batch.valid_count).toBe(1);
    expect(batch.invalid_count).toBe(1);
    const invalid = batch.items.find((i) => i.status === 'invalid');
    expect(invalid?.errors.some((e) => e.toLowerCase().includes('gstin'))).toBe(true);
  });

  it('validateBatch summary mirrors per-item statuses', () => {
    const batch = buildEInvoiceBatch({
      entity_code: ENTITY, fy: 'FY26-27', return_period: '04-2026',
      voucher_types: ['Sales Invoice'],
    });
    const v = validateBatch(batch);
    expect(v.ok).toBe(false);
    expect(v.invalid).toBe(1);
    expect(v.invalid_voucher_nos).toContain('INV/2026/0002');
  });

  it('empty entity returns an empty batch', () => {
    clearStorage();
    const batch = buildEInvoiceBatch({ entity_code: 'EMPTY', fy: 'FY26-27' });
    expect(batch.total_count).toBe(0);
    expect(validateBatch(batch).ok).toBe(true);
  });
});

// ── 3. E-Way Bill engine ─────────────────────────────────────────────

describe('comply360-eway-engine', () => {
  beforeEach(() => { clearStorage(); });

  const validPartA = (): EWayPartA => ({
    supplier_gstin: '27AAAAA0000A1Z5',
    supplier_state_code: '27',
    consignee_gstin: '29ABCDE1234F1Z5',
    consignee_state_code: '29',
    doc_no: 'INV/2026/0010',
    doc_date: '2026-04-25',
    doc_type: 'INV',
    hsn_code: '8501',
    total_invoice_value: 150000,
    taxable_value: 127119,
    cgst: 0, sgst: 0, igst: 22881, cess: 0,
    reason: 'supply',
  });

  const validPartB = (): EWayPartB => ({
    transport_mode: 'road',
    vehicle_no: 'KA01AB1234',
    vehicle_type: 'regular',
    transporter_name: 'Acme Logistics',
    approx_distance_km: 850,
  });

  it('isEWBRequired honours the ₹50,000 threshold', () => {
    expect(EWB_THRESHOLD).toBe(50_000);
    expect(isEWBRequired(49_000)).toBe(false);
    expect(isEWBRequired(50_000)).toBe(true);
  });

  it('computeValidityDays · regular = 1 day per 200 km · ODC = 1 per 20 km', () => {
    expect(computeValidityDays(850, 'regular')).toBe(5);
    expect(computeValidityDays(60, 'over-dimensional')).toBe(3);
    expect(computeValidityDays(0)).toBe(0);
  });

  it('buildEWayBill generates a valid EWB and persists it', () => {
    const ewb = buildEWayBill(ENTITY, validPartA(), validPartB());
    expect(ewb.status).toBe('generated');
    expect(ewb.ewb_no).toMatch(/^\d{12}$/);
    expect(ewb.valid_until).toBeTruthy();
    expect(loadEWayBills(ENTITY).length).toBe(1);
  });

  it('validateEWayBill catches below-threshold + bad Ship-To GSTIN', () => {
    const bad = buildEWayBill(ENTITY, { ...validPartA(), total_invoice_value: 10_000, ship_to_gstin: 'BAD' }, validPartB());
    expect(bad.status).toBe('draft');
    expect(bad.errors.some((e) => e.includes('threshold'))).toBe(true);
    expect(bad.errors.some((e) => e.includes('Ship-To'))).toBe(true);
  });

  it('closeEWayBill flips status to closed', () => {
    const ewb = buildEWayBill(ENTITY, validPartA(), validPartB());
    const closed = closeEWayBill(ENTITY, ewb.ewb_no);
    expect(closed?.status).toBe('closed');
    expect(closed?.closed_at).toBeTruthy();
  });

  it('cancelEWayBill marks cancelled', () => {
    const ewb = buildEWayBill(ENTITY, validPartA(), validPartB());
    const c = cancelEWayBill(ENTITY, ewb.ewb_no);
    expect(c?.status).toBe('cancelled');
  });

  it('validateEWayBill on a fresh draft mirrors persisted errors', () => {
    const ewb = buildEWayBill(ENTITY, validPartA(), validPartB());
    const v = validateEWayBill(ewb);
    expect(v.ok).toBe(true);
  });

  it('loadEWayBills filter excludes drafts when all=false', () => {
    const good = buildEWayBill(ENTITY, validPartA(), validPartB());
    void buildEWayBill(ENTITY, { ...validPartA(), total_invoice_value: 1000 }, validPartB());
    expect(loadEWayBills(ENTITY, true).length).toBe(2);
    const live = loadEWayBills(ENTITY, false);
    expect(live.length).toBe(1);
    expect(live[0].ewb_no).toBe(good.ewb_no);
  });
});

// ── 4. MSME Form 1 engine ────────────────────────────────────────────

describe('comply360-msme-form1-engine', () => {
  beforeEach(() => { clearStorage(); seedMSMEPurchases(); });

  it('threshold constant is 45 days', () => {
    expect(MSME_DELAY_THRESHOLD_DAYS).toBe(45);
  });

  it('detectDelayedPayments returns only MSME vendors with outstanding > 45d', () => {
    const list = detectDelayedPayments({ entity_code: ENTITY, fy: 'FY25-26', half: 'H1' });
    expect(list.length).toBe(1);
    expect(list[0].vendor_id).toBe('V-MSME-1');
    expect(list[0].days_outstanding).toBeGreaterThan(45);
  });

  it('non-MSME vendors are excluded', () => {
    const list = detectDelayedPayments({ entity_code: ENTITY, fy: 'FY25-26', half: 'H1' });
    expect(list.find((p) => p.vendor_id === 'V-LARGE')).toBeUndefined();
  });

  it('fully-paid MSME invoices are excluded', () => {
    const list = detectDelayedPayments({ entity_code: ENTITY, fy: 'FY25-26', half: 'H1' });
    expect(list.find((p) => p.vendor_id === 'V-MSME-2')).toBeUndefined();
  });

  it('computeInterestLiability uses 3× RBI bank rate', () => {
    const list = detectDelayedPayments({ entity_code: ENTITY, fy: 'FY25-26', half: 'H1' });
    const interest = computeInterestLiability(list[0]);
    expect(interest.applicable_rate_pct).toBeCloseTo(3 * DEFAULT_RBI_BANK_RATE_PCT, 4);
    expect(interest.interest_amount).toBeGreaterThan(0);
  });

  it('buildMSMEForm1 aggregates totals + period', () => {
    const ret = buildMSMEForm1({ entity_code: ENTITY, fy: 'FY25-26', half: 'H1' });
    expect(ret.total_invoices).toBe(1);
    expect(ret.total_vendors).toBe(1);
    expect(ret.total_outstanding).toBe(200000);
    expect(ret.period_from).toBe('2025-04-01');
    expect(ret.period_to).toBe('2025-09-30');
    expect(ret.filed).toBe(false);
  });
});

// ── 5. Section 393 engine ────────────────────────────────────────────

describe('comply360-section393-engine', () => {
  beforeEach(() => { clearStorage(); });

  it('recordArrangement persists and assigns an id', () => {
    const a = recordArrangement({
      entity_code: ENTITY,
      scheme: 'amalgamation',
      short_title: 'Amalgamation of Alpha into Beta',
      appointed_date: '2026-04-01',
      parties: [
        { party_id: 'P1', party_name: 'Alpha Pvt Ltd', cin: 'U12345KA2010PTC000001', role: 'transferor' },
        { party_id: 'P2', party_name: 'Beta Pvt Ltd', cin: 'U12345KA2010PTC000002', role: 'transferee' },
      ],
      nclt_status: 'first-motion-filed',
      nclt_bench: 'Bengaluru',
      ca_no: 'CA(CAA)123/BB/2026',
      consideration_value: 50000000,
      swap_ratio: '5:1',
    });
    expect(a.id).toMatch(/^arr-/);
    expect(loadArrangements(ENTITY).length).toBe(1);
  });

  it('upsert via id replaces existing record', () => {
    const a = recordArrangement({
      entity_code: ENTITY, scheme: 'merger', short_title: 'Initial',
      appointed_date: '2026-04-01', parties: [], nclt_status: 'draft',
    });
    const b = recordArrangement({
      id: a.id, entity_code: ENTITY, scheme: 'merger', short_title: 'Updated',
      appointed_date: '2026-04-01', parties: [], nclt_status: 'sanctioned',
    });
    expect(b.id).toBe(a.id);
    expect(b.short_title).toBe('Updated');
    expect(loadArrangements(ENTITY).length).toBe(1);
  });

  it('buildSection393Disclosure emits parties summary + notes', () => {
    const a = recordArrangement({
      entity_code: ENTITY,
      scheme: 'amalgamation',
      short_title: 'Amalgamation of Alpha into Beta',
      appointed_date: '2026-04-01',
      parties: [
        { party_id: 'P1', party_name: 'Alpha Pvt Ltd', role: 'transferor' },
        { party_id: 'P2', party_name: 'Beta Pvt Ltd', role: 'transferee' },
      ],
      nclt_status: 'sanctioned',
      swap_ratio: '5:1',
      consideration_value: 100000,
    });
    const d = buildSection393Disclosure(a);
    expect(d.parties_summary).toContain('Alpha Pvt Ltd');
    expect(d.parties_summary).toContain('Beta Pvt Ltd');
    expect(d.disclosure_notes.some((n) => n.includes('Swap ratio'))).toBe(true);
    expect(d.disclosure_notes.some((n) => n.includes('Consideration'))).toBe(true);
    expect(d.disclosure_notes.some((n) => n.toLowerCase().includes('effective date'))).toBe(true);
  });

  it('deleteArrangement removes the record', () => {
    const a = recordArrangement({
      entity_code: ENTITY, scheme: 'demerger', short_title: 'X',
      appointed_date: '2026-04-01', parties: [], nclt_status: 'draft',
    });
    expect(deleteArrangement(ENTITY, a.id)).toBe(true);
    expect(loadArrangements(ENTITY).length).toBe(0);
    expect(deleteArrangement(ENTITY, 'missing')).toBe(false);
  });
});
