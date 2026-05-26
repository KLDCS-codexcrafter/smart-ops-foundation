import { describe, it, expect } from 'vitest';
import { computeMultiGAAPDepreciation, compareMultiGAAPBooks, isMultiGAAPReconciledWithinTolerance } from '@/lib/multi-gaap-depreciation-engine';
import type { AssetUnitRecord } from '@/types/fixed-asset';

const mockUnit = (over: Partial<AssetUnitRecord> = {}): AssetUnitRecord => ({
  id: 'u1', entity_id: 'e1', item_id: 'i1', item_name: 'Test', ledger_definition_id: 'l1', ledger_name: 'PP&E',
  asset_id: 'PPE/25-26/001', asset_id_prefix: 'PPE', asset_id_suffix: '25-26', asset_id_seq: 1,
  gross_block_cost: 1000000, salvage_value: 100000, accumulated_depreciation: 0, net_book_value: 1000000,
  opening_wdv: 1000000, purchase_date: '2025-04-01', put_to_use_date: '2025-04-01',
  it_act_block: 'Plant & Machinery', it_act_depr_rate: 15, location: 'A', department: 'B', custodian_name: 'C',
  status: 'active', capital_purchase_voucher_id: '',
  created_at: '2025-04-01', updated_at: '2025-04-01', ...over,
});

describe('multi-gaap-depreciation-engine', () => {
  it('returns 3-books result with totals + FY', () => {
    const result = computeMultiGAAPDepreciation([mockUnit()], '2025-26');
    expect(result.financialYear).toBe('2025-26');
    expect(result.unitCount).toBe(1);
    expect(result.totals).toBeDefined();
    expect(result.itAct).toBeDefined();
    expect(result.companiesAct).toBeDefined();
    expect(result.indAS).toBeDefined();
  });

  it('compareMultiGAAPBooks returns per-ledger rows', () => {
    const result = computeMultiGAAPDepreciation([mockUnit()], '2025-26');
    const recon = compareMultiGAAPBooks(result);
    expect(Array.isArray(recon)).toBe(true);
  });

  it('isMultiGAAPReconciledWithinTolerance returns boolean', () => {
    const result = computeMultiGAAPDepreciation([mockUnit()], '2025-26');
    expect(typeof isMultiGAAPReconciledWithinTolerance(result, 10)).toBe('boolean');
  });

  it('handles empty units array', () => {
    const result = computeMultiGAAPDepreciation([], '2025-26');
    expect(result.unitCount).toBe(0);
    expect(result.totals.indASTotalDepr).toBe(0);
  });
});
