/**
 * @file        audit-trail-hash-chain.ts
 * @sprint      T-Phase-1.2.6f-pre-2 · Block C3 · OOB-49
 * @purpose     SHA-256 hash chain for indent state transitions (tamper-evidence).
 * @disciplines SD-13, SD-15
 * @[JWT]       POST /api/audit/chain · GET /api/audit/chain/verify
 */

export interface AuditChainEntry {
  id: string;
  entity_id: string;
  voucher_id: string;
  voucher_kind: 'material' | 'service' | 'capital';
  action: string;
  actor_user_id: string;
  prev_hash: string;
  payload_hash: string;
  chain_hash: string;
  recorded_at: string;
}

export const auditChainKey = (entityCode: string): string => `erp_audit_chain_${entityCode}`;

const GENESIS = '0000000000000000000000000000000000000000000000000000000000000000';

async function sha256Hex(input: string): Promise<string> {
  if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.subtle) {
    const buf = new TextEncoder().encode(input);
    const digest = await globalThis.crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(digest))
      .map(b => b.toString(16).padStart(2, '0')).join('');
  }
  // Fallback FNV-1a 64-bit (test environments without subtle crypto)
  let h = BigInt('14695981039346656037');
  const prime = BigInt('1099511628211');
  const mask = (BigInt(1) << BigInt(64)) - BigInt(1);
  for (let i = 0; i < input.length; i++) {
    h = (h ^ BigInt(input.charCodeAt(i))) & mask;
    h = (h * prime) & mask;
  }
  return h.toString(16).padStart(16, '0').padStart(64, '0');
}

function loadChain(entityCode: string): AuditChainEntry[] {
  // [JWT] GET /api/audit/chain?entityCode=...
  try {
    const raw = localStorage.getItem(auditChainKey(entityCode));
    return raw ? JSON.parse(raw) as AuditChainEntry[] : [];
  } catch { return []; }
}

function saveChain(entityCode: string, chain: AuditChainEntry[]): void {
  // [JWT] POST /api/audit/chain
  localStorage.setItem(auditChainKey(entityCode), JSON.stringify(chain));
}

export interface AppendAuditInput {
  entityCode: string;
  entityId: string;
  voucherId: string;
  voucherKind: AuditChainEntry['voucher_kind'];
  action: string;
  actorUserId: string;
  payload: unknown;
}

export async function appendAuditEntry(input: AppendAuditInput): Promise<AuditChainEntry> {
  const chain = loadChain(input.entityCode);
  const prev_hash = chain.length > 0 ? chain[chain.length - 1].chain_hash : GENESIS;
  const payload_hash = await sha256Hex(JSON.stringify(input.payload ?? {}));
  const recorded_at = new Date().toISOString();
  const composite = `${prev_hash}|${input.voucherId}|${input.action}|${input.actorUserId}|${payload_hash}|${recorded_at}`;
  const chain_hash = await sha256Hex(composite);
  const entry: AuditChainEntry = {
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    entity_id: input.entityId,
    voucher_id: input.voucherId,
    voucher_kind: input.voucherKind,
    action: input.action,
    actor_user_id: input.actorUserId,
    prev_hash, payload_hash, chain_hash, recorded_at,
  };
  chain.push(entry);
  saveChain(input.entityCode, chain);
  return entry;
}

export interface ChainVerification {
  ok: boolean;
  total: number;
  broken_at: number | null;
  reason: string | null;
}

export async function verifyChainIntegrity(entityCode: string): Promise<ChainVerification> {
  const chain = loadChain(entityCode);
  let prev = GENESIS;
  for (let i = 0; i < chain.length; i++) {
    const e = chain[i];
    if (e.prev_hash !== prev) {
      return { ok: false, total: chain.length, broken_at: i, reason: 'prev_hash mismatch' };
    }
    const composite = `${e.prev_hash}|${e.voucher_id}|${e.action}|${e.actor_user_id}|${e.payload_hash}|${e.recorded_at}`;
    const recomputed = await sha256Hex(composite);
    if (recomputed !== e.chain_hash) {
      return { ok: false, total: chain.length, broken_at: i, reason: 'chain_hash mismatch' };
    }
    prev = e.chain_hash;
  }
  return { ok: true, total: chain.length, broken_at: null, reason: null };
}

export function readChainForEntity(entityCode: string): AuditChainEntry[] {
  return loadChain(entityCode);
}
