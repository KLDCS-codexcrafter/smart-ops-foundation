import { describe, it, expect } from 'vitest';
import { computeComponentDepreciation, validateComponentBreakdown } from '@/lib/component-depreciation-engine';
import type { AssetUnitRecord } from '@/types/fixed-asset';

const mockCompUnit = (over: Partial<AssetUnitRecord> = {}): AssetUnitRecord => ({
  id: 'u1', entity_id: 'e1', item_id: 'i1', item_name: 'Truck', ledger_definition_id: 'l1', ledger_name: 'Vehicles',
  asset_id: 'PPE/25-26/001', asset_id_prefix: 'PPE', asset_id_suffix: '25-26', asset_id_seq: 1,
  gross_block_cost: 1000000, salvage_value: 100000, accumulated_depreciation: 0, net_book_value: 1000000,
  opening_wdv: 1000000, purchase_date: '2025-04-01', put_to_use_date: '2025-04-01',
  it_act_block: 'Vehicles', it_act_depr_rate: 15, location: 'A', department: 'B', custodian_name: 'C',
  status: 'active', capital_purchase_voucher_id: '',
  depreciation_method: 'Component',
  component_breakdown: [
    { component_id: 'engine', component_name: 'Engine', cost_allocation: 600000, useful_life_years: 7, salvage_value: 50000, put_to_use_date: '2025-04-01' },
    { component_id: 'chassis', component_name: 'Chassis', cost_allocation: 400000, useful_life_years: 15, salvage_value: 50000, put_to_use_date: '2025-04-01' },
  ],
  created_at: '2025-04-01', updated_at: '2025-04-01', ...over,
});

describe('component-depreciation-engine', () => {
  it('computes one row per component', () => {
    const r = computeComponentDepreciation([mockCompUnit()], '2025-26');
    expect(r.rows.length).toBe(2);
    expect(r.perAssetTotals.length).toBe(1);
    expect(r.perAssetTotals[0].componentCount).toBe(2);
  });

  it('skips units without component_breakdown', () => {
    const r = computeComponentDepreciation([mockCompUnit({ component_breakdown: null })], '2025-26');
    expect(r.unitCount).toBe(0);
  });

  it('validateComponentBreakdown flags allocation > gross', () => {
    const v = validateComponentBreakdown(mockCompUnit({ gross_block_cost: 500000 }));
    expect(v.isValid).toBe(false);
    expect(v.errors.length).toBeGreaterThan(0);
  });

  it('validateComponentBreakdown passes when sum ≤ gross', () => {
    expect(validateComponentBreakdown(mockCompUnit()).isValid).toBe(true);
  });

  it('flags duplicate component_id', () => {
    const v = validateComponentBreakdown(mockCompUnit({
      component_breakdown: [
        { component_id: 'a', component_name: 'A', cost_allocation: 100, useful_life_years: 5, salvage_value: 0, put_to_use_date: '2025-04-01' },
        { component_id: 'a', component_name: 'B', cost_allocation: 100, useful_life_years: 5, salvage_value: 0, put_to_use_date: '2025-04-01' },
      ],
    }));
    expect(v.isValid).toBe(false);
  });
});
