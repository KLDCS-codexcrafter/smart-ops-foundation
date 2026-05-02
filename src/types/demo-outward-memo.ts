/**
 * demo-outward-memo.ts — Demo Outward Memo (D-193)
 * Salesman-initiated outbound full demo unit to a prospect for evaluation.
 * Mandatory return tracking. ServiceDesk hook is Phase 1.5.5d (Phase 1 = stub).
 *
 * Sprint T-Phase-1.1.1p-v2 EXTENSIONS:
 *   - Full party fields filled by Dispatch on issue
 *   - outward_godown linkage (always refundable by nature)
 *   - issued_by_dispatch two-step flow
 *   - unit_value / amount per item
 *
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
  /** Sprint T-Phase-1.1.1p-v2 — value per unit. */
  unit_value: number;
  /** Sprint T-Phase-1.1.1p-v2 — qty * unit_value. */
  amount: number;
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

  // ── Sprint T-Phase-1.1.1p-v2 · Full party fields (Dispatch fills on issue) ──
  customer_id: string | null;
  customer_name: string | null;
  salesman_id: string | null;
  salesman_name: string | null;
  agent_id: string | null;
  agent_name: string | null;
  broker_id: string | null;
  broker_name: string | null;
  engineer_emp_id: string | null;
  engineer_name: string | null;

  // Demo units are always refundable by nature (mandatory return)
  // but track the outward godown for stock purposes.
  outward_godown_id: string | null;
  outward_godown_name: string | null;

  // Dispatch issue step
  issued_by_dispatch: boolean;
  dispatch_issued_at: string | null;
  dispatch_issued_by: string | null;

  // Sprint T-Phase-1.1.1q · Phase 2 hookpoint — flips true when a demo unit is
  // marked lost/converted (instead of returned), triggering Marketing Expense voucher.
  pending_expense_voucher: boolean;

  /** D-226 UTS · accounting effective date; falls back to primary date when null. */
  effective_date?: string | null;
  /** D-228 Universal Transaction Header (UTH) — all optional · backward compat preserved */
  narration?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
  posted_at?: string | null;
  cancelled_at?: string | null;
  cancel_reason?: string | null;
  reference_no?: string | null;
  voucher_hash?: string | null;
  currency_code?: string | null;
  exchange_rate?: number | null;
  created_at: string;
  updated_at: string;
}

export const demoOutwardMemosKey = (e: string) =>
  `erp_demo_outward_memos_${e}`;
