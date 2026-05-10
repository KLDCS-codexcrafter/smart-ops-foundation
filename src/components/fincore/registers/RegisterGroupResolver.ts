/**
 * @file     RegisterGroupResolver.ts
 * @purpose  Pure helper: given a Voucher and a RegisterGroupKey, return the string value
 *           used as the group-sort key. Handles all 6 group dimensions from 2d-A.
 * @who      Operix Engineering (Lovable-generated, Claude-audited, Founder-owned)
 * @when     Created Apr-2026 · T10-pre.2d-C
 * @sprint   T10-pre.2d-C
 * @iso      Maintainability (HIGH — one place for grouping logic)
 *           Functional Suitability (HIGH — all 6 group keys supported)
 * @whom     RegisterGrid.tsx (only consumer)
 * @depends  Voucher type · RegisterGroupKey type (2d-A)
 * @consumers RegisterGrid.tsx
 */

import type { Voucher, VoucherInventoryLine } from '@/types/voucher';
import type { RegisterGroupKey } from '@/types/register-config';

/**
 * @purpose   Pure: extract the string value of the group dimension for a voucher.
 *            Used by RegisterGrid to sort rows by group BEFORE sorting by date (secondary).
 * @param     voucher — the voucher to classify
 * @param     groupKey — RegisterGroupKey (none/party/ledger/status/godown/bank)
 * @returns   Stable string — sort-stable. Empty/missing values become 'zzz-unknown' so they
 *            sort to the bottom; 'none' groupKey returns empty so default date sort wins.
 * @iso       Reliability (HIGH — no throws; all paths return string)
 */
export function resolveGroupValue(voucher: Voucher, groupKey: RegisterGroupKey): string {
  switch (groupKey) {
    case 'none':
      return ''; // no grouping — empty string preserves date-only sort
    case 'party':
      // [Concrete] Fallback for GL vouchers / Journal without a party.
      return voucher.party_name?.trim() || 'zzz-no-party';
    case 'ledger':
      // [Analytical] GL registers — group by first ledger line's ledger_name.
      // Convention: ledger_lines[0] is the driving ledger for the voucher.
      return voucher.ledger_lines?.[0]?.ledger_name?.trim() || 'zzz-unknown-ledger';
    case 'status':
      return voucher.status ?? 'draft';
    case 'godown':
      // [Analytical] Inventory registers — use the first inventory line's godown.
      // If voucher spans multiple godowns, the primary (first) one governs grouping.
      return firstGodown(voucher.inventory_lines) || 'zzz-unknown-godown';
    case 'bank':
      // [Concrete] Top-level bank_name field (Receipt/Payment vouchers) per voucher.ts.
      return voucher.bank_name?.trim() || 'zzz-no-bank';
    default:
      // [Critical] Exhaustive switch — TypeScript would catch a new RegisterGroupKey added
      // in 2d-A that isn't handled here, at compile time.
      return '';
  }
}

function firstGodown(lines: VoucherInventoryLine[] | undefined): string {
  if (!lines || lines.length === 0) return '';
  return lines[0].godown_name?.trim() || '';
}
