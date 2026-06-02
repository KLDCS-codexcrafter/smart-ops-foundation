/**
 * @file        src/test/sprint-115/inter-dept-governance.test.ts
 * @sprint      Sprint 115 · T-Phase-6.C.3.1-CLOSE · 🏁🎉 PHASE 6 FINALE
 * @floor       v1.30 §N · ≥30 discrete it() · TIME-ROBUST (no toBeUndefined / no future-file
 *              existsSync tombstones) · scope-wall + honest-metrics + FR-44 0-DIFF + ceremony §A/§B.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

import {
  auditInterDeptBridges,
  listGovernedBridges,
  NARRATIVE_HEADLINE_FIGURES,
  READS_FROM,
} from '@/lib/inter-dept-governance-engine';
import { getSiblingCount, SIBLINGS } from '@/lib/_institutional/sibling-register';
import { SPRINTS } from '@/lib/_institutional/sprint-history';

const ROOT = process.cwd();
const ENGINE_PATH = join(ROOT, 'src/lib/inter-dept-governance-engine.ts');
const PAGE_PATH = join(ROOT, 'src/features/inter-dept-governance/InterDeptGovernancePage.tsx');
const CEREMONY_PATH = join(ROOT, 'docs/Operix_Phase6_Close_Ceremony.md');
const AUDIT_TYPES_PATH = join(ROOT, 'src/types/audit-trail.ts');
const IDEA6_PATH = join(ROOT, 'src/lib/idea-6-inter-dept-approval-bridge-engine.ts');
const OOB8_PATH = join(ROOT, 'src/lib/oob8-compliance-aware-approval-engine.ts');
const COMPLIANCE_MODULE_PATH = join(ROOT, 'src/lib/comply360-health-score-engine.ts');
const SIDEBAR_PATH = join(ROOT, 'src/apps/erp/configs/command-center-sidebar-config.ts');
const CC_PAGE_PATH = join(ROOT, 'src/features/command-center/pages/CommandCenterPage.tsx');
const S114_CLOSE_SUMMARY_PATH = join(ROOT, 'audit_workspace/T-Phase-6.B.OOB.2/Z_close_evidence/close_summary.md');
const S114_TEST_PATH = join(ROOT, 'src/test/sprint-114/oob13-workpaper-autopop.test.ts');

const engineSrc = readFileSync(ENGINE_PATH, 'utf8');
const pageSrc = readFileSync(PAGE_PATH, 'utf8');
const ceremonySrc = readFileSync(CEREMONY_PATH, 'utf8');
const auditTypesSrc = readFileSync(AUDIT_TYPES_PATH, 'utf8');
const idea6Src = readFileSync(IDEA6_PATH, 'utf8');
const oob8Src = readFileSync(OOB8_PATH, 'utf8');

// ────────────────────────────────────────────────────────────────────────────
describe('Sprint 115 · file scaffold (time-robust)', () => {
  it('engine file exists at canonical path', () => {
    expect(existsSync(ENGINE_PATH)).toBe(true);
  });
  it('engine name is inter-dept-governance-engine (NOT pillar-c3-governance-engine)', () => {
    expect(existsSync(join(ROOT, 'src/lib/pillar-c3-governance-engine.ts'))).toBe(false);
  });
  it('page file exists at canonical path', () => {
    expect(existsSync(PAGE_PATH)).toBe(true);
  });
  it('ceremony doc exists', () => {
    expect(existsSync(CEREMONY_PATH)).toBe(true);
  });
  it('S114 close-summary committed (cleanup)', () => {
    expect(existsSync(S114_CLOSE_SUMMARY_PATH)).toBe(true);
  });
});

// ────────────────────────────────────────────────────────────────────────────
describe('Sprint 115 · engine headers + READS_FROM (FR-44)', () => {
  it('engine declares @pillar C.3', () => {
    expect(engineSrc).toMatch(/@pillar\s+C\.3/);
  });
  it('engine declares @fr-44 wall', () => {
    expect(engineSrc).toMatch(/@fr-44/);
  });
  it('engine declares READS_FROM with idea-6 + oob8 + sibling-register', () => {
    expect(READS_FROM.engines).toContain('idea-6-inter-dept-approval-bridge-engine');
    expect(READS_FROM.engines).toContain('oob8-compliance-aware-approval-engine');
    expect(READS_FROM.engines).toContain('_institutional/sibling-register');
  });
});

// ────────────────────────────────────────────────────────────────────────────
describe('Sprint 115 · auditInterDeptBridges READS the bridge sources', () => {
  const res = auditInterDeptBridges({ fy: 'FY25-26' });
  it('returns the requested FY', () => {
    expect(res.fy).toBe('FY25-26');
  });
  it('enumerates at least the idea-6 and oob8 bridges', () => {
    const ids = res.bridges.map((b) => b.bridge_id);
    expect(ids).toContain('idea-6-inter-dept-approval-bridge-engine');
    expect(ids).toContain('oob8-compliance-aware-approval-engine');
  });
  it('total_bridges equals bridges.length (ACTUAL enumerated count)', () => {
    expect(res.total_bridges).toBe(res.bridges.length);
  });
  it('total_bridges is at least 2 (idea-6 + oob8)', () => {
    expect(res.total_bridges).toBeGreaterThanOrEqual(2);
  });
  it('total_bridges is NOT hardcoded to the narrative 29', () => {
    expect(res.total_bridges).not.toBe(29);
  });
  it('sources_read includes all three READ sources (transparency · FR-91)', () => {
    expect(res.sources_read).toContain('idea-6-inter-dept-approval-bridge-engine.listInterDeptWorkflows');
    expect(res.sources_read).toContain('oob8-compliance-aware-approval-engine.listComplianceApprovalRules');
    expect(res.sources_read).toContain('_institutional/sibling-register.SIBLINGS');
  });
});

// ────────────────────────────────────────────────────────────────────────────
describe('Sprint 115 · exceptions detection', () => {
  it('exceptions is an array', () => {
    const res = auditInterDeptBridges();
    expect(Array.isArray(res.exceptions)).toBe(true);
  });
  it('flags oob8 "no active rules" when rules are inactive (default empty store)', () => {
    const res = auditInterDeptBridges();
    const oob8Row = res.bridges.find((b) => b.bridge_id === 'oob8-compliance-aware-approval-engine');
    expect(oob8Row).toBeTruthy();
    if (oob8Row && oob8Row.active_rules === 0) {
      const flagged = res.exceptions.some(
        (e) => e.bridge_id === 'oob8-compliance-aware-approval-engine' && /no active rules/i.test(e.issue),
      );
      expect(flagged).toBe(true);
    }
  });
});

// ────────────────────────────────────────────────────────────────────────────
describe('Sprint 115 · listGovernedBridges (read-only convenience)', () => {
  it('returns a non-empty array', () => {
    const rows = listGovernedBridges();
    expect(rows.length).toBeGreaterThanOrEqual(2);
  });
  it('row shape includes bridge_id + bridge_type + source_engine', () => {
    const rows = listGovernedBridges();
    for (const r of rows) {
      expect(typeof r.bridge_id).toBe('string');
      expect(['inter_dept_approval', 'compliance_approval', 'other']).toContain(r.bridge_type);
      expect(typeof r.source_engine).toBe('string');
    }
  });
});

// ────────────────────────────────────────────────────────────────────────────
describe('Sprint 115 · audit type added · ComplianceModule UNTOUCHED', () => {
  it('audit-trail.ts contains inter_dept_governance_audit', () => {
    expect(auditTypesSrc).toMatch(/'inter_dept_governance_audit'/);
  });
  it('audit type carries mca-roc context comment', () => {
    expect(auditTypesSrc).toMatch(/inter-dept-governance-engine[\s\S]{0,400}mca-roc/i);
  });
  it('ComplianceModule has not gained a c3-governance variant', () => {
    if (!existsSync(COMPLIANCE_MODULE_PATH)) return;
    const src = readFileSync(COMPLIANCE_MODULE_PATH, 'utf8');
    expect(src).not.toMatch(/c3[-_ ]?governance/i);
  });
});

// ────────────────────────────────────────────────────────────────────────────
describe('Sprint 115 · FR-44 · idea-6 + oob8 + approval engines 0-DIFF', () => {
  it('idea-6 still exports listInterDeptWorkflows', () => {
    expect(idea6Src).toMatch(/export function listInterDeptWorkflows/);
  });
  it('idea-6 still exports evaluateInterDeptApproval', () => {
    expect(idea6Src).toMatch(/export function evaluateInterDeptApproval/);
  });
  it('oob8 still exports listComplianceApprovalRules', () => {
    expect(oob8Src).toMatch(/export function listComplianceApprovalRules/);
  });
  it('governance engine does NOT import write fns from idea-6', () => {
    expect(engineSrc).not.toMatch(/evaluateInterDeptApproval|recordInterDeptDecision/);
  });
  it('governance engine does NOT import write fns from oob8', () => {
    expect(engineSrc).not.toMatch(/setRuleActive|evaluateComplianceApproval|decideComplianceApproval/);
  });
});

// ────────────────────────────────────────────────────────────────────────────
describe('Sprint 115 · SCOPE WALL · no bridge-mutation functions', () => {
  it('engine does NOT export create/update/delete bridge fns', () => {
    expect(engineSrc).not.toMatch(/export function\s+(create|update|delete|mutate|write)Bridge/i);
  });
  it('engine does NOT export workflow-mutation fns', () => {
    expect(engineSrc).not.toMatch(/export function\s+(submit|approve|reject)(InterDept|Bridge)/i);
  });
  it('engine never calls localStorage.setItem', () => {
    expect(engineSrc).not.toMatch(/localStorage\.setItem/);
  });
});

// ────────────────────────────────────────────────────────────────────────────
describe('Sprint 115 · HONEST METRICS (DP-A4-8 · FR-91)', () => {
  it('engine does NOT export a numeric "16/16" certified register', () => {
    expect(engineSrc).not.toMatch(/export\s+(const|let|var)\s+OOB_COUNT/);
    expect(engineSrc).not.toMatch(/OOB_CERTIFIED|oob_count_register/i);
  });
  it('engine does NOT hardcode total_bridges to 29 anywhere', () => {
    expect(engineSrc).not.toMatch(/total_bridges\s*[:=]\s*29\b/);
  });
  it('NARRATIVE_HEADLINE_FIGURES flags itself as narrative', () => {
    expect(NARRATIVE_HEADLINE_FIGURES.oobs_functional_narrative).toBe('16/16');
    expect(NARRATIVE_HEADLINE_FIGURES.bridges_narrative).toBe('29');
    expect(NARRATIVE_HEADLINE_FIGURES.disclaimer).toMatch(/NOT machine-certified/i);
  });
  it('engine source does not say "fully certified 16/16"', () => {
    expect(engineSrc).not.toMatch(/fully\s+certified\s+16\s*\/\s*16/i);
  });
  it('ceremony doc does not say "fully certified 16/16"', () => {
    expect(ceremonySrc).not.toMatch(/fully\s+certified\s+16\s*\/\s*16/i);
  });
});

// ────────────────────────────────────────────────────────────────────────────
describe('Sprint 115 · Phase-6 Close Ceremony doc §A vs §B', () => {
  it('ceremony has §A · Register-Certified section', () => {
    expect(ceremonySrc).toMatch(/§A · Register-Certified/);
  });
  it('ceremony has §B · Narrative Claims section', () => {
    expect(ceremonySrc).toMatch(/§B · Narrative Claims/);
  });
  it('ceremony §B section explicitly references the 16/16 OOBs claim', () => {
    const sectionB = ceremonySrc.split('§B · Narrative Claims')[1] ?? '';
    expect(sectionB).toMatch(/16\/16/);
  });
  it('ceremony §B section explicitly references the 29 inter-dept bridges claim', () => {
    const sectionB = ceremonySrc.split('§B · Narrative Claims')[1] ?? '';
    expect(sectionB).toMatch(/29 inter-dept bridges/);
  });
  it('ceremony references the 5-arc journey', () => {
    expect(ceremonySrc).toMatch(/5-Arc Journey/i);
    expect(ceremonySrc).toMatch(/Horizon 1\.5/);
  });
  it('ceremony includes the honest cycle-2 record', () => {
    expect(ceremonySrc).toMatch(/Cycle-2/i);
  });
});

// ────────────────────────────────────────────────────────────────────────────
describe('Sprint 115 · sibling-register · 183 → 184', () => {
  it('inter-dept-governance-engine appears exactly once', () => {
    const matches = SIBLINGS.filter((s) => s.id === 'inter-dept-governance-engine');
    expect(matches.length).toBe(1);
  });
  it('comply360-tier2-extensions-engine still appears exactly once', () => {
    const matches = SIBLINGS.filter((s) => s.id === 'comply360-tier2-extensions-engine');
    expect(matches.length).toBe(1);
  });
  it('getSiblingCount() >= 184 (floor-style assertion · S110 T1 lesson · no exact-equality)', () => {
    expect(getSiblingCount()).toBeGreaterThanOrEqual(184);
  });
});

// ────────────────────────────────────────────────────────────────────────────
describe('Sprint 115 · sprint-history · S115 appended (final · time-robust)', () => {
  const s114 = SPRINTS.find((s) => s.sprintNumber === 114);
  const s115 = SPRINTS.find((s) => s.sprintNumber === 115);
  it('S114 sha backfilled to 0eb85e87…', () => {
    expect(s114?.headSha).toBe('0eb85e876271380bd526dd6d0901035665996001');
  });
  it('S115 entry exists', () => {
    expect(s115).toBeTruthy();
  });
  it('S115 newSiblings lists inter-dept-governance-engine', () => {
    expect(s115?.newSiblings).toContain('inter-dept-governance-engine');
  });
  it('S115 headSha is TBD_AT_BANK (legitimately the last open entry)', () => {
    expect(s115?.headSha).toBe('TBD_AT_BANK');
  });
  it('S115 predecessorSha is 0eb85e87…', () => {
    expect(s115?.predecessorSha).toBe('0eb85e876271380bd526dd6d0901035665996001');
  });
  it('S115 grade starts with A', () => {
    expect(s115?.grade?.startsWith('A')).toBe(true);
  });
});

// ────────────────────────────────────────────────────────────────────────────
describe('Sprint 115 · Page #42 wiring (NOT a SIBLID)', () => {
  it('sidebar registers fincore-inter-dept-governance as type:item', () => {
    const src = readFileSync(SIDEBAR_PATH, 'utf8');
    expect(src).toMatch(/fincore-inter-dept-governance/);
    expect(src).toMatch(/type:\s*'item'[\s\S]{0,200}fincore-inter-dept-governance|fincore-inter-dept-governance[\s\S]{0,200}type:\s*'item'/);
  });
  it('CC page imports InterDeptGovernancePage and has a render case', () => {
    const src = readFileSync(CC_PAGE_PATH, 'utf8');
    expect(src).toMatch(/InterDeptGovernancePage/);
    expect(src).toMatch(/case\s+'fincore-inter-dept-governance'/);
  });
  it('page reads the engine (no dead UI)', () => {
    expect(pageSrc).toMatch(/auditInterDeptBridges|listGovernedBridges/);
  });
  it('page is NOT registered as a SIBLID', () => {
    const ids = SIBLINGS.map((s) => s.id);
    expect(ids).not.toContain('fincore-inter-dept-governance');
    expect(ids).not.toContain('InterDeptGovernancePage');
  });
});

// ────────────────────────────────────────────────────────────────────────────
describe('Sprint 115 · S114 cleanups verified', () => {
  it('S114 close-summary file is non-empty and mentions §L', () => {
    const src = readFileSync(S114_CLOSE_SUMMARY_PATH, 'utf8');
    expect(src.length).toBeGreaterThan(200);
    expect(src).toMatch(/§L/);
    expect(src).toMatch(/honest[-_ ]metrics/i);
  });
  it('S114 test no longer asserts existsSync(future governance file)', () => {
    const src = readFileSync(S114_TEST_PATH, 'utf8');
    expect(src).not.toMatch(/existsSync\([^)]*pillar-c3-governance-engine\.ts[^)]*\)\s*\)\.toBe\(false\)/);
  });
  it('S114 retargeted assertion uses the still-true /auditBridges|governanceAudit/ invariant', () => {
    const src = readFileSync(S114_TEST_PATH, 'utf8');
    expect(src).toMatch(/auditBridges\|governanceAudit/);
  });
});
