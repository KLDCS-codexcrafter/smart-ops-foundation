/**
 * a4r-block-behavioral.test.ts — Sprint A.4-Residual (T-A4R-Dispatch-Residual)
 * Behavioral guards for the dispatch-residual-engine + §H wall guards.
 * Per spec: ≥20 it() · house posture · consume-not-duplicate · honest-empty.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  bookSampleExpense,
  returnRefundableSampleToStock,
  triggerPackingReplenishment,
  compareCourierRates,
  computePackingBomVariance,
  emitBomVarianceToSupplier,
  summarizeReusablePacking,
  buildDemoSerialRegister,
  buildDispatchAnalyticsSnapshot,
  SUPPLIER_FEEDBACK_OUTBOX_KEY,
} from '@/lib/dispatch-residual-engine';
import { packingMaterialsKey, type PackingMaterial } from '@/types/packing-material';
import {
  transporterRateCardsKey,
  type TransporterRateCard,
} from '@/types/transporter-rate';
import {
  sampleOutwardMemosKey,
  type SampleOutwardMemo,
} from '@/types/sample-outward-memo';
import {
  demoOutwardMemosKey,
  type DemoOutwardMemo,
} from '@/types/demo-outward-memo';
import {
  returnablePackagingKey,
  type ReturnablePackaging,
} from '@/types/returnable-packaging';
import { SPRINTS } from '@/lib/_institutional/sprint-history';
import { SIBLINGS } from '@/lib/_institutional/sibling-register';

const E = 'A4R_TEST';

function blankSOM(over: Partial<SampleOutwardMemo>): SampleOutwardMemo {
  return {
    id: 'som-x', entity_id: E, memo_no: 'SOM/26-27/0001',
    memo_date: '2026-06-08',
    raised_by_person_id: 'p1', raised_by_person_name: 'Tester',
    raised_by_person_type: 'salesman',
    recipient_name: 'Acme', recipient_company: null,
    recipient_phone: null, recipient_address: null,
    purpose: 'architect_trial', purpose_note: null,
    items: [{
      id: 'it1', item_name: 'Sample A', description: null, qty: 1,
      uom: 'NOS', unit_value: 1000, amount: 1000,
    }],
    expect_return: false, return_due_date: null, returned_at: null,
    attachments: [], status: 'completed',
    dispatched_at: '2026-06-08T10:00:00Z', completed_at: '2026-06-08T11:00:00Z',
    customer_id: null, customer_name: null,
    salesman_id: null, salesman_name: null,
    agent_id: null, agent_name: null,
    broker_id: null, broker_name: null,
    engineer_emp_id: null, engineer_name: null,
    is_refundable: false,
    outward_godown_id: null, outward_godown_name: null,
    issued_by_dispatch: true,
    dispatch_issued_at: '2026-06-08T10:00:00Z', dispatch_issued_by: 'dispatch',
    unit_value: 1000, total_value: 1000,
    pending_expense_voucher: true,
    created_at: '2026-06-08T09:00:00Z', updated_at: '2026-06-08T11:00:00Z',
    ...over,
  };
}

function blankPM(over: Partial<PackingMaterial>): PackingMaterial {
  return {
    id: 'pm1', entity_id: E, code: 'CRT-01', name: 'Carton',
    kind: 'carton', uom: 'piece',
    cost_per_uom_paise: 5000, pricing_source: 'manual',
    price_effective_from: '2026-01-01',
    opening_stock: 100, current_stock: 5, reorder_level: 20, reorder_qty: 50,
    is_reusable: false, tracks_expiry: false,
    active: true,
    created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
    ...over,
  };
}

beforeEach(() => {
  localStorage.clear();
});

describe('Sprint A.4-Residual · dispatch-residual-engine', () => {
  it('005 · bookSampleExpense routes SOM → FinCore expense voucher (consume, not duplicate)', () => {
    const som = blankSOM({});
    const r = bookSampleExpense(som, E);
    expect(r.posted).toBe(true);
    expect(r.voucher_no).toMatch(/JV/);
  });

  it('005 · bookSampleExpense refuses refundable SOM (reason carries through)', () => {
    const som = blankSOM({ is_refundable: true });
    const r = bookSampleExpense(som, E);
    expect(r.posted).toBe(false);
    expect(r.reason).toBe('is_refundable');
  });

  it('005 · bookSampleExpense routes DOM lost → marketing-expense voucher', () => {
    const dom: DemoOutwardMemo = {
      id: 'dom-1', entity_id: E, memo_no: 'DOM/1', memo_date: '2026-06-08',
      raised_by_person_id: 'p', raised_by_person_name: 'r',
      raised_by_person_type: 'salesman',
      recipient_name: 'X', recipient_company: null,
      recipient_phone: null, recipient_address: null,
      purpose: 'demo_eval', purpose_note: null,
      items: [{ id: 'i', item_name: 'Demo', description: null, qty: 1, uom: 'NOS', serial_no: 'SN-1', unit_value: 5000, amount: 5000 }],
      demo_period_days: 30, demo_start_date: '2026-06-08', demo_end_date: '2026-07-08',
      return_due_date: '2026-07-08', returned_at: null, return_condition: null,
      attachments: [], status: 'lost',
      dispatched_at: '2026-06-08T10:00:00Z', converted_at: null, lost_at: '2026-06-20T00:00:00Z',
      customer_id: null, customer_name: null,
      salesman_id: null, salesman_name: null,
      agent_id: null, agent_name: null,
      broker_id: null, broker_name: null,
      engineer_emp_id: null, engineer_name: null,
      outward_godown_id: null, outward_godown_name: null,
      issued_by_dispatch: true,
      dispatch_issued_at: '2026-06-08T10:00:00Z', dispatch_issued_by: 'dispatch',
      pending_expense_voucher: true,
      created_at: '2026-06-08T09:00:00Z', updated_at: '2026-06-20T00:00:00Z',
    } as unknown as DemoOutwardMemo;
    const r = bookSampleExpense(dom, E);
    expect(r.posted).toBe(true);
  });

  it('005 · bookSampleExpense honest-empty when entity missing', () => {
    const r = bookSampleExpense(blankSOM({}), '');
    expect(r.posted).toBe(false);
    expect(r.reason).toBe('no_entity');
  });

  it('006 · returnRefundableSampleToStock posts stock-transfer (consume FinCore stock path)', () => {
    const som = blankSOM({
      is_refundable: true, status: 'returned', returned_at: '2026-06-09T10:00:00Z',
      outward_godown_id: 'gd-samples', outward_godown_name: 'Samples godown',
    });
    const r = returnRefundableSampleToStock(som, E);
    expect(r.posted).toBe(true);
    expect(r.voucher_no).toMatch(/ST/);
  });

  it('006 · returnRefundableSampleToStock refuses non-returned status', () => {
    const r = returnRefundableSampleToStock(blankSOM({ is_refundable: true }), E);
    expect(r.posted).toBe(false);
    expect(r.reason).toBe('status_not_returned');
  });

  it('007 · triggerPackingReplenishment returns honest [] when no materials', () => {
    expect(triggerPackingReplenishment(E)).toEqual([]);
  });

  it('007 · triggerPackingReplenishment surfaces only materials at/below reorder', () => {
    localStorage.setItem(packingMaterialsKey(E), JSON.stringify([
      blankPM({ id: 'pm1', current_stock: 5,  reorder_level: 20 }),
      blankPM({ id: 'pm2', current_stock: 50, reorder_level: 20 }),
      blankPM({ id: 'pm3', current_stock: 0,  reorder_level: 10 }),
    ]));
    const out = triggerPackingReplenishment(E);
    expect(out.length).toBe(2);
    expect(out[0].urgency).toBe('critical');
  });

  it('007 · triggerPackingReplenishment ignores inactive rows', () => {
    localStorage.setItem(packingMaterialsKey(E), JSON.stringify([
      blankPM({ id: 'pm1', current_stock: 0, active: false }),
    ]));
    expect(triggerPackingReplenishment(E)).toEqual([]);
  });

  it('012 · buildDemoSerialRegister honest-empty when no DOMs', () => {
    expect(buildDemoSerialRegister(E)).toEqual([]);
  });

  it('012 · buildDemoSerialRegister never fabricates serials (skips empty serial_no)', () => {
    const memos = [{
      id: 'd1', memo_no: 'DOM/1', memo_date: '2026-06-08',
      recipient_name: 'X', status: 'dispatched', return_due_date: null,
      items: [
        { id: 'a', item_name: 'No-SN', serial_no: '' },
        { id: 'b', item_name: 'Has-SN', serial_no: 'SN-42' },
      ],
    }];
    localStorage.setItem(demoOutwardMemosKey(E), JSON.stringify(memos));
    const rows = buildDemoSerialRegister(E);
    expect(rows.length).toBe(1);
    expect(rows[0].serial_no).toBe('SN-42');
  });

  it('012 · buildDemoSerialRegister flags overdue when due-date past + not closed', () => {
    const memos = [{
      id: 'd1', memo_no: 'DOM/1', memo_date: '2024-01-01',
      recipient_name: 'X', status: 'demo_active', demo_end_date: '2024-02-01',
      items: [{ id: 'a', item_name: 'X', serial_no: 'SN-1' }],
    }];
    localStorage.setItem(demoOutwardMemosKey(E), JSON.stringify(memos));
    const rows = buildDemoSerialRegister(E);
    expect(rows[0].is_overdue).toBe(true);
  });

  it('018 · computePackingBomVariance returns planned − actual per line', () => {
    const planned = [{ material_id: 'm1', code: 'C', name: 'X', qty: 10 }];
    const actual  = [{ material_id: 'm1', code: 'C', name: 'X', qty: 14 }];
    const v = computePackingBomVariance(planned, actual);
    expect(v[0].variance_qty).toBe(4);
    expect(v[0].variance_pct).toBe(40);
  });

  it('018 · computePackingBomVariance honest-empty inputs → []', () => {
    expect(computePackingBomVariance([], [])).toEqual([]);
  });

  it('018 · computePackingBomVariance flags actual-only as positive variance', () => {
    const v = computePackingBomVariance(
      [], [{ material_id: 'm2', code: 'D', name: 'Y', qty: 3 }],
    );
    expect(v[0].variance_qty).toBe(3);
    expect(v[0].planned_qty).toBe(0);
  });

  it('018 · emitBomVarianceToSupplier is SEAM-ONLY (no fabricated delivery)', () => {
    const entry = emitBomVarianceToSupplier(E, [], 'sup-1');
    expect(entry.delivered).toBe(false);
    expect(entry.reason).toBe('wave2_supplier_portal_absent');
    const raw = localStorage.getItem(SUPPLIER_FEEDBACK_OUTBOX_KEY);
    expect(raw).toBeTruthy();
  });

  it('020 · summarizeReusablePacking honest-empty when no units', () => {
    const s = summarizeReusablePacking(E);
    expect(s.total).toBe(0);
    expect(s.return_rate_pct).toBe(0);
  });

  it('020 · summarizeReusablePacking computes return rate from units', () => {
    const u: ReturnablePackaging[] = [
      { id: 'u1', entity_id: E, unit_no: 'P-1', kind: 'pallet', description: '',
        acquisition_cost: 0, expected_lifetime_cycles: null, current_cycle_count: 0,
        status: 'returned', current_location: null, current_godown_id: null,
        current_customer_id: null, sent_with_dln_id: null, sent_to_customer_id: null,
        sent_to_customer_name: null, sent_at: null, return_due_date: null,
        returned_at: null, return_grn_id: null, return_condition: null, notes: null,
        created_at: '', updated_at: '' },
      { id: 'u2', entity_id: E, unit_no: 'P-2', kind: 'pallet', description: '',
        acquisition_cost: 0, expected_lifetime_cycles: null, current_cycle_count: 0,
        status: 'with_customer', current_location: null, current_godown_id: null,
        current_customer_id: null, sent_with_dln_id: null, sent_to_customer_id: null,
        sent_to_customer_name: null, sent_at: null, return_due_date: '2020-01-01',
        returned_at: null, return_grn_id: null, return_condition: null, notes: null,
        created_at: '', updated_at: '' },
    ];
    localStorage.setItem(returnablePackagingKey(E), JSON.stringify(u));
    const s = summarizeReusablePacking(E);
    expect(s.total).toBe(2);
    expect(s.returned).toBe(1);
    expect(s.with_customer).toBe(1);
    expect(s.overdue).toBe(1);
    expect(s.return_rate_pct).toBe(50);
  });

  it('022 · compareCourierRates honest-empty when no rate cards', () => {
    expect(compareCourierRates(E, { zone: 'WEST_I', mode: 'surface', weight_kg: 10 })).toEqual([]);
  });

  it('022 · compareCourierRates honest-empty on zero weight', () => {
    expect(compareCourierRates(E, { zone: 'WEST_I', mode: 'surface', weight_kg: 0 })).toEqual([]);
  });

  it('022 · compareCourierRates ranks cheapest first', () => {
    const cards: TransporterRateCard[] = [{
      id: 'rc1', logistic_id: 'l1', entity_id: E, label: 'Slow Carrier',
      effective_from: '2026-01-01', effective_to: null,
      zone_definitions: [], oda_grid: [], collection_delivery: [],
      zone_rates: [{ zone: 'WEST_I', mode: 'surface', rate_per_kg: 20, transit_days_min: 3, transit_days_max: 5 }],
      minimum_chargeable: { surface: 5, train: 0, air: 0 },
      volumetric_divisor: 5000,
      surcharges: { statistical_flat: 0, fuel_pct_of_basic: 0, fov_pct_of_invoice: 0, cod_flat_if_applicable: 0, demurrage_free_days: 0, demurrage_per_kg_per_day: 0 },
      fuel_escalation: { base_fuel_price: 0, current_fuel_price: 0, ratio_numerator: 0, ratio_denominator: 0 },
      annual_hike_pct: 0, contract_start: '2026-01-01', contract_end: '2027-01-01',
      created_at: '', updated_at: '', created_by: 'tester',
    }, {
      id: 'rc2', logistic_id: 'l2', entity_id: E, label: 'Fast Carrier',
      effective_from: '2026-01-01', effective_to: null,
      zone_definitions: [], oda_grid: [], collection_delivery: [],
      zone_rates: [{ zone: 'WEST_I', mode: 'surface', rate_per_kg: 10, transit_days_min: 1, transit_days_max: 2 }],
      minimum_chargeable: { surface: 5, train: 0, air: 0 },
      volumetric_divisor: 5000,
      surcharges: { statistical_flat: 0, fuel_pct_of_basic: 0, fov_pct_of_invoice: 0, cod_flat_if_applicable: 0, demurrage_free_days: 0, demurrage_per_kg_per_day: 0 },
      fuel_escalation: { base_fuel_price: 0, current_fuel_price: 0, ratio_numerator: 0, ratio_denominator: 0 },
      annual_hike_pct: 0, contract_start: '2026-01-01', contract_end: '2027-01-01',
      created_at: '', updated_at: '', created_by: 'tester',
    }];
    localStorage.setItem(transporterRateCardsKey(E), JSON.stringify(cards));
    const rows = compareCourierRates(E, { zone: 'WEST_I', mode: 'surface', weight_kg: 10 });
    expect(rows.length).toBe(2);
    expect(rows[0].rate_per_kg).toBe(10);
    expect(rows[0].freight_amount).toBe(100);
  });

  it('022 · compareCourierRates applies minimum chargeable weight', () => {
    const cards: TransporterRateCard[] = [{
      id: 'rc1', logistic_id: 'l1', entity_id: E, label: 'X',
      effective_from: '2026-01-01', effective_to: null,
      zone_definitions: [], oda_grid: [], collection_delivery: [],
      zone_rates: [{ zone: 'WEST_I', mode: 'surface', rate_per_kg: 10, transit_days_min: 1, transit_days_max: 2 }],
      minimum_chargeable: { surface: 50, train: 0, air: 0 },
      volumetric_divisor: 5000,
      surcharges: { statistical_flat: 0, fuel_pct_of_basic: 0, fov_pct_of_invoice: 0, cod_flat_if_applicable: 0, demurrage_free_days: 0, demurrage_per_kg_per_day: 0 },
      fuel_escalation: { base_fuel_price: 0, current_fuel_price: 0, ratio_numerator: 0, ratio_denominator: 0 },
      annual_hike_pct: 0, contract_start: '2026-01-01', contract_end: '2027-01-01',
      created_at: '', updated_at: '', created_by: 'tester',
    }];
    localStorage.setItem(transporterRateCardsKey(E), JSON.stringify(cards));
    const [row] = compareCourierRates(E, { zone: 'WEST_I', mode: 'surface', weight_kg: 10 });
    expect(row.chargeable_weight).toBe(50);
    expect(row.freight_amount).toBe(500);
  });

  it('023 · buildDispatchAnalyticsSnapshot honest-empty when stores empty', () => {
    const s = buildDispatchAnalyticsSnapshot(E);
    expect(s.honest_empty).toBe(true);
    expect(s.delivery_memos.total).toBe(0);
    expect(s.samples.total).toBe(0);
    expect(s.demos.total).toBe(0);
  });

  it('023 · buildDispatchAnalyticsSnapshot aggregates without fabrication', () => {
    localStorage.setItem(sampleOutwardMemosKey(E), JSON.stringify([
      blankSOM({ id: 's1', is_refundable: false }),
      blankSOM({ id: 's2', is_refundable: true, status: 'returned' }),
    ]));
    const s = buildDispatchAnalyticsSnapshot(E);
    expect(s.samples.total).toBe(2);
    expect(s.samples.refundable).toBe(1);
    expect(s.samples.returned).toBe(1);
    expect(s.honest_empty).toBe(false);
  });

  // §H · walls + bucket guards
  it('§H · GPS/ML/driver-app remain ABSENT (Bucket-2 Wave-2 excluded)', () => {
    const exported = Object.keys(import.meta.glob('/src/lib/dispatch-residual-engine.ts')).join('|');
    expect(exported).not.toMatch(/gps|ml-|driver-app/i);
  });

  it('§H · engine does not export courierApi/gpsTrack symbols', async () => {
    const mod = await import('@/lib/dispatch-residual-engine');
    expect(Object.keys(mod)).not.toContain('callCourierApi');
    expect(Object.keys(mod)).not.toContain('trackGps');
  });

  it('history · A.4R row toContain · A.5 flipped to d9556537', () => {
    const a4r = SPRINTS.find((s) => String(s.sprintNumber) === 'A4R');
    expect(a4r).toBeTruthy();
    expect(a4r?.newSiblings).toContain('dispatch-residual-engine');
    expect(a4r?.predecessorSha).toBe('d9556537');
    const a5 = SPRINTS.find((s) => String(s.sprintNumber) === 'A5');
    expect(a5?.headSha).toBe('d9556537');
  });

  it('sibling-register · dispatch-residual-engine registered', () => {
    const row = SIBLINGS.find((s) => s.id === 'dispatch-residual-engine');
    expect(row).toBeTruthy();
    expect(row?.path).toBe('src/lib/dispatch-residual-engine.ts');
  });
});
