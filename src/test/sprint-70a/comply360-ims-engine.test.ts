/**
 * @file        src/test/sprint-70a/comply360-ims-engine.test.ts
 * @purpose     Unit tests · Sprint 70a Block 4 IMS engine
 * @sprint      Sprint 70a · Pass A · Block 5
 * @lesson-23   Signatures grepped from src/lib/comply360-ims-engine.ts
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  imsStorageKey,
  loadIMSActions,
  recordIMSAction,
  bulkAcceptIMS,
  getIMSPendingCount,
  IMS_VALID_STATUSES,
  type IMSAction,
} from '@/lib/comply360-ims-engine';

const ENTITY = 'ent-001';
const PERIOD = '04-2026';
const GSTIN = '27AAAPL1234C1Z5';

const mk = (over: Partial<IMSAction> = {}): IMSAction => ({
  id: 'ims-1',
  entity_id: ENTITY,
  gstin: GSTIN,
  return_period: PERIOD,
  source_invoice_ref: 'inv-1',
  supplier_gstin: '29AAAPL1234C1Z5',
  taxable_value: 1000,
  igst: 180, cgst: 0, sgst: 0,
  status: 'pending',
  ...over,
});

beforeEach(() => localStorage.clear());

describe('Sprint 70a · Block 4 · comply360-ims-engine', () => {
  it('imsStorageKey is scoped by entity + period', () => {
    expect(imsStorageKey(ENTITY, PERIOD)).toBe(`comply360.ims.${ENTITY}.${PERIOD}`);
  });

  it('loadIMSActions returns [] when nothing stored', () => {
    expect(loadIMSActions(ENTITY, PERIOD)).toEqual([]);
  });

  it('recordIMSAction inserts then updates by id (id-lookup, not index)', () => {
    const a = mk();
    const inserted = recordIMSAction(a);
    const found = inserted.find(x => x.id === 'ims-1');
    expect(found?.action_at).toBeTruthy();
    const updated = recordIMSAction({ ...a, status: 'accepted' });
    expect(updated.find(x => x.id === 'ims-1')?.status).toBe('accepted');
    expect(updated).toHaveLength(1);
  });

  it('getIMSPendingCount counts only pending', () => {
    recordIMSAction(mk({ id: 'a', source_invoice_ref: 'a' }));
    recordIMSAction(mk({ id: 'b', source_invoice_ref: 'b', status: 'accepted' }));
    expect(getIMSPendingCount(ENTITY, PERIOD)).toBe(1);
  });

  it('bulkAcceptIMS flips matching invoice_refs to accepted', () => {
    recordIMSAction(mk({ id: 'a', source_invoice_ref: 'a' }));
    recordIMSAction(mk({ id: 'b', source_invoice_ref: 'b' }));
    const out = bulkAcceptIMS(ENTITY, PERIOD, ['a']);
    const ofA = out.find(x => x.source_invoice_ref === 'a');
    const ofB = out.find(x => x.source_invoice_ref === 'b');
    expect(ofA?.status).toBe('accepted');
    expect(ofB?.status).toBe('pending');
  });

  it('IMS_VALID_STATUSES enumerates all 4 GSTN buyer-action states', () => {
    expect([...IMS_VALID_STATUSES].sort()).toEqual(
      ['accepted', 'kept_pending', 'pending', 'rejected'].sort(),
    );
  });
});
