/**
 * @file        src/lib/intercompany-matching-engine.ts
 * @sibling     NEW @ Sprint 108 · T-Phase-6.C.1.4 · 🏁 Arc 2 Capstone · Pillar C.1
 * @purpose     Auto-match the two sides of each Intercompany transaction
 *              (source posting ↔ counterparty posting) and flag breaks.
 *              READS listICTransactions (0-DIFF) + fincore voucher storage
 *              by vouchersKey. Decimal-safe variance via dSub/dEq.
 *
 * @reads-from  intercompany-transaction-engine (listICTransactions · 0-DIFF) ·
 *              fincore-engine (vouchersKey · read-only lookup) ·
 *              mock-entities (loadEntities · code resolution) ·
 *              decimal-helpers (dSub · dEq · roundTo) ·
 *              audit-trail-engine (logAudit)
 *
 * @audit-type  intercompany_match · module: mca-roc
 *
 * @scope-wall  DP-A2-9 · Reconciliation of existing IC postings ONLY.
 *              NO consolidation / NCI / Goodwill / multi-currency
 *              (Arc 3 · S109–S112). Scope-wall asserted in the test pack.
 *
 * @disciplines FR-19 SIBLING · FR-44 spine reuse (READS · no duplication) ·
 *              FR-67 §H 0-DIFF · v1.30 §L (DP-A2-6)
 *
 * @[JWT]       GET /api/intercompany/matching
 *              POST /api/intercompany/matching/run
 */

import { logAudit } from '@/lib/audit-trail-engine';
import { dSub, dEq, roundTo } from '@/lib/decimal-helpers';
import {
  listICTransactions,
  type IntercompanyTransaction,
} from '@/lib/intercompany-transaction-engine';
import { vouchersKey } from '@/lib/fincore-engine';
import { loadEntities } from '@/data/mock-entities';
import type { Voucher } from '@/types/voucher';

// ─── Provenance · READS_FROM (FR-44 disclosure) ───────────────────────────

export const READS_FROM = {
  icTransactions: 'src/lib/intercompany-transaction-engine.ts (listICTransactions · 0-DIFF)',
  fincore: 'src/lib/fincore-engine.ts (vouchersKey · voucher gross_amount lookup)',
  mockEntities: 'src/data/mock-entities.ts (loadEntities · id→shortCode)',
  decimalHelpers: 'src/lib/decimal-helpers.ts (dSub · dEq · roundTo)',
} as const;

// ─── Types ────────────────────────────────────────────────────────────────

export type ICMatchBreakReason =
  | 'missing_counterparty_voucher'
  | 'amount_mismatch'
  | 'status_mismatch'
  | 'unposted';

export const IC_MATCH_BREAK_REASONS: readonly ICMatchBreakReason[] = [
  'missing_counterparty_voucher',
  'amount_mismatch',
  'status_mismatch',
  'unposted',
] as const;

export interface ICMatchResult {
  ic_txn_id: string;
  txn_type: IntercompanyTransaction['txn_type'];
  from_entity: string;
  to_entity: string;
  from_voucher_id?: string;
  to_voucher_id?: string;
  matched: boolean;
  break_reason?: ICMatchBreakReason;
  amount_from: number;
  amount_to: number;
  variance: number;
  status: IntercompanyTransaction['status'];
}

export interface ICMatchSummary {
  total: number;
  matched: number;
  breaks: number;
  match_rate_pct: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function codeOf(entityId: string): string {
  const entities = loadEntities();
  const found = entities.find((e) => e.id === entityId);
  return found?.shortCode ?? entityId;
}

function readVoucherById(entityId: string, voucherId: string): Voucher | null {
  try {
    const raw = localStorage.getItem(vouchersKey(codeOf(entityId)));
    if (!raw) return null;
    const list = JSON.parse(raw) as Voucher[];
    return list.find((v) => v.id === voucherId) ?? null;
  } catch {
    return null;
  }
}

function evaluateTxn(txn: IntercompanyTransaction): ICMatchResult {
  // Unposted: no orchestration ran yet — no reciprocal vouchers expected.
  if (txn.status === 'draft' || txn.status === 'priced') {
    return {
      ic_txn_id: txn.ic_txn_id,
      txn_type: txn.txn_type,
      from_entity: txn.from_entity,
      to_entity: txn.to_entity,
      matched: false,
      break_reason: 'unposted',
      amount_from: roundTo(txn.amount, 2),
      amount_to: 0,
      variance: roundTo(txn.amount, 2),
      status: txn.status,
    };
  }

  // Posted/settled — both voucher refs must exist on the IC txn record.
  if (!txn.from_voucher_id || !txn.to_voucher_id) {
    return {
      ic_txn_id: txn.ic_txn_id,
      txn_type: txn.txn_type,
      from_entity: txn.from_entity,
      to_entity: txn.to_entity,
      from_voucher_id: txn.from_voucher_id,
      to_voucher_id: txn.to_voucher_id,
      matched: false,
      break_reason: 'missing_counterparty_voucher',
      amount_from: roundTo(txn.amount, 2),
      amount_to: 0,
      variance: roundTo(txn.amount, 2),
      status: txn.status,
    };
  }

  const fromV = readVoucherById(txn.from_entity, txn.from_voucher_id);
  const toV = readVoucherById(txn.to_entity, txn.to_voucher_id);

  // Either side missing in voucher storage → counterparty break.
  if (!fromV || !toV) {
    const amount_from = fromV ? roundTo(fromV.gross_amount, 2) : 0;
    const amount_to = toV ? roundTo(toV.gross_amount, 2) : 0;
    return {
      ic_txn_id: txn.ic_txn_id,
      txn_type: txn.txn_type,
      from_entity: txn.from_entity,
      to_entity: txn.to_entity,
      from_voucher_id: txn.from_voucher_id,
      to_voucher_id: txn.to_voucher_id,
      matched: false,
      break_reason: 'missing_counterparty_voucher',
      amount_from,
      amount_to,
      variance: roundTo(dSub(amount_from, amount_to), 2),
      status: txn.status,
    };
  }

  const amount_from = roundTo(fromV.gross_amount, 2);
  const amount_to = roundTo(toV.gross_amount, 2);
  const variance = roundTo(dSub(amount_from, amount_to), 2);

  // Status alignment — both vouchers should share posting status (draft vs posted).
  if (fromV.status !== toV.status) {
    return {
      ic_txn_id: txn.ic_txn_id,
      txn_type: txn.txn_type,
      from_entity: txn.from_entity,
      to_entity: txn.to_entity,
      from_voucher_id: txn.from_voucher_id,
      to_voucher_id: txn.to_voucher_id,
      matched: false,
      break_reason: 'status_mismatch',
      amount_from,
      amount_to,
      variance,
      status: txn.status,
    };
  }

  // Amount reconciliation — decimal-safe equality.
  if (!dEq(amount_from, amount_to, 2)) {
    return {
      ic_txn_id: txn.ic_txn_id,
      txn_type: txn.txn_type,
      from_entity: txn.from_entity,
      to_entity: txn.to_entity,
      from_voucher_id: txn.from_voucher_id,
      to_voucher_id: txn.to_voucher_id,
      matched: false,
      break_reason: 'amount_mismatch',
      amount_from,
      amount_to,
      variance,
      status: txn.status,
    };
  }

  return {
    ic_txn_id: txn.ic_txn_id,
    txn_type: txn.txn_type,
    from_entity: txn.from_entity,
    to_entity: txn.to_entity,
    from_voucher_id: txn.from_voucher_id,
    to_voucher_id: txn.to_voucher_id,
    matched: true,
    amount_from,
    amount_to,
    variance: 0,
    status: txn.status,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────

/**
 * Run matching across all IC transactions (optionally filtered by direction).
 * Logs a single `intercompany_match` audit per invocation (run-level).
 */
export function runICMatching(
  filter?: { from_entity?: string; to_entity?: string },
): ICMatchResult[] {
  const all = listICTransactions();
  const filtered = all.filter((t) => {
    if (filter?.from_entity && t.from_entity !== filter.from_entity) return false;
    if (filter?.to_entity && t.to_entity !== filter.to_entity) return false;
    return true;
  });
  const results = filtered.map(evaluateTxn);

  const matched = results.filter((r) => r.matched).length;
  const breaks = results.length - matched;
  const auditEntity = filter?.from_entity ?? filter?.to_entity ?? 'GROUP';

  logAudit({
    entityCode: auditEntity,
    action: 'view',
    entityType: 'intercompany_match',
    recordId: `ic-match-${Date.now()}`,
    recordLabel: `IC matching run · total=${results.length} · matched=${matched} · breaks=${breaks}`,
    beforeState: null,
    afterState: {
      total: results.length,
      matched,
      breaks,
      filter: (filter ?? null) as unknown as Record<string, unknown> | null,
    } as Record<string, unknown>,
    sourceModule: 'intercompany-matching-engine',
  });

  return results;
}

/** Return only the unmatched results (matched === false) from a fresh run. */
export function getMatchBreaks(
  filter?: { from_entity?: string; to_entity?: string },
): ICMatchResult[] {
  return runICMatching(filter).filter((r) => !r.matched);
}

/**
 * Summary aggregate: total / matched / breaks / match_rate_pct.
 * match_rate_pct is decimal-safe: matched/total * 100, rounded to 2.
 * Zero-total returns 0% (no division-by-zero).
 */
export function getMatchSummary(
  filter?: { from_entity?: string; to_entity?: string },
): ICMatchSummary {
  const results = runICMatching(filter);
  const total = results.length;
  const matched = results.filter((r) => r.matched).length;
  const breaks = total - matched;
  const match_rate_pct = total === 0
    ? 0
    : roundTo((matched / total) * 100, 2);
  return { total, matched, breaks, match_rate_pct };
}
