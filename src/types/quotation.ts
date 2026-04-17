/**
 * quotation.ts — Sales Quotation with revision history
 * Based on Charis TDL UDF 4955-4975
 * [JWT] GET/POST/PUT/DELETE /api/salesx/quotations
 */

export type QuotationType = 'original' | 'revised';
export type QuotationStage =
  | 'draft' | 'on_hold' | 'negotiation'
  | 'confirmed' | 'lost' | 'cancelled';

export interface QuotationItem {
  id: string;
  item_name: string;
  description: string | null;
  qty: number;
  uom: string | null;
  rate: number;
  discount_pct: number;
  sub_total: number;
  tax_pct: number;
  tax_amount: number;
  amount: number;
}

// Snapshot of items at time of revision — never mutated after creation
export interface QuotationRevision {
  id: string;
  revision_no: string;
  revision_date: string;
  reason: string | null;
  changed_by: string;
  snapshot_items: QuotationItem[];
  total_at_revision: number;
}

export interface Quotation {
  id: string;
  entity_id: string;
  quotation_no: string;
  quotation_date: string;
  quotation_type: QuotationType;
  quotation_stage: QuotationStage;
  enquiry_id: string | null;
  enquiry_no: string | null;
  customer_id: string | null;
  customer_name: string | null;
  valid_until_days: number;
  valid_until_date: string | null;
  // Revision tracking
  original_quotation_no: string | null;
  last_quotation_no: string | null;
  last_quotation_date: string | null;
  revision_number: number;
  revision_history: QuotationRevision[];
  items: QuotationItem[];
  sub_total: number;
  tax_amount: number;
  total_amount: number;
  notes: string | null;
  terms_conditions: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const quotationsKey = (e: string) => `erp_quotations_${e}`;
