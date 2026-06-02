/**
 * @file        src/lib/oob8-compliance-aware-approval-engine.ts
 * @oob         OOB-8 · Compliance-Aware Approval · 8 default rules that trigger approval based on
 *              COMPLIANCE CONTEXT (value · statutory-deadline · regulated-category · cross-entity · TDS/TCS ·
 *              related-party · MSME · CAPEX), complementary to idea-6's price-variance trigger (>5% vs budget).
 * @orchestrator When a rule fires, routes the approval through idea-6-inter-dept-approval-bridge-engine
 *              (evaluateInterDeptApproval → recordInterDeptDecision). DOES NOT reimplement idea-6, the
 *              approval-matrix, or the approval-workflow. All three remain 0-DIFF.
 * @reads-from  idea-6-inter-dept-approval-bridge-engine · comply360-statutory-payments-engine ·
 *              comply360-statutory-registers-engine · idea-12-compliance-aware-master-save-engine ·
 *              field-lock-metadata-engine · decimal-helpers
 * @sprint      T-Phase-6.B.OOB.1 · Sprint 113 · Arc 4 opener · 182nd SIBLING ⭐
 * @decisions   DP-A4-2 (FR-44 idea-6 reuse) · DP-A4-8 (honest metrics: no machine OOB counter)
 * @disciplines FR-19 · FR-44 · FR-67 · FR-91 (honest metrics) · v1.30 §L
 * @[JWT]       erp_oob8_compliance_approval_rules · erp_oob8_routed_workflows
 */
import {
  evaluateInterDeptApproval,
  recordInterDeptDecision,
  type InterDeptApprovalEvaluation,
} from '@/lib/idea-6-inter-dept-approval-bridge-engine';
import { dAdd, round2 } from '@/lib/decimal-helpers';
import { logAudit } from '@/lib/audit-trail-engine';

export const READS_FROM = {
  engines: [
    'idea-6-inter-dept-approval-bridge-engine',
    'comply360-statutory-payments-engine',
    'comply360-statutory-registers-engine',
    'idea-12-compliance-aware-master-save-engine',
    'field-lock-metadata-engine',
  ],
  storage_keys: ['erp_oob8_compliance_approval_rules', 'erp_oob8_routed_workflows'],
} as const;

// ─── 8 default compliance-context rule IDs ───────────────────────────────────
export type ComplianceApprovalRuleId =
  | 'high_value_threshold'
  | 'statutory_deadline_adjacent'
  | 'regulated_category'
  | 'cross_entity_transfer'
  | 'tds_tcs_applicable'
  | 'related_party'
  | 'msme_vendor_payment'
  | 'capex_threshold';

export interface ComplianceApprovalRule {
  rule_id: ComplianceApprovalRuleId;
  description: string;
  approver_role: string;
  active: boolean;
  // numeric threshold (paise-aware ₹ amount) when the rule has one
  threshold_inr?: number;
}

export interface ComplianceApprovalInput {
  txn_type: string;
  amount: number;
  entity_code: string;
  vendor_msme?: boolean;
  regulated?: boolean;
  near_statutory_deadline?: boolean;
  related_party?: boolean;
  cross_entity?: boolean;
  tds_tcs?: boolean;
  is_capex?: boolean;
}

export interface ComplianceApprovalEvaluation {
  rule_id: ComplianceApprovalRuleId | null;
  requires_approval: boolean;
  approver_role?: string;
  routed_workflow_id?: string;
  reason: string;
}

// ─── Default rules (exactly 8) ───────────────────────────────────────────────
const HIGH_VALUE_INR = 500_000;
const CAPEX_INR = 1_000_000;

const RULES_KEY = 'erp_oob8_compliance_approval_rules';
const ROUTED_KEY = 'erp_oob8_routed_workflows';

export const DEFAULT_COMPLIANCE_APPROVAL_RULES: readonly ComplianceApprovalRule[] = Object.freeze([
  { rule_id: 'high_value_threshold', description: 'Transaction value crosses ₹5L compliance threshold', approver_role: 'CFO', active: true, threshold_inr: HIGH_VALUE_INR },
  { rule_id: 'statutory_deadline_adjacent', description: 'Within statutory due-date window (GST/TDS/PF/ESI/PT)', approver_role: 'compliance_head', active: true },
  { rule_id: 'regulated_category', description: 'Regulated category (NBFC/SEBI/RERA/FEMA) impacted ledger or master', approver_role: 'compliance_head', active: true },
  { rule_id: 'cross_entity_transfer', description: 'Cross-entity (intercompany) movement requiring committee sign-off', approver_role: 'group_finance', active: true },
  { rule_id: 'tds_tcs_applicable', description: 'TDS or TCS withholding attracts independent compliance review', approver_role: 'tax_head', active: true },
  { rule_id: 'related_party', description: 'Related-party transaction (Sec 188) requires audit-committee sign-off', approver_role: 'audit_committee', active: true },
  { rule_id: 'msme_vendor_payment', description: 'MSME vendor payment — MSMED Act 45-day discipline', approver_role: 'finance_head', active: true },
  { rule_id: 'capex_threshold', description: 'CAPEX outlay crosses ₹10L board-delegation threshold', approver_role: 'board_delegate', active: true, threshold_inr: CAPEX_INR },
]);

interface RoutedWorkflowRecord {
  rule_id: ComplianceApprovalRuleId;
  routed_workflow_id: string;
  decision?: 'approved' | 'rejected';
  reason?: string;
  routed_at: string;
}

function readRules(): ComplianceApprovalRule[] {
  try {
    // [JWT] GET /api/oob8/compliance-approval/rules
    const raw = localStorage.getItem(RULES_KEY);
    if (!raw) return DEFAULT_COMPLIANCE_APPROVAL_RULES.map((r) => ({ ...r }));
    const parsed = JSON.parse(raw) as ComplianceApprovalRule[];
    // ensure all 8 default rule_ids always present (idempotent self-heal)
    const map = new Map(parsed.map((r) => [r.rule_id, r]));
    for (const d of DEFAULT_COMPLIANCE_APPROVAL_RULES) {
      if (!map.has(d.rule_id)) map.set(d.rule_id, { ...d });
    }
    return Array.from(map.values());
  } catch {
    return DEFAULT_COMPLIANCE_APPROVAL_RULES.map((r) => ({ ...r }));
  }
}

function writeRules(rules: ComplianceApprovalRule[]): void {
  try {
    // [JWT] POST /api/oob8/compliance-approval/rules
    localStorage.setItem(RULES_KEY, JSON.stringify(rules));
  } catch { /* quota silent */ }
}

function readRouted(): RoutedWorkflowRecord[] {
  try {
    // [JWT] GET /api/oob8/routed-workflows
    const raw = localStorage.getItem(ROUTED_KEY);
    return raw ? (JSON.parse(raw) as RoutedWorkflowRecord[]) : [];
  } catch {
    return [];
  }
}

function writeRouted(all: RoutedWorkflowRecord[]): void {
  try {
    // [JWT] POST /api/oob8/routed-workflows
    localStorage.setItem(ROUTED_KEY, JSON.stringify(all));
  } catch { /* quota silent */ }
}

export function listComplianceApprovalRules(): ComplianceApprovalRule[] {
  return readRules();
}

export function setRuleActive(rule_id: ComplianceApprovalRuleId, active: boolean): void {
  const rules = readRules();
  const idx = rules.findIndex((r) => r.rule_id === rule_id);
  if (idx < 0) return;
  rules[idx] = { ...rules[idx], active };
  writeRules(rules);
}

// ─── Rule matcher (compliance context → rule_id) ──────────────────────────────
function pickRule(input: ComplianceApprovalInput, rules: ComplianceApprovalRule[]): ComplianceApprovalRule | null {
  const active = new Map(rules.filter((r) => r.active).map((r) => [r.rule_id, r]));
  const amt = round2(dAdd(input.amount, 0));
  // priority order: statutory > related-party > regulated > tds > capex > cross-entity > msme > high-value
  if (input.near_statutory_deadline && active.has('statutory_deadline_adjacent')) return active.get('statutory_deadline_adjacent')!;
  if (input.related_party && active.has('related_party')) return active.get('related_party')!;
  if (input.regulated && active.has('regulated_category')) return active.get('regulated_category')!;
  if (input.tds_tcs && active.has('tds_tcs_applicable')) return active.get('tds_tcs_applicable')!;
  if (input.is_capex && amt >= CAPEX_INR && active.has('capex_threshold')) return active.get('capex_threshold')!;
  if (input.cross_entity && active.has('cross_entity_transfer')) return active.get('cross_entity_transfer')!;
  if (input.vendor_msme && active.has('msme_vendor_payment')) return active.get('msme_vendor_payment')!;
  if (amt >= HIGH_VALUE_INR && active.has('high_value_threshold')) return active.get('high_value_threshold')!;
  return null;
}

// ─── BOUNDARY ADAPTER · OOB-8 context → idea-6 evaluate shape ────────────────
// idea-6 signature is {from_department, to_department, internal_price, budget_rate, entity_code?}
// — its trigger is price-variance >5%. To route a compliance-context approval through idea-6
// without editing it, we synthesise inputs that guarantee variance>5% (force a workflow open).
function routeThroughIdea6(
  rule: ComplianceApprovalRule,
  input: ComplianceApprovalInput,
): InterDeptApprovalEvaluation {
  const amount = Math.max(1, input.amount);
  // budget_rate set well below internal_price so variance vastly exceeds 5% → workflow opens
  const budget_rate = Math.max(1, Math.floor(amount * 0.5));
  return evaluateInterDeptApproval({
    from_department: `compliance:${rule.rule_id}`,
    to_department: rule.approver_role,
    internal_price: amount,
    budget_rate,
    entity_code: input.entity_code,
  });
}

export function evaluateComplianceApproval(
  input: ComplianceApprovalInput,
): ComplianceApprovalEvaluation {
  const rules = readRules();
  const matched = pickRule(input, rules);
  if (!matched) {
    return {
      rule_id: null,
      requires_approval: false,
      reason: 'No compliance rule fired for this context',
    };
  }
  const routed = routeThroughIdea6(matched, input);
  if (routed.workflow_id) {
    const all = readRouted();
    all.push({
      rule_id: matched.rule_id,
      routed_workflow_id: routed.workflow_id,
      routed_at: new Date().toISOString(),
    });
    writeRouted(all);
  }
  // Audit (mca-roc)
  logAudit({
    entityCode: input.entity_code,
    action: 'create',
    entityType: 'oob8_approval_rule_event',
    recordId: routed.workflow_id ?? `oob8-${matched.rule_id}-${Date.now().toString(36)}`,
    recordLabel: `OOB-8 ${matched.rule_id} · ${input.txn_type} · ₹${Math.round(input.amount).toLocaleString('en-IN')}`,
    beforeState: null,
    afterState: {
      rule_id: matched.rule_id,
      approver_role: matched.approver_role,
      amount: input.amount,
      routed_workflow_id: routed.workflow_id ?? null,
      variance_pct: routed.variance_pct,
    },
    sourceModule: 'mca-roc',
  });
  return {
    rule_id: matched.rule_id,
    requires_approval: routed.requires_approval,
    approver_role: matched.approver_role,
    routed_workflow_id: routed.workflow_id,
    reason: `Rule "${matched.rule_id}" fired · routed through idea-6 inter-dept bridge`,
  };
}

export function decideComplianceApproval(
  routed_workflow_id: string,
  decision: 'approved' | 'rejected',
  reason?: string,
): { ok: boolean; reason?: string } {
  const result = recordInterDeptDecision(routed_workflow_id, decision, reason);
  if (result.ok) {
    const all = readRouted();
    const idx = all.findIndex((r) => r.routed_workflow_id === routed_workflow_id);
    if (idx >= 0) {
      all[idx] = { ...all[idx], decision, reason };
      writeRouted(all);
    }
  }
  return result;
}

export function listRoutedWorkflows(): RoutedWorkflowRecord[] {
  return readRouted();
}

// Test seam: reset persisted state (used by tests; safe no-op in production absent localStorage)
export function __resetOob8ForTests(): void {
  try {
    localStorage.removeItem(RULES_KEY);
    localStorage.removeItem(ROUTED_KEY);
  } catch { /* ignore */ }
}
