/**
 * p85-block4-behavioral.test.ts — P8.5 · B.5-L2 Global Hash-Chain
 *
 * Sprint T-P85-Global-Hash-Chain · §N ≥26 behavioral tests.
 *
 * Spine under test: src/lib/audit-trail-chain-engine.ts (NEW sibling).
 * Co-spine ZERO-DIFF wall: src/lib/audit-trail-hash-chain.ts (S137 · OOB-49).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { logAudit, readAuditTrail } from '@/lib/audit-trail-engine';
import {
  chainAuditEntry,
  ensureChainsSeeded,
  verifyTypedChain,
  verifyAllChains,
  readTypedChain,
  readTypedChainStore,
  listChainTypes,
  typedChainKey,
  drainChainQueue,
} from '@/lib/audit-trail-chain-engine';
import { auditTrailKey } from '@/types/audit-trail';

const E1 = 'P85ENT';
const E2 = 'P85ENT2';

function reset(entity: string): void {
  localStorage.removeItem(auditTrailKey(entity));
  localStorage.removeItem(typedChainKey(entity));
}

/** Wait one tick so chainAuditEntry's detached microtask settles. */
function flush(): Promise<void> {
  return new Promise((r) => setTimeout(r, 0));
}

describe('P8.5 · B.5-L2 · audit-trail-chain-engine — append + cross-isolation', () => {
  beforeEach(() => { reset(E1); reset(E2); });

  it('1 · chainAuditEntry forges seq:0 link with GENESIS prev_hash on first entry', async () => {
    const entry = logAudit({
      entityCode: E1, action: 'create', entityType: 'voucher',
      recordId: 'V1', recordLabel: 'V1', beforeState: null, afterState: { a: 1 },
      sourceModule: 'test',
    });
    await flush();
    const chain = readTypedChain(E1, 'voucher');
    expect(chain.length).toBe(1);
    expect(chain[0].seq).toBe(0);
    expect(chain[0].auditEntryId).toBe(entry.id);
    expect(chain[0].prev_hash).toBe('GENESIS');
    expect(chain[0].chain_hash.length).toBeGreaterThanOrEqual(16);
  });

  it('2 · second entry of same type chains to first (prev_hash = chain[0].chain_hash)', async () => {
    logAudit({ entityCode: E1, action: 'create', entityType: 'voucher', recordId: 'V1', recordLabel: 'V1', beforeState: null, afterState: null, sourceModule: 't' });
    await flush();
    logAudit({ entityCode: E1, action: 'create', entityType: 'voucher', recordId: 'V2', recordLabel: 'V2', beforeState: null, afterState: null, sourceModule: 't' });
    await flush();
    const chain = readTypedChain(E1, 'voucher');
    expect(chain.length).toBe(2);
    expect(chain[1].seq).toBe(1);
    expect(chain[1].prev_hash).toBe(chain[0].chain_hash);
  });

  it('3 · per-entityType isolation — voucher and approval_workflow grow independently', async () => {
    logAudit({ entityCode: E1, action: 'create', entityType: 'voucher', recordId: 'V1', recordLabel: 'V1', beforeState: null, afterState: null, sourceModule: 't' });
    logAudit({ entityCode: E1, action: 'create', entityType: 'voucher', recordId: 'V2', recordLabel: 'V2', beforeState: null, afterState: null, sourceModule: 't' });
    logAudit({ entityCode: E1, action: 'approve', entityType: 'order', recordId: 'AW1', recordLabel: 'AW1', beforeState: null, afterState: null, sourceModule: 't' });
    await flush();
    expect(readTypedChain(E1, 'voucher').length).toBe(2);
    expect(readTypedChain(E1, 'order').length).toBe(1);
    expect(readTypedChain(E1, 'order')[0].prev_hash).toBe('GENESIS');
  });

  it('4 · per-entity isolation — two entities never share a chain store', async () => {
    logAudit({ entityCode: E1, action: 'create', entityType: 'voucher', recordId: 'V1', recordLabel: 'V1', beforeState: null, afterState: null, sourceModule: 't' });
    logAudit({ entityCode: E2, action: 'create', entityType: 'voucher', recordId: 'V1', recordLabel: 'V1', beforeState: null, afterState: null, sourceModule: 't' });
    await flush();
    expect(readTypedChain(E1, 'voucher').length).toBe(1);
    expect(readTypedChain(E2, 'voucher').length).toBe(1);
    expect(localStorage.getItem(typedChainKey(E1))).not.toBe(localStorage.getItem(typedChainKey(E2)));
  });

  it('5 · listChainTypes enumerates only types that actually have links', async () => {
    logAudit({ entityCode: E1, action: 'create', entityType: 'voucher', recordId: 'V1', recordLabel: 'V1', beforeState: null, afterState: null, sourceModule: 't' });
    logAudit({ entityCode: E1, action: 'approve', entityType: 'order', recordId: 'AW1', recordLabel: 'AW1', beforeState: null, afterState: null, sourceModule: 't' });
    await flush();
    const types = listChainTypes(E1).sort();
    expect(types).toEqual(['order', 'voucher'].sort());
  });

  it('6 · chainAuditEntry is idempotent on duplicate auditEntryId', async () => {
    const entry = logAudit({ entityCode: E1, action: 'create', entityType: 'voucher', recordId: 'V1', recordLabel: 'V1', beforeState: null, afterState: null, sourceModule: 't' });
    await flush();
    // Replay the same forged entry — must NOT add another link.
    chainAuditEntry(entry);
    await flush();
    chainAuditEntry(entry);
    await flush();
    expect(readTypedChain(E1, 'voucher').length).toBe(1);
  });

  it('7 · readTypedChainStore returns the entire {type → links} map', async () => {
    logAudit({ entityCode: E1, action: 'create', entityType: 'voucher', recordId: 'V1', recordLabel: 'V1', beforeState: null, afterState: null, sourceModule: 't' });
    await flush();
    const store = readTypedChainStore(E1);
    expect(Object.keys(store)).toContain('voucher');
    expect(store['voucher'][0].seq).toBe(0);
  });
});

describe('P8.5 · B.5-L2 · deterministic hashing', () => {
  beforeEach(() => { reset(E1); });

  it('8 · two distinct audit entries with identical identity-fields-except-id produce DIFFERENT chain_hashes (id participates in hash)', async () => {
    logAudit({ entityCode: E1, action: 'create', entityType: 'voucher', recordId: 'V1', recordLabel: 'V1', beforeState: null, afterState: null, sourceModule: 't' });
    await flush();
    logAudit({ entityCode: E1, action: 'create', entityType: 'voucher', recordId: 'V1', recordLabel: 'V1', beforeState: null, afterState: null, sourceModule: 't' });
    await flush();
    const chain = readTypedChain(E1, 'voucher');
    expect(chain[0].chain_hash).not.toBe(chain[1].chain_hash);
  });

  it('9 · verify on a clean chain re-derives the same hashes (deterministic primitive)', async () => {
    logAudit({ entityCode: E1, action: 'create', entityType: 'voucher', recordId: 'V1', recordLabel: 'V1', beforeState: null, afterState: null, sourceModule: 't' });
    logAudit({ entityCode: E1, action: 'create', entityType: 'voucher', recordId: 'V2', recordLabel: 'V2', beforeState: null, afterState: null, sourceModule: 't' });
    await flush();
    const r = await verifyTypedChain(E1, 'voucher');
    expect(r.valid).toBe(true);
    expect(r.length).toBe(2);
    expect(r.firstBreakSeq).toBeNull();
  });
});

describe('P8.5 · B.5-L2 · TAMPER FIXTURES (the heart of L2)', () => {
  beforeEach(() => { reset(E1); });

  it('10 · MUTATE an entry record_label → verify names the exact seq + entryId', async () => {
    const e1 = logAudit({ entityCode: E1, action: 'create', entityType: 'voucher', recordId: 'V1', recordLabel: 'V1', beforeState: null, afterState: null, sourceModule: 't' });
    logAudit({ entityCode: E1, action: 'create', entityType: 'voucher', recordId: 'V2', recordLabel: 'V2', beforeState: null, afterState: null, sourceModule: 't' });
    await flush();
    // Tamper: rewrite the first entry's record_label in storage.
    const trail = JSON.parse(localStorage.getItem(auditTrailKey(E1))!);
    trail[0].record_label = 'TAMPERED';
    localStorage.setItem(auditTrailKey(E1), JSON.stringify(trail));
    const r = await verifyTypedChain(E1, 'voucher');
    expect(r.valid).toBe(false);
    expect(r.firstBreakSeq).toBe(0);
    expect(r.firstBreakEntryId).toBe(e1.id);
    expect(r.reason).toBe('chain_hash mismatch');
  });

  it('11 · MUTATE an entry action → verify breaks at that link', async () => {
    logAudit({ entityCode: E1, action: 'create', entityType: 'voucher', recordId: 'V1', recordLabel: 'V1', beforeState: null, afterState: null, sourceModule: 't' });
    const e2 = logAudit({ entityCode: E1, action: 'create', entityType: 'voucher', recordId: 'V2', recordLabel: 'V2', beforeState: null, afterState: null, sourceModule: 't' });
    await flush();
    const trail = JSON.parse(localStorage.getItem(auditTrailKey(E1))!);
    trail[1].action = 'update';
    localStorage.setItem(auditTrailKey(E1), JSON.stringify(trail));
    const r = await verifyTypedChain(E1, 'voucher');
    expect(r.valid).toBe(false);
    expect(r.firstBreakSeq).toBe(1);
    expect(r.firstBreakEntryId).toBe(e2.id);
  });

  it('12 · DELETE a mid-chain underlying audit row → verify breaks with explicit reason', async () => {
    logAudit({ entityCode: E1, action: 'create', entityType: 'voucher', recordId: 'V1', recordLabel: 'V1', beforeState: null, afterState: null, sourceModule: 't' });
    const e2 = logAudit({ entityCode: E1, action: 'create', entityType: 'voucher', recordId: 'V2', recordLabel: 'V2', beforeState: null, afterState: null, sourceModule: 't' });
    logAudit({ entityCode: E1, action: 'create', entityType: 'voucher', recordId: 'V3', recordLabel: 'V3', beforeState: null, afterState: null, sourceModule: 't' });
    await flush();
    // Wipe the underlying audit row for seq 1 (the chain link stays).
    const trail: ReturnType<typeof readAuditTrail> = JSON.parse(localStorage.getItem(auditTrailKey(E1))!);
    const filtered = trail.filter((x) => x.id !== e2.id);
    localStorage.setItem(auditTrailKey(E1), JSON.stringify(filtered));
    const r = await verifyTypedChain(E1, 'voucher');
    expect(r.valid).toBe(false);
    expect(r.firstBreakSeq).toBe(1);
    expect(r.reason).toBe('underlying audit entry missing');
  });

  it('13 · REORDER chain links (swap seq 1 and 2 storage positions) → verify breaks', async () => {
    logAudit({ entityCode: E1, action: 'create', entityType: 'voucher', recordId: 'V1', recordLabel: 'V1', beforeState: null, afterState: null, sourceModule: 't' });
    logAudit({ entityCode: E1, action: 'create', entityType: 'voucher', recordId: 'V2', recordLabel: 'V2', beforeState: null, afterState: null, sourceModule: 't' });
    logAudit({ entityCode: E1, action: 'create', entityType: 'voucher', recordId: 'V3', recordLabel: 'V3', beforeState: null, afterState: null, sourceModule: 't' });
    await flush();
    const store = readTypedChainStore(E1);
    const ch = store['voucher'];
    // Swap positions 1 and 2 (keep .seq fields as-is — exposes the reorder).
    [ch[1], ch[2]] = [ch[2], ch[1]];
    store['voucher'] = ch;
    localStorage.setItem(typedChainKey(E1), JSON.stringify(store));
    const r = await verifyTypedChain(E1, 'voucher');
    expect(r.valid).toBe(false);
    expect(r.firstBreakSeq).toBe(1);
  });

  it('14 · DELETE a mid-chain link entirely → verify reports break (prev_hash mismatch)', async () => {
    logAudit({ entityCode: E1, action: 'create', entityType: 'voucher', recordId: 'V1', recordLabel: 'V1', beforeState: null, afterState: null, sourceModule: 't' });
    logAudit({ entityCode: E1, action: 'create', entityType: 'voucher', recordId: 'V2', recordLabel: 'V2', beforeState: null, afterState: null, sourceModule: 't' });
    logAudit({ entityCode: E1, action: 'create', entityType: 'voucher', recordId: 'V3', recordLabel: 'V3', beforeState: null, afterState: null, sourceModule: 't' });
    await flush();
    const store = readTypedChainStore(E1);
    store['voucher'] = [store['voucher'][0], store['voucher'][2]];
    localStorage.setItem(typedChainKey(E1), JSON.stringify(store));
    const r = await verifyTypedChain(E1, 'voucher');
    expect(r.valid).toBe(false);
    // The retained-seq:2 link is now at position 1 → reason can be either prev_hash mismatch or seq out of order.
    expect(['prev_hash mismatch', 'seq out of order']).toContain(r.reason!);
  });

  it('15 · MUTATE the chain_hash field of a link → verify breaks there', async () => {
    logAudit({ entityCode: E1, action: 'create', entityType: 'voucher', recordId: 'V1', recordLabel: 'V1', beforeState: null, afterState: null, sourceModule: 't' });
    logAudit({ entityCode: E1, action: 'create', entityType: 'voucher', recordId: 'V2', recordLabel: 'V2', beforeState: null, afterState: null, sourceModule: 't' });
    await flush();
    const store = readTypedChainStore(E1);
    store['voucher'][0].chain_hash = '0'.repeat(64);
    localStorage.setItem(typedChainKey(E1), JSON.stringify(store));
    const r = await verifyTypedChain(E1, 'voucher');
    expect(r.valid).toBe(false);
    expect(r.firstBreakSeq).toBe(0);
  });
});

describe('P8.5 · B.5-L2 · retro-genesis migration (ensureChainsSeeded)', () => {
  beforeEach(() => { reset(E1); });

  it('16 · covers pre-existing entries written before the chain engine knew about them', async () => {
    // Simulate pre-existing audit rows by writing the trail directly + wiping the chain.
    logAudit({ entityCode: E1, action: 'create', entityType: 'voucher', recordId: 'V1', recordLabel: 'V1', beforeState: null, afterState: null, sourceModule: 't' });
    logAudit({ entityCode: E1, action: 'create', entityType: 'voucher', recordId: 'V2', recordLabel: 'V2', beforeState: null, afterState: null, sourceModule: 't' });
    await flush();
    localStorage.removeItem(typedChainKey(E1)); // wipe chain only
    const mig = await ensureChainsSeeded(E1);
    expect(mig.scanned).toBe(2);
    expect(mig.newLinks).toBe(2);
    const r = await verifyTypedChain(E1, 'voucher');
    expect(r.valid).toBe(true);
    expect(r.length).toBe(2);
  });

  it('17 · is idempotent — second run produces zero new links', async () => {
    logAudit({ entityCode: E1, action: 'create', entityType: 'voucher', recordId: 'V1', recordLabel: 'V1', beforeState: null, afterState: null, sourceModule: 't' });
    logAudit({ entityCode: E1, action: 'create', entityType: 'voucher', recordId: 'V2', recordLabel: 'V2', beforeState: null, afterState: null, sourceModule: 't' });
    await flush();
    localStorage.removeItem(typedChainKey(E1));
    const m1 = await ensureChainsSeeded(E1);
    const m2 = await ensureChainsSeeded(E1);
    expect(m1.newLinks).toBe(2);
    expect(m2.newLinks).toBe(0);
    expect(m2.scanned).toBe(2);
  });

  it('18 · mixed pre-existing + post-engine entries chain correctly after migration', async () => {
    logAudit({ entityCode: E1, action: 'create', entityType: 'voucher', recordId: 'V1', recordLabel: 'V1', beforeState: null, afterState: null, sourceModule: 't' });
    await flush();
    // Wipe chain — simulate "pre-existing" state for V1.
    localStorage.removeItem(typedChainKey(E1));
    // New entry that triggers live chaining (only V2 gets chained live).
    logAudit({ entityCode: E1, action: 'create', entityType: 'voucher', recordId: 'V2', recordLabel: 'V2', beforeState: null, afterState: null, sourceModule: 't' });
    await flush();
    // Migration fills in V1.
    const mig = await ensureChainsSeeded(E1);
    expect(mig.newLinks).toBe(1);
    expect(readTypedChain(E1, 'voucher').length).toBe(2);
  });

  it('19 · ensureChainsSeeded on an entity with zero audit rows → no work', async () => {
    const mig = await ensureChainsSeeded(E1);
    expect(mig.scanned).toBe(0);
    expect(mig.newLinks).toBe(0);
  });

  it('20 · ensureChainsSeeded with empty entityCode returns {0,0}', async () => {
    const mig = await ensureChainsSeeded('');
    expect(mig.scanned).toBe(0);
    expect(mig.newLinks).toBe(0);
  });

  it('21 · migration order is deterministic — stored array order is canonical', async () => {
    logAudit({ entityCode: E1, action: 'create', entityType: 'voucher', recordId: 'V1', recordLabel: 'V1', beforeState: null, afterState: null, sourceModule: 't' });
    logAudit({ entityCode: E1, action: 'create', entityType: 'voucher', recordId: 'V2', recordLabel: 'V2', beforeState: null, afterState: null, sourceModule: 't' });
    await flush();
    localStorage.removeItem(typedChainKey(E1));
    await ensureChainsSeeded(E1);
    const chain1 = readTypedChain(E1, 'voucher').map((c) => c.auditEntryId);
    // Repeat the whole exercise on a fresh entity with identical trail.
    reset(E2);
    const trail = JSON.parse(localStorage.getItem(auditTrailKey(E1))!);
    localStorage.setItem(auditTrailKey(E2), JSON.stringify(trail.map((t: { id: string }, i: number) => ({ ...t, id: `re_${i}_${t.id}`, entity_id: E2 }))));
    await ensureChainsSeeded(E2);
    const chain2 = readTypedChain(E2, 'voucher').map((c) => c.seq);
    expect(chain1.length).toBe(2);
    expect(chain2).toEqual([0, 1]);
  });
});

describe('P8.5 · B.5-L2 · verifyTypedChain edge cases + verifyAllChains', () => {
  beforeEach(() => { reset(E1); });

  it('22 · verify on an empty / never-chained type returns valid + length 0', async () => {
    const r = await verifyTypedChain(E1, 'voucher');
    expect(r.valid).toBe(true);
    expect(r.length).toBe(0);
    expect(r.firstBreakSeq).toBeNull();
    expect(r.firstBreakEntryId).toBeNull();
  });

  it('23 · verifyAllChains aggregates intact/broken counts across types', async () => {
    logAudit({ entityCode: E1, action: 'create', entityType: 'voucher', recordId: 'V1', recordLabel: 'V1', beforeState: null, afterState: null, sourceModule: 't' });
    logAudit({ entityCode: E1, action: 'approve', entityType: 'order', recordId: 'AW1', recordLabel: 'AW1', beforeState: null, afterState: null, sourceModule: 't' });
    await flush();
    // Tamper the voucher chain only.
    const trail = JSON.parse(localStorage.getItem(auditTrailKey(E1))!);
    trail[0].record_label = 'TAMPERED';
    localStorage.setItem(auditTrailKey(E1), JSON.stringify(trail));
    const r = await verifyAllChains(E1);
    expect(r.totalChains).toBe(2);
    expect(r.brokenChains).toBe(1);
    expect(r.intactChains).toBe(1);
  });

  it('24 · verify is read-only — does NOT mutate the chain store or audit trail', async () => {
    logAudit({ entityCode: E1, action: 'create', entityType: 'voucher', recordId: 'V1', recordLabel: 'V1', beforeState: null, afterState: null, sourceModule: 't' });
    await flush();
    const before = localStorage.getItem(typedChainKey(E1));
    const trailBefore = localStorage.getItem(auditTrailKey(E1));
    await verifyAllChains(E1);
    expect(localStorage.getItem(typedChainKey(E1))).toBe(before);
    expect(localStorage.getItem(auditTrailKey(E1))).toBe(trailBefore);
  });
});

describe('P8.5 · B.5-L2 · synchronous contract + S137 wall', () => {
  beforeEach(() => { reset(E1); });

  it('25 · logAudit signature stays synchronous — returns the entry directly (no Promise)', () => {
    const ret = logAudit({
      entityCode: E1, action: 'create', entityType: 'voucher',
      recordId: 'V1', recordLabel: 'V1', beforeState: null, afterState: null, sourceModule: 't',
    });
    // If async had been introduced, `ret` would be a Promise — assert it is the entry shape.
    expect(typeof (ret as unknown as { then?: unknown }).then).toBe('undefined');
    expect(typeof ret.id).toBe('string');
    expect(ret.id.startsWith('aud_')).toBe(true);
  });

  it('26 · chainAuditEntry is fire-and-forget — returns void synchronously', () => {
    const entry = logAudit({ entityCode: E1, action: 'create', entityType: 'voucher', recordId: 'V1', recordLabel: 'V1', beforeState: null, afterState: null, sourceModule: 't' });
    const ret = chainAuditEntry(entry);
    expect(ret).toBeUndefined();
  });

  it('27 · S137 spine module is importable AND exports its original surface untouched', async () => {
    const s137 = await import('@/lib/audit-trail-hash-chain');
    expect(typeof s137.appendAuditEntry).toBe('function');
    expect(typeof s137.appendAuditEntrySafe).toBe('function');
    expect(typeof s137.verifyChainIntegrity).toBe('function');
    expect(typeof s137.readChainForEntity).toBe('function');
    expect(typeof s137.auditChainKey).toBe('function');
    // Key namespace MUST differ from the typed-chain key.
    expect(s137.auditChainKey(E1)).not.toBe(typedChainKey(E1));
  });

  it('28 · typed-chain storage key namespace is erp_audit_typed_chain_<entity>', () => {
    expect(typedChainKey(E1)).toBe('erp_audit_typed_chain_P85ENT');
    expect(typedChainKey('')).toBe('erp_audit_typed_chain_UNKNOWN');
  });

  it('29 · readTypedChain on missing entity → empty array (defensive)', () => {
    expect(readTypedChain('NO_SUCH_ENTITY', 'voucher')).toEqual([]);
  });

  it('30 · P8.5 headSha row exists in sprint-history canon', async () => {
    const history = await import('@/lib/_institutional/sprint-history');
    const rows = (history as unknown as { SPRINTS?: Array<{ code: string }> }).SPRINTS;
    const all = rows ?? (Object.values(history).find(Array.isArray) as Array<{ code: string }> | undefined) ?? [];
    const p85 = all.find((r) => r && r.code === 'T-P85-Global-Hash-Chain');
    expect(p85).toBeDefined();
    // Also assert P8.4's row got flipped to its known headSha.
    const p84 = all.find((r) => r && r.code === 'T-P84-Audit-Expansion-W2');
    expect(p84).toBeDefined();
    expect((p84 as unknown as { headSha: string }).headSha).toBe('803310f12');
  });
});
