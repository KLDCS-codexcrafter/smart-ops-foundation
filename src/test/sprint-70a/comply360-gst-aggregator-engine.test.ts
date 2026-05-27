/**
 * @file        src/test/sprint-70a/comply360-gst-aggregator-engine.test.ts
 * @purpose     Unit tests · Sprint 70a Block 2 aggregator engine
 * @sprint      Sprint 70a · Pass A · Block 5
 * @lesson-23   Signatures grepped from src/lib/comply360-gst-aggregator-engine.ts
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  aggregateOutwardSupplies,
  aggregateInwardSupplies,
  aggregateAmendments,
  groupSuppliesByType,
  computeTotalTax,
  deriveHSNRows,
  type CrossCardSupply,
  type AggregationFilter,
} from '@/lib/comply360-gst-aggregator-engine';

const ENTITY = 'ent-001';
const GSTIN = '27AAAPL1234C1Z5';

const filter: AggregationFilter = {
  entity_id: ENTITY,
  gstin: GSTIN,
  fy: 'FY26-27',
  return_period: '04-2026',
};

const mkSO = (over: Partial<Record<string, unknown>> = {}) => ({
  id: 'so-1',
  invoice_no: 'INV/0001',
  invoice_date: '2026-04-15',
  gstin_supplier: GSTIN,
  gstin_recipient: '29AAAPL1234C1Z5',
  hsn_sac: '8471',
  taxable_value: 100000,
  igst: 18000, cgst: 0, sgst: 0, cess: 0,
  pos_state_code: '29',
  supply_type: 'b2b',
  ...over,
});

beforeEach(() => localStorage.clear());

describe('Sprint 70a · Block 2 · comply360-gst-aggregator-engine', () => {
  it('aggregateOutwardSupplies reads SalesX SO + EximX export storage', () => {
    localStorage.setItem(`erp_sales_orders_${ENTITY}`, JSON.stringify([mkSO()]));
    localStorage.setItem(
      `erp_export_pos_${ENTITY}`,
      JSON.stringify([mkSO({ id: 'ex-1', invoice_no: 'EX/0001', is_export: true, with_payment: true })]),
    );
    const out = aggregateOutwardSupplies(filter);
    expect(out).toHaveLength(2);
    expect(out.find(s => s.source_card === 'salesx')).toBeTruthy();
    expect(out.find(s => s.source_card === 'eximx')?.supply_type).toBe('export_with_pmt');
  });

  it('aggregateInwardSupplies reads Procure360 PO storage', () => {
    localStorage.setItem(
      `erp_purchase_orders_${ENTITY}`,
      JSON.stringify([mkSO({ id: 'po-1', invoice_no: 'PO/0001' })]),
    );
    const out = aggregateInwardSupplies(filter);
    expect(out).toHaveLength(1);
    expect(out[0].source_card).toBe('procure360');
  });

  it('filters by return_period (MM-YYYY)', () => {
    localStorage.setItem(`erp_sales_orders_${ENTITY}`, JSON.stringify([
      mkSO({ invoice_no: 'IN', invoice_date: '2026-04-15' }),
      mkSO({ invoice_no: 'OUT', invoice_date: '2026-05-15' }),
    ]));
    const out = aggregateOutwardSupplies(filter);
    expect(out.find(s => s.source_ref === 'so-1')).toBeTruthy();
    expect(out).toHaveLength(1);
  });

  it('filters by filer gstin', () => {
    localStorage.setItem(`erp_sales_orders_${ENTITY}`, JSON.stringify([
      mkSO(),
      mkSO({ id: 'so-2', invoice_no: 'INV/0002', gstin_supplier: '07AAAPL1234C1Z5' }),
    ]));
    const out = aggregateOutwardSupplies(filter);
    expect(out).toHaveLength(1);
    expect(out[0].source_ref).toBe('so-1');
  });

  it('excludes amendments by default; includes via aggregateAmendments', () => {
    localStorage.setItem(`erp_sales_orders_${ENTITY}`, JSON.stringify([
      mkSO(),
      mkSO({ id: 'so-am', invoice_no: 'INV/A1', amendment_flag: true }),
    ]));
    expect(aggregateOutwardSupplies(filter)).toHaveLength(1);
    const amends = aggregateAmendments(filter);
    expect(amends).toHaveLength(1);
    expect(amends[0].source_ref).toBe('so-am');
  });

  it('groupSuppliesByType buckets all supply types deterministically', () => {
    const supplies: CrossCardSupply[] = [
      { ...mkSO(), supply_type: 'b2b' } as CrossCardSupply,
      { ...mkSO({ id: 'x' }), supply_type: 'b2cs' } as CrossCardSupply,
    ];
    const g = groupSuppliesByType(supplies);
    expect(g.b2b).toHaveLength(1);
    expect(g.b2cs).toHaveLength(1);
    expect(g.export_with_pmt).toHaveLength(0);
  });

  it('computeTotalTax sums all five tax columns', () => {
    const t = computeTotalTax([
      { ...mkSO(), taxable_value: 100, igst: 18, cgst: 0, sgst: 0, cess: 1 } as CrossCardSupply,
      { ...mkSO({ id: 'x' }), taxable_value: 200, igst: 36, cgst: 0, sgst: 0, cess: 2 } as CrossCardSupply,
    ]);
    expect(t.taxable_value).toBe(300);
    expect(t.igst).toBe(54);
    expect(t.cess).toBe(3);
  });

  it('deriveHSNRows merges identical hsn+rate rows', () => {
    const supplies = [
      { ...mkSO(), hsn_sac: '8471', taxable_value: 100, igst: 18 } as CrossCardSupply,
      { ...mkSO({ id: '2' }), hsn_sac: '8471', taxable_value: 200, igst: 36 } as CrossCardSupply,
    ];
    const rows = deriveHSNRows(supplies);
    const row = rows.find(r => r.hsn === '8471' && r.rt === 18);
    expect(row?.txval).toBe(300);
    expect(row?.iamt).toBe(54);
  });

  it('classifies B2CL when value > 2.5L and no recipient gstin', () => {
    localStorage.setItem(`erp_sales_orders_${ENTITY}`, JSON.stringify([
      mkSO({ gstin_recipient: undefined, taxable_value: 300000, igst: 54000, supply_type: undefined }),
    ]));
    const out = aggregateOutwardSupplies(filter);
    expect(out[0].supply_type).toBe('b2cl');
  });

  it('returns empty array for malformed localStorage payloads', () => {
    localStorage.setItem(`erp_sales_orders_${ENTITY}`, '{not-json');
    expect(aggregateOutwardSupplies(filter)).toEqual([]);
  });

  it('returns empty when return_period is malformed', () => {
    localStorage.setItem(`erp_sales_orders_${ENTITY}`, JSON.stringify([mkSO()]));
    const out = aggregateOutwardSupplies({ ...filter, return_period: 'bad' });
    expect(out).toEqual([]);
  });
});
