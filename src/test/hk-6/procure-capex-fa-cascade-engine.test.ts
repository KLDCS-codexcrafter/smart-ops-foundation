/**
 * HK-6 Pass 1+2 · 28th SIBLING tests · procure-capex-fa-cascade-engine
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  checkCAPEXCascadeReadiness,
  cascadeCAPEXGRNToFA,
  putToUseAssetUnit,
  type CAPEXGRNCascadeEvent,
} from '@/lib/procure-capex-fa-cascade-engine';
import { faUnitsKey } from '@/types/fixed-asset';
import type { AssetUnitRecord } from '@/types/fixed-asset';

const ENTITY = 'ENT004';

function event(over: Partial<CAPEXGRNCascadeEvent> = {}): CAPEXGRNCascadeEvent {
  return {
    type: 'procure360:grn.capex_received',
    entity_id: ENTITY,
    po_id: 'PO/25-26/0001',
    grn_id: 'GRN/25-26/0001',
    capital_indent_id: 'CAPI/0001',
    capital_indent_line_id: 'CAPI/0001/L1',
    vendor_id: 'vnd-1', vendor_name: 'Bharat Equipment Pvt Ltd',
    received_qty: 2, received_value: 200000,
    item_id: 'item-cnc', item_name: 'CNC Drill',
    ledger_definition_id: 'l-ppe', ledger_name: 'Plant & Machinery',
    asset_id_prefix: 'PPE', it_act_block: 'Plant & Machinery',
    cwip_account_id: 'l-cwip', put_to_use_date: '2025-08-15',
    location: 'Plant A', department: 'Production', custodian_name: 'Ravi',
    emitted_at: '2025-08-15T10:00:00Z',
    ...over,
  };
}

beforeEach(() => localStorage.clear());

describe('procure-capex-fa-cascade-engine · readiness', () => {
  it('blocks when qty is zero', () => {
    expect(checkCAPEXCascadeReadiness(ENTITY, { capital_indent_id: 'c', grn_id: 'g', received_qty: 0, received_value: 100 }).allowed).toBe(false);
  });
  it('blocks when value is zero', () => {
    expect(checkCAPEXCascadeReadiness(ENTITY, { capital_indent_id: 'c', grn_id: 'g', received_qty: 1, received_value: 0 }).allowed).toBe(false);
  });
  it('blocks when entity missing', () => {
    expect(checkCAPEXCascadeReadiness('', { capital_indent_id: 'c', grn_id: 'g', received_qty: 1, received_value: 100 }).allowed).toBe(false);
  });
  it('allows otherwise', () => {
    expect(checkCAPEXCascadeReadiness(ENTITY, { capital_indent_id: 'c', grn_id: 'g', received_qty: 1, received_value: 100 }).allowed).toBe(true);
  });
});

describe('procure-capex-fa-cascade-engine · cascade', () => {
  it('creates N AssetUnitRecords + 1 capital purchase voucher (active when put_to_use_date set)', () => {
    const r = cascadeCAPEXGRNToFA(ENTITY, event());
    expect(r.asset_unit_ids).toHaveLength(2);
    expect(r.capital_purchase_voucher_id).toBeTruthy();
    expect(r.cwip_voucher_id).toBeNull();
    const stored = JSON.parse(localStorage.getItem(faUnitsKey(ENTITY))!) as AssetUnitRecord[];
    expect(stored).toHaveLength(2);
    expect(stored[0].gross_block_cost).toBe(100000);
    expect(stored[0].status).toBe('active');
    expect(stored[0].capital_purchase_voucher_id).toBe(r.capital_purchase_voucher_id);
  });

  it('creates CWIP status when put_to_use_date absent', () => {
    const r = cascadeCAPEXGRNToFA(ENTITY, event({ put_to_use_date: undefined, received_qty: 1, received_value: 50000 }));
    const u = (JSON.parse(localStorage.getItem(faUnitsKey(ENTITY))!) as AssetUnitRecord[])[0];
    expect(u.status).toBe('cwip');
    expect(r.cwip_voucher_id).toBe(r.capital_purchase_voucher_id);
  });

  it('increments asset_id_seq within prefix+suffix scope', () => {
    cascadeCAPEXGRNToFA(ENTITY, event({ received_qty: 2, received_value: 200000 }));
    cascadeCAPEXGRNToFA(ENTITY, event({ grn_id: 'GRN-2', received_qty: 1, received_value: 100000 }));
    const units = JSON.parse(localStorage.getItem(faUnitsKey(ENTITY))!) as AssetUnitRecord[];
    expect(units.length).toBe(3);
    const seqs = units.map(u => u.asset_id_seq).sort((a, b) => a - b);
    expect(seqs).toEqual([1, 2, 3]);
  });

  it('throws on readiness failure', () => {
    expect(() => cascadeCAPEXGRNToFA(ENTITY, event({ received_qty: 0 }))).toThrow();
  });
});

describe('procure-capex-fa-cascade-engine · putToUseAssetUnit', () => {
  it('flips CWIP → active and emits Put-To-Use voucher', () => {
    const c = cascadeCAPEXGRNToFA(ENTITY, event({ put_to_use_date: undefined, received_qty: 1, received_value: 80000 }));
    const id = c.asset_unit_ids[0];
    const r = putToUseAssetUnit(ENTITY, id, '2025-09-01');
    expect(r.put_to_use_voucher_id).toBeTruthy();
    const u = (JSON.parse(localStorage.getItem(faUnitsKey(ENTITY))!) as AssetUnitRecord[]).find(x => x.id === id)!;
    expect(u.status).toBe('active');
    expect(u.put_to_use_date).toBe('2025-09-01');
  });

  it('idempotent · returns blank voucher when already active', () => {
    const c = cascadeCAPEXGRNToFA(ENTITY, event({ received_qty: 1, received_value: 60000 }));
    const r = putToUseAssetUnit(ENTITY, c.asset_unit_ids[0], '2025-09-01');
    expect(r.put_to_use_voucher_id).toBe('');
  });

  it('throws on missing asset unit', () => {
    expect(() => putToUseAssetUnit(ENTITY, 'ghost', '2025-09-01')).toThrow();
  });
});
