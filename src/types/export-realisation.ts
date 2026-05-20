/**
 * @file        src/types/export-realisation.ts
 * @purpose     Export Realisation · 9th sibling · Moat #19 FEMA 270-day PRIMARY · Forex Triangulation
 * @sprint      T-Phase-1.EX-7c-ExportRealisation-eBRC-FEMA
 * @decisions   EX-7c-Q1=b sibling · Q3=a FEMA 5-state · Q6=a Forex 3-way · Q7=a Reval seed · Q8=a STPI
 */

export type FEMAState = 'safe' | 'attention' | 'warning' | 'critical' | 'overdue';

export const FEMA_DAY_BANDS: Record<FEMAState, { min: number; max: number; description: string }> = {
  safe: { min: 0, max: 180, description: '0-180 days · within standard FEMA window · normal monitoring' },
  attention: { min: 180, max: 225, description: '180-225 days · half-life crossed · operator should follow up with buyer' },
  warning: { min: 225, max: 260, description: '225-260 days · approaching 270-day deadline · escalate to finance' },
  critical: { min: 260, max: 270, description: '260-270 days · 10-day window before regulatory breach · file extension if needed' },
  overdue: { min: 270, max: 99999, description: '>270 days · FEMA breach · file with RBI · risk of penalty' },
};

export type RealisationEventType = 'advance_payment' | 'partial_payment' | 'balance_payment' | 'full_payment' | 'adjustment';

export type RealisationStatus = 'pending' | 'partially_realised' | 'fully_realised' | 'overdue' | 'written_off';

export const REALISATION_VALID_TRANSITIONS: Record<RealisationStatus, RealisationStatus[]> = {
  pending: ['partially_realised', 'fully_realised', 'overdue'],
  partially_realised: ['fully_realised', 'overdue'],
  fully_realised: [],
  overdue: ['partially_realised', 'fully_realised', 'written_off'],
  written_off: [],
};

export interface ForexTriangulation {
  booking_rate: number;
  booking_rate_at_date: string;
  selling_rate_at_pol: number;
  selling_rate_at_pol_date: string | null;
  realised_rate: number | null;
  realised_rate_date: string | null;
  variance_booking_to_pol_inr: number;
  variance_pol_to_realised_inr: number;
  variance_total_inr: number;
}

export interface RealisationReceipt {
  id: string;
  event_type: RealisationEventType;
  received_date: string;
  amount_foreign: number;
  amount_inr: number;
  realised_rate: number;
  related_firc_id: string | null;
  related_ebrc_id: string | null;
  bank_credit_ref: string;
  notes: string;
}

export interface ExportRealisation {
  id: string;
  realisation_no: string;
  entity_id: string;
  status: RealisationStatus;

  related_shipping_bill_id: string;
  related_shipping_bill_no: string;
  related_export_po_id: string;
  related_export_po_no: string;
  related_foreign_customer_id: string;
  related_ecgc_policy_id: string | null;

  goods_dispatched_date: string;
  fema_270_day_deadline: string;
  days_since_dispatch: number;
  fema_state: FEMAState;

  invoice_value_foreign: number;
  invoice_value_inr_at_dispatch: number;
  currency_code: string;

  total_realised_foreign: number;
  total_realised_inr: number;
  outstanding_foreign: number;
  outstanding_inr: number;
  realisation_pct: number;

  receipts: RealisationReceipt[];

  forex_triangulation: ForexTriangulation;

  month_end_reval_amount_inr: number;
  month_end_reval_variance_inr: number;
  month_end_reval_last_run: string | null;

  is_stpi_export: boolean;
  stpi_unit_id: string | null;
  stpi_softex_form_no: string | null;
  stpi_softex_filed_date: string | null;

  notes: string;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export const exportRealisationKey = (entityCode: string): string =>
  `erp_${entityCode}_export_realisations`;
