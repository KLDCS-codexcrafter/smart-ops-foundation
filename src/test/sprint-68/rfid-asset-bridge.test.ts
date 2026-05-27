/**
 * Sprint 68 FAR-4 · Block 16 · rfid-asset-bridge smoke tests
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  linkRFIDTag,
  unlinkRFIDTag,
  findAssetByRFIDTag,
  listRFIDTaggedAssets,
  rfidRegistryKey,
} from '@/lib/rfid-asset-bridge';

const ENTITY = 'TST68R';

describe('rfid-asset-bridge · registry CRUD', () => {
  beforeEach(() => localStorage.clear());

  it('linkRFIDTag persists record · findAssetByRFIDTag retrieves it', () => {
    linkRFIDTag(ENTITY, 'asset-1', 'TAG-AAA-001');
    const found = findAssetByRFIDTag(ENTITY, 'TAG-AAA-001');
    expect(found?.asset_unit_record_id).toBe('asset-1');
  });

  it('unlinkRFIDTag removes the record', () => {
    linkRFIDTag(ENTITY, 'asset-2', 'TAG-BBB-002');
    unlinkRFIDTag(ENTITY, 'TAG-BBB-002');
    expect(findAssetByRFIDTag(ENTITY, 'TAG-BBB-002')).toBeNull();
  });

  it('listRFIDTaggedAssets returns linked records', () => {
    linkRFIDTag(ENTITY, 'asset-3', 'TAG-CCC-003');
    const list = listRFIDTaggedAssets(ENTITY);
    expect(list.some(r => r.rfid_tag_id === 'TAG-CCC-003')).toBe(true);
  });

  it('rfidRegistryKey is entity-scoped', () => {
    expect(rfidRegistryKey(ENTITY)).toContain(ENTITY);
  });
});
