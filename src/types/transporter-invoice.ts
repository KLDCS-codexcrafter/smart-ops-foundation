/**
 * transporter-invoice.ts — Transporter invoice inbox
 * Sprint 15c-1. Invoices come via CSV/Excel upload or manual entry.
 * Each invoice has N lines, each line references an LR number.
 * [JWT] GET/POST /api/dispatch/transporter-invoices
 */

export type InvoiceStatus =
  | 'uploaded'
  | 'reconciling'
  | 'reconciled'
  | 'approved'
  | 'partial_approved'
  | 'disputed'
  | 'paid'
  | 'void';

export type WorkflowMode =
  | 'flag_only'
  | 'auto_approve'
  | 'dispute_ticket';

export type PayerModel =
  | 'manufacturer'
  | 'buyer'
  | 'third_party'
  | 'pass_through';

export interface TransporterInvoiceLine {
  id: string;
  invoice_id: string;
  line_no: number;
  lr_no: string;
  lr_date: string | null;
  dln_voucher_id?: string | null;
  dln_voucher_no?: string | null;
  transporter_declared_weight_kg: number;
  transporter_declared_rate: number;
  transporter_declared_amount: number;
  fuel_surcharge: number;
  fov: number;
  statistical: number;
  cod: number;
  demurrage: number;
  oda: number;
  gst_amount: number;
  total: number;
  notes?: string;
}

export interface TransporterInvoice {
  id: string;
  entity_id: string;
  invoice_no: string;
  invoice_date: string;
  logistic_id: string;
  logistic_name: string;
  period_from: string;
  period_to: string;
  lines: TransporterInvoiceLine[];
  total_declared: number;
  total_gst: number;
  grand_total: number;

  workflow_mode: WorkflowMode;
  tolerance_pct?: number | null;
  tolerance_amount?: number | null;

  status: InvoiceStatus;
  uploaded_at: string;
  uploaded_by: string;
  upload_source: 'csv' | 'xlsx' | 'manual' | 'portal';
  original_filename?: string;

  reconciled_at?: string | null;
  reconciled_by?: string | null;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export const transporterInvoicesKey = (e: string) => `erp_transporter_invoices_${e}`;

/** Column mapping remembered per transporter for future uploads. */
export interface InvoiceColumnMapping {
  id: string;
  logistic_id: string;
  mapping: Record<string, string>;
  sample_filename?: string;
  saved_at: string;
}
export const invoiceColumnMappingsKey = (e: string) => `erp_invoice_col_mappings_${e}`;

/** Column whitelist — the fields we can map into. */
export const MAPPABLE_FIELDS = [
  'lr_no', 'lr_date',
  'transporter_declared_weight_kg',
  'transporter_declared_rate',
  'transporter_declared_amount',
  'fuel_surcharge', 'fov', 'statistical', 'cod', 'demurrage', 'oda',
  'gst_amount', 'total', 'notes',
] as const;
export type MappableField = typeof MAPPABLE_FIELDS[number];
