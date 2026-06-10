/**
 * @file        integrity-sign.ts
 * @purpose     Tamper-evident integrity signature for report row-sets.
 *              DELEGATES to voucher-hash (FNV-1a 64-bit) — no new hash algorithm.
 * @sprint      RPT-1a · Reporting Framework Foundation
 * @decisions   D-RPT-3 (one hash family across audit trail and reports)
 * @[JWT]       N/A — deterministic client compute
 */

import { computeVoucherHash, verifyVoucherHash } from '@/lib/voucher-hash';

/**
 * Deterministic FNV-1a signature over a canonical row digest.
 * Order-stable: input row order does NOT affect the signature when rows carry
 * a stable identity field (`id` or `voucher_no`); otherwise rows are hashed
 * in input order.
 */
export function signReport(rows: Record<string, unknown>[]): string {
  const digest = {
    __report: true,
    count: rows.length,
    rows: canonicalize(rows),
  };
  return computeVoucherHash(digest);
}

export function verifyReport(rows: Record<string, unknown>[], hash: string): boolean {
  const stamped = {
    __report: true,
    count: rows.length,
    rows: canonicalize(rows),
    voucher_hash: hash,
  };
  return verifyVoucherHash(stamped);
}

function canonicalize(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  // If rows have stable IDs, sort by them for order-independence; else preserve order.
  const idKey = rows.length > 0 && rows[0] && 'id' in rows[0]
    ? 'id'
    : rows.length > 0 && rows[0] && 'voucher_no' in rows[0]
      ? 'voucher_no'
      : null;
  if (!idKey) return rows.slice();
  return rows.slice().sort((a, b) => String(a[idKey]).localeCompare(String(b[idKey])));
}
