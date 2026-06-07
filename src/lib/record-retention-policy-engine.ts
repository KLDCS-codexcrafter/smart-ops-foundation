/**
 * record-retention-policy-engine.ts — Sprint P8.6 · B.5-L3
 * SOLE new sibling this sprint (engine-credit meta-rule).
 *
 * Retention policy registry + best-effort evaluator over the 35
 * FY-stamped record types. Evaluation + flagging only — no purge,
 * no archival mutation, no enforcement.
 *
 * Defaults are STATUTORY-INFORMED, not legal advice. Every row is
 * operator-editable; edits are persisted to localStorage and audited
 * via the existing logAudit spine.
 *
 * [JWT] Phase-8 Wave-2: server-side enforcement + Rule 46(8)
 *       India-resident daily backup anchor land there. This engine
 *       reports only — never deletes or archives.
 *
 * Walls (0-DIFF): audit-trail-hash-chain.ts · audit-trail-chain-engine.ts ·
 *                 comply360-audit-retention-engine.ts · logAudit entry-write logic.
 */

import type {
  RetentionPolicyId,
  RetentionPolicyRow,
  RetentionEvaluationRow,
  RetentionEvaluationStatus,
  RetentionYears,
} from '@/types/record-retention';
import { logAudit } from '@/lib/audit-trail-engine';

// ─── Storage keys ─────────────────────────────────────────────────────────
const POLICY_STORE_KEY = 'erp_retention_policies_v1';
const POLICY_EDIT_LOG_KEY = 'erp_retention_policy_edit_log_v1';

// ─── Default policy seed (statutory-informed · NOT legal advice) ──────────
const DEFAULT_POLICIES: RetentionPolicyRow[] = [
  {
    id: 'companies_act_8yr',
    label: 'Companies Act · 8 years',
    retentionYears: 8,
    action: 'review',
    statuteDescription:
      'Companies Act 2013 s.128(5): books of account + vouchers, >=8 FY; extendable under investigation',
    editable: true,
  },
  {
    id: 'gst_8yr',
    label: 'GST / Tax · 8 years',
    retentionYears: 8,
    action: 'review',
    statuteDescription:
      'Statutory floor ~7y: CGST s.36 = 72 months from GSTR-9 due date; Income-tax Rules 2026 Rule 46(9) = 7 tax years. 8y default aligns all horizons to the Companies Act ceiling',
    editable: true,
  },
  {
    id: 'hr_employment_lifetime',
    label: 'HR · Employment lifetime + 7y',
    retentionYears: 'employment_lifetime_plus_7',
    action: 'review',
    statuteDescription:
      'Wages/ESI/PF/IT family: employment lifetime + 7 years post-exit',
    editable: true,
  },
  {
    id: 'customer_app_friendly',
    label: 'Customer-app · 3 years',
    retentionYears: 3,
    action: 'archive_flag',
    statuteDescription:
      'Consumer-grade order-history retention; no statutory floor',
    editable: true,
  },
  {
    id: 'operational_log_only',
    label: 'Operational log · 2 years',
    retentionYears: 2,
    action: 'archive_flag',
    statuteDescription: 'Operational logs; no statutory floor',
    editable: true,
  },
];

// ─── Record-type → default policy mapping (all 35 FY-stamped types) ───────
// Mapping follows TXUI-0 jurisdiction classification:
//   books / vouchers / accounting receipts → companies_act_8yr
//   GST-adjacent (invoice / e-invoice / dispatch tax doc) → gst_8yr
//   customer-side orders → customer_app_friendly
//   operational lifecycle docs (service / job / production) → operational_log_only
//   payroll / employment-linked → hr_employment_lifetime
const RECORD_TYPE_POLICY_MAP: Record<string, RetentionPolicyId> = {
  voucher: 'companies_act_8yr',
  'customer-voucher': 'companies_act_8yr',
  'invoice-memo': 'gst_8yr',
  irn: 'gst_8yr',
  'bill-passing': 'companies_act_8yr',
  grn: 'gst_8yr',
  'inward-receipt': 'gst_8yr',
  'dispatch-receipt': 'gst_8yr',
  'delivery-memo': 'gst_8yr',
  'supply-request-memo': 'gst_8yr',
  'packing-slip': 'gst_8yr',
  pod: 'gst_8yr',
  'transporter-invoice': 'gst_8yr',
  'sales-return-memo': 'gst_8yr',
  'sample-outward-memo': 'operational_log_only',
  'demo-outward-memo': 'operational_log_only',
  git: 'gst_8yr',
  'stock-issue': 'companies_act_8yr',
  'stock-receipt-ack': 'companies_act_8yr',
  'material-indent': 'operational_log_only',
  'material-issue-note': 'companies_act_8yr',
  'capital-indent': 'companies_act_8yr',
  'job-card': 'operational_log_only',
  'job-work-out-order': 'operational_log_only',
  'job-work-receipt': 'operational_log_only',
  'production-order': 'operational_log_only',
  'production-plan': 'operational_log_only',
  'production-confirmation': 'operational_log_only',
  'process-batch': 'operational_log_only',
  'service-request': 'operational_log_only',
  order: 'customer_app_friendly',
  'customer-order': 'customer_app_friendly',
  'distributor-order': 'customer_app_friendly',
  'invoice-dispute': 'gst_8yr',
  'commission-register': 'companies_act_8yr',
  // Sprint WMS1 · additive — new record types born under P8.6 floor
  picklist: 'operational_log_only',
  'pack-group': 'operational_log_only',
};

// ─── localStorage helpers (typed + defensive) ─────────────────────────────
function safeRead<T>(key: string, fallback: T): T {
  try {
    if (typeof localStorage === 'undefined') return fallback;
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeWrite(key: string, value: unknown): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // swallow — quota / private mode
  }
}

// ─── Public API ───────────────────────────────────────────────────────────

/** Return the 5 retention policies, seeding defaults on first call. */
export function listRetentionPolicies(): RetentionPolicyRow[] {
  const stored = safeRead<RetentionPolicyRow[] | null>(POLICY_STORE_KEY, null);
  if (stored && Array.isArray(stored) && stored.length === DEFAULT_POLICIES.length) {
    return stored;
  }
  safeWrite(POLICY_STORE_KEY, DEFAULT_POLICIES);
  return DEFAULT_POLICIES.slice();
}

export interface RetentionPolicyEditEntry {
  id: string;
  policyId: RetentionPolicyId;
  editedBy: string;
  editedAt: string;
  before: Partial<RetentionPolicyRow>;
  after: Partial<RetentionPolicyRow>;
}

/** Persist an edit + audit-log it (append-only edit log). */
export function updateRetentionPolicy(
  id: RetentionPolicyId,
  patch: Partial<Pick<RetentionPolicyRow, 'retentionYears' | 'action' | 'statuteDescription' | 'label'>>,
  editedBy: string,
): RetentionPolicyRow | null {
  const policies = listRetentionPolicies();
  const idx = policies.findIndex((p) => p.id === id);
  if (idx < 0) return null;

  const before = { ...policies[idx] };
  const updated: RetentionPolicyRow = {
    ...policies[idx],
    ...patch,
    lastEditedBy: editedBy,
    lastEditedAt: new Date().toISOString(),
    editable: true,
  };
  policies[idx] = updated;
  safeWrite(POLICY_STORE_KEY, policies);

  // Append-only edit log
  const log = safeRead<RetentionPolicyEditEntry[]>(POLICY_EDIT_LOG_KEY, []);
  log.push({
    id: `rp-edit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    policyId: id,
    editedBy,
    editedAt: updated.lastEditedAt!,
    before,
    after: updated,
  });
  safeWrite(POLICY_EDIT_LOG_KEY, log);

  // Audit via the global spine (hash-chain instrumented in P8.5)
  try {
    logAudit({
      entityCode: 'GLOBAL',
      action: 'update',
      entityType: 'retention_policy_event',
      recordId: id,
      recordLabel: updated.label,
      beforeState: before as unknown as Record<string, unknown>,
      afterState: updated as unknown as Record<string, unknown>,
      reason: 'Retention policy edited via Retention Console',
      sourceModule: 'record-retention-policy-engine',
    });
  } catch {
    // never let audit failures block the edit
  }

  return updated;
}

export function listRetentionPolicyEditLog(): RetentionPolicyEditEntry[] {
  return safeRead<RetentionPolicyEditEntry[]>(POLICY_EDIT_LOG_KEY, []);
}

/** Map a record-type string to its default policy id. Unknown → operational_log_only. */
export function getDefaultPolicyForRecordType(recordType: string): RetentionPolicyId {
  return RECORD_TYPE_POLICY_MAP[recordType] ?? 'operational_log_only';
}

/** Full list of the 35 known FY-stamped record types this sprint covers. */
export function listKnownRecordTypes(): string[] {
  return Object.keys(RECORD_TYPE_POLICY_MAP);
}

// ─── FY math ──────────────────────────────────────────────────────────────
function fyStartYearFromTag(fy: string): number | null {
  // "FY-2024-25" → 2024
  const m = fy.match(/FY-(\d{4})-\d{2}/);
  if (!m) return null;
  return parseInt(m[1], 10);
}

function currentFYStartYear(today: Date): number {
  // Indian FY starts 1 April
  const y = today.getFullYear();
  const m = today.getMonth(); // 0=Jan
  return m >= 3 ? y : y - 1;
}

function fyTag(startYear: number): string {
  const next = (startYear + 1) % 100;
  return `FY-${startYear}-${next.toString().padStart(2, '0')}`;
}

function cutoffFYForPolicy(policy: RetentionPolicyRow, today: Date): string {
  const currentStart = currentFYStartYear(today);
  const years = typeof policy.retentionYears === 'number'
    ? policy.retentionYears
    : 7; // employment_lifetime_plus_7 → use 7 as the FY cutoff anchor
  return fyTag(currentStart - years);
}

// ─── Best-effort store collector ──────────────────────────────────────────
// We rely on the well-known `erp_<thing>_<entityCode>` localStorage convention.
// Types with no discoverable store report no_data honestly — never fabricate.
const STORE_KEY_HINTS: Record<string, string[]> = {
  voucher: ['erp_vouchers_'],
  'customer-voucher': ['servicedesk_v1_customer_in_', 'servicedesk_v1_customer_out_'],
  'invoice-memo': ['erp_invoice_memos_'],
  irn: ['erp_irns_'],
  'bill-passing': ['erp_bill_passing_'],
  grn: ['erp_grns_'],
  'inward-receipt': ['erp_inward_receipts_'],
  'dispatch-receipt': ['erp_dispatch_receipts_'],
  'delivery-memo': ['erp_delivery_memos_'],
  'supply-request-memo': ['erp_supply_request_memos_'],
  'packing-slip': ['erp_packing_slips_'],
  pod: ['erp_pods_'],
  'transporter-invoice': ['erp_transporter_invoices_'],
  'sales-return-memo': ['erp_sales_return_memos_'],
  'sample-outward-memo': ['erp_sample_outward_memos_'],
  'demo-outward-memo': ['erp_demo_outward_memos_'],
  git: ['erp_gits_'],
  'stock-issue': ['erp_stock_issues_'],
  'stock-receipt-ack': ['erp_stock_receipt_acks_'],
  'material-indent': ['erp_material_indents_'],
  'material-issue-note': ['erp_material_issue_notes_'],
  'capital-indent': ['erp_capital_indents_'],
  'job-card': ['erp_job_cards_'],
  'job-work-out-order': ['erp_job_work_out_orders_'],
  'job-work-receipt': ['erp_job_work_receipts_'],
  'production-order': ['erp_production_orders_'],
  'production-plan': ['erp_production_plans_'],
  'production-confirmation': ['erp_production_confirmations_'],
  'process-batch': ['erp_process_batches_'],
  'service-request': ['erp_service_requests_'],
  order: ['erp_orders_'],
  'customer-order': ['erp_customer_orders_'],
  'distributor-order': ['erp_distributor_orders_'],
  'invoice-dispute': ['erp_invoice_disputes_'],
  'commission-register': ['erp_commission_register_'],
};

interface RowWithFY { fiscal_year_id?: string; fiscalYearId?: string }

function readRowsForRecordType(recordType: string, entityCode: string): RowWithFY[] | null {
  const hints = STORE_KEY_HINTS[recordType];
  if (!hints || typeof localStorage === 'undefined') return null;
  const all: RowWithFY[] = [];
  let found = false;
  for (const prefix of hints) {
    try {
      const raw = localStorage.getItem(prefix + entityCode);
      if (raw === null) continue;
      found = true;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        for (const row of parsed) {
          if (row && typeof row === 'object') all.push(row as RowWithFY);
        }
      }
    } catch {
      // ignore corrupted slot
    }
  }
  return found ? all : null;
}

function statusFor(fyTagStr: string, cutoff: string): RetentionEvaluationStatus {
  const a = fyStartYearFromTag(fyTagStr);
  const b = fyStartYearFromTag(cutoff);
  if (a === null || b === null) return 'within_retention';
  return a < b ? 'past_retention_review' : 'within_retention';
}

/** Evaluate retention across all known record types for an entity. */
export function evaluateRetention(entityCode: string, today: Date = new Date()): RetentionEvaluationRow[] {
  const policies = listRetentionPolicies();
  const policyById = new Map(policies.map((p) => [p.id, p]));
  const out: RetentionEvaluationRow[] = [];

  for (const recordType of listKnownRecordTypes()) {
    const policyId = getDefaultPolicyForRecordType(recordType);
    const policy = policyById.get(policyId)!;
    const cutoff = cutoffFYForPolicy(policy, today);

    const rows = readRowsForRecordType(recordType, entityCode);
    if (rows === null) {
      out.push({
        recordType,
        fiscalYear: '—',
        recordCount: 0,
        policyId,
        cutoffFY: cutoff,
        status: 'no_data',
      });
      continue;
    }

    // Group by FY tag (only rows that carry one — honest)
    const byFy = new Map<string, number>();
    let untagged = 0;
    for (const r of rows) {
      const tag = r.fiscal_year_id ?? r.fiscalYearId;
      if (!tag) { untagged++; continue; }
      byFy.set(tag, (byFy.get(tag) ?? 0) + 1);
    }

    if (byFy.size === 0 && untagged === 0) {
      out.push({
        recordType,
        fiscalYear: '—',
        recordCount: 0,
        policyId,
        cutoffFY: cutoff,
        status: 'no_data',
      });
      continue;
    }

    for (const [fy, count] of byFy.entries()) {
      out.push({
        recordType,
        fiscalYear: fy,
        recordCount: count,
        policyId,
        cutoffFY: cutoff,
        status: statusFor(fy, cutoff),
      });
    }
    if (untagged > 0) {
      out.push({
        recordType,
        fiscalYear: 'untagged',
        recordCount: untagged,
        policyId,
        cutoffFY: cutoff,
        status: 'within_retention',
      });
    }
  }

  // Past-retention rows float to the top for the report
  out.sort((a, b) => {
    const rank = (s: RetentionEvaluationStatus) =>
      s === 'past_retention_review' ? 0 : s === 'within_retention' ? 1 : 2;
    const r = rank(a.status) - rank(b.status);
    if (r !== 0) return r;
    return a.recordType.localeCompare(b.recordType);
  });

  return out;
}

export interface RetentionSummary {
  totalRecordTypes: number;
  pastRetention: number;
  withinRetention: number;
  noData: number;
  policyCount: number;
}

export function getRetentionSummary(entityCode: string, today: Date = new Date()): RetentionSummary {
  const rows = evaluateRetention(entityCode, today);
  let past = 0, within = 0, none = 0;
  const recordTypes = new Set<string>();
  for (const r of rows) {
    recordTypes.add(r.recordType);
    if (r.status === 'past_retention_review') past++;
    else if (r.status === 'within_retention') within++;
    else none++;
  }
  return {
    totalRecordTypes: recordTypes.size,
    pastRetention: past,
    withinRetention: within,
    noData: none,
    policyCount: listRetentionPolicies().length,
  };
}

// Re-export type for ergonomic single-import in consumers (UI).
export type { RetentionPolicyId, RetentionPolicyRow, RetentionEvaluationRow, RetentionYears };
