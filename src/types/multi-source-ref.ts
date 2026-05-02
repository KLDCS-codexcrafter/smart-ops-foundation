/**
 * @file     multi-source-ref.ts — Multi-source reference type for non-FineCore transactions
 * @sprint   T-Phase-1.2.6e-tally-1 · Q2-c · purely additive (don't break existing single refs)
 * @purpose  Tally-Prime parity: 1 GRN against multiple POs · 1 IM against multiple DMs · etc.
 *
 *   Re-exports the FineCore BillReference shape so non-FineCore transactions
 *   carry the same structure (auditor consistency · cross-card reports work).
 *
 *   D-128 SIBLING DISCIPLINE: we IMPORT the type · do NOT modify voucher.ts.
 */

import type { BillReference } from '@/types/voucher';

/** Re-export under domain-friendly name · same shape as FineCore's. */
export type MultiSourceRef = BillReference;

/** Helper: is this transaction multi-source? */
export function hasMultipleSources(refs: MultiSourceRef[] | undefined | null): boolean {
  return Array.isArray(refs) && refs.length > 1;
}

/** Helper: total amount across all source refs. */
export function totalSourceAmount(refs: MultiSourceRef[] | undefined | null): number {
  if (!Array.isArray(refs) || refs.length === 0) return 0;
  return refs.reduce((s, r) => s + (r.amount ?? 0), 0);
}

/** Helper: read EITHER multi_source_refs (preferred) OR fall back to single legacy ref.
 *  Universal accessor for registers/reports to display sources. */
export function resolveSources(record: Record<string, unknown>): MultiSourceRef[] {
  const multi = record.multi_source_refs;
  if (Array.isArray(multi) && multi.length > 0) return multi as MultiSourceRef[];

  // Legacy single-ref fallback patterns by transaction shape
  const legacyPatterns: Array<[string, string, string]> = [
    ['po_id', 'po_no', 'po_date'],
    ['enquiry_id', 'enquiry_no', 'enquiry_date'],
    ['sales_order_id', 'sales_order_no', 'sales_order_date'],
    ['delivery_memo_id', 'delivery_memo_no', 'delivery_memo_date'],
    ['supply_request_memo_id', 'supply_request_memo_no', 'supply_request_memo_date'],
    ['source_grn_id', 'source_grn_no', 'source_grn_date'],
  ];
  for (const [idField, noField, dateField] of legacyPatterns) {
    const id = record[idField];
    const no = record[noField];
    if (typeof id === 'string' && id && typeof no === 'string' && no) {
      return [{
        voucher_id: id,
        voucher_no: no,
        voucher_date: typeof record[dateField] === 'string' ? (record[dateField] as string) : '',
        amount: 0,
        type: 'against_ref',
      }];
    }
  }
  return [];
}
