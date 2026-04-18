/**
 * credit-increase-request.ts — Distributor-side credit increase request
 * Sprint 11a. Razorpay Capital pattern: distributor asks, internal approves,
 * credit_limit on CustomerMaster updates on approval.
 */

export type CreditRequestStatus =
  | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'cancelled';

export type CreditRequestUrgency = 'normal' | 'festival' | 'emergency';

export interface CreditIncreaseRequest {
  id: string;
  entity_id: string;
  request_no: string;                 // CR/YYYY/0001
  request_date: string;
  distributor_id: string;
  customer_id: string;
  current_limit_paise: number;
  requested_limit_paise: number;
  requested_delta_paise: number;
  urgency: CreditRequestUrgency;
  justification: string;              // min 20 chars
  // Financial snapshot at request time
  current_outstanding_paise: number;
  current_overdue_paise: number;
  last_6m_purchase_paise: number;
  last_6m_payment_paise: number;
  avg_days_to_pay: number;
  // Workflow
  status: CreditRequestStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  approved_limit_paise: number | null; // may be less than requested
  rejection_reason: string | null;
  effective_until: string | null;     // for festival: temporary credit
  internal_remarks: string;
  created_at: string;
  updated_at: string;
}

export const creditRequestsKey = (e: string) =>
  `erp_credit_increase_requests_${e}`;

export const CREDIT_REQUEST_STATUS_COLOURS: Record<CreditRequestStatus, string> = {
  submitted: 'bg-blue-500/15 text-blue-700 border-blue-500/30',
  under_review: 'bg-amber-500/15 text-amber-700 border-amber-500/30',
  approved: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30',
  rejected: 'bg-destructive/15 text-destructive border-destructive/30',
  cancelled: 'bg-slate-500/15 text-slate-700 border-slate-500/30',
};

export const CREDIT_REQUEST_URGENCY_LABELS: Record<CreditRequestUrgency, string> = {
  normal: 'Normal',
  festival: 'Festival (Temporary)',
  emergency: 'Emergency',
};
