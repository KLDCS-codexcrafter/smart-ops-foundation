/**
 * demo-outward-memo.ts — Demo Outward Memo (D-193)
 * Salesman-initiated outbound full demo unit to a prospect for evaluation.
 * Mandatory return tracking. ServiceDesk hook is Phase 1.5.5d (Phase 1 = stub).
 * [JWT] GET/POST/PATCH /api/salesx/demo-outward-memos
 */

export type DOMStatus =
  | 'draft'
  | 'dispatched'
  | 'demo_active'
  | 'returned'
  | 'overdue'
  | 'converted'
  | 'lost';

export const DOM_STATUS_LABELS: Record<DOMStatus, string> = {
  draft:       'Draft',
  dispatched:  'Dispatched',
  demo_active: 'Demo Active',
  returned:    'Returned',
  overdue:     'Overdue',
  converted:   'Converted',
  lost:        'Lost',
};

export type DOMReturnCondition = 'good' | 'damaged' | 'partial';

export const DOM_RETURN_CONDITION_LABELS: Record<DOMReturnCondition, string> = {
  good:    'Good',
  damaged: 'Damaged',
  partial: 'Partial',
};

export type DOMPeriodDays = 14 | 30 | 60 | 90;

export interface DemoOutwardMemoItem {
  id: string;
  item_name: string;
  description: string | null;
  qty: number;
  uom: string | null;
  serial_no: string | null;
}

export interface DemoOutwardMemo {
  id: string;
  entity_id: string;
  memo_no: string;                  // DOM/YY-YY/NNNN
  memo_date: string;

  raised_by_person_id: string;
  raised_by_person_name: string;
  raised_by_person_type: string;

  recipient_name: string;
  recipient_company: string | null;
  recipient_phone: string | null;
  recipient_address: string | null;

  items: DemoOutwardMemoItem[];

  demo_period_days: DOMPeriodDays;
  demo_start_date: string | null;
  demo_end_date: string | null;

  return_condition: DOMReturnCondition | null;
  returned_at: string | null;

  // Conversion outcome
  converted_so_no: string | null;
  converted_at: string | null;
  lost_reason: string | null;

  // ServiceDesk linkage — Phase 1.5.5d stub
  // [JWT] Phase 1.5.5d stub — service_desk_ticket_id remains null until then.
  service_desk_ticket_id: string | null;

  attachments: string[];

  status: DOMStatus;
  dispatched_at: string | null;

  created_at: string;
  updated_at: string;
}

export const demoOutwardMemosKey = (e: string) =>
  `erp_demo_outward_memos_${e}`;
