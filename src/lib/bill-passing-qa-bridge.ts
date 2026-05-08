/**
 * @file        bill-passing-qa-bridge.ts
 * @purpose     Cross-card QA bridge · listens for QA inspection outcomes (qa-card)
 *              and updates 4-way Bill Passing line `qa_passed` flag · re-runs match.
 * @who         Bill Passing · QA Card integration
 * @when        Sprint T-Phase-1.A.3.b-Procure360-Bill-Passing-Integration · Block F
 * @sprint      T-Phase-1.A.3.b-Procure360-Bill-Passing-Integration
 * @iso         25010 · Functional Suitability · Interoperability
 * @decisions   D-NEW-AJ (QA cross-card bridge · CustomEvent decoupled · reuses runMatch)
 * @reuses      bill-passing-engine.runMatch · @/types/bill-passing · localStorage canonical
 * @[JWT]       Subscribes to in-process CustomEvent('qa:inspection-finalized') · server bus replaces in production
 */

import type { BillPassingRecord } from '@/types/bill-passing';
import { billPassingKey } from '@/types/bill-passing';
import { runMatch } from './bill-passing-engine';

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
