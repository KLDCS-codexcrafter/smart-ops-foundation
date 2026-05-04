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
}

export const qaInspectionKey = (entityCode: string): string =>
  `erp_qa_inspections_${entityCode}`;
