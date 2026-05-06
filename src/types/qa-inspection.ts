/**
 * @file        qa-inspection.ts
 * @sprint      T-Phase-1.2.6f-c-2 · Block D · per D-286 4-way upgrade gate
 * @extended    T-Phase-1.2.6f-d-2-card5-5-pre-1 · Block A · D-321/D-332/D-335
 *              ADD 9 nullable fields ADDITIVELY (matches D-291 precedent).
 *              Existing fields preserved bytes-identical.
 * @purpose     QA inspection types · 4-way Match upgrade for items requiring inspection
 */

export type QaInspectionStatus =
  | 'pending' | 'in_progress' | 'passed' | 'failed' | 'partial_pass' | 'cancelled';

// Sprint 5-pre-1 · Block A · D-333 · 4th value 'sample' (matches Tally Sample In voucher)
export type QaInspectionType = 'incoming' | 'in_process' | 'outgoing' | 'sample';

// Sprint 5-pre-1 · Block A · D-335 · external lab + customer-witnessed support
export type QaInspectionAuthority =
  | 'internal' | 'external_lab' | 'customer_witnessed' | 'vendor_self_certified';

export interface QaInspectionLine {
  id: string;
  bill_line_id: string;
  item_id: string;
  item_name: string;
  qty_inspected: number;
  qty_passed: number;
  qty_failed: number;
  failure_reason: string | null;
  inspection_parameters: Record<string, string>;
  // Sprint 5-pre-1 · Block A · D-332 · 5-field qty tracking (matches Tally VCHBatchQC*)
  qty_sample?: number | null;
  qty_pending?: number | null;
  // Sprint 5-pre-2 · Block A · D-338/D-341 · UoM + batch surface for closure resolver + CoA print
  uom?: string | null;
  batch_id?: string | null;
}

export interface QaInspectionRecord {
  id: string;
  qa_no: string;
  bill_id: string;
  bill_no: string;
  git_id: string | null;
  po_id: string;
  po_no: string;
  entity_id: string;
  branch_id: string | null;
  inspector_user_id: string;
  inspection_date: string;
  inspection_location: string;
  lines: QaInspectionLine[];
  status: QaInspectionStatus;
  notes: string;
  // Sprint 5-pre-2 · Block A · D-341 (Q4=a) · CoA on-demand reference (D-291 additive precedent)
  coa_url?: string | null;
  coa_generated_at?: string | null;
  // Sprint 5-pre-2 · Block A · D-338 (Q1=a) · closure journal trace · audit visibility
  closure_journal_ids?: string[] | null;
  // Sprint 5-pre-2 · Block A · D-340/D-341 · vendor + customer linkage + parameter results for scorecard + CoA
  vendor_id?: string | null;
  vendor_name?: string | null;
  customer_id?: string | null;
  customer_name?: string | null;
  parameter_results?: Record<string, string> | null;
  // Sprint 5-pre-2 · Block A · D-333 · inspection_type for rework cascade
  inspection_type?: 'incoming' | 'in_process' | 'outgoing' | 'sample' | null;
  parent_inspection_id?: string | null;
  created_at: string;
  updated_at: string;
  // Sprint 5-pre-1 · Block A · D-321 · plan + spec linkage (nullable additive)
  plan_id?: string | null;
  spec_id?: string | null;
  // Sprint 5-pre-1 · Block A · D-335 · external lab support (5 nullable fields)
  inspection_authority?: QaInspectionAuthority | null;
  external_lab_party_id?: string | null;
  external_lab_sample_sent_date?: string | null;
  external_lab_report_received_date?: string | null;
  external_lab_report_url?: string | null;
  // 🆕 D-615 · Card 3b 3b-pre-1 · Production transaction linkage (Q44=a · ADDITIVE)
  source_context?: 'incoming_vendor' | 'incoming_internal' | 'in_process' | 'outgoing' | null;
  production_order_id?: string | null;
  production_order_no?: string | null;
  production_confirmation_id?: string | null;
  material_issue_id?: string | null;
  job_card_id?: string | null;
  factory_id?: string | null;
  machine_id?: string | null;
  work_center_id?: string | null;
}

export const qaInspectionKey = (entityCode: string): string =>
  `erp_qa_inspections_${entityCode}`;
