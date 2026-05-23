/**
 * HK-6 Pass 1+2 · 27th SIBLING tests · physical-asset-unit-bridge (3-shape unification)
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  linkPhysicalAssetUnit,
  findPhysicalAssetUnit,
  listUnifiedAssets,
  detectOrphans,
  unlinkPhysicalAssetUnit,
  syncFromHRAssignment,
} from '@/lib/physical-asset-unit-bridge';
import { faUnitsKey, type AssetUnitRecord } from '@/types/fixed-asset';
import { ASSETS_KEY, type Asset } from '@/types/asset-master';

const ENTITY = 'ENT003';
const assetTagsKey = (e: string) => `erp_asset_tags_${e}`;

function seedFA(): AssetUnitRecord {
  const u: AssetUnitRecord = {
    id: 'fau-x', entity_id: ENTITY, item_id: 'i-1', item_name: 'Lathe',
    ledger_definition_id: 'l-ppe', ledger_name: 'P&M',
    asset_id: 'PPE/25-26/010', asset_id_prefix: 'PPE', asset_id_suffix: '25-26',
    asset_id_seq: 10, gross_block_cost: 100000, salvage_value: 0,
    accumulated_depreciation: 0, net_book_value: 100000, opening_wdv: 100000,
    purchase_date: '2025-04-01', put_to_use_date: '2025-04-01',
    it_act_block: 'Plant & Machinery', it_act_depr_rate: 15,
    location: '', department: '', custodian_name: '',
    status: 'active', capital_purchase_voucher_id: 'vch-cp',
    created_at: '', updated_at: '',
  };
  localStorage.setItem(faUnitsKey(ENTITY), JSON.stringify([u]));
  return u;
}

function seedHR(id = 'hr-1'): Asset {
  const a: Partial<Asset> = { id, name: 'Lathe-HR', status: 'assigned' };
  localStorage.setItem(ASSETS_KEY, JSON.stringify([a]));
  return a as Asset;
}

beforeEach(() => localStorage.clear());

describe('physical-asset-unit-bridge · link + find', () => {
  it('creates PhysicalAssetUnit and soft-links back-references on FA shape', () => {
    seedFA();
    seedHR('hr-1');
    localStorage.setItem(assetTagsKey(ENTITY), JSON.stringify([{ id: 'tag-1', status: 'active', physical_location: 'Bay 3' }]));
    const pau = linkPhysicalAssetUnit(ENTITY, 'fau-x', { asset_tag_id: 'tag-1', hr_asset_id: 'hr-1' });
    expect(pau.asset_tag_id).toBe('tag-1');
    expect(pau.hr_asset_id).toBe('hr-1');
    const stored = JSON.parse(localStorage.getItem(faUnitsKey(ENTITY))!) as AssetUnitRecord[];
    expect(stored[0].hr_asset_id).toBe('hr-1');
    expect(stored[0].asset_tag_id).toBe('tag-1');
  });

  it('findPhysicalAssetUnit resolves via each of 3 IDs', () => {
    seedFA();
    const pau = linkPhysicalAssetUnit(ENTITY, 'fau-x');
    expect(findPhysicalAssetUnit(ENTITY, { asset_unit_record_id: 'fau-x' })?.id).toBe(pau.id);
  });

  it('throws on missing AssetUnitRecord', () => {
    expect(() => linkPhysicalAssetUnit(ENTITY, 'ghost')).toThrow();
  });

  it('upserts when called twice on same fau', () => {
    seedFA();
    const p1 = linkPhysicalAssetUnit(ENTITY, 'fau-x');
    const p2 = linkPhysicalAssetUnit(ENTITY, 'fau-x', { hr_asset_id: null });
    expect(p1.id).toBe(p2.id);
  });
});

describe('physical-asset-unit-bridge · orphan detection (LEAK-1/LEAK-3)', () => {
  it('reports unlinked FA units as fa_orphans', () => {
    seedFA();
    const rep = detectOrphans(ENTITY);
    expect(rep.fa_orphans).toContain('fau-x');
  });

  it('linked FA units no longer appear in orphans', () => {
    seedFA();
    linkPhysicalAssetUnit(ENTITY, 'fau-x');
    expect(detectOrphans(ENTITY).fa_orphans).not.toContain('fau-x');
  });
});

describe('physical-asset-unit-bridge · sync + unify', () => {
  it('syncFromHRAssignment updates FA custodian_name', () => {
    seedFA(); seedHR('hr-1');
    linkPhysicalAssetUnit(ENTITY, 'fau-x', { hr_asset_id: 'hr-1' });
    syncFromHRAssignment(ENTITY, 'hr-1', 'Suresh Reddy');
    const u = (JSON.parse(localStorage.getItem(faUnitsKey(ENTITY))!) as AssetUnitRecord[])[0];
    expect(u.custodian_name).toBe('Suresh Reddy');
  });

  it('listUnifiedAssets joins all 3 shapes', () => {
    seedFA();
    linkPhysicalAssetUnit(ENTITY, 'fau-x');
    const list = listUnifiedAssets(ENTITY);
    expect(list).toHaveLength(1);
    expect(list[0].fa_record?.id).toBe('fau-x');
  });

  it('unlink removes the join · back-refs preserved for audit', () => {
    seedFA();
    const p = linkPhysicalAssetUnit(ENTITY, 'fau-x');
    unlinkPhysicalAssetUnit(ENTITY, p.id);
    expect(listUnifiedAssets(ENTITY)).toHaveLength(0);
  });
});
