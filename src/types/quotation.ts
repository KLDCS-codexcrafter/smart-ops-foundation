/**
 * quotation.ts — Sales Quotation with revision history
 * Based on Charis TDL UDF 4955-4975
 * [JWT] GET/POST/PUT/DELETE /api/salesx/quotations
 */

export type QuotationType = 'original' | 'revised';
export type QuotationStage =
  | 'draft' | 'on_hold' | 'negotiation'
  | 'confirmed' | 'proforma' | 'sales_order'   // Sprint 1.1.1k-followup — SO conversion stage
  | 'lost' | 'cancelled';

export const QUOTATION_STAGE_LABELS: Record<QuotationStage, string> = {
  draft: 'Draft',
  on_hold: 'On Hold',
  negotiation: 'Negotiation',
  confirmed: 'Confirmed',
  proforma: 'Proforma Issued',
  sales_order: 'SO Issued',
  lost: 'Lost',
  cancelled: 'Cancelled',
};

export const QUOTATION_STAGE_COLOURS: Record<QuotationStage, string> = {
  draft: 'bg-muted text-muted-foreground border-border',
  on_hold: 'bg-yellow-500/15 text-yellow-700 border-yellow-500/30',
  negotiation: 'bg-blue-500/15 text-blue-700 border-blue-500/30',
  confirmed: 'bg-green-500/15 text-green-700 border-green-500/30',
  proforma: 'bg-teal-500/15 text-teal-700 border-teal-500/30',
  sales_order: 'bg-purple-500/15 text-purple-700 border-purple-500/30',
  lost: 'bg-destructive/15 text-destructive border-destructive/30',
  cancelled: 'bg-muted text-muted-foreground border-border',
};

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

  // Sprint 6B — Proforma conversion
  proforma_no: string | null;              // PF/YY-YY/NNNN
  proforma_date: string | null;
  proforma_converted_at: string | null;

  // Sprint 1.1.1k-followup — Sales Order conversion
  so_id: string | null;                    // Order.id once converted
  so_no: string | null;                    // SO/YY-YY/NNNN
  so_converted_at: string | null;

  // Sprint T-Phase-1.1.1a — ProjX hookpoint stub (D-171 dual-phase)
  // Phase 1.1.2 ProjX page wires this real. Existing localStorage records
  // without this field are read with `q.project_id ?? null` fallback.
  project_id: string | null;

  is_active: boolean;
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
  /** Tally-Prime voucher type identity (Q1-b · 1.2.6e-tally-1) · UI dropdown in 2.7-b. */
  voucher_type_id?: string | null;
  voucher_type_name?: string | null;
  /** Tally-Prime multi-source linking (Q2-c · 1.2.6e-tally-1).
   *  Existing single-ref fields stay populated as the "primary" source · this array
   *  captures additional sources when operator clicks "Add another source." */
  multi_source_refs?: import('./multi-source-ref').MultiSourceRef[] | null;
  created_at: string;
  updated_at: string;
}

export const quotationsKey = (e: string) => `erp_quotations_${e}`;
