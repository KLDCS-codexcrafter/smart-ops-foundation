/**
 * @file     irn-lock-engine.ts — Q2-d · GSTN IRN 24h lock enforcement (OOB-15)
 * @sprint   T-Phase-2.7-c · Card #2.7 sub-sprint 3 of 5
 * @purpose  Pure functions over a record snapshot (subset of Voucher/InvoiceMemo).
 *           D-127 + D-128 preserved · NO writes to voucher schema.
 *
 *  GSTN rule: once an IRN is generated against an invoice, the invoice cannot
 *  be edited. It MAY be cancelled within 24 hours · past 24h, only a Credit
 *  Note can reverse it. We enforce engine-side at postVoucher; D-127 voucher
 *  .tsx files catch the throw via existing error UI.
 */

export type IRNStatus = 'pending' | 'generated' | 'cancelled' | 'failed' | undefined;

export interface IRNLockResult {
  is_locked: boolean;
  reason: string | null;
  can_cancel: boolean;
  /** -1 if no IRN generated yet · 0 once 24h has elapsed. */
  cancel_window_remaining_hours: number;
  irn: string | null;
  irn_generated_at: string | null;
}

interface IRNRecordShape {
  irn?: string | null;
  irn_status?: IRNStatus;
  irn_ack_date?: string | null;
  posted_at?: string | null;
}

const WINDOW_HOURS = 24;

function elapsedHoursSince(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  return (Date.now() - t) / (1000 * 60 * 60);
}

/**
 * Compute the IRN lock state for a record. Pure · safe to call on partial records.
 */
export function computeIRNLockState(record: IRNRecordShape): IRNLockResult {
  const irn = record.irn ?? null;
  const status: IRNStatus = record.irn_status;

  if (!irn || status !== 'generated') {
    return {
      is_locked: false,
      reason: null,
      can_cancel: true,
      cancel_window_remaining_hours: -1,
      irn: irn,
      irn_generated_at: null,
    };
  }

  const generatedAt = record.irn_ack_date ?? record.posted_at ?? null;
  const elapsed = elapsedHoursSince(generatedAt);
  const remaining = elapsed === null
    ? WINDOW_HOURS                          // no timestamp · assume fresh window
    : Math.max(0, WINDOW_HOURS - elapsed);
  const canCancel = remaining > 0;

  return {
    is_locked: true,
    reason: canCancel
      ? `IRN ${irn} generated · ${remaining.toFixed(1)}h remaining for cancellation`
      : `IRN ${irn} generated · 24h cancellation window expired · issue Credit Note`,
    can_cancel: canCancel,
    cancel_window_remaining_hours: remaining,
    irn,
    irn_generated_at: generatedAt,
  };
}

interface BeforeShape extends IRNRecordShape {
  status?: string;
}
interface AfterShape {
  status?: string;
}

/**
 * Decide whether to reject a save based on the lock state and the next status.
 * - Allow cancellation within the 24h window.
 * - Block any edit (status change other than cancel, or stay-same edit) when locked.
 * - Block cancellation past the 24h window — must use Credit Note.
 */
export function rejectSaveDueToIRNLock(
  before: BeforeShape,
  after: AfterShape,
): { reject: boolean; message: string | null } {
  const lock = computeIRNLockState(before);
  if (!lock.is_locked) return { reject: false, message: null };

  const nextStatus = after.status ?? '';
  const isCancelTransition = nextStatus === 'cancelled';

  if (isCancelTransition) {
    if (lock.can_cancel) {
      return { reject: false, message: null };
    }
    return {
      reject: true,
      message: 'IRN cancellation window expired (24h elapsed) · issue Credit Note instead',
    };
  }

  // Any other edit while locked is rejected.
  const remainingTxt = lock.can_cancel
    ? `${lock.cancel_window_remaining_hours.toFixed(1)}h remaining for cancellation`
    : 'cancellation window expired';
  return {
    reject: true,
    message: `Cannot edit · IRN ${lock.irn} is generated. ${remainingTxt}.`,
  };
}
