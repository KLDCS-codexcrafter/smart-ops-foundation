/**
 * @file     cancellation-audit-log.ts — Q3-d UPGRADED · cancellation forensic log
 * @sprint   T-Phase-2.7-c · Card #2.7 sub-sprint 3 of 5
 * @purpose  Append-only register of every cancel action across 12 transaction
 *           forms · feeds CancellationAuditRegister + CancellationDashboardWidget.
 *
 *  Storage: erp_cancellation_audit_log_${entityCode} — one entity bucket.
 *  [JWT] GET/POST /api/cancellation-audit-log?entityCode=:entityCode
 */

export type CancellationImpact =
  | 'draft-only'              // never posted · no GL/stock entries
  | 'posted-no-reversal'      // posted but no reversal needed (rare · e.g. stub voucher)
  | 'posted-gl-reversed'      // posted · GL reversed via cancelVoucher
  | 'posted-rcm-reversed'     // posted with RCM JV that also got reversed
  | 'posted-stock-reversed'   // inventory transaction · stock entries reversed
  | 'posted-multi-reversed';  // GL + stock + RCM all reversed

export interface CancellationAuditEntry {
  id: string;
  entity_id: string;

  voucher_id: string;
  voucher_no: string;
  voucher_date: string;
  voucher_type_id: string | null;
  voucher_type_name: string | null;
  /** 'GRN', 'MIN', 'CE', 'CC', 'RTV', 'Quotation', 'SRM', 'IM', 'SEC', 'SOM', 'DOM', 'DM' */
  base_voucher_type: string;

  party_id: string | null;
  party_name: string | null;

  cancelled_at: string;
  cancelled_by: string;
  cancelled_by_name: string;
  cancel_reason: string;

  impact: CancellationImpact;
  was_posted_before_cancel: boolean;
  had_rcm: boolean;
  had_irn: boolean;

  linked_rcm_jv_id: string | null;
  linked_rcm_jv_no: string | null;
  /** Voucher IDs of any auto-generated reversal entries. */
  linked_reversal_voucher_ids: string[];

  total_amount: number;
  total_tax_amount: number;

  severity: 'high' | 'med' | 'low';
  created_at: string;
}

export const cancellationAuditLogKey = (entityCode: string): string =>
  `erp_cancellation_audit_log_${entityCode}`;

/**
 * High = had IRN (GSTN-bound · forensic priority)
 * Medium = posted (RCM or otherwise)
 * Low = draft-only cancel
 */
export function inferCancellationSeverity(
  entry: Pick<CancellationAuditEntry, 'was_posted_before_cancel' | 'had_irn' | 'had_rcm'>,
): 'high' | 'med' | 'low' {
  if (entry.had_irn) return 'high';
  if (entry.was_posted_before_cancel) return 'med';
  return 'low';
}

/**
 * Convenience writer used by the 12 form persist flows. Silent · never throws ·
 * a write failure must NOT break the cancel flow.
 */
export interface CancellationWriteInput {
  entityCode: string;
  voucherId: string;
  voucherNo: string;
  voucherDate: string;
  voucherTypeId: string | null;
  voucherTypeName: string | null;
  baseVoucherType: string;
  partyId: string | null;
  partyName: string | null;
  cancelledBy: string;
  cancelledByName: string;
  cancelReason: string;
  wasPostedBeforeCancel: boolean;
  hadRcm: boolean;
  hadIrn: boolean;
  linkedRcmJvId: string | null;
  linkedRcmJvNo: string | null;
  totalAmount: number;
  totalTaxAmount: number;
}

export function writeCancellationAuditEntry(input: CancellationWriteInput): void {
  try {
    const severity = inferCancellationSeverity({
      was_posted_before_cancel: input.wasPostedBeforeCancel,
      had_irn: input.hadIrn,
      had_rcm: input.hadRcm,
    });
    const impact: CancellationImpact = !input.wasPostedBeforeCancel
      ? 'draft-only'
      : input.hadRcm && input.hadIrn
        ? 'posted-multi-reversed'
        : input.hadRcm
          ? 'posted-rcm-reversed'
          : input.baseVoucherType === 'GRN' || input.baseVoucherType === 'MIN' || input.baseVoucherType === 'CE' || input.baseVoucherType === 'CC' || input.baseVoucherType === 'RTV'
            ? 'posted-stock-reversed'
            : 'posted-gl-reversed';
    const entry: CancellationAuditEntry = {
      id: `cancel-${Date.now()}-${input.voucherId}`,
      entity_id: input.entityCode,
      voucher_id: input.voucherId,
      voucher_no: input.voucherNo,
      voucher_date: input.voucherDate,
      voucher_type_id: input.voucherTypeId,
      voucher_type_name: input.voucherTypeName,
      base_voucher_type: input.baseVoucherType,
      party_id: input.partyId,
      party_name: input.partyName,
      cancelled_at: new Date().toISOString(),
      cancelled_by: input.cancelledBy,
      cancelled_by_name: input.cancelledByName,
      cancel_reason: input.cancelReason,
      impact,
      was_posted_before_cancel: input.wasPostedBeforeCancel,
      had_rcm: input.hadRcm,
      had_irn: input.hadIrn,
      linked_rcm_jv_id: input.linkedRcmJvId,
      linked_rcm_jv_no: input.linkedRcmJvNo,
      linked_reversal_voucher_ids: [],
      total_amount: input.totalAmount,
      total_tax_amount: input.totalTaxAmount,
      severity,
      created_at: new Date().toISOString(),
    };
    // [JWT] POST /api/cancellation-audit-log?entityCode=:entityCode
    const raw = localStorage.getItem(cancellationAuditLogKey(input.entityCode));
    const log: CancellationAuditEntry[] = raw ? JSON.parse(raw) : [];
    log.push(entry);
    localStorage.setItem(cancellationAuditLogKey(input.entityCode), JSON.stringify(log));
  } catch { /* silent · don't break cancel flow */ }
}
