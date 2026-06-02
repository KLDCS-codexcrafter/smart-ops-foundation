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
  // FinCore vouchers (all voucher types collapse to 'voucher')
  | 'voucher'
  // Inventory transactions
  | 'grn' | 'min' | 'consumption_entry' | 'cycle_count' | 'rtv' | 'heat_master'
  // SalesX memos
  | 'supply_request_memo' | 'invoice_memo' | 'sample_outward_memo' | 'demo_outward_memo' | 'sales_return_memo'
  // ProjX
  | 'project' | 'project_centre' | 'project_milestone' | 'time_entry'
  // Masters
  | 'employee' | 'ledger' | 'party' | 'item' | 'voucher_type' | 'godown'
  // Sprint T-Phase-1.Hardening-B.ATELC · Rule 11(g) coverage extension (additive only)
  | 'order' | 'bill_passing' | 'git' | 'inward_receipt'
  | 'job_card' | 'job_work_out_order' | 'job_work_receipt'
  | 'material_issue_note' | 'production_confirmation'
  | 'stock_issue' | 'stock_receipt_ack'
  | 'customer_voucher_in' | 'customer_voucher_out'
  | 'transporter_invoice'
  // Sprint 80d · MCA Rule 11(g) Hardening · 4 new audit entity types
  | 'mca_coverage_report' | 'audit_retention_export'
  | 'audit_retention_warning_ack' | 'audit_continuity_report'
  // Sprint 96 · T-Phase-6.A.0.1 · Arc 0 Master Data Foundation · 4 new audit entity types (module: 'mca-roc')
  | 'master_replication_event' | 'master_conflict_resolution'
  | 'master_sync_run' | 'master_version_change'
  // Sprint 97 · T-Phase-6.A.0.2 · 7-tier hierarchical ledger + Master DNA · 2 new audit entity types (module: 'mca-roc')
  | 'hierarchical_ledger_created' | 'master_dna_inheritance'
  // Sprint 98 · T-Phase-6.A.0.3 · Field-Lock Metadata · 1 new audit entity type (module: 'mca-roc')
  | 'field_lock_rule_change'
  // Sprint 99 · T-Phase-6.A.0.4 · Inter-scope pricing + TP audit · 2 new audit entity types (module: 'mca-roc')
  | 'pricing_rule_change' | 'transfer_pricing_event'
  // Sprint 100 · T-Phase-6.A.0.5 · Master access matrix + cost-centre cross-stitch · 2 new audit entity types (module: 'mca-roc')
  | 'master_access_change' | 'cost_centre_cross_stitch'
  // Sprint 101 · T-Phase-6.A.0.6 · Master Lifecycle (Arc 0 Capstone) · 1 NEW shared audit entity type (module: 'mca-roc')
  // Sprint 101 · T-Phase-6.A.0.6 · Master Lifecycle (Arc 0 Capstone) · 1 NEW shared audit entity type (module: 'mca-roc')
  // Action discriminator carried via AuditTrailEntry.reason / record_label: sleeping_flagged | cross_entity_reorder | compliance_block
  | 'master_lifecycle_event'
  // Sprint 105 · T-Phase-6.C.1.1 · Arc 2 OPENER · Pillar C.1 Intercompany Foundation · 1 NEW audit entity type (module: 'mca-roc')
  // Logged on every upsert/update of GroupStructureNode (ownership %, relationship, consolidation method)
  | 'group_structure_change'
  // Sprint 106 · T-Phase-6.C.1.2 · Arc 2 · Pillar C.1 · IC Transactions Pt 1 · 1 NEW audit entity type (module: 'mca-roc')
  // Logged by intercompany-transaction-engine on postICTransaction. TP-audit + voucher-post events
  // are logged downstream by idea-7 + fincore (v1.31 §P @orchestrator exemption).
  | 'intercompany_transaction'
  // Sprint 107 · T-Phase-6.C.1.3 · Arc 2 · Pillar C.1 · IC Transactions Pt 2 · 1 NEW audit entity type (module: 'mca-roc')
  // Logged by intercompany-transaction-engine on settleICTransaction (posted→settled).
  // The 4 new S107 txn types (expense_allocation/asset_transfer/invoice/payment) REUSE
  // 'intercompany_transaction' above — no per-type audit type.
  | 'intercompany_settlement'

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

  /** Source module — for filterability (e.g. 'inventory', 'fincore', 'salesx', 'payhub') */
  source_module: string;

  /** Sprint 80d · MCA Rule 11(g)(c) · Section 128(5) 8-year retention timestamp (ISO) */
  retention_until?: string;
}

/** Append-only storage key */
export const auditTrailKey = (entityCode: string): string =>
  `erp_audit_trail_${entityCode}`;

/** Maximum entries kept hot in localStorage before triggering archive warning */
export const AUDIT_TRAIL_HOT_LIMIT = 5000;
