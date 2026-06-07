/**
 * @file        src/lib/idea-6-inter-dept-approval-bridge-engine.ts
 * @sibling     NEW @ Sprint 100 · 💡 Idea 6 · Inter-Department Approval Bridge (ORCHESTRATOR)
 *
 * @orchestrator-exemption  v1.31 §P
 *   This engine BRIDGES the existing approval-matrix-engine (chain lookup) and
 *   approval-workflow-engine (6-state machine). It does NOT reimplement approval
 *   logic and does NOT introduce a new audit type — audit is routed through the
 *   approval-workflow-engine, which already logs natively (MCA Rule 3(1)).
 *   FR-44 (no-duplicity) holds: both source engines remain 0-DIFF.
 *
 * @realizes    Cross-department transfers (e.g. Production → Sales at internal price
 *              >5% above budget rate) auto-route to the receiving department head.
 * @reads-from  approval-matrix-engine (findApplicableTemplate · USE-SITE)
 *              approval-workflow-engine (submit/approve/reject · USE-SITE)
 *              internal-pricing-engine (variance signal · type-only)
 * @audit       NO new audit type — routes through approval-workflow-engine.
 * @sprint      T-Phase-6.A.0.5 · Block 5
 * [JWT] Phase 8: POST /api/inter-dept-approval/evaluate · POST /api/inter-dept-approval/decision
 */
import { findApplicableTemplate } from '@/lib/approval-matrix-engine';
import {
  submit as workflowSubmit,
  approve as workflowApprove,
  reject as workflowReject,
  type ApprovalRecord,
} from '@/lib/approval-workflow-engine';
import { resolveDeptFromContext } from '@/lib/dept-context-resolver-engine';

export const READS_FROM = {
  engines: ['approval-matrix-engine', 'approval-workflow-engine', 'internal-pricing-engine'],
  storage_keys: ['erp_inter_dept_approval_workflows'],
} as const;

/** Variance threshold above budget that mandates cross-dept approval. */
export const INTER_DEPT_THRESHOLD_PCT = 5;

const STORAGE_KEY = 'erp_inter_dept_approval_workflows';

interface InterDeptWorkflow extends ApprovalRecord {
  from_department: string;
  to_department: string;
  internal_price: number;
  budget_rate: number;
  variance_pct: number;
  template_id: string | null;
}

function readWorkflows(): InterDeptWorkflow[] {
  try {
    // [JWT] GET /api/inter-dept-approval/workflows
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as InterDeptWorkflow[]) : [];
  } catch {
    return [];
  }
}

function writeWorkflows(all: InterDeptWorkflow[]): void {
  try {
    // [JWT] POST /api/inter-dept-approval/workflows
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch { /* quota silent */ }
}

function newWorkflowId(): string {
  return `idw_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export interface InterDeptApprovalEvaluation {
  requires_approval: boolean;
  threshold_pct: number;
  variance_pct: number;
  workflow_id?: string;
  template_id?: string | null;
  /** P8.7 · P2BB Sub-Arc 9 · dept context · resolved honestly or undefined · [JWT] auth-derived at Wave-2 */
  dept_id?: string;
}

/**
 * Evaluate whether an internal-transfer line requires cross-department approval.
 * Side-effects: when threshold exceeded, creates an approval-workflow record
 * via approval-workflow-engine.submit() (which writes audit natively).
 */
export function evaluateInterDeptApproval(input: {
  from_department: string;
  to_department: string;
  internal_price: number;
  budget_rate: number;
  entity_code?: string;
}): InterDeptApprovalEvaluation {
  const variance = input.budget_rate > 0
    ? ((input.internal_price - input.budget_rate) / input.budget_rate) * 100
    : 0;
  const required = variance > INTER_DEPT_THRESHOLD_PCT;
  if (!required) {
    return { requires_approval: false, threshold_pct: INTER_DEPT_THRESHOLD_PCT, variance_pct: variance };
  }

  // ── BRIDGE 1: chain lookup via approval-matrix-engine ──
  const { template } = findApplicableTemplate(
    input.entity_code ?? 'GLOBAL',
    'po', // closest existing voucher_kind for cross-dept transfers; admins may swap.
    Math.round(input.internal_price),
  );

  // ── BRIDGE 2: state-machine via approval-workflow-engine ──
  const wf: InterDeptWorkflow = {
    id: newWorkflowId(),
    from_department: input.from_department,
    to_department: input.to_department,
    internal_price: input.internal_price,
    budget_rate: input.budget_rate,
    variance_pct: variance,
    template_id: template?.id ?? null,
    status: 'draft',
  };
  const submitted = workflowSubmit(wf, { id: 'system', name: 'Inter-Dept Bridge' }, {
    entityCode: input.entity_code ?? 'GLOBAL',
    auditEntityType: 'order', // existing approved AuditEntityType — bridge reuses, does NOT add new
    sourceModule: 'mca-roc',
    recordLabel: (r) => `Inter-Dept ${(r as InterDeptWorkflow).from_department}→${(r as InterDeptWorkflow).to_department} +${variance.toFixed(1)}%`,
  });
  const finalWf = (submitted.ok && submitted.next) ? (submitted.next as InterDeptWorkflow) : wf;
  const all = readWorkflows();
  all.push(finalWf);
  writeWorkflows(all);

  return {
    requires_approval: true,
    threshold_pct: INTER_DEPT_THRESHOLD_PCT,
    variance_pct: variance,
    workflow_id: finalWf.id,
    template_id: template?.id ?? null,
    // P8.7 · THREADED · target department is the natural dept context for this evaluation
    dept_id: resolveDeptFromContext({ explicit: input.to_department }),
  };
}

/** Route the committee's decision through approval-workflow-engine (no audit reimpl). */
export function recordInterDeptDecision(
  workflow_id: string,
  decision: 'approved' | 'rejected',
  reason?: string,
): { ok: boolean; reason?: string } {
  const all = readWorkflows();
  const idx = all.findIndex((w) => w.id === workflow_id);
  if (idx < 0) return { ok: false, reason: 'workflow not found' };
  const ctx = {
    entityCode: 'GLOBAL',
    auditEntityType: 'order' as const,
    sourceModule: 'mca-roc',
  };
  const result = decision === 'approved'
    ? workflowApprove(all[idx], { id: 'committee', name: 'Inter-Dept Committee' }, ctx)
    : workflowReject(all[idx], { id: 'committee', name: 'Inter-Dept Committee' }, reason || 'rejected', ctx);
  if (!result.ok || !result.next) return { ok: false, reason: result.reason };
  all[idx] = result.next as InterDeptWorkflow;
  writeWorkflows(all);
  return { ok: true };
}

export function listInterDeptWorkflows(): InterDeptWorkflow[] {
  return readWorkflows();
}
