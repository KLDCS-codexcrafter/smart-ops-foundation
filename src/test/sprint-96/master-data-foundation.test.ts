/**
 * @file        src/test/sprint-96/master-data-foundation.test.ts
 * @sprint      Sprint 96 · T-Phase-6.A.0.1 · Arc 0 Master Data Foundation
 * @form        v1.30 §N · ≥20 discrete it() blocks (target 25+) · NOT it.each
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  promptCreateInAll, setPreference, getPreference,
  replicateToAllEntities, seedAllMastersForNewEntity,
  detectConflicts, siblingEntities,
  _clearEntityMasterCacheForTests,
  ALL_MASTER_TYPES,
} from '@/lib/master-replication-engine';
import {
  recordMasterVersion, getMasterAsOf, getVersionChain,
  _clearVersionChainForTests,
} from '@/lib/idea-1-time-travel-masters-engine';
import {
  evaluateSmartSync, DEFAULT_SYNC_THRESHOLDS,
} from '@/lib/idea-4-smart-master-sync-engine';
import { AUDIT_ENTITY_TYPES_REGISTRY } from '@/lib/comply360-audit-trail-aggregator-engine';
import { SIBLINGS } from '@/lib/_institutional/sibling-register';
import { SPRINTS } from '@/lib/_institutional/sprint-history';

const E_SRC = 'SMRT';
const E_T1 = 'DGTL';
const E_T2 = 'EXPT';
const NEW_E = 'NEW1';

function resetAll(): void {
  _clearEntityMasterCacheForTests(E_SRC);
  _clearEntityMasterCacheForTests(E_T1);
  _clearEntityMasterCacheForTests(E_T2);
  _clearEntityMasterCacheForTests(NEW_E);
  for (const t of ALL_MASTER_TYPES) {
    _clearVersionChainForTests(t, 'TEST_KEY_1');
    _clearVersionChainForTests(t, 'TEST_KEY_2');
  }
  try { localStorage.removeItem('erp_audit_trail_' + E_SRC); } catch { /* ignore */ }
  try { localStorage.removeItem('erp_audit_trail_' + E_T1); } catch { /* ignore */ }
  try { localStorage.removeItem('erp_audit_trail_' + E_T2); } catch { /* ignore */ }
  try { localStorage.removeItem('erp_audit_trail_' + NEW_E); } catch { /* ignore */ }
}

beforeEach(resetAll);

describe('Sprint 96 · master-replication-engine · promptCreateInAll modes', () => {
  it('default mode is always_prompt with default_answer false', () => {
    const r = promptCreateInAll({ master_type: 'item', current_entity: E_SRC });
    expect(r.should_prompt).toBe(true);
    expect(r.default_answer).toBe(false);
    expect(r.preference.mode).toBe('always_prompt');
  });

  it('always_replicate mode skips prompt and defaults true', () => {
    setPreference({ master_type: 'customer', entity_code: E_SRC, mode: 'always_replicate', updated_at: '' });
    const r = promptCreateInAll({ master_type: 'customer', current_entity: E_SRC });
    expect(r.should_prompt).toBe(false);
    expect(r.default_answer).toBe(true);
  });

  it('never_replicate mode skips prompt and defaults false', () => {
    setPreference({ master_type: 'vendor', entity_code: E_SRC, mode: 'never_replicate', updated_at: '' });
    const r = promptCreateInAll({ master_type: 'vendor', current_entity: E_SRC });
    expect(r.should_prompt).toBe(false);
    expect(r.default_answer).toBe(false);
  });

  it('persistent remembered_choice round-trips (Q2=C)', () => {
    setPreference({ master_type: 'ledger', entity_code: E_SRC, mode: 'always_prompt', remembered_choice: true, updated_at: '' });
    const r = promptCreateInAll({ master_type: 'ledger', current_entity: E_SRC });
    expect(r.should_prompt).toBe(true);
    expect(r.default_answer).toBe(true);
    expect(getPreference(E_SRC, 'ledger').remembered_choice).toBe(true);
  });
});

describe('Sprint 96 · master-replication-engine · walk-collection', () => {
  it('siblingEntities skips the source entity', () => {
    const sibs = siblingEntities(E_SRC);
    expect(sibs).not.toContain(E_SRC);
    expect(sibs.length).toBeGreaterThan(0);
  });

  it('siblingEntities returns multiple targets for known mock entities', () => {
    const sibs = siblingEntities(E_SRC);
    expect(sibs).toContain(E_T1);
  });
});

describe('Sprint 96 · master-replication-engine · replicate', () => {
  it('replicateToAllEntities succeeds when no conflicts exist', () => {
    const res = replicateToAllEntities({
      master_type: 'item',
      master_record: { id: 'ITM-001', name: 'Widget', price: 100 },
      source_entity: E_SRC, respect_preferences: false,
    });
    expect(res.targets_attempted.length).toBeGreaterThan(0);
    expect(res.targets_succeeded.length).toBe(res.targets_attempted.length);
    expect(res.conflicts.length).toBe(0);
  });

  it('replicateToAllEntities stamps owner_company on every target copy', () => {
    replicateToAllEntities({
      master_type: 'item',
      master_record: { id: 'ITM-002', name: 'Gadget' },
      source_entity: E_SRC, respect_preferences: false,
    });
    const raw = localStorage.getItem('erp_' + E_T1 + '_master_item');
    expect(raw).toBeTruthy();
    const list = JSON.parse(raw!) as Record<string, unknown>[];
    expect(list[0].owner_company).toBe(E_SRC);
  });

  it('replicateToAllEntities skips a target whose preference is never_replicate', () => {
    setPreference({ master_type: 'vendor', entity_code: E_T1, mode: 'never_replicate', updated_at: '' });
    const res = replicateToAllEntities({
      master_type: 'vendor',
      master_record: { id: 'VEN-001', name: 'Acme' },
      source_entity: E_SRC, respect_preferences: true,
    });
    expect(res.targets_skipped.some((s) => s.entity_code === E_T1 && s.reason === 'preference_off')).toBe(true);
  });

  it('replicateToAllEntities is idempotent on re-run (no duplicate inserts)', () => {
    const input = {
      master_type: 'ledger' as const,
      master_record: { id: 'LED-001', name: 'Cash' },
      source_entity: E_SRC, respect_preferences: false,
    };
    replicateToAllEntities(input);
    replicateToAllEntities(input);
    const raw = localStorage.getItem('erp_' + E_T1 + '_master_ledger');
    const list = JSON.parse(raw!) as Record<string, unknown>[];
    expect(list.length).toBe(1);
  });

  it('replicateToAllEntities detects conflict when key exists with different field values', () => {
    localStorage.setItem('erp_' + E_T1 + '_master_customer',
      JSON.stringify([{ id: 'CST-001', name: 'Existing', credit_limit: 50000 }]));
    const res = replicateToAllEntities({
      master_type: 'customer',
      master_record: { id: 'CST-001', name: 'Existing', credit_limit: 99999 },
      source_entity: E_SRC, respect_preferences: false,
    });
    expect(res.conflicts.length).toBeGreaterThan(0);
    expect(res.conflicts[0].resolution).toBe('pending');
    expect(res.targets_skipped.some((s) => s.entity_code === E_T1 && s.reason === 'conflict')).toBe(true);
  });
});

describe('Sprint 96 · master-replication-engine · conflict detection', () => {
  it('detectConflicts returns empty when target has no collision', () => {
    const c = detectConflicts({
      master_type: 'item',
      master_record: { id: 'NEW-X', name: 'X' },
      source_entity: E_SRC, target_entity: E_T1,
    });
    expect(c).toEqual([]);
  });

  it('detectConflicts flags differing field values per collision', () => {
    localStorage.setItem('erp_' + E_T1 + '_master_item',
      JSON.stringify([{ id: 'COL-1', name: 'Old', price: 100 }]));
    const c = detectConflicts({
      master_type: 'item',
      master_record: { id: 'COL-1', name: 'New', price: 200 },
      source_entity: E_SRC, target_entity: E_T1,
    });
    const fields = c.map((x) => x.field).sort();
    expect(fields).toContain('name');
    expect(fields).toContain('price');
    expect(c.every((x) => x.resolution === 'pending')).toBe(true);
  });
});

describe('Sprint 96 · master-replication-engine · reverse seed', () => {
  it('seedAllMastersForNewEntity aggregates from sibling entities (USE-SITE READ, no entity-setup-service edit)', () => {
    localStorage.setItem('erp_' + E_SRC + '_master_item',
      JSON.stringify([{ id: 'AGG-1', name: 'Agg1', owner_company: E_SRC }]));
    localStorage.setItem('erp_' + E_T1 + '_master_item',
      JSON.stringify([{ id: 'AGG-2', name: 'Agg2', owner_company: E_T1 }]));
    const results = seedAllMastersForNewEntity({ new_entity_code: NEW_E, master_types: ['item'] });
    expect(results.length).toBe(1);
    const raw = localStorage.getItem('erp_' + NEW_E + '_master_item');
    const list = JSON.parse(raw!) as Record<string, unknown>[];
    const ids = list.map((r) => r.id).sort();
    expect(ids).toEqual(['AGG-1', 'AGG-2']);
  });

  it('seedAllMastersForNewEntity returns one result per requested master type', () => {
    const results = seedAllMastersForNewEntity({
      new_entity_code: NEW_E,
      master_types: ['item', 'customer', 'vendor'],
    });
    expect(results.length).toBe(3);
  });
});

describe('Sprint 96 · master-replication-engine · audit emissions', () => {
  it('replicate emits master_replication_event into audit trail', () => {
    replicateToAllEntities({
      master_type: 'unit',
      master_record: { id: 'UOM-1', name: 'Each' },
      source_entity: E_SRC, respect_preferences: false,
    });
    const raw = localStorage.getItem('erp_audit_trail_' + E_SRC);
    const entries = JSON.parse(raw!) as Array<{ entity_type: string }>;
    expect(entries.some((e) => e.entity_type === 'master_replication_event')).toBe(true);
  });

  it('conflict emits master_conflict_resolution entries on target entity', () => {
    localStorage.setItem('erp_' + E_T1 + '_master_stock_group',
      JSON.stringify([{ id: 'SG-1', name: 'Old' }]));
    replicateToAllEntities({
      master_type: 'stock_group',
      master_record: { id: 'SG-1', name: 'New' },
      source_entity: E_SRC, respect_preferences: false,
    });
    const raw = localStorage.getItem('erp_audit_trail_' + E_T1);
    const entries = JSON.parse(raw!) as Array<{ entity_type: string }>;
    expect(entries.some((e) => e.entity_type === 'master_conflict_resolution')).toBe(true);
  });

  it('seedAllMastersForNewEntity emits master_sync_run audit', () => {
    seedAllMastersForNewEntity({ new_entity_code: NEW_E, master_types: ['voucher_type'] });
    const raw = localStorage.getItem('erp_audit_trail_' + NEW_E);
    const entries = JSON.parse(raw!) as Array<{ entity_type: string }>;
    expect(entries.some((e) => e.entity_type === 'master_sync_run')).toBe(true);
  });

  it('all 4 new audit entity types registered under mca-roc', () => {
    const ids = AUDIT_ENTITY_TYPES_REGISTRY.filter((t) => t.module === 'mca-roc').map((t) => t.id);
    expect(ids).toContain('master_replication_event');
    expect(ids).toContain('master_conflict_resolution');
    expect(ids).toContain('master_sync_run');
    expect(ids).toContain('master_version_change');
  });
});

describe('Sprint 96 · idea-1 time-travel masters', () => {
  it('recordMasterVersion creates v1 with open effective_to_date', () => {
    const v = recordMasterVersion({
      master_type: 'item', master_key: 'TEST_KEY_1',
      snapshot: { price: 100 }, effective_from_date: '2026-01-01', changed_by: 'tester',
    });
    expect(v.version_no).toBe(1);
    expect(v.effective_to_date).toBeNull();
  });

  it('recording v2 closes v1 effective_to_date to day-before', () => {
    recordMasterVersion({ master_type: 'item', master_key: 'TEST_KEY_1', snapshot: { price: 100 }, effective_from_date: '2026-01-01', changed_by: 't' });
    recordMasterVersion({ master_type: 'item', master_key: 'TEST_KEY_1', snapshot: { price: 200 }, effective_from_date: '2026-03-15', changed_by: 't' });
    const chain = getVersionChain({ master_type: 'item', master_key: 'TEST_KEY_1' });
    expect(chain.length).toBe(2);
    expect(chain[0].effective_to_date).toBe('2026-03-14');
    expect(chain[1].effective_to_date).toBeNull();
    expect(chain[1].predecessor_version).toBe(1);
  });

  it('getMasterAsOf returns the v1 snapshot for a date inside v1 window', () => {
    recordMasterVersion({ master_type: 'item', master_key: 'TEST_KEY_2', snapshot: { price: 50 }, effective_from_date: '2026-01-01', changed_by: 't' });
    recordMasterVersion({ master_type: 'item', master_key: 'TEST_KEY_2', snapshot: { price: 75 }, effective_from_date: '2026-04-01', changed_by: 't' });
    const v = getMasterAsOf({ master_type: 'item', master_key: 'TEST_KEY_2', as_of_date: '2026-02-15' });
    expect(v?.version_no).toBe(1);
    expect((v?.snapshot as { price: number }).price).toBe(50);
  });

  it('getMasterAsOf returns the open (current) version for a future date', () => {
    recordMasterVersion({ master_type: 'item', master_key: 'TEST_KEY_2', snapshot: { price: 50 }, effective_from_date: '2026-01-01', changed_by: 't' });
    recordMasterVersion({ master_type: 'item', master_key: 'TEST_KEY_2', snapshot: { price: 75 }, effective_from_date: '2026-04-01', changed_by: 't' });
    const v = getMasterAsOf({ master_type: 'item', master_key: 'TEST_KEY_2', as_of_date: '2099-12-31' });
    expect(v?.version_no).toBe(2);
  });

  it('getMasterAsOf returns null when as_of_date is before first effective_from', () => {
    recordMasterVersion({ master_type: 'item', master_key: 'TEST_KEY_2', snapshot: { price: 50 }, effective_from_date: '2026-06-01', changed_by: 't' });
    const v = getMasterAsOf({ master_type: 'item', master_key: 'TEST_KEY_2', as_of_date: '2026-01-01' });
    expect(v).toBeNull();
  });

  it('getVersionChain returns ascending by version_no', () => {
    recordMasterVersion({ master_type: 'item', master_key: 'TEST_KEY_1', snapshot: { v: 1 }, effective_from_date: '2026-01-01', changed_by: 't' });
    recordMasterVersion({ master_type: 'item', master_key: 'TEST_KEY_1', snapshot: { v: 2 }, effective_from_date: '2026-02-01', changed_by: 't' });
    recordMasterVersion({ master_type: 'item', master_key: 'TEST_KEY_1', snapshot: { v: 3 }, effective_from_date: '2026-03-01', changed_by: 't' });
    const chain = getVersionChain({ master_type: 'item', master_key: 'TEST_KEY_1' });
    expect(chain.map((v) => v.version_no)).toEqual([1, 2, 3]);
  });

  it('recordMasterVersion emits master_version_change audit', () => {
    recordMasterVersion({ master_type: 'item', master_key: 'TEST_KEY_1', snapshot: { x: 1 }, effective_from_date: '2026-01-01', changed_by: E_SRC });
    const raw = localStorage.getItem('erp_audit_trail_' + E_SRC);
    const entries = JSON.parse(raw!) as Array<{ entity_type: string }>;
    expect(entries.some((e) => e.entity_type === 'master_version_change')).toBe(true);
  });
});

describe('Sprint 96 · idea-4 smart master sync', () => {
  it('DEFAULT_SYNC_THRESHOLDS covers all 8 master types', () => {
    const covered = DEFAULT_SYNC_THRESHOLDS.map((t) => t.master_type).sort();
    expect(covered).toEqual([...ALL_MASTER_TYPES].sort());
  });

  it('item used within 6 months → replicate (recently_used)', () => {
    const recent = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const res = evaluateSmartSync({
      new_entity_code: NEW_E,
      candidates: [{ master_type: 'item', master_key: 'I1', last_used: recent }],
    });
    expect(res[0].decision).toBe('replicate');
    expect(res[0].reason).toBe('recently_used');
  });

  it('item dormant beyond 6 months → skip (dormant)', () => {
    const old = new Date(Date.now() - 400 * 24 * 60 * 60 * 1000).toISOString();
    const res = evaluateSmartSync({
      new_entity_code: NEW_E,
      candidates: [{ master_type: 'item', master_key: 'I2', last_used: old }],
    });
    expect(res[0].decision).toBe('skip');
    expect(res[0].reason).toBe('dormant');
  });

  it('customer with active_balance → replicate (active_credit)', () => {
    const res = evaluateSmartSync({
      new_entity_code: NEW_E,
      candidates: [{ master_type: 'customer', master_key: 'C1', active_balance: true }],
    });
    expect(res[0].decision).toBe('replicate');
    expect(res[0].reason).toBe('active_credit');
  });

  it('customer without active_balance → skip (dormant)', () => {
    const res = evaluateSmartSync({
      new_entity_code: NEW_E,
      candidates: [{ master_type: 'customer', master_key: 'C2', active_balance: false }],
    });
    expect(res[0].decision).toBe('skip');
    expect(res[0].reason).toBe('dormant');
  });

  it('always-rule master types replicate unconditionally', () => {
    const res = evaluateSmartSync({
      new_entity_code: NEW_E,
      candidates: [
        { master_type: 'ledger', master_key: 'L1' },
        { master_type: 'unit',   master_key: 'U1' },
      ],
    });
    expect(res.every((d) => d.decision === 'replicate' && d.reason === 'threshold_always')).toBe(true);
  });

  it('threshold override forces never on a normally-active type', () => {
    const res = evaluateSmartSync({
      new_entity_code: NEW_E,
      candidates: [{ master_type: 'ledger', master_key: 'L9' }],
      thresholds: [{ master_type: 'ledger', rule: 'never' }],
    });
    expect(res[0].decision).toBe('skip');
    expect(res[0].reason).toBe('threshold_never');
  });
});

describe('Sprint 96 · institutional registers', () => {
  it('sibling-register count is at least 160 (158 + 2 new in S97, post-T1 dedup)', () => {
    expect(SIBLINGS.length).toBeGreaterThanOrEqual(160);
  });

  it('all 3 new Sprint 96 SIBLINGs are registered with CONFIRMED provenance', () => {
    const ids = SIBLINGS.filter((s) => s.sprintAdded === 96).map((s) => s.id);
    expect(ids).toContain('master-replication-engine');
    expect(ids).toContain('idea-1-time-travel-masters-engine');
    expect(ids).toContain('idea-4-smart-master-sync-engine');
    expect(SIBLINGS.filter((s) => s.sprintAdded === 96).every((s) => s.provenance === 'CONFIRMED')).toBe(true);
  });

  it('sprint-history S95.1 SHA backfilled (v1.30 §M)', () => {
    const s951 = SPRINTS.find((s) => s.sprintNumber === 95.1);
    expect(s951?.headSha).toBe('5b84d631820b1df077ef564c1bff4281da666676');
  });

  it('sprint-history S96 entry exists with backfilled headSha (post-S97 Block 0)', () => {
    const s96 = SPRINTS.find((s) => s.sprintNumber === 96);
    expect(s96).toBeDefined();
    expect(s96?.code).toBe('T-Phase-6.A.0.1');
    expect(s96?.headSha).toBe('7f0cee2d900ace3f91ade9327b8d0641f0738322');
    expect(s96?.predecessorSha).toBe('5b84d631820b1df077ef564c1bff4281da666676');
    expect(s96?.newSiblings.length).toBe(3);
  });
});
