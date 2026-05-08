/**
 * @file src/types/ncr.ts
 * @purpose NCR (Non-Conformance Report) data model · consumes qa-plan + qa-spec
 * @who Lovable on behalf of Operix Founder
 * @when 2026-05-08
 * @sprint T-Phase-1.A.5.a-bis-Qulicheak-NCR-Foundation
 * @iso 25010 Maintainability + Reliability + Auditability
 * @whom Quality Inspector · QA Manager · Vendor Manager
 * @decisions D-NEW-AV (NCR data model · two-engine pattern per Q-LOCK-4(a))
 * @disciplines FR-22 (Type Discipline) · FR-30 (Standard File Header) ·
 *              FR-50 (Multi-Entity 6-point · entity_id field) ·
 *              FR-51 (Multi-Branch · branch_id captured) ·
 *              FR-23 (D-194 Phase 1/2 · localStorage with entityCode prefix)
 * @reuses qa-plan-engine.ts (zero-touch · SD-21 · 4 streak) · qa-spec-engine.ts (zero-touch)
 * @[JWT] localStorage key pattern: erp_ncr_${entityCode}
 */
import type { Party } from './party';

export type NcrId = `NCR-${string}`;
export type NcrStatus = 'open' | 'investigating' | 'capa_pending' | 'closed' | 'cancelled';
export type NcrSeverity = 'minor' | 'major' | 'critical';
export type NcrSource =
  | 'iqc' | 'inprocess' | 'fg' | 'customer_complaint' | 'audit' | 'procure360_match';
export type NcrOutcome = 'rework' | 'reject' | 'concession_use' | 'return_to_vendor';

export interface NcrAuditEntry {
  at: string;        // ISO 8601
  by: string;        // user_id
  action: 'raise' | 'investigate' | 'capa_assign' | 'close' | 'cancel';
  note?: string;
}

export interface NonConformanceReport {
  id: NcrId;
  entity_id: string;                       // FR-24 multi-entity 6-point
  branch_id?: string | null;               // FR-51 multi-branch
  source: NcrSource;
  severity: NcrSeverity;
  status: NcrStatus;
  raised_at: string;                       // ISO 8601
  raised_by: string;                       // user_id
  related_qa_plan_id?: string | null;      // consume-only · zero-touch qa-plan-engine
  related_qa_spec_id?: string | null;      // consume-only · zero-touch qa-spec-engine
  related_voucher_id?: string | null;      // GRN · ProductionConfirmation · etc.
  related_voucher_kind?: 'grn' | 'production_confirmation' | 'sales_invoice' | null;
  related_party_id?: Party['id'] | null;   // vendor for IQC · customer for complaints
  related_party_name?: string | null;
  item_id?: string | null;
  item_name?: string | null;
  qty_affected?: number | null;
  description: string;
  immediate_action?: string | null;
  capa_id?: string | null;                 // forward-link slot · CAPA built in α-b
  closed_at?: string | null;
  closed_by?: string | null;
  outcome?: NcrOutcome | null;
  audit_log: NcrAuditEntry[];
}

export const ncrKey = (entityCode: string): string => `erp_ncr_${entityCode}`;

export const NCR_STATUS_LABELS: Record<NcrStatus, string> = {
  open: 'Open',
  investigating: 'Investigating',
  capa_pending: 'CAPA Pending',
  closed: 'Closed',
  cancelled: 'Cancelled',
};

export const NCR_SEVERITY_LABELS: Record<NcrSeverity, string> = {
  minor: 'Minor',
  major: 'Major',
  critical: 'Critical',
};

export const NCR_SOURCE_LABELS: Record<NcrSource, string> = {
  iqc: 'Incoming (IQC)',
  inprocess: 'In-Process',
  fg: 'Finished Goods',
  customer_complaint: 'Customer Complaint',
  audit: 'Audit',
  procure360_match: 'Procure360 Auto',
};

export const NCR_OUTCOME_LABELS: Record<NcrOutcome, string> = {
  rework: 'Rework',
  reject: 'Reject',
  concession_use: 'Concession (Use as-is)',
  return_to_vendor: 'Return to Vendor',
};
