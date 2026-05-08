/**
 * @file        bill-passing-qa-bridge.ts
 * @purpose     Bidirectional Bill Passing ↔ Qulicheak QA bridge.
 *              Outbound: notifyQaHandoff fires toast + recordActivity + deep-link
 *                        when a bill enters awaiting_qa or qa_failed.
 *              Inbound:  applyQaOutcome listens for QA finalization events and
 *                        patches qa_passed on the matching line + re-runs match.
 * @who         Procurement · Bill Passing · Qulicheak
 * @when        Sprint T-Phase-1.A.3.b-T1-Bill-Passing-Reports-Wiring · Block D
 * @sprint      T-Phase-1.A.3.b-T1-Bill-Passing-Reports-Wiring
 * @iso         25010 · Functional Suitability · Interoperability
 * @decisions   D-NEW-AJ (revised · bidirectional QA bridge · outbound + inbound) ·
 *              D-NEW-AL (T-fix · outbound handoff added · mount wired in Procure360Page)
 * @reuses      bill-passing-engine.runMatch · cross-card-activity-engine.recordActivity ·
 *              sonner.toast · localStorage canonical
 * @[JWT]       Outbound: client-only notification.
 *              Inbound:  CustomEvent('qa:inspection-finalized') · server bus replaces in production.
 */

import type { BillPassingRecord } from '@/types/bill-passing';
import { billPassingKey } from '@/types/bill-passing';
import { runMatch } from './bill-passing-engine';
import { recordActivity } from './cross-card-activity-engine';
import { toast } from 'sonner';

// ============================================================================
// Outbound · Bill Passing → Qulicheak (notify QC)
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
  const deepLink = `/erp/qulicheak#qc-entry?bill_id=${bill.id}`;

  // [JWT] POST /api/notifications · client-side toast in Phase 1
  toast.info(`Bill ${bill.bill_no} ${verb}`, {
    description: `Vendor: ${bill.vendor_name} · open in Qulicheak`,
    action: {
      label: 'Open Qulicheak',
      onClick: () => {
        window.location.href = deepLink;
      },
    },
  });

  recordActivity(entityCode, userId, {
    card_id: 'qulicheak',
    kind: 'voucher',
    ref_id: bill.id,
    title: `QC needed: ${bill.bill_no}`,
    subtitle: `Vendor: ${bill.vendor_name} · ${reason}`,
    deep_link: deepLink,
  });
}

// ============================================================================
// Inbound · Qulicheak → Bill Passing (QA outcome applied)
// ============================================================================

export interface QaInspectionFinalizedDetail {
  entityCode: string;
  bill_id: string;
  bill_line_id: string;
  passed: boolean;
  inspection_id: string;
  actor_user_id: string;
}

export const QA_FINALIZED_EVENT = 'qa:inspection-finalized';

/** Apply QA outcome to the matching bill line · returns the updated record (or null if not found). */
export async function applyQaOutcome(
  detail: QaInspectionFinalizedDetail,
): Promise<BillPassingRecord | null> {
  // [JWT] PATCH /api/bill-passing/{bill_id}/lines/{bill_line_id}/qa
  const raw = localStorage.getItem(billPassingKey(detail.entityCode));
  if (!raw) return null;
  let list: BillPassingRecord[];
  try { list = JSON.parse(raw) as BillPassingRecord[]; } catch { return null; }

  const idx = list.findIndex((b) => b.id === detail.bill_id);
  if (idx < 0) return null;

  const cur = list[idx];
  const lineIdx = cur.lines.findIndex((l) => l.id === detail.bill_line_id);
  if (lineIdx < 0) return null;

  const updatedLines = cur.lines.slice();
  updatedLines[lineIdx] = { ...updatedLines[lineIdx], qa_passed: detail.passed };

  const updated: BillPassingRecord = {
    ...cur,
    lines: updatedLines,
    qa_inspection_id: detail.inspection_id,
    updated_at: new Date().toISOString(),
  };
  list[idx] = updated;
  localStorage.setItem(billPassingKey(detail.entityCode), JSON.stringify(list));

  // Re-run match · transitions awaiting_qa → matched_clean / matched_with_variance / qa_failed
  return runMatch(detail.bill_id, detail.entityCode, detail.actor_user_id);
}

/** Mount global QA listener · returns unsubscribe fn. Safe in non-browser (returns no-op). */
export function mountQaBridge(): () => void {
  if (typeof window === 'undefined') return () => { /* noop */ };
  const handler = (ev: Event): void => {
    const ce = ev as CustomEvent<QaInspectionFinalizedDetail>;
    if (!ce.detail || typeof ce.detail !== 'object') return;
    void applyQaOutcome(ce.detail);
  };
  window.addEventListener(QA_FINALIZED_EVENT, handler);
  return () => window.removeEventListener(QA_FINALIZED_EVENT, handler);
}
