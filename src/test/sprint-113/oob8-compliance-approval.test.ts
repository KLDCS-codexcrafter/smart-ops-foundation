/**
 * @file        src/test/sprint-113/oob8-compliance-approval.test.ts
 * @sprint      T-Phase-6.B.OOB.1 · Sprint 113 · Arc 4 opener · §N test pack
 * @asserts     OOB-8 8 rules · routes through idea-6 · FR-44 no reimplementation · 0-DIFF of upstream engines ·
 *              SCOPE WALL · HONEST METRICS (no machine "15/16" register) · sibling count 182 · page wired
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

import {
  DEFAULT_COMPLIANCE_APPROVAL_RULES,
  evaluateComplianceApproval,
  listComplianceApprovalRules,
  setRuleActive,
  decideComplianceApproval,
  listRoutedWorkflows,
  __resetOob8ForTests,
  READS_FROM,
} from '@/lib/oob8-compliance-aware-approval-engine';

import * as Idea6 from '@/lib/idea-6-inter-dept-approval-bridge-engine';
import { getSiblingCount, SIBLINGS } from '@/lib/_institutional/sibling-register';
import { SPRINTS } from '@/lib/_institutional/sprint-history';

const ROOT = process.cwd();
const ENGINE_PATH = join(ROOT, 'src/lib/oob8-compliance-aware-approval-engine.ts');
const IDEA6_PATH = join(ROOT, 'src/lib/idea-6-inter-dept-approval-bridge-engine.ts');
const APPROVAL_MATRIX_PATH = join(ROOT, 'src/lib/approval-matrix-engine.ts');
const APPROVAL_WORKFLOW_PATH = join(ROOT, 'src/lib/approval-workflow-engine.ts');
const AUDIT_TYPES_PATH = join(ROOT, 'src/types/audit-trail.ts');
const PAGE_PATH = join(ROOT, 'src/features/compliance-approval/ComplianceApprovalRulesPage.tsx');
const SIDEBAR_PATH = join(ROOT, 'src/apps/erp/configs/command-center-sidebar-config.ts');
const CC_PATH = join(ROOT, 'src/features/command-center/pages/CommandCenterPage.tsx');

const engineSrc = readFileSync(ENGINE_PATH, 'utf8');
const idea6Src = readFileSync(IDEA6_PATH, 'utf8');
const matrixSrc = readFileSync(APPROVAL_MATRIX_PATH, 'utf8');
const workflowSrc = readFileSync(APPROVAL_WORKFLOW_PATH, 'utf8');

beforeEach(() => {
  __resetOob8ForTests();
});

describe('Sprint 113 · OOB-8 Compliance-Aware Approval · engine surface', () => {
  it('engine file exists', () => {
    expect(existsSync(ENGINE_PATH)).toBe(true);
  });
  it('engine has @oob header', () => {
    expect(engineSrc).toMatch(/@oob\s+OOB-8/);
  });
  it('engine has @orchestrator header', () => {
    expect(engineSrc).toMatch(/@orchestrator/);
  });
  it('engine declares READS_FROM', () => {
    expect(READS_FROM.engines).toContain('idea-6-inter-dept-approval-bridge-engine');
    expect(READS_FROM.engines).toContain('comply360-statutory-payments-engine');
    expect(READS_FROM.engines).toContain('comply360-statutory-registers-engine');
  });
  it('DEFAULT_COMPLIANCE_APPROVAL_RULES length === 8', () => {
    expect(DEFAULT_COMPLIANCE_APPROVAL_RULES.length).toBe(8);
  });
  it('covers all 8 compliance dimensions', () => {
    const ids = DEFAULT_COMPLIANCE_APPROVAL_RULES.map((r) => r.rule_id).sort();
    expect(ids).toEqual([
      'capex_threshold',
      'cross_entity_transfer',
      'high_value_threshold',
      'msme_vendor_payment',
      'regulated_category',
      'related_party',
      'statutory_deadline_adjacent',
      'tds_tcs_applicable',
    ]);
  });
  it('listComplianceApprovalRules returns 8 rules by default', () => {
    expect(listComplianceApprovalRules().length).toBe(8);
  });
  it('setRuleActive toggles a rule off', () => {
    setRuleActive('high_value_threshold', false);
    const r = listComplianceApprovalRules().find((x) => x.rule_id === 'high_value_threshold');
    expect(r?.active).toBe(false);
  });
  it('setRuleActive toggles a rule back on', () => {
    setRuleActive('high_value_threshold', false);
    setRuleActive('high_value_threshold', true);
    const r = listComplianceApprovalRules().find((x) => x.rule_id === 'high_value_threshold');
    expect(r?.active).toBe(true);
  });
});

describe('Sprint 113 · evaluateComplianceApproval · rule firing by compliance context', () => {
  it('fires high_value_threshold above ₹5L', () => {
    const r = evaluateComplianceApproval({ txn_type: 'vendor_payment', amount: 600_000, entity_code: 'GLOBAL' });
    expect(r.rule_id).toBe('high_value_threshold');
    expect(r.requires_approval).toBe(true);
  });
  it('does not fire below ₹5L with no other context', () => {
    const r = evaluateComplianceApproval({ txn_type: 'vendor_payment', amount: 100_000, entity_code: 'GLOBAL' });
    expect(r.rule_id).toBeNull();
    expect(r.requires_approval).toBe(false);
  });
  it('fires statutory_deadline_adjacent', () => {
    const r = evaluateComplianceApproval({ txn_type: 'gst_payment', amount: 50_000, entity_code: 'GLOBAL', near_statutory_deadline: true });
    expect(r.rule_id).toBe('statutory_deadline_adjacent');
  });
  it('fires regulated_category', () => {
    const r = evaluateComplianceApproval({ txn_type: 'nbfc_advance', amount: 10_000, entity_code: 'GLOBAL', regulated: true });
    expect(r.rule_id).toBe('regulated_category');
  });
  it('fires cross_entity_transfer', () => {
    const r = evaluateComplianceApproval({ txn_type: 'ic_transfer', amount: 10_000, entity_code: 'GLOBAL', cross_entity: true });
    expect(r.rule_id).toBe('cross_entity_transfer');
  });
  it('fires tds_tcs_applicable', () => {
    const r = evaluateComplianceApproval({ txn_type: 'professional_fees', amount: 30_000, entity_code: 'GLOBAL', tds_tcs: true });
    expect(r.rule_id).toBe('tds_tcs_applicable');
  });
  it('fires related_party', () => {
    const r = evaluateComplianceApproval({ txn_type: 'sister_payment', amount: 1000, entity_code: 'GLOBAL', related_party: true });
    expect(r.rule_id).toBe('related_party');
  });
  it('fires msme_vendor_payment', () => {
    const r = evaluateComplianceApproval({ txn_type: 'vendor_payment', amount: 10_000, entity_code: 'GLOBAL', vendor_msme: true });
    expect(r.rule_id).toBe('msme_vendor_payment');
  });
  it('fires capex_threshold above ₹10L', () => {
    const r = evaluateComplianceApproval({ txn_type: 'capex', amount: 1_500_000, entity_code: 'GLOBAL', is_capex: true });
    expect(r.rule_id).toBe('capex_threshold');
  });
  it('returns reason text when no rule fires', () => {
    const r = evaluateComplianceApproval({ txn_type: 'petty', amount: 100, entity_code: 'GLOBAL' });
    expect(r.reason).toMatch(/No compliance rule/i);
  });
});

describe('Sprint 113 · orchestration · routes THROUGH idea-6 (FR-44)', () => {
  it('routing CALLS idea-6 evaluateInterDeptApproval and gets a workflow_id', () => {
    const before = Idea6.listInterDeptWorkflows().length;
    const r = evaluateComplianceApproval({ txn_type: 'vendor_payment', amount: 800_000, entity_code: 'GLOBAL' });
    expect(r.routed_workflow_id).toBeTruthy();
    const after = Idea6.listInterDeptWorkflows().length;
    expect(after).toBeGreaterThan(before);
  });
  it('stores routed_workflow_id in OOB-8 routed-workflows side store', () => {
    const r = evaluateComplianceApproval({ txn_type: 'vendor_payment', amount: 800_000, entity_code: 'GLOBAL' });
    const routed = listRoutedWorkflows();
    expect(routed.find((w) => w.routed_workflow_id === r.routed_workflow_id)).toBeTruthy();
  });
  it('decideComplianceApproval routes decision through idea-6 recordInterDeptDecision', () => {
    const r = evaluateComplianceApproval({ txn_type: 'vendor_payment', amount: 800_000, entity_code: 'GLOBAL' });
    const dec = decideComplianceApproval(r.routed_workflow_id!, 'approved', 'ok');
    expect(dec.ok).toBe(true);
    const routed = listRoutedWorkflows();
    expect(routed.find((w) => w.routed_workflow_id === r.routed_workflow_id)?.decision).toBe('approved');
  });
  it('OOB-8 boundary maps compliance context → idea-6 {from_department,to_department,internal_price,budget_rate}', () => {
    // Engine source must explicitly call evaluateInterDeptApproval with these four keys
    expect(engineSrc).toMatch(/evaluateInterDeptApproval\(/);
    expect(engineSrc).toMatch(/from_department:/);
    expect(engineSrc).toMatch(/to_department:/);
    expect(engineSrc).toMatch(/internal_price:/);
    expect(engineSrc).toMatch(/budget_rate[,:]/);
  });
});

describe('Sprint 113 · FR-44 · engine does NOT reimplement idea-6/approval-matrix/approval-workflow', () => {
  it('engine does NOT redefine findApplicableTemplate', () => {
    expect(engineSrc).not.toMatch(/function\s+findApplicableTemplate\b/);
  });
  it('engine does NOT redefine routeForApproval', () => {
    expect(engineSrc).not.toMatch(/function\s+routeForApproval\b/);
  });
  it('engine does NOT redefine a workflow state machine (submit/approve/reject)', () => {
    expect(engineSrc).not.toMatch(/function\s+(submit|approve|reject)\b/);
  });
  it('engine does NOT redefine evaluateInterDeptApproval (only calls it)', () => {
    expect(engineSrc).not.toMatch(/function\s+evaluateInterDeptApproval\b/);
  });
  it('engine does NOT redefine recordInterDeptDecision (only calls it)', () => {
    expect(engineSrc).not.toMatch(/function\s+recordInterDeptDecision\b/);
  });
});

describe('Sprint 113 · 0-DIFF upstream engines', () => {
  it('idea-6 still exports evaluateInterDeptApproval and recordInterDeptDecision', () => {
    expect(idea6Src).toMatch(/export function evaluateInterDeptApproval/);
    expect(idea6Src).toMatch(/export function recordInterDeptDecision/);
    expect(idea6Src).toMatch(/INTER_DEPT_THRESHOLD_PCT\s*=\s*5/);
  });
  it('approval-matrix-engine still exports findApplicableTemplate and routeForApproval', () => {
    expect(matrixSrc).toMatch(/export function findApplicableTemplate/);
    expect(matrixSrc).toMatch(/export function routeForApproval/);
  });
  it('approval-workflow-engine file is present and untouched-shape (exports submit/approve/reject)', () => {
    expect(workflowSrc).toMatch(/export function submit\b/);
    expect(workflowSrc).toMatch(/export function approve\b/);
    expect(workflowSrc).toMatch(/export function reject\b/);
  });
});

describe('Sprint 113 · SCOPE WALL · OOB-8 only', () => {
  it('engine does NOT export OOB-13 workpaper functions (S114 scope)', () => {
    expect(engineSrc).not.toMatch(/workpaper|oob13|OOB-13/i);
  });
  it('engine does NOT export Pillar-C.3 governance functions (S115 scope)', () => {
    expect(engineSrc).not.toMatch(/pillar[-_]?c\.?3|governance[-_]engine/i);
  });
  it('no OOB-13 engine file exists yet', () => {
    expect(existsSync(join(ROOT, 'src/lib/oob13-workpapers-engine.ts'))).toBe(false);
  });
});

describe('Sprint 113 · HONEST METRICS (DP-A4-8) · no fake "15/16" register', () => {
  it('engine source does NOT assert any "15/16" or "16/16" certified register', () => {
    expect(engineSrc).not.toMatch(/15\s*\/\s*16/);
    expect(engineSrc).not.toMatch(/16\s*\/\s*16/);
    expect(engineSrc).not.toMatch(/oob_count_register|OOB_CERTIFIED/i);
  });
  it('no machine OOB counter export', () => {
    expect(engineSrc).not.toMatch(/export\s+(const|function|let|var)\s+OOB_COUNT/);
  });
});

describe('Sprint 113 · audit · oob8_approval_rule_event added (mca-roc)', () => {
  it('audit-trail.ts contains oob8_approval_rule_event', () => {
    const src = readFileSync(AUDIT_TYPES_PATH, 'utf8');
    expect(src).toMatch(/'oob8_approval_rule_event'/);
  });
  it('only ONE new OOB-8 audit type is added', () => {
    const src = readFileSync(AUDIT_TYPES_PATH, 'utf8');
    const m = src.match(/oob8_/g) ?? [];
    // appears in a few comment lines + the type union — but only one '_event' identifier
    const ids = src.match(/'oob8_[a-z_]+'/g) ?? [];
    expect(new Set(ids).size).toBe(1);
    expect(m.length).toBeGreaterThan(0);
  });
});

describe('Sprint 113 · page #40 wiring · NOT a sibling', () => {
  it('ComplianceApprovalRulesPage file exists', () => {
    expect(existsSync(PAGE_PATH)).toBe(true);
  });
  it('page reads from oob8-compliance-aware-approval-engine (no dead UI)', () => {
    const src = readFileSync(PAGE_PATH, 'utf8');
    expect(src).toMatch(/oob8-compliance-aware-approval-engine/);
    expect(src).toMatch(/listComplianceApprovalRules|evaluateComplianceApproval/);
  });
  it('sidebar has fincore-compliance-approval-rules type:item entry', () => {
    const src = readFileSync(SIDEBAR_PATH, 'utf8');
    expect(src).toMatch(/fincore-compliance-approval-rules/);
    expect(src).toMatch(/Compliance Approval Rules/);
  });
  it('CommandCenterPage wires fincore-compliance-approval-rules case', () => {
    const src = readFileSync(CC_PATH, 'utf8');
    expect(src).toMatch(/case 'fincore-compliance-approval-rules':\s+return <ComplianceApprovalRulesPage/);
  });
  it('page is NOT registered as a SIBLING', () => {
    const ids = SIBLINGS.map((s) => s.id);
    expect(ids).not.toContain('compliance-approval-rules-page');
    expect(ids).not.toContain('fincore-compliance-approval-rules');
  });
});

describe('Sprint 113 · sibling-register +1 (181→182) + ComplianceModule untouched', () => {
  it('getSiblingCount >= 182', () => {
    expect(getSiblingCount()).toBeGreaterThanOrEqual(182);
  });
  it('oob8-compliance-aware-approval-engine appears exactly ONCE', () => {
    const matches = SIBLINGS.filter((s) => s.id === 'oob8-compliance-aware-approval-engine');
    expect(matches.length).toBe(1);
  });
  it('comply360-tier2-extensions-engine still appears exactly ONCE', () => {
    const matches = SIBLINGS.filter((s) => s.id === 'comply360-tier2-extensions-engine');
    expect(matches.length).toBe(1);
  });
  it('all sibling ids unique', () => {
    const ids = SIBLINGS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('Sprint 113 · sprint-history · S112 backfilled + S113 appended · no S114 entry', () => {
  it('S112 headSha = c8ddef29... (Block 1 backfill)', () => {
    const s112 = SPRINTS.find((s) => s.sprintNumber === 112);
    expect(s112?.headSha).toBe('c8ddef29a3ec1a1d1015e80ff63da517ee76cedc');
  });
  it('S113 entry exists with TBD_AT_BANK and correct predecessor', () => {
    const s113 = SPRINTS.find((s) => s.sprintNumber === 113);
    expect(s113).toBeTruthy();
    expect(s113?.headSha).toBe('TBD_AT_BANK');
    expect(s113?.predecessorSha).toBe('c8ddef29a3ec1a1d1015e80ff63da517ee76cedc');
    expect(s113?.newSiblings).toContain('oob8-compliance-aware-approval-engine');
  });
  it('no S114 entry pre-created (Guardrail 2)', () => {
    expect(SPRINTS.find((s) => s.sprintNumber === 114)).toBeFalsy();
  });
});

describe('Sprint 113 · Guardrail 3 · no banked test asserts equality on getSiblingCount above current floor', () => {
  it('no toBe(N) sibling-count equality outside meta/self test files', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { execSync } = require('node:child_process');
    let out = '';
    try {
      out = execSync(
        `grep -rln --include="*.ts" "getSiblingCount()).toBe(" src/test/ | grep -vE "sprint-(77b|78b|79b|79c|79d|113)/" || true`,
      ).toString().trim();
    } catch { /* no matches ok */ }
    expect(out).toBe('');
  });
});
