/**
 * sample-outward-memo.ts — Sample Outward Memo (D-192)
 * Salesman-initiated outbound sample to architect / prospect / quality-trial target.
 * Memo is the authorization. NO ServiceDesk hook (D-192 explicit).
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

  created_at: string;
  updated_at: string;
}

export const sampleOutwardMemosKey = (e: string) =>
  `erp_sample_outward_memos_${e}`;
