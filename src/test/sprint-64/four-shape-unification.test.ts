/**
 * @file FAR-0 Theme 8 · 4-shape unification bridge tests · Lesson 19 ID-lookup only
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  linkPhysicalAssetUnit,
  linkEquipmentToPhysicalAssetUnit,
  findPhysicalAssetUnitByEquipment,
  findPhysicalAssetUnit,
  physicalAssetUnitsKey,
} from '@/lib/physical-asset-unit-bridge';
import { faUnitsKey, type AssetUnitRecord } from '@/types/fixed-asset';

const E = 'TEST64SHAPE';

function seedOneFA(): string {
  const id = 'fa-shape-001';
  const rec: AssetUnitRecord = {
    id, entity_id: E, item_id: 'item-001', item_name: 'CNC',
    ledger_definition_id: 'led-001', ledger_name: 'Plant',
    asset_id: 'PPE/25-26/001', asset_id_prefix: 'PPE', asset_id_suffix: '001', asset_id_seq: 1,
    gross_block_cost: 100000, salvage_value: 0, accumulated_depreciation: 0, net_book_value: 100000,
    opening_wdv: 100000, purchase_date: '2025-04-01', put_to_use_date: '2025-04-15',
    it_act_block: 'Plant & Machinery', it_act_depr_rate: 0.15,
    location: 'Floor', department: 'Production', custodian_name: 'X',
    custodian_employee_id: null, status: 'active', capital_purchase_voucher_id: 'v-1',
    created_at: '2025-04-01', updated_at: '2025-04-01',
  };
  localStorage.setItem(faUnitsKey(E), JSON.stringify([rec]));
  return id;
}

beforeEach(() => {
  localStorage.removeItem(faUnitsKey(E));
  localStorage.removeItem(physicalAssetUnitsKey(E));
});

describe('FAR-0 Theme 8 · 4-shape unification (Equipment as 4th shape)', () => {
  it('linkEquipmentToPhysicalAssetUnit populates equipment_id + timestamp', () => {
    const faId = seedOneFA();
    const pau = linkPhysicalAssetUnit(E, faId);
    const linked = linkEquipmentToPhysicalAssetUnit(E, pau.id, 'eqp-001');
    expect(linked.equipment_id).toBe('eqp-001');
    expect(linked.equipment_synced_at).toBeTruthy();
  });

  it('findPhysicalAssetUnitByEquipment resolves by 4th-shape FK', () => {
    const faId = seedOneFA();
    const pau = linkPhysicalAssetUnit(E, faId);
    linkEquipmentToPhysicalAssetUnit(E, pau.id, 'eqp-002');
    const found = findPhysicalAssetUnitByEquipment(E, 'eqp-002');
    expect(found?.id).toBe(pau.id);
  });

  it('findPhysicalAssetUnit() extended signature accepts equipment_id', () => {
    const faId = seedOneFA();
    const pau = linkPhysicalAssetUnit(E, faId);
    linkEquipmentToPhysicalAssetUnit(E, pau.id, 'eqp-003');
    const found = findPhysicalAssetUnit(E, { equipment_id: 'eqp-003' });
    expect(found?.id).toBe(pau.id);
  });
});
