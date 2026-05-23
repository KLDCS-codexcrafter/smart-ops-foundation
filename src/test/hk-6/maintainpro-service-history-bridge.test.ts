/**
 * HK-6 Pass 2 · B-4 · 29th SIBLING tests
 * MaintainPro → FA service-history bridge.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  syncMaintenanceEventToFA,
  resolveAssetUnitForEquipment,
  getServiceHistorySummary,
  bulkSyncMaintenanceEvents,
  type MaintenanceCostEvent,
} from '@/lib/maintainpro-service-history-bridge';
import { faUnitsKey } from '@/types/fixed-asset';
import type { AssetUnitRecord } from '@/types/fixed-asset';

const ENTITY = 'ENT001';

function seedUnit(overrides: Partial<AssetUnitRecord> = {}): AssetUnitRecord {
  return {
    id: 'fau-1',
    entity_id: ENTITY,
    item_id: 'item-1',
    item_name: 'CNC Lathe Machine',
    ledger_definition_id: 'ldg-ppe',
    ledger_name: 'Plant & Machinery',
    asset_id: 'PPE/25-26/001',
    asset_id_prefix: 'PPE',
    asset_id_suffix: '25-26',
    asset_id_seq: 1,
    gross_block_cost: 500000,
    salvage_value: 0,
    accumulated_depreciation: 0,
    net_book_value: 500000,
    opening_wdv: 500000,
    purchase_date: '2025-04-01',
    put_to_use_date: '2025-04-01',
    it_act_block: 'Plant & Machinery',
    it_act_depr_rate: 15,
    location: 'Plant A',
    department: 'Production',
    custodian_name: 'Ravi Kumar',
    status: 'active',
    capital_purchase_voucher_id: 'vch-cp-1',
    hr_asset_id: 'EQ-1001',
    created_at: '2025-04-01T00:00:00Z',
    updated_at: '2025-04-01T00:00:00Z',
    ...overrides,
  };
}

beforeEach(() => {
  localStorage.clear();
});

describe('maintainpro-service-history-bridge · resolveAssetUnitForEquipment', () => {
  it('resolves via hr_asset_id soft-link (path 2)', () => {
    localStorage.setItem(faUnitsKey(ENTITY), JSON.stringify([seedUnit()]));
    const r = resolveAssetUnitForEquipment(ENTITY, 'EQ-1001', 'CNC Lathe Machine');
    expect(r.unit?.id).toBe('fau-1');
    expect(r.resolution).toBe('matched_pau');
  });

  it('falls back to name match when hr_asset_id missing (path 3)', () => {
    localStorage.setItem(faUnitsKey(ENTITY), JSON.stringify([seedUnit({ hr_asset_id: undefined })]));
    const r = resolveAssetUnitForEquipment(ENTITY, 'UNKNOWN', 'cnc lathe machine');
    expect(r.unit?.id).toBe('fau-1');
    expect(r.resolution).toBe('matched_name');
  });

  it('returns unmatched when nothing fits', () => {
    localStorage.setItem(faUnitsKey(ENTITY), JSON.stringify([seedUnit({ hr_asset_id: undefined })]));
    const r = resolveAssetUnitForEquipment(ENTITY, 'UNKNOWN', 'Forklift');
    expect(r.unit).toBeNull();
    expect(r.resolution).toBe('unmatched');
  });
});

describe('maintainpro-service-history-bridge · syncMaintenanceEventToFA', () => {
  const baseEvt = (over: Partial<MaintenanceCostEvent> = {}): MaintenanceCostEvent => ({
    type: 'work_order_close',
    entity_id: ENTITY,
    source_ref: 'WO-2025-001',
    equipment_id: 'EQ-1001',
    equipment_name: 'CNC Lathe Machine',
    amount: 12000,
    date: '2025-08-15',
    description: 'Bearing replacement',
    emitted_at: '2025-08-15T10:00:00Z',
    ...over,
  });

  it('appends expense_history on matched asset', () => {
    localStorage.setItem(faUnitsKey(ENTITY), JSON.stringify([seedUnit()]));
    const r = syncMaintenanceEventToFA(ENTITY, baseEvt());
    expect(r.asset_unit_id).toBe('fau-1');
    expect(r.expense_history_id).toBeTruthy();
    const stored = JSON.parse(localStorage.getItem(faUnitsKey(ENTITY))!) as AssetUnitRecord[];
    expect(stored[0].expense_history?.length).toBe(1);
    expect(stored[0].expense_history?.[0].amount).toBe(12000);
  });

  it('is idempotent · same source_ref skipped on rerun', () => {
    localStorage.setItem(faUnitsKey(ENTITY), JSON.stringify([seedUnit()]));
    syncMaintenanceEventToFA(ENTITY, baseEvt());
    const r2 = syncMaintenanceEventToFA(ENTITY, baseEvt());
    expect(r2.expense_history_id).toBeNull();
    expect(r2.asset_unit_id).toBe('fau-1');
    const stored = JSON.parse(localStorage.getItem(faUnitsKey(ENTITY))!) as AssetUnitRecord[];
    expect(stored[0].expense_history?.length).toBe(1);
  });

  it('rejects non-positive amount', () => {
    localStorage.setItem(faUnitsKey(ENTITY), JSON.stringify([seedUnit()]));
    const r = syncMaintenanceEventToFA(ENTITY, baseEvt({ amount: 0 }));
    expect(r.resolution).toBe('unmatched');
  });

  it('returns unmatched when asset cannot be resolved', () => {
    localStorage.setItem(faUnitsKey(ENTITY), JSON.stringify([seedUnit({ hr_asset_id: undefined })]));
    const r = syncMaintenanceEventToFA(ENTITY, baseEvt({ equipment_id: 'ZZZ', equipment_name: 'Forklift' }));
    expect(r.resolution).toBe('unmatched');
    expect(r.asset_unit_id).toBeNull();
  });
});

describe('maintainpro-service-history-bridge · summary + bulk', () => {
  it('summarises by kind and totals', () => {
    localStorage.setItem(faUnitsKey(ENTITY), JSON.stringify([seedUnit()]));
    bulkSyncMaintenanceEvents(ENTITY, [
      { type: 'work_order_close', entity_id: ENTITY, source_ref: 'WO-1', equipment_id: 'EQ-1001',
        equipment_name: 'CNC Lathe Machine', amount: 5000, date: '2025-08-01',
        description: 'x', emitted_at: '2025-08-01T00:00:00Z' },
      { type: 'pm_tickoff', entity_id: ENTITY, source_ref: 'PMT-1', equipment_id: 'EQ-1001',
        equipment_name: 'CNC Lathe Machine', amount: 2500, date: '2025-09-01',
        description: 'x', emitted_at: '2025-09-01T00:00:00Z' },
      { type: 'amc_actual', entity_id: ENTITY, source_ref: 'AMC-1', equipment_id: 'EQ-1001',
        equipment_name: 'CNC Lathe Machine', amount: 15000, date: '2025-10-01',
        description: 'x', emitted_at: '2025-10-01T00:00:00Z' },
    ]);
    const s = getServiceHistorySummary(ENTITY, 'fau-1');
    expect(s).not.toBeNull();
    expect(s!.event_count).toBe(3);
    expect(s!.total_cost).toBe(22500);
    expect(s!.by_kind.work_order_close.total).toBe(5000);
    expect(s!.by_kind.pm_tickoff.count).toBe(1);
    expect(s!.by_kind.amc_actual.total).toBe(15000);
    expect(s!.last_event_date).toBe('2025-10-01');
  });

  it('bulk reports synced/skipped/unmatched counts', () => {
    localStorage.setItem(faUnitsKey(ENTITY), JSON.stringify([seedUnit()]));
    const r = bulkSyncMaintenanceEvents(ENTITY, [
      { type: 'work_order_close', entity_id: ENTITY, source_ref: 'WO-A', equipment_id: 'EQ-1001',
        equipment_name: 'CNC Lathe Machine', amount: 1000, date: '2025-08-01',
        description: 'x', emitted_at: '2025-08-01T00:00:00Z' },
      { type: 'work_order_close', entity_id: ENTITY, source_ref: 'WO-A', equipment_id: 'EQ-1001',
        equipment_name: 'CNC Lathe Machine', amount: 1000, date: '2025-08-01',
        description: 'x', emitted_at: '2025-08-01T00:00:00Z' },
      { type: 'work_order_close', entity_id: ENTITY, source_ref: 'WO-B', equipment_id: 'GHOST',
        equipment_name: 'Ghost Machine', amount: 500, date: '2025-08-02',
        description: 'x', emitted_at: '2025-08-02T00:00:00Z' },
    ]);
    expect(r.synced).toBe(1);
    expect(r.skipped).toBe(1);
    expect(r.unmatched).toBe(1);
  });
});
