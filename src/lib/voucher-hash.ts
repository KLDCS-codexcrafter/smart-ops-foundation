/**
 * @file     voucher-hash.ts — Tamper-evidence hash for posted transactions
 * @sprint   T-Phase-1.2.6d-hdr · OOB-12 · Blockchain-style audit
 * @purpose  Compute a stable hash of a record's material fields. Stamped at
 *           posted_at by stampPost() in uth-stamper. If anyone modifies the
 *           record after posting, the hash no longer matches — auditor
 *           verification tools detect tampering instantly.
 *
 *   Phase 1: FNV-1a 64-bit (synchronous · deterministic · no async surface).
 *   Phase 1.6 upgrade path: crypto.subtle SHA-256 (async) for stronger compliance.
 */

const STABLE_FIELDS_TO_EXCLUDE = new Set<string>([
  'updated_at', 'updated_by',          // legitimate updates after post
  'voucher_hash',                       // exclude self
  'cancel_reason', 'cancelled_at',      // legitimate cancellation
  'pod_reference', 'received_at',       // delivery receipt updates
]);

function stableStringify(obj: Record<string, unknown>): string {
  const filtered = Object.entries(obj)
    .filter(([k]) => !STABLE_FIELDS_TO_EXCLUDE.has(k))
    .filter(([, v]) => v !== undefined && v !== null)
    .sort(([a], [b]) => a.localeCompare(b));
  return JSON.stringify(filtered);
}

const MASK_64 = 0xFFFFFFFFFFFFFFFFn;

export function computeVoucherHash(record: Record<string, unknown>): string {
  const canonical = stableStringify(record);
  let h = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  for (let i = 0; i < canonical.length; i++) {
    h = (h ^ BigInt(canonical.charCodeAt(i))) & MASK_64;
    h = (h * prime) & MASK_64;
  }
  return 'fnv1a:' + h.toString(16).padStart(16, '0');
}

export function verifyVoucherHash(record: Record<string, unknown>): boolean {
  if (!record.voucher_hash || typeof record.voucher_hash !== 'string') return true;
  return record.voucher_hash === computeVoucherHash(record);
}
