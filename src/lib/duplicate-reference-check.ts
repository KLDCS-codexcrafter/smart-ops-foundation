/**
 * @file     duplicate-reference-check.ts — Q7-b duplicate reference_no detector
 * @sprint   T-Phase-1.2.6d-hdr · CGST 36(4) ITC double-claim prevention
 *
 * For purchase-side (GRN, RTV): hard-block when (vendor_id, reference_no, FY) collides.
 * For sales-side (Quotation, IM): hard-block when (customer_id, reference_no, FY) collides.
 *
 * Override path: caller passes `overrideReason` (10+ chars) to bypass the block.
 * The override reason should be recorded by the caller in the saved record's
 * narration with a marker like `[Override: <reason>]`.
 *
 * [JWT] Phase 2 backend may move this logic server-side for stronger guarantees.
 */

import { fyForDate } from '@/lib/fy-helpers';

export type DuplicateRecordType = 'grn' | 'rtv' | 'quotation' | 'invoice_memo';

export interface DuplicateCheckParams {
  entityCode: string;
  recordType: DuplicateRecordType;
  partyId: string;
  referenceNo: string;
  recordDate: string;
  /** When editing an existing record · its own ID is excluded from the scan. */
  excludeRecordId?: string;
  /** When user has elected to override · 10+ chars satisfies the gate. */
  overrideReason?: string;
}

export interface DuplicateCheckResult {
  blocked: boolean;
  conflicting?: {
    record_id: string;
    record_no: string;
    record_date: string;
  };
  message?: string;
}

const STORAGE_KEYS: Record<DuplicateRecordType, (e: string) => string> = {
  grn:          e => `erp_grns_${e}`,
  rtv:          e => `erp_rtvs_${e}`,
  quotation:    e => `erp_quotations_${e}`,
  invoice_memo: e => `erp_invoice_memos_${e}`,
};

const PARTY_FIELDS: Record<DuplicateRecordType, string> = {
  grn:          'vendor_id',
  rtv:          'vendor_id',
  quotation:    'customer_id',
  invoice_memo: 'customer_id',
};

const NUM_FIELDS: Record<DuplicateRecordType, string> = {
  grn:          'grn_no',
  rtv:          'rtv_no',
  quotation:    'quotation_no',
  invoice_memo: 'memo_no',
};

const DATE_FIELDS: Record<DuplicateRecordType, string> = {
  grn:          'receipt_date',
  rtv:          'rtv_date',
  quotation:    'quotation_date',
  invoice_memo: 'memo_date',
};

export function checkDuplicateReference(
  params: DuplicateCheckParams,
): DuplicateCheckResult {
  if (!params.referenceNo || !params.partyId) return { blocked: false };
  if (params.overrideReason && params.overrideReason.trim().length >= 10) {
    return { blocked: false };
  }

  try {
    const keyFn = STORAGE_KEYS[params.recordType];
    if (!keyFn) return { blocked: false };
    const records: Array<Record<string, unknown>> = JSON.parse(
      localStorage.getItem(keyFn(params.entityCode)) ?? '[]',
    );
    const partyField = PARTY_FIELDS[params.recordType];
    const numField = NUM_FIELDS[params.recordType];
    const dateField = DATE_FIELDS[params.recordType];
    const targetFY = fyForDate(params.recordDate);

    const conflict = records.find(r =>
      r.id !== params.excludeRecordId
      && r[partyField] === params.partyId
      && r.reference_no === params.referenceNo
      && typeof r[dateField] === 'string'
      && fyForDate(r[dateField] as string) === targetFY
    );

    if (conflict) {
      return {
        blocked: true,
        conflicting: {
          record_id: String(conflict.id ?? ''),
          record_no: String(conflict[numField] ?? ''),
          record_date: String(conflict[dateField] ?? ''),
        },
        message: `Reference No "${params.referenceNo}" already used on ${String(conflict[numField] ?? '')} dated ${String(conflict[dateField] ?? '')}. Provide override reason (min 10 chars) to proceed.`,
      };
    }
  } catch {
    // Don't block on read errors
  }
  return { blocked: false };
}
