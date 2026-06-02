/**
 * @file        src/lib/inter-dept-governance-engine.ts
 * @sibling     NEW @ Sprint 115 · Pillar C.3 · Inter-Department Governance · 🏁 PHASE 6 FINALE
 * @pillar      C.3 · Read-only governance audit/oversight over the existing inter-dept bridges —
 *              which bridges exist, their approval coverage, exception flags, rule activity.
 * @fr-44       AUDITS existing bridges by READING idea-6 + oob8 + the sibling-register. Creates NO
 *              new bridge, edits NO bridge engine. idea-6 + oob8 + approval-matrix + approval-workflow
 *              all stay 0-DIFF (FR-44 no-duplicity).
 * @reads-from  idea-6-inter-dept-approval-bridge-engine (listInterDeptWorkflows · USE-SITE) ·
 *              oob8-compliance-aware-approval-engine (listComplianceApprovalRules · USE-SITE) ·
 *              _institutional/sibling-register (SIBLINGS · USE-SITE)
 * @honest      "29 bridges" / "16/16 OOBs" are NARRATIVE positioning figures (DP-A4-8 · FR-91).
 *              total_bridges = ACTUAL enumerated count from the three sources, NOT hardcoded.
 * @scope-wall  Governance audit only · READ-ONLY. NO bridge mutation. NO bridge reimplementation.
 * @sprint      T-Phase-6.C.3.1-CLOSE · Sprint 115 · Block 3 (CLOSES PHASE 6)
 * [JWT] Phase 8: GET /api/inter-dept-governance/audit · GET /api/inter-dept-governance/bridges
 */
import { listInterDeptWorkflows } from '@/lib/idea-6-inter-dept-approval-bridge-engine';
import {
  listComplianceApprovalRules,
  type ComplianceApprovalRule,
} from '@/lib/oob8-compliance-aware-approval-engine';
import { SIBLINGS } from '@/lib/_institutional/sibling-register';
import { logAudit } from '@/lib/audit-trail-engine';

export const READS_FROM = {
  engines: [
    'idea-6-inter-dept-approval-bridge-engine',
    'oob8-compliance-aware-approval-engine',
    '_institutional/sibling-register',
  ],
  storage_keys: [
    'erp_inter_dept_approval_workflows',
    'erp_oob8_compliance_approval_rules',
    'erp_oob8_routed_workflows',
  ],
} as const;

// ── Public types ─────────────────────────────────────────────────────

export type BridgeType = 'inter_dept_approval' | 'compliance_approval' | 'other';

export interface BridgeGovernanceRow {
  /** Stable bridge identifier (engine id, or a synthetic id for runtime workflows). */
  bridge_id: string;
  bridge_type: BridgeType;
  /** Source engine that owns the bridge (sibling-register id, when known). */
  source_engine: string;
  /** Rules currently active on this bridge (0 for non-rule bridges). */
  active_rules: number;
  /** Live workflow rows enumerated for this bridge (0 when not workflow-bearing). */
  workflow_count: number;
  /** Human-readable note on coverage; flagged exceptions reference this. */
  coverage_note: string;
}

export interface GovernanceException {
  bridge_id: string;
  /** Short reason — e.g. "no active rules", "stale workflows", "missing approver". */
  issue: string;
}

export interface GovernanceAuditResult {
  fy: string;
  /** Enumerated bridges from idea-6 + oob8 + bridge-pattern siblings (READ-ONLY). */
  bridges: BridgeGovernanceRow[];
  /** ACTUAL enumerated count — NEVER a hardcoded narrative figure (DP-A4-8). */
  total_bridges: number;
  exceptions: GovernanceException[];
  /** Which read sources were consulted in this audit run (transparency · FR-91). */
  sources_read: string[];
  /** Honest-metrics disclosure — surfaced into the page banner. */
  honest_metrics_note: string;
}

// ── Bridge-pattern detection on the sibling-register (READ-ONLY) ─────

const BRIDGE_PATTERN_REGEX = /\b(bridge|orchestrat(?:or|ion)|reconcil|workflow|approval|interfac)/i;

interface BridgePatternSibling {
  id: string;
  bridge_type: BridgeType;
}

function enumerateBridgePatternSiblings(): BridgePatternSibling[] {
  const out: BridgePatternSibling[] = [];
  for (const s of SIBLINGS) {
    const haystack = `${s.id} ${s.name}`;
    if (!BRIDGE_PATTERN_REGEX.test(haystack)) continue;
    if (s.id === 'inter-dept-governance-engine') continue; // do not count self
    let bt: BridgeType = 'other';
    if (/inter[-_]?dept|cross[-_]?company/i.test(haystack)) bt = 'inter_dept_approval';
    else if (/oob8|compliance[-_]?approval|approval[-_]?rule/i.test(haystack)) bt = 'compliance_approval';
    out.push({ id: s.id, bridge_type: bt });
  }
  return out;
}

// ── Core audit ───────────────────────────────────────────────────────

export interface AuditInput {
  fy?: string;
  entity_code?: string;
}

export function auditInterDeptBridges(input: AuditInput = {}): GovernanceAuditResult {
  const fy = input.fy ?? 'FY25-26';
  const sources_read: string[] = [];

  // ── 1 · idea-6 inter-dept workflows ──
  const interDeptWorkflows = listInterDeptWorkflows();
  sources_read.push('idea-6-inter-dept-approval-bridge-engine.listInterDeptWorkflows');

  // ── 2 · oob8 compliance-approval rules ──
  const oob8Rules: ComplianceApprovalRule[] = listComplianceApprovalRules();
  sources_read.push('oob8-compliance-aware-approval-engine.listComplianceApprovalRules');
  const oob8Active = oob8Rules.filter((r) => r.active).length;

  // ── 3 · bridge-pattern siblings (engine-level enumeration) ──
  const bridgeSiblings = enumerateBridgePatternSiblings();
  sources_read.push('_institutional/sibling-register.SIBLINGS');

  // ── Compose rows ──
  const bridges: BridgeGovernanceRow[] = [];

  // 3a · idea-6 itself as a governed bridge
  bridges.push({
    bridge_id: 'idea-6-inter-dept-approval-bridge-engine',
    bridge_type: 'inter_dept_approval',
    source_engine: 'idea-6-inter-dept-approval-bridge-engine',
    active_rules: 0, // idea-6 is rule-less (variance trigger is fixed)
    workflow_count: interDeptWorkflows.length,
    coverage_note: `${interDeptWorkflows.length} live workflow(s); 5% variance trigger`,
  });

  // 3b · oob8 itself as a governed bridge
  bridges.push({
    bridge_id: 'oob8-compliance-aware-approval-engine',
    bridge_type: 'compliance_approval',
    source_engine: 'oob8-compliance-aware-approval-engine',
    active_rules: oob8Active,
    workflow_count: 0,
    coverage_note: `${oob8Active}/${oob8Rules.length} rule(s) active; routes through idea-6`,
  });

  // 3c · other bridge-pattern siblings — enumerate, do not mutate
  for (const s of bridgeSiblings) {
    if (s.id === 'idea-6-inter-dept-approval-bridge-engine') continue;
    if (s.id === 'oob8-compliance-aware-approval-engine') continue;
    bridges.push({
      bridge_id: s.id,
      bridge_type: s.bridge_type,
      source_engine: s.id,
      active_rules: 0,
      workflow_count: 0,
      coverage_note: 'enumerated from sibling-register (READ-ONLY · no inspection of internal state)',
    });
  }

  // ── Exceptions ──
  const exceptions: GovernanceException[] = [];
  for (const b of bridges) {
    if (b.bridge_type === 'compliance_approval' && b.active_rules === 0) {
      exceptions.push({ bridge_id: b.bridge_id, issue: 'no active rules' });
    }
    if (b.bridge_type === 'inter_dept_approval' && b.workflow_count === 0) {
      exceptions.push({ bridge_id: b.bridge_id, issue: 'no live workflows in current store' });
    }
  }

  const result: GovernanceAuditResult = {
    fy,
    bridges,
    total_bridges: bridges.length,
    exceptions,
    sources_read,
    honest_metrics_note:
      'Headline figures (16/16 OOBs · 29 bridges · 161/161 obligations · 18 capabilities · ' +
      'Horizon 1.5) are NARRATIVE positioning claims (DP-A4-8 · FR-91), NOT register-certified ' +
      'integers. total_bridges below is the ACTUAL enumerated count.',
  };

  // ── Audit log ──
  try {
    logAudit({
      entityCode: input.entity_code ?? 'GLOBAL',
      action: 'export', // closest existing AuditAction for a read-only run
      entityType: 'inter_dept_governance_audit',
      recordId: `governance-${fy}-${Date.now()}`,
      recordLabel: `Inter-Dept Governance Audit · ${fy} · ${bridges.length} bridges · ${exceptions.length} exceptions`,
      beforeState: null,
      afterState: {
        fy,
        total_bridges: result.total_bridges,
        exception_count: exceptions.length,
        sources_read,
      },
      sourceModule: 'mca-roc',
    });
  } catch {
    // Audit append is best-effort here; storage errors must not break the read.
  }

  return result;
}

/** Convenience read — surfaces only the bridge rows (no audit emission). */
export function listGovernedBridges(): BridgeGovernanceRow[] {
  // Re-uses the audit composition but suppresses logAudit by reading sources directly.
  const interDeptWorkflows = listInterDeptWorkflows();
  const oob8Rules = listComplianceApprovalRules();
  const oob8Active = oob8Rules.filter((r) => r.active).length;
  const bridgeSiblings = enumerateBridgePatternSiblings();
  const rows: BridgeGovernanceRow[] = [
    {
      bridge_id: 'idea-6-inter-dept-approval-bridge-engine',
      bridge_type: 'inter_dept_approval',
      source_engine: 'idea-6-inter-dept-approval-bridge-engine',
      active_rules: 0,
      workflow_count: interDeptWorkflows.length,
      coverage_note: `${interDeptWorkflows.length} live workflow(s); 5% variance trigger`,
    },
    {
      bridge_id: 'oob8-compliance-aware-approval-engine',
      bridge_type: 'compliance_approval',
      source_engine: 'oob8-compliance-aware-approval-engine',
      active_rules: oob8Active,
      workflow_count: 0,
      coverage_note: `${oob8Active}/${oob8Rules.length} rule(s) active; routes through idea-6`,
    },
  ];
  for (const s of bridgeSiblings) {
    if (s.id === 'idea-6-inter-dept-approval-bridge-engine') continue;
    if (s.id === 'oob8-compliance-aware-approval-engine') continue;
    rows.push({
      bridge_id: s.id,
      bridge_type: s.bridge_type,
      source_engine: s.id,
      active_rules: 0,
      workflow_count: 0,
      coverage_note: 'enumerated from sibling-register (READ-ONLY)',
    });
  }
  return rows;
}

/** Honest-metrics narrative figures (NOT register-certified · DP-A4-8 · FR-91). */
export const NARRATIVE_HEADLINE_FIGURES = Object.freeze({
  oobs_functional_narrative: '16/16',
  bridges_narrative: '29',
  obligations_native_narrative: '161/161',
  unique_capabilities_narrative: '18',
  horizon_milestone_narrative: 'Horizon 1.5 group consolidation delivered',
  disclaimer:
    'These are POSITIONING claims, NOT machine-certified register integers. The only register-' +
    'certified figures are getSiblingCount(), getSprintCount(), ESLint streak, and page-route count.',
} as const);
