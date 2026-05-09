/**
 * @file src/types/mtc.ts
 * @purpose MTC (Material Test Certificate) data model · IQC-side certificate of conformance for incoming material lots
 * @who Lovable on behalf of Operix Founder
 * @when 2026-05-09
 * @sprint T-Phase-1.A.5.b-Qulicheak-CAPA-MTC-FAI
 * @iso 25010 Maintainability + Reliability + Auditability · ISO 9001:2015 Clause 8.4.2
 * @whom Quality Inspector · QA Manager · Vendor Manager
 * @decisions D-NEW-BF (MTC engine NEW · two-engine pattern · IQC-attached) ·
 *            D-NEW-BJ (3-arg userId-2nd signature alignment with α-a-bis ncr-engine)
 * @disciplines FR-22 · FR-30 · FR-50 (entity_id) · FR-51 (branch_id) · FR-23 (localStorage prefix)
 * @reuses types/party (consume only)
 * @[JWT] localStorage key pattern: erp_mtc_${entityCode}
 */
import type { Party } from './party';

export type MtcId = `MTC-${string}`;
export type MtcStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'archived';
export type MtcOverall = 'pass' | 'fail' | 'conditional';
export type MtcParamStatus = 'pass' | 'fail' | 'na';

export interface MtcParameter {
  name: string;
  unit?: string | null;
  spec_min?: number | null;
  spec_max?: number | null;
  observed: string;          // free-text · supports non-numeric (e.g. "passed visual")
  observed_numeric?: number | null;
  status: MtcParamStatus;
}

export type MtcAuditAction = 'create' | 'submit' | 'approve' | 'reject' | 'archive' | 'update';

export interface MtcAuditEntry {
  at: string;
  by: string;
  action: MtcAuditAction;
  note?: string;
}

export interface MaterialTestCertificate {
  id: MtcId;
  entity_id: string;
  branch_id?: string | null;
  status: MtcStatus;
  overall: MtcOverall;
  certificate_no: string;
  issue_date: string;                 // ISO 8601 · vendor-issued
  supplier_name: string;
  related_party_id?: Party['id'] | null;
  related_grn_id?: string | null;
  item_id?: string | null;
  item_name?: string | null;
  lot_no?: string | null;
  heat_no?: string | null;
  parameters: MtcParameter[];
  uploaded_at: string;                // ISO 8601
  uploaded_by: string;                // user_id
  approved_at?: string | null;
  approved_by?: string | null;
  notes?: string | null;
  audit_log: MtcAuditEntry[];
}

export const mtcKey = (entityCode: string): string => `erp_mtc_${entityCode}`;

export const MTC_STATUS_LABELS: Record<MtcStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  approved: 'Approved',
  rejected: 'Rejected',
  archived: 'Archived',
};

export const MTC_OVERALL_LABELS: Record<MtcOverall, string> = {
  pass: 'Pass',
  fail: 'Fail',
  conditional: 'Conditional',
};

export const MTC_PARAM_STATUS_LABELS: Record<MtcParamStatus, string> = {
  pass: 'Pass',
  fail: 'Fail',
  na: 'N/A',
};
