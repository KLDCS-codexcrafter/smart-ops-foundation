/**
 * audit-trail.ts — Universal Audit Trail per MCA Rule 3(1) of Companies (Accounts) Rules, 2014
 *
 * Sprint T-Phase-1.2.5h-b1 · Card #2.5 sub-sprint 2 of 4
 *
 * Compliance: MCA Rule 3(1) [audit trail of each and every transaction; edit log
 * with date and time; cannot be disabled] + CGST Rule 56(8) [electronic log of
 * every entry edited or deleted].
 *
 * Storage: erp_audit_trail_${entityCode} — APPEND-ONLY. No edit/delete API exposed.
 * Retention: 8 years (enforced via Phase 2 backend; Phase 1 provides CSV export tool).
 *
 * [JWT] GET /api/audit-trail?entityCode=:entityCode&from=:from&to=:to
 */

export type AuditAction =
  | 'create'      // new record inserted
  | 'update'      // existing record modified
  | 'cancel'      // record marked cancelled (soft-delete)
  | 'post'        // voucher status moved to posted
  | 'unpost'      // voucher status moved back from posted (rare; logged for forensics)
  | 'approve'     // approval workflow approval
  | 'reject';     // approval workflow rejection

export type AuditEntityType =
  // FineCore vouchers (all voucher types collapse to 'voucher')
  | 'voucher'
  // Inventory transactions
  | 'grn' | 'min' | 'consumption_entry' | 'cycle_count' | 'rtv' | 'heat_master'
  // SalesX memos
  | 'supply_request_memo' | 'invoice_memo' | 'sample_outward_memo' | 'demo_outward_memo' | 'sales_return_memo'
  // ProjX
  | 'project' | 'project_centre' | 'project_milestone' | 'time_entry'
  // Masters
  | 'employee' | 'ledger' | 'party' | 'item' | 'voucher_type' | 'godown';

export interface AuditTrailEntry {
  /** Stable UUID for this audit record (cannot be edited or deleted) */
  id: string;

  /** Entity (tenant) scope — duplicated here for safety even though storage key is entity-scoped */
  entity_id: string;

  /** ISO 8601 timestamp to second precision (MCA Rule 3(1) "with the date when changes were made") */
  timestamp: string;

  /** User who performed the action (Phase 1: mock auth user; Phase 2: real JWT subject) */
  user_id: string;
  user_name: string;
  user_role: string | null;

  /** What changed */
  action: AuditAction;
  entity_type: AuditEntityType;
  record_id: string;

  /** Human-readable label for UI (e.g. "JV/25-26/0042" or "Employee EMP-0017") */
  record_label: string;

  /** Before/after snapshots — full record (Q3-a lock: full snapshot, no delta optimization) */
  before_state: Record<string, unknown> | null;  // null on 'create'
  after_state: Record<string, unknown> | null;   // null on 'cancel' (or hard-delete, which we don't do)

  /** Optional reason / comment supplied by user (required for cancel + unpost) */
  reason: string | null;

  /** Source module — for filterability (e.g. 'inventory', 'finecore', 'salesx', 'payhub') */
  source_module: string;
}

/** Append-only storage key */
export const auditTrailKey = (entityCode: string): string =>
  `erp_audit_trail_${entityCode}`;

/** Maximum entries kept hot in localStorage before triggering archive warning */
export const AUDIT_TRAIL_HOT_LIMIT = 5000;
