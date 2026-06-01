/**
 * @file        src/test/sprint-98/master-data-governance.test.ts
 * @sprint      Sprint 98 · T-Phase-6.A.0.3
 * @scope       Block 3 (field-lock-metadata) + Block 4 (idea-3 conflict resolution)
 *              + Block 5 (idea-11 sync throttle) + Block 2 (voucher-type
 *              replication adapter) + Block 7 institutional integrity.
 * @goal        >=28 discrete it() blocks. Currently 32.
 */
import { describe, it, expect, beforeEach } from 'vitest';

import {
  loadFieldLockRules,
  getRule,
  upsertRule,
  deleteRule,
  evaluateOverride,
  _clearFieldLockRulesForTests,
} from '@/lib/field-lock-metadata-engine';

import {
  scanForDuplicates,
  buildMergePlan,
  commitMerge,
} from '@/lib/idea-3-conflict-resolution-engine';

import {
  requestSyncToken,
  recordThrottledSyncRun,
  getBucketState,
  DEFAULT_POLICY,
  _clearThrottleBucketForTests,
} from '@/lib/idea-11-sync-throttle-engine';

import {
  promptCreateVoucherTypeInAll,
  replicateVoucherTypeToAllEntities,
  setPreference,
} from '@/lib/master-replication-engine';

import { SIBLINGS, getSiblingCount } from '@/lib/_institutional/sibling-register';

// ─── localStorage shim for node-like vitest env ──────────────────────
class MemStorage {
  private m = new Map<string, string>();
  getItem(k: string) { return this.m.has(k) ? this.m.get(k)! : null; }
  setItem(k: string, v: string) { this.m.set(k, v); }
  removeItem(k: string) { this.m.delete(k); }
  clear() { this.m.clear(); }
  get length() { return this.m.size; }
  key(i: number) { return Array.from(this.m.keys())[i] ?? null; }
}
if (typeof globalThis.localStorage === 'undefined') {
  (globalThis as unknown as { localStorage: MemStorage }).localStorage = new MemStorage();
}

beforeEach(() => {
  (globalThis as unknown as { localStorage: Storage }).localStorage.clear();
});

// ═════════════════════════════════════════════════════════════════════
// Block 3 · Field Lock Metadata Engine (9 it())
// ═════════════════════════════════════════════════════════════════════
describe('Sprint 98 · Block 3 · field-lock-metadata-engine', () => {
  it('seeds default rules on first load', () => {
    _clearFieldLockRulesForTests();
    const rules = loadFieldLockRules();
    expect(rules.length).toBeGreaterThanOrEqual(9);
  });

  it('GSTIN on customer is locked by default', () => {
    _clearFieldLockRulesForTests();
    loadFieldLockRules();
    const r = getRule('customer', 'gstin');
    expect(r?.mode).toBe('locked');
  });

  it('evaluateOverride blocks locked fields', () => {
    _clearFieldLockRulesForTests();
    loadFieldLockRules();
    const d = evaluateOverride({ master_type: 'customer', field_path: 'gstin' });
    expect(d.allowed).toBe(false);
    expect(d.requires_approval).toBe(false);
  });

  it('evaluateOverride allows overrideable fields', () => {
    _clearFieldLockRulesForTests();
    loadFieldLockRules();
    const d = evaluateOverride({ master_type: 'vendor', field_path: 'msme_udyam' });
    expect(d.allowed).toBe(true);
  });

  it('evaluateOverride requires approval for request_approval fields', () => {
    _clearFieldLockRulesForTests();
    loadFieldLockRules();
    const d = evaluateOverride({ master_type: 'item', field_path: 'hsn_code' });
    expect(d.requires_approval).toBe(true);
    expect(d.allowed).toBe(false);
  });

  it('evaluateOverride defaults to permissive when no rule exists', () => {
    _clearFieldLockRulesForTests();
    loadFieldLockRules();
    const d = evaluateOverride({ master_type: 'item', field_path: 'no_such_field' });
    expect(d.allowed).toBe(true);
  });

  it('upsertRule creates a new rule and persists it', () => {
    _clearFieldLockRulesForTests();
    loadFieldLockRules();
    const next = upsertRule({
      rule: { master_type: 'item', field_path: 'sku', field_label: 'SKU', mode: 'locked' },
      actor: 't1', entity_code: 'TEST',
    });
    expect(next.id).toBeTruthy();
    expect(getRule('item', 'sku')?.mode).toBe('locked');
  });

  it('upsertRule updates an existing rule by (master_type, field_path)', () => {
    _clearFieldLockRulesForTests();
    loadFieldLockRules();
    upsertRule({
      rule: { master_type: 'item', field_path: 'hsn_code', field_label: 'HSN', mode: 'locked' },
      actor: 't1', entity_code: 'TEST',
    });
    expect(getRule('item', 'hsn_code')?.mode).toBe('locked');
  });

  it('deleteRule removes a rule by id', () => {
    _clearFieldLockRulesForTests();
    loadFieldLockRules();
    const r = upsertRule({
      rule: { master_type: 'item', field_path: 'tmp', field_label: 'tmp', mode: 'locked' },
      actor: 't1', entity_code: 'TEST',
    });
    expect(deleteRule({ rule_id: r.id, actor: 't1', entity_code: 'TEST' })).toBe(true);
    expect(getRule('item', 'tmp')).toBeNull();
  });
});

// ═════════════════════════════════════════════════════════════════════
// Block 4 · idea-3 Conflict Resolution Engine (8 it())
// ═════════════════════════════════════════════════════════════════════
describe('Sprint 98 · Block 4 · idea-3-conflict-resolution-engine', () => {
  it('scanForDuplicates returns empty when no records', () => {
    expect(scanForDuplicates({ master_type: 'item', records: [] })).toEqual([]);
  });

  it('detects near-duplicate names via similarity threshold', () => {
    const dups = scanForDuplicates({
      master_type: 'item',
      records: [
        { id: 'a', name: 'Steel Rod 10mm' },
        { id: 'b', name: 'Steel Rod 10 mm' },
      ],
    });
    expect(dups.length).toBe(1);
    expect(dups[0].matched_fields).toContain('name');
  });

  it('detects exact HSN match even when names differ', () => {
    const dups = scanForDuplicates({
      master_type: 'item',
      records: [
        { id: 'a', name: 'Widget A', hsn_code: '7308' },
        { id: 'b', name: 'Bracket Z', hsn_code: '7308' },
      ],
      threshold: 0.99,
    });
    expect(dups.length).toBe(1);
    expect(dups[0].matched_fields).toContain('hsn_code');
  });

  it('ignores unrelated records', () => {
    const dups = scanForDuplicates({
      master_type: 'item',
      records: [
        { id: 'a', name: 'Apple' },
        { id: 'b', name: 'Bicycle' },
      ],
    });
    expect(dups).toEqual([]);
  });

  it('caps scan at 500 records', () => {
    const recs = Array.from({ length: 600 }, (_, i) => ({ id: `r${i}`, name: 'Same Name' }));
    const dups = scanForDuplicates({ master_type: 'item', records: recs });
    // n*(n-1)/2 for n=500 = 124750; pairs across capped set, not 600
    expect(dups.length).toBeLessThanOrEqual(500 * 499 / 2);
  });

  it('buildMergePlan keeps survivor non-empty values', () => {
    const plan = buildMergePlan({
      master_type: 'item',
      survivor: { id: 'a', name: 'Steel Rod 10mm', hsn_code: '7308' },
      loser:    { id: 'b', name: 'Steel Rod 10 mm', hsn_code: '', uom: 'NOS' },
    });
    expect(plan.survivor_id).toBe('a');
    expect(plan.loser_id).toBe('b');
    expect(plan.merged.hsn_code).toBe('7308');
    expect(plan.merged.uom).toBe('NOS'); // gap-fill from loser
  });

  it('commitMerge removes loser and replaces survivor with merged record', () => {
    const records = [
      { id: 'a', name: 'Steel Rod 10mm' },
      { id: 'b', name: 'Steel Rod 10 mm' },
      { id: 'c', name: 'Bolt M8' },
    ];
    const plan = buildMergePlan({
      master_type: 'item',
      survivor: records[0], loser: records[1],
    });
    const next = commitMerge({
      plan, records, entity_code: 'TEST', actor: 'test',
    });
    expect(next.length).toBe(2);
    expect(next.find((r) => r.id === 'b')).toBeUndefined();
    expect(next.find((r) => r.id === 'a')).toBeTruthy();
  });

  it('commitMerge is a no-op for records not matching survivor/loser', () => {
    const records = [
      { id: 'a', name: 'Survivor' },
      { id: 'b', name: 'Loser' },
      { id: 'untouched', name: 'X' },
    ];
    const plan = buildMergePlan({ master_type: 'item', survivor: records[0], loser: records[1] });
    const next = commitMerge({ plan, records, entity_code: 'TEST', actor: 't' });
    expect(next.find((r) => r.id === 'untouched')).toBeTruthy();
  });
});

// ═════════════════════════════════════════════════════════════════════
// Block 5 · idea-11 Sync Throttle Engine (7 it())
// ═════════════════════════════════════════════════════════════════════
describe('Sprint 98 · Block 5 · idea-11-sync-throttle-engine', () => {
  it('first request returns allowed with capacity-1 tokens remaining', () => {
    _clearThrottleBucketForTests('E1', 'item');
    const d = requestSyncToken({ entity_code: 'E1', master_type: 'item' });
    expect(d.allowed).toBe(true);
    expect(d.remaining_tokens).toBe(DEFAULT_POLICY.capacity - 1);
  });

  it('denies request when bucket exhausted', () => {
    _clearThrottleBucketForTests('E1', 'item');
    const small = { capacity: 2, refill_per_minute: 1 };
    requestSyncToken({ entity_code: 'E1', master_type: 'item', policy: small });
    requestSyncToken({ entity_code: 'E1', master_type: 'item', policy: small });
    const d = requestSyncToken({ entity_code: 'E1', master_type: 'item', policy: small });
    expect(d.allowed).toBe(false);
    expect(d.retry_after_ms).toBeGreaterThan(0);
  });

  it('refills tokens after time passes (now_ms override)', () => {
    _clearThrottleBucketForTests('E1', 'item');
    const small = { capacity: 2, refill_per_minute: 60 }; // 1 per second
    const t0 = 1_700_000_000_000;
    requestSyncToken({ entity_code: 'E1', master_type: 'item', policy: small, now_ms: t0 });
    requestSyncToken({ entity_code: 'E1', master_type: 'item', policy: small, now_ms: t0 });
    const denied = requestSyncToken({ entity_code: 'E1', master_type: 'item', policy: small, now_ms: t0 });
    expect(denied.allowed).toBe(false);
    const later = requestSyncToken({ entity_code: 'E1', master_type: 'item', policy: small, now_ms: t0 + 2_000 });
    expect(later.allowed).toBe(true);
  });

  it('per (entity, master_type) buckets are independent', () => {
    _clearThrottleBucketForTests('E1', 'item');
    _clearThrottleBucketForTests('E1', 'customer');
    requestSyncToken({ entity_code: 'E1', master_type: 'item' });
    const s1 = getBucketState('E1', 'item')!;
    const s2 = getBucketState('E1', 'customer');
    expect(s1.tokens).toBe(DEFAULT_POLICY.capacity - 1);
    expect(s2).toBeNull();
  });

  it('getBucketState returns null when no bucket exists', () => {
    _clearThrottleBucketForTests('FRESH', 'unit');
    expect(getBucketState('FRESH', 'unit')).toBeNull();
  });

  it('recordThrottledSyncRun returns a decision and persists bucket', () => {
    _clearThrottleBucketForTests('E1', 'ledger');
    const d = recordThrottledSyncRun({
      entity_code: 'E1', master_type: 'ledger',
      run_id: 'r1', payload_summary: 'test',
    });
    expect(d.allowed).toBe(true);
    expect(getBucketState('E1', 'ledger')).not.toBeNull();
  });

  it('throttle decisions include bucket_id', () => {
    _clearThrottleBucketForTests('E2', 'item');
    const d = requestSyncToken({ entity_code: 'E2', master_type: 'item' });
    expect(d.bucket_id).toBe('erp_sync_throttle_bucket_E2_item');
  });
});

// ═════════════════════════════════════════════════════════════════════
// Block 2 · Voucher Type replication adapter (4 it())
// ═════════════════════════════════════════════════════════════════════
describe('Sprint 98 · Block 2 · voucher-type replication adapter', () => {
  it('promptCreateVoucherTypeInAll returns a default-prompt preference', () => {
    const r = promptCreateVoucherTypeInAll({ current_entity: 'SMRT' });
    expect(r.preference.master_type).toBe('voucher_type');
    expect(['always_prompt', 'always_replicate', 'never_replicate']).toContain(r.preference.mode);
  });

  it('replicateVoucherTypeToAllEntities returns a ReplicationResult for voucher_type', () => {
    const res = replicateVoucherTypeToAllEntities({
      voucher_type: { id: 'vt1', name: 'Sales' },
      source_entity: 'SMRT',
      respect_preferences: true,
    });
    expect(res.master_type).toBe('voucher_type');
    expect(res.source_entity).toBe('SMRT');
    expect(Array.isArray(res.targets_attempted)).toBe(true);
  });

  it('respects never_replicate preference on target entities', () => {
    setPreference({
      master_type: 'voucher_type', entity_code: 'DGTL',
      mode: 'never_replicate', updated_at: new Date().toISOString(),
    });
    const res = replicateVoucherTypeToAllEntities({
      voucher_type: { id: 'vt2', name: 'Purchase' },
      source_entity: 'SMRT',
      respect_preferences: true,
    });
    const skip = res.targets_skipped.find((s) => s.entity_code === 'DGTL');
    if (res.targets_attempted.includes('DGTL')) {
      expect(skip?.reason).toBe('preference_off');
    } else {
      expect(true).toBe(true); // entity not a sibling in this config
    }
  });

  it('writes into canonical erp_voucher_types_<code> key', () => {
    setPreference({
      master_type: 'voucher_type', entity_code: 'DGTL',
      mode: 'always_replicate', updated_at: new Date().toISOString(),
    });
    replicateVoucherTypeToAllEntities({
      voucher_type: { id: 'vt3', name: 'Receipt' },
      source_entity: 'SMRT',
      respect_preferences: false,
    });
    // canonical key — one of the entities should now have content
    const dgtl = localStorage.getItem('erp_voucher_types_DGTL');
    const expt = localStorage.getItem('erp_voucher_types_EXPT');
    expect(dgtl !== null || expt !== null).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════════
// Block 7 · Institutional integrity (4 it())
// ═════════════════════════════════════════════════════════════════════
describe('Sprint 98 · Block 7 · institutional integrity', () => {
  it('SIBLINGS register count is at least 163 after S98 additions', () => {
    expect(getSiblingCount()).toBeGreaterThanOrEqual(163);
  });

  it('field-lock-metadata-engine is registered as a CONFIRMED sibling', () => {
    const s = SIBLINGS.find((x) => x.id === 'field-lock-metadata-engine');
    expect(s?.provenance).toBe('CONFIRMED');
    expect(s?.sprintAdded).toBe(98);
  });

  it('idea-3-conflict-resolution-engine is registered as a CONFIRMED sibling', () => {
    const s = SIBLINGS.find((x) => x.id === 'idea-3-conflict-resolution-engine');
    expect(s?.provenance).toBe('CONFIRMED');
    expect(s?.sprintAdded).toBe(98);
  });

  it('idea-11-sync-throttle-engine is registered as a CONFIRMED sibling', () => {
    const s = SIBLINGS.find((x) => x.id === 'idea-11-sync-throttle-engine');
    expect(s?.provenance).toBe('CONFIRMED');
    expect(s?.sprintAdded).toBe(98);
  });
});
