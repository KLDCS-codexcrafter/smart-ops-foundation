/**
 * @file src/types/fai.ts
 * @purpose FAI (First Article Inspection) data model · per-dimension pass/fail · approval workflow
 * @who Lovable on behalf of Operix Founder
 * @when 2026-05-09
 * @sprint T-Phase-1.A.5.b-QualiCheck-CAPA-MTC-FAI
 * @iso 25010 Maintainability + Reliability · ISO 9001:2015 Clause 8.5.1.1 (PPAP/FAI)
 * @whom Quality Inspector · QA Manager · Production Lead
 * @decisions D-NEW-BG (FAI engine NEW · per-dimension model · fail-dominant) ·
 *            D-NEW-BJ (3-arg userId-2nd signature)
 * @disciplines FR-22 · FR-30 (header who/when/sprint/decisions) · FR-50 · FR-51 · FR-23
 * @reuses types/party (consume only)
 * @[JWT] localStorage key pattern: erp_fai_${entityCode}
 */
export type FaiId = `FAI-${string}`;
export type FaiStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'archived';
export type FaiOverall = 'pass' | 'fail' | 'conditional';
export type FaiDimStatus = 'pass' | 'fail' | 'na';

export interface FaiDimension {
  name: string;            // e.g. "Outer Diameter"
  unit?: string | null;    // e.g. "mm"
  nominal?: number | null;
  tol_minus?: number | null;
  tol_plus?: number | null;
  observed: string;        // free-text (supports visual/qualitative)
  observed_numeric?: number | null;
  status: FaiDimStatus;
}

export type FaiAuditAction = 'create' | 'submit' | 'approve' | 'reject' | 'archive' | 'update';

export interface FaiAuditEntry {
  at: string;
  by: string;
  action: FaiAuditAction;
  note?: string;
}

export interface FirstArticleInspection {
  id: FaiId;
  entity_id: string;
  branch_id?: string | null;
  status: FaiStatus;
  overall: FaiOverall;
  part_no: string;
  part_name: string;
  drawing_no?: string | null;
  drawing_rev?: string | null;
  related_party_id?: string | null;
  supplier_name?: string | null;
  related_po_id?: string | null;
  related_production_order_id?: string | null;
  sample_qty?: number | null;
  inspection_date: string;             // ISO 8601
  dimensions: FaiDimension[];
  inspected_by: string;                // user_id
  inspected_at: string;                // ISO 8601
  approved_at?: string | null;
  approved_by?: string | null;
  notes?: string | null;
  audit_log: FaiAuditEntry[];
}

export const faiKey = (entityCode: string): string => `erp_fai_${entityCode}`;

export const FAI_STATUS_LABELS: Record<FaiStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  approved: 'Approved',
  rejected: 'Rejected',
  archived: 'Archived',
};

export const FAI_OVERALL_LABELS: Record<FaiOverall, string> = {
  pass: 'Pass',
  fail: 'Fail',
  conditional: 'Conditional',
};

export const FAI_DIM_STATUS_LABELS: Record<FaiDimStatus, string> = {
  pass: 'Pass',
  fail: 'Fail',
  na: 'N/A',
};
