import { describe, it, expect } from 'vitest';
import { computeUOPDepreciation, computeUOPPerUnitRate, computeUOPDepreciationForUnit, isAssetUOPEligible, estimateUOPRemainingLife } from '@/lib/uop-depreciation-engine';
import type { AssetUnitRecord } from '@/types/fixed-asset';

const mockUOPUnit = (over: Partial<AssetUnitRecord> = {}): AssetUnitRecord => ({
  id: 'u1', entity_id: 'e1', item_id: 'i1', item_name: 'CNC', ledger_definition_id: 'l1', ledger_name: 'P&M',
  asset_id: 'PPE/25-26/001', asset_id_prefix: 'PPE', asset_id_suffix: '25-26', asset_id_seq: 1,
  gross_block_cost: 1000000, salvage_value: 100000, accumulated_depreciation: 0, net_book_value: 1000000,
  opening_wdv: 1000000, purchase_date: '2025-04-01', put_to_use_date: '2025-04-01',
  it_act_block: 'Plant & Machinery', it_act_depr_rate: 15, location: 'A', department: 'B', custodian_name: 'C',
  status: 'active', capital_purchase_voucher_id: '',
  depreciation_method: 'UOP', uop_total_units: 100000, uop_units_consumed: 0,
  created_at: '2025-04-01', updated_at: '2025-04-01', ...over,
});

describe('uop-depreciation-engine', () => {
  it('computeUOPPerUnitRate = depreciable / total units', () => {
    expect(computeUOPPerUnitRate(mockUOPUnit())).toBe(9);
  });

  it('returns 0 rate when uop_total_units missing', () => {
    expect(computeUOPPerUnitRate(mockUOPUnit({ uop_total_units: null }))).toBe(0);
  });

  it('caps consumption at uop_total_units', () => {
    const row = computeUOPDepreciationForUnit(mockUOPUnit({ uop_units_consumed: 90000 }), 50000, '2025-26');
    expect(row?.uop_units_consumed_closing).toBe(100000);
    expect(row?.uop_units_consumed_during_fy).toBe(10000);
  });

  it('isAssetUOPEligible true only for UOP method with total units', () => {
    expect(isAssetUOPEligible(mockUOPUnit())).toBe(true);
    expect(isAssetUOPEligible(mockUOPUnit({ depreciation_method: 'SLM' }))).toBe(false);
  });

  it('estimateUOPRemainingLife computes percent', () => {
    const est = estimateUOPRemainingLife(mockUOPUnit({ uop_units_consumed: 25000 }));
    expect(est?.remainingUnits).toBe(75000);
    expect(est?.remainingPercent).toBe(75);
  });

  it('computeUOPDepreciation batch only includes UOP units', () => {
    const units = [mockUOPUnit(), mockUOPUnit({ id: 'u2', depreciation_method: 'SLM' })];
    const consumed = new Map([['u1', 10000]]);
    const r = computeUOPDepreciation(units, consumed, '2025-26');
    expect(r.unitCount).toBe(1);
    expect(r.totalDeprForFY).toBeGreaterThan(0);
  });
});
