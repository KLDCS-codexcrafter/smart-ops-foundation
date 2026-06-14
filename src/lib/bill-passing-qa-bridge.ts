/**
 * @file        bill-passing-qa-bridge.ts
 * @purpose     Outbound Bill Passing → QualiCheck handoff notification.
 *              notifyQaHandoff fires toast + recordActivity + deep-link
 *              when a bill enters awaiting_qa or qa_failed.
 *              (Inbound QA outcome application is now handled exclusively via
 *              the LIVE `qa.outcome.applied` channel in qualicheck-bridges.ts →
 *              procure360-vendor-scoring-listener.ts, which carries the
 *              quality_score_delta. The legacy `qa:inspection-finalized`
 *              listener was removed at CL-FINAL · Class-C as dead code · 0 dispatchers.)
 * @who         Procurement · Bill Passing · QualiCheck
 * @when        Sprint T-Phase-1.A.3.b-T1-Bill-Passing-Reports-Wiring · Block D
 * @sprint      T-Phase-1.A.3.b-T1-Bill-Passing-Reports-Wiring
 * @iso         25010 · Functional Suitability · Interoperability
 * @decisions   D-NEW-AJ (revised · outbound QA handoff · inbound superseded by qa.outcome.applied) ·
 *              D-NEW-AL (T-fix · outbound handoff added · mount wired in Procure360Page) ·
 *              CL-FINAL Class-C (dead inbound listener removed · live path = qa.outcome.applied)
 * @reuses      cross-card-activity-engine.recordActivity · sonner.toast
 * @[JWT]       Outbound: client-only notification.
 */

// P8.7: dept_id present in payload type · no honest source at this bridge · populated at Wave-2 (auth-derived)
import type { BillPassingRecord } from '@/types/bill-passing';
import { recordActivity } from './cross-card-activity-engine';
import { toast } from 'sonner';

// ============================================================================
// Outbound · Bill Passing → QualiCheck (notify QC)
// ============================================================================

/**
 * Fire a cross-card handoff when a bill needs QC inspection or has failed QC.
 * Surfaces a sonner toast with deep-link and records cross-card activity.
 */
export function notifyQaHandoff(
  bill: BillPassingRecord,
  entityCode: string,
  userId: string,
  reason: 'awaiting_qa' | 'qa_failed',
): void {
  const verb = reason === 'awaiting_qa'
    ? 'awaiting QC inspection'
    : 'QC inspection FAILED';
  const deepLink = `/erp/qualicheck#qc-entry?bill_id=${bill.id}`;

  // [JWT] POST /api/notifications · client-side toast in Phase 1
  toast.info(`Bill ${bill.bill_no} ${verb}`, {
    description: `Vendor: ${bill.vendor_name} · open in QualiCheck`,
    action: {
      label: 'Open QualiCheck',
      onClick: () => {
        window.location.href = deepLink;
      },
    },
  });

  recordActivity(entityCode, userId, {
    card_id: 'qualicheck',
    kind: 'voucher',
    ref_id: bill.id,
    title: `QC needed: ${bill.bill_no}`,
    subtitle: `Vendor: ${bill.vendor_name} · ${reason}`,
    deep_link: deepLink,
  });
}
