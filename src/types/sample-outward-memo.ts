/**
 * sample-outward-memo.ts — Sample Outward Memo (D-192)
 * Salesman-initiated outbound sample to architect / prospect / quality-trial target.
 * Memo is the authorization. NO ServiceDesk hook (D-192 explicit).
 *
 * Sprint T-Phase-1.1.1p-v2 EXTENSIONS:
 *   - Full party fields filled by Dispatch on issue (customer · salesman ·
 *     agent · broker · engineer)
 *   - is_refundable flag · outward_godown linkage when refundable
 *   - issued_by_dispatch two-step flow (SalesX raises → Dispatch issues)
 *   - unit_value / total_value for non-refundable expense booking (Phase 2)
 *
 * [JWT] GET/POST/PATCH /api/salesx/sample-outward-memos
 */

export type SOMStatus = 'draft' | 'dispatched' | 'returned' | 'completed';

export type SOMPurpose =
  | 'architect_trial'
  | 'prospect_eval'
  | 'quality_check'
  | 'trade_show'
  | 'other';

export const SOM_PURPOSE_LABELS: Record<SOMPurpose, string> = {
  architect_trial: 'Architect Trial',
  prospect_eval:   'Prospect Evaluation',
  quality_check:   'Quality Check',
  trade_show:      'Trade Show',
  other:           'Other',
};

export const SOM_STATUS_LABELS: Record<SOMStatus, string> = {
  draft:      'Draft',
  dispatched: 'Dispatched',
  returned:   'Returned',
  completed:  'Completed',
};

export interface SampleOutwardMemoItem {
  id: string;
  item_name: string;
  description: string | null;
  qty: number;
  uom: string | null;
  /** Sprint T-Phase-1.1.1p-v2 — value per unit (for expense / consumption tracking). */
  unit_value: number;
  /** Sprint T-Phase-1.1.1p-v2 — qty * unit_value. */
  amount: number;
}

export interface SampleOutwardMemo {
  id: string;
  entity_id: string;
  memo_no: string;                  // SOM/YY-YY/NNNN
  memo_date: string;

  raised_by_person_id: string;
  raised_by_person_name: string;
  raised_by_person_type: string;

  // Free-text recipient (NOT customer master required)
  recipient_name: string;
  recipient_company: string | null;
  recipient_phone: string | null;
  recipient_address: string | null;

  purpose: SOMPurpose;
  purpose_note: string | null;

  items: SampleOutwardMemoItem[];

  expect_return: boolean;
  return_due_date: string | null;
  returned_at: string | null;

  attachments: string[];

  status: SOMStatus;
  dispatched_at: string | null;
  completed_at: string | null;

  // ── Sprint T-Phase-1.1.1p-v2 · Full party fields (Dispatch fills these on issue) ──
  customer_id: string | null;
  customer_name: string | null;

  salesman_id: string | null;
  salesman_name: string | null;
  agent_id: string | null;          // agent SAM person
  agent_name: string | null;
  broker_id: string | null;         // broker SAM person
  broker_name: string | null;

  engineer_emp_id: string | null;   // employee master FK (Phase 2 wiring)
  engineer_name: string | null;     // free text fallback

  // Refundable tracking
  is_refundable: boolean;           // true = must return · false = consumed (expensed)

  // Godown linkage (when is_refundable = true)
  outward_godown_id: string | null;
  outward_godown_name: string | null;

  // Dispatch issue step
  issued_by_dispatch: boolean;      // false until Dispatch issues it
  dispatch_issued_at: string | null;
  dispatch_issued_by: string | null;

  // Aggregate value (for non-refundable expense booking · Phase 2)
  unit_value: number;
  total_value: number;

  created_at: string;
  updated_at: string;
}

export const sampleOutwardMemosKey = (e: string) =>
  `erp_sample_outward_memos_${e}`;
