/**
 * audit-trail-chain-engine.ts — P8.5 · B.5-L2 Global Hash-Chain
 *
 * Sprint T-P85-Global-Hash-Chain · predecessor 803310f12
 *
 * SECOND SPINE relationship:
 *   - audit-trail-hash-chain.ts (S137 · OOB-49) is the ORIGINAL spine, still
 *     in production: a SINGLE chain per entity over a narrow voucher set
 *     (material/service/capital indents, RFQ, vendor-quotation, etc.). Its
 *     consumers (weighbridge / vendor-return / vendor-quotation / bill-passing
 *     / git / gateflow bridges / ApprovalActionPanel) keep working unchanged.
 *     ZERO diff on that file in this sprint.
 *   - THIS engine is the GENERALIZED layer: one chain per
 *     (entityCode, auditEntityType) over EVERY audit-trail entry written via
 *     logAudit/safeAudit. It exists to make every audit row tamper-evident
 *     without touching the 80+ P8.3/P8.4 instrumented sites.
 *
 * Granularity (founder-ratified): one chain per (entityCode, auditEntityType).
 * Storage: erp_audit_typed_chain_<entityCode>
 *   → Record<auditEntityType, TypedChainEntry[]>
 *
 * Hash primitive: same algorithm as S137 (SHA-256 via crypto.subtle when
 * available · deterministic FNV-1a 64-bit fallback for test environments
 * without SubtleCrypto). Re-implemented here as a private helper because
 * S137 holds a ZERO-DIFF wall this sprint — no extraction permitted.
 *
 * Synchronous contract: logAudit STAYS SYNCHRONOUS. chainAuditEntry is
 * fire-and-forget; the async hash work runs in a detached microtask.
 *
 * Retro-genesis migration: ensureChainsSeeded(entityCode) is idempotent —
 * walks erp_audit_trail_<entity> in stored array order, chains every entry
 * not yet chained (keyed by auditEntryId). Runs on first verify / open of
 * the Audit Integrity module, NEVER on every logAudit.
 *
 * [JWT] POST /api/audit/typed-chain · GET /api/audit/typed-chain/verify
 *       Server-side chain-head anchoring arrives with the Phase-2 backend.
 */

import type { AuditTrailEntry, AuditEntityType } from '@/types/audit-trail';
import { auditTrailKey } from '@/types/audit-trail';

// ──────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────

export interface TypedChainEntry {
  seq: number;            // 0-indexed position within (entity, entityType)
  auditEntryId: string;   // links back to AuditTrailEntry.id
  prev_hash: string;      // 'GENESIS' for seq 0
  chain_hash: string;
  at: string;             // ISO timestamp of when this chain link was forged
}

export type TypedChainStore = Record<string, TypedChainEntry[]>;

export interface TypedChainVerification {
  entityType: AuditEntityType;
  length: number;
  valid: boolean;
  firstBreakSeq: number | null;
  firstBreakEntryId: string | null;
  reason: string | null;
}

// ──────────────────────────────────────────────────────────────────────────
// Storage
// ──────────────────────────────────────────────────────────────────────────

const GENESIS = 'GENESIS';

export const typedChainKey = (entityCode: string): string =>
  `erp_audit_typed_chain_${entityCode || 'UNKNOWN'}`;

function loadStore(entityCode: string): TypedChainStore {
  // [JWT] GET /api/audit/typed-chain?entityCode=...
  try {
    const raw = localStorage.getItem(typedChainKey(entityCode));
    return raw ? (JSON.parse(raw) as TypedChainStore) : {};
  } catch {
    return {};
  }
}

function saveStore(entityCode: string, store: TypedChainStore): void {
  // [JWT] POST /api/audit/typed-chain
  try {
    localStorage.setItem(typedChainKey(entityCode), JSON.stringify(store));
  } catch (err) {
    console.error('[audit-typed-chain] persist failed (non-fatal):', err);
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Hash primitive — same algorithm as audit-trail-hash-chain.ts (S137).
// Re-implemented privately because that file holds a ZERO-DIFF wall.
// ──────────────────────────────────────────────────────────────────────────

async function sha256Hex(input: string): Promise<string> {
  if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.subtle) {
    const buf = new TextEncoder().encode(input);
    const digest = await globalThis.crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  // FNV-1a 64-bit deterministic fallback (test envs without SubtleCrypto)
  let h = BigInt('14695981039346656037');
  const prime = BigInt('1099511628211');
  const mask = (BigInt(1) << BigInt(64)) - BigInt(1);
  for (let i = 0; i < input.length; i++) {
    h = (h ^ BigInt(input.charCodeAt(i))) & mask;
    h = (h * prime) & mask;
  }
  return h.toString(16).padStart(16, '0').padStart(64, '0');
}

/**
 * Deterministic serialization of an audit entry's IMMUTABLE fields.
 * Excludes mutable/derived fields (retention_until is computed at write-time
 * from clock; before_state/after_state are content but not identity).
 * The S137 chain hashes payload separately; here the identity-fields ARE the
 * payload because the audit entry is itself the record-of-truth.
 */
function serializeForHash(entry: AuditTrailEntry): string {
  return [
    entry.id,
    entry.entity_id,
    entry.entity_type,
    entry.action,
    entry.record_id,
    entry.record_label,
    entry.user_id,
    entry.user_role ?? '',
    entry.source_module,
    entry.reason ?? '',
    entry.timestamp,
  ].join('|');
}

// ──────────────────────────────────────────────────────────────────────────
// Append (synchronous-safe wrapper · fire-and-forget)
//
// Per-entity tail-promise queue ensures concurrent logAudit calls within the
// same event-loop tick serialize their store mutations — without it, each
// detached chainAuditEntryAsync would loadStore() before its siblings
// saveStore(), and last-write-wins would drop links. The queue keeps the
// fire-and-forget guarantee for callers while preserving chain correctness.
// ──────────────────────────────────────────────────────────────────────────

const chainQueueByEntity = new Map<string, Promise<void>>();

/**
 * Forge a chain link for a freshly-written audit entry.
 *
 * SYNCHRONOUS RETURN. The async hash work is detached so callers (logAudit)
 * are never blocked by hashing — mirrors appendAuditEntrySafe :101 pattern.
 *
 * Idempotent by auditEntryId: if a link for this entry already exists in the
 * (entity, entityType) chain, this is a no-op.
 */
export function chainAuditEntry(entry: AuditTrailEntry): void {
  const entityCode = entry.entity_id || 'UNKNOWN';
  const prev = chainQueueByEntity.get(entityCode) ?? Promise.resolve();
  const next = prev
    .then(() => chainAuditEntryAsync(entry))
    .catch((err) => {
      console.error('[audit-typed-chain] append failed (non-fatal):', err);
    });
  chainQueueByEntity.set(entityCode, next);
}

/**
 * Test/UI helper — await every in-flight chain append across all entities.
 * The Audit Integrity UI calls this before verifyAllChains so freshly-fired
 * logAudit appends settle before verification reads.
 */
export async function drainChainQueue(): Promise<void> {
  // Take a snapshot — new appends added during await are picked up in the
  // next loop iteration until the map is steady.
  // Bounded: each pass shrinks pending work; converges quickly.
  for (let i = 0; i < 8; i++) {
    const pending = Array.from(chainQueueByEntity.values());
    if (pending.length === 0) return;
    await Promise.allSettled(pending);
    const stillPending = Array.from(chainQueueByEntity.values());
    if (stillPending.every((p, idx) => p === pending[idx])) return;
  }
}

async function chainAuditEntryAsync(entry: AuditTrailEntry): Promise<void> {
  const entityCode = entry.entity_id || 'UNKNOWN';
  const entityType = entry.entity_type as string;
  const store = loadStore(entityCode);
  const chain = store[entityType] ?? [];

  // Idempotency: never double-chain the same audit entry id.
  if (chain.some((c) => c.auditEntryId === entry.id)) return;

  const prev_hash = chain.length > 0 ? chain[chain.length - 1].chain_hash : GENESIS;
  const composite = `${prev_hash}|${serializeForHash(entry)}`;
  const chain_hash = await sha256Hex(composite);

  const link: TypedChainEntry = {
    seq: chain.length,
    auditEntryId: entry.id,
    prev_hash,
    chain_hash,
    at: new Date().toISOString(),
  };
  chain.push(link);
  store[entityType] = chain;
  saveStore(entityCode, store);
}

// ──────────────────────────────────────────────────────────────────────────
// Retro-genesis migration
// ──────────────────────────────────────────────────────────────────────────

/**
 * Walk the existing erp_audit_trail_<entity> array in stored order; chain
 * every entry not yet present in its (entityType) chain. Idempotent — a
 * second invocation produces zero new links. Deterministic — stored array
 * order IS the canonical order.
 *
 * Cost note: O(N) over the entity's audit-trail array on first verify;
 * fresh demo seed currently writes ZERO audit entries (0.6 finding) so
 * this is near-free on first use.
 */
export async function ensureChainsSeeded(entityCode: string): Promise<{
  scanned: number;
  newLinks: number;
}> {
  if (!entityCode) return { scanned: 0, newLinks: 0 };
  let entries: AuditTrailEntry[] = [];
  try {
    const raw = localStorage.getItem(auditTrailKey(entityCode));
    entries = raw ? (JSON.parse(raw) as AuditTrailEntry[]) : [];
  } catch {
    entries = [];
  }
  if (entries.length === 0) return { scanned: 0, newLinks: 0 };

  const store = loadStore(entityCode);
  // Build a flat set of already-chained auditEntryIds across all types.
  const alreadyChained = new Set<string>();
  for (const t of Object.keys(store)) {
    for (const link of store[t]) alreadyChained.add(link.auditEntryId);
  }

  let newLinks = 0;
  // Stored array order = canonical order. Process strictly in that order so
  // chain hashes are deterministic regardless of when migration runs.
  for (const entry of entries) {
    if (alreadyChained.has(entry.id)) continue;
    const type = entry.entity_type as string;
    const chain = store[type] ?? [];
    const prev_hash = chain.length > 0 ? chain[chain.length - 1].chain_hash : GENESIS;
    const composite = `${prev_hash}|${serializeForHash(entry)}`;
    const chain_hash = await sha256Hex(composite);
    chain.push({
      seq: chain.length,
      auditEntryId: entry.id,
      prev_hash,
      chain_hash,
      at: new Date().toISOString(),
    });
    store[type] = chain;
    alreadyChained.add(entry.id);
    newLinks++;
  }

  if (newLinks > 0) saveStore(entityCode, store);
  return { scanned: entries.length, newLinks };
}

// ──────────────────────────────────────────────────────────────────────────
// Verification
// ──────────────────────────────────────────────────────────────────────────

/**
 * Recompute every link in a (entity, entityType) chain; return the first
 * break position (seq + entry id) if any.
 *
 * Pure / read-only — never mutates storage.
 */
export async function verifyTypedChain(
  entityCode: string,
  entityType: AuditEntityType,
): Promise<TypedChainVerification> {
  const store = loadStore(entityCode);
  const chain = store[entityType as string] ?? [];
  if (chain.length === 0) {
    return {
      entityType, length: 0, valid: true,
      firstBreakSeq: null, firstBreakEntryId: null, reason: null,
    };
  }

  // We need the underlying audit entries to recompute hashes.
  let trail: AuditTrailEntry[] = [];
  try {
    const raw = localStorage.getItem(auditTrailKey(entityCode));
    trail = raw ? (JSON.parse(raw) as AuditTrailEntry[]) : [];
  } catch {
    trail = [];
  }
  const byId = new Map(trail.map((e) => [e.id, e] as const));

  let prev = GENESIS;
  for (let i = 0; i < chain.length; i++) {
    const link = chain[i];
    if (link.seq !== i) {
      return {
        entityType, length: chain.length, valid: false,
        firstBreakSeq: i, firstBreakEntryId: link.auditEntryId,
        reason: 'seq out of order',
      };
    }
    if (link.prev_hash !== prev) {
      return {
        entityType, length: chain.length, valid: false,
        firstBreakSeq: i, firstBreakEntryId: link.auditEntryId,
        reason: 'prev_hash mismatch',
      };
    }
    const entry = byId.get(link.auditEntryId);
    if (!entry) {
      return {
        entityType, length: chain.length, valid: false,
        firstBreakSeq: i, firstBreakEntryId: link.auditEntryId,
        reason: 'underlying audit entry missing',
      };
    }
    const composite = `${prev}|${serializeForHash(entry)}`;
    const recomputed = await sha256Hex(composite);
    if (recomputed !== link.chain_hash) {
      return {
        entityType, length: chain.length, valid: false,
        firstBreakSeq: i, firstBreakEntryId: link.auditEntryId,
        reason: 'chain_hash mismatch',
      };
    }
    prev = link.chain_hash;
  }
  return {
    entityType, length: chain.length, valid: true,
    firstBreakSeq: null, firstBreakEntryId: null, reason: null,
  };
}

export interface AllChainsVerification {
  entityCode: string;
  totalChains: number;
  totalLinks: number;
  intactChains: number;
  brokenChains: number;
  results: TypedChainVerification[];
}

export async function verifyAllChains(entityCode: string): Promise<AllChainsVerification> {
  const store = loadStore(entityCode);
  const types = Object.keys(store) as AuditEntityType[];
  const results: TypedChainVerification[] = [];
  for (const t of types) {
    results.push(await verifyTypedChain(entityCode, t));
  }
  return {
    entityCode,
    totalChains: results.length,
    totalLinks: results.reduce((a, r) => a + r.length, 0),
    intactChains: results.filter((r) => r.valid).length,
    brokenChains: results.filter((r) => !r.valid).length,
    results,
  };
}

// ──────────────────────────────────────────────────────────────────────────
// Read helpers (for the CC Audit Integrity module)
// ──────────────────────────────────────────────────────────────────────────

export function readTypedChainStore(entityCode: string): TypedChainStore {
  return loadStore(entityCode);
}

export function readTypedChain(
  entityCode: string,
  entityType: AuditEntityType,
): TypedChainEntry[] {
  const store = loadStore(entityCode);
  return store[entityType as string] ?? [];
}

export function listChainTypes(entityCode: string): AuditEntityType[] {
  return Object.keys(loadStore(entityCode)) as AuditEntityType[];
}
