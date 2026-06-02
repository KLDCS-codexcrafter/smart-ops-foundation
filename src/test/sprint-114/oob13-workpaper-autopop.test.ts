/**
 * @file        src/test/sprint-114/oob13-workpaper-autopop.test.ts
 * @sprint      T-Phase-6.B.OOB.2 · Sprint 114 · Arc 4 · §N test pack (≥30 discrete it())
 * @asserts     OOB-13 10 templates · per-template source-engine read · FR-44 no figure rebuild ·
 *              0-DIFF of upstream engines · SCOPE WALL · HONEST METRICS (no "16/16" register) ·
 *              sibling count 183 · audit type added · page wired · TIME-ROBUST own assertions.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

import {
  WORKPAPER_TEMPLATES,
  TEMPLATE_SOURCE_ENGINE,
  autoPopulateWorkpaper,
  autoPopulateAll,
  listWorkpapers,
  sumWorkpaperTotals,
  __resetWorkpapersForTests,
  READS_FROM,
} from '@/lib/oob13-workpaper-autopop-engine';

import * as Idea7 from '@/lib/idea-7-transfer-pricing-audit-engine';
import * as MultiGaap from '@/lib/multi-gaap-depreciation-engine';
import * as TdsAgg from '@/lib/comply360-tds-aggregator-engine';
import * as CostAudit from '@/lib/comply360-cost-audit-engine';
import * as StatReg from '@/lib/comply360-statutory-registers-engine';
import * as GroupCons from '@/lib/group-consolidation-engine';
import * as ConsBS from '@/lib/consolidated-balance-sheet-engine';
import * as DiscPack from '@/lib/consolidation-disclosure-engine';

import { getSiblingCount, SIBLINGS } from '@/lib/_institutional/sibling-register';
import { SPRINTS } from '@/lib/_institutional/sprint-history';

const ROOT = process.cwd();
const ENGINE_PATH = join(ROOT, 'src/lib/oob13-workpaper-autopop-engine.ts');
const PAGE_PATH = join(ROOT, 'src/features/workpaper-autopop/WorkpaperAutoPopPage.tsx');
const SIDEBAR_PATH = join(ROOT, 'src/apps/erp/configs/command-center-sidebar-config.ts');
const CC_PATH = join(ROOT, 'src/features/command-center/pages/CommandCenterPage.tsx');
const AUDIT_TYPES_PATH = join(ROOT, 'src/types/audit-trail.ts');
const COMPLIANCE_MODULE_PATH = join(ROOT, 'src/features/command-center/modules/ComplianceModule.tsx');

const engineSrc = readFileSync(ENGINE_PATH, 'utf8');
const FY = 'FY25-26';
const EC = 'OPERIX-DEMO';

beforeEach(() => {
  __resetWorkpapersForTests();
  vi.restoreAllMocks();
});

// ───────────────────────────────────────────────────────────────────────────
describe('Sprint 114 · OOB-13 engine surface', () => {
  it('engine file exists', () => {
    expect(existsSync(ENGINE_PATH)).toBe(true);
  });
  it('engine has @oob OOB-13 header', () => {
    expect(engineSrc).toMatch(/@oob\s+OOB-13/);
  });
  it('engine has @fr-44 header (pure assembly)', () => {
    expect(engineSrc).toMatch(/@fr-44/);
  });
  it('engine has @reads-from header listing all 8 source engines', () => {
    expect(engineSrc).toMatch(/@reads-from[\s\S]*idea-7[\s\S]*multi-gaap[\s\S]*tds-aggregator[\s\S]*cost-audit[\s\S]*statutory-registers[\s\S]*group-consolidation[\s\S]*consolidation-disclosure/);
  });
  it('READS_FROM.engines lists all required source engines', () => {
    const need = [
      'idea-7-transfer-pricing-audit-engine',
      'multi-gaap-depreciation-engine',
      'comply360-tds-aggregator-engine',
      'comply360-cost-audit-engine',
      'comply360-statutory-registers-engine',
      'group-consolidation-engine',
      'consolidated-balance-sheet-engine',
      'consolidation-disclosure-engine',
    ];
    for (const n of need) expect(READS_FROM.engines as readonly string[]).toContain(n);
  });
});

describe('Sprint 114 · 10 workpaper templates (institutional ceiling)', () => {
  it('WORKPAPER_TEMPLATES length === 10', () => {
    expect(WORKPAPER_TEMPLATES.length).toBe(10);
  });
  it('all 10 expected template ids present', () => {
    const ids = [...WORKPAPER_TEMPLATES].sort();
    expect(ids).toEqual([
      'consolidation', 'cost_audit', 'depreciation_reconciliation', 'fixed_asset_register',
      'gst_reconciliation', 'provisions', 'related_party', 'statutory_register_extract',
      'tds_reconciliation', 'transfer_pricing',
    ]);
  });
  it('TEMPLATE_SOURCE_ENGINE map covers every template id', () => {
    for (const t of WORKPAPER_TEMPLATES) {
      expect(typeof TEMPLATE_SOURCE_ENGINE[t]).toBe('string');
      expect(TEMPLATE_SOURCE_ENGINE[t].length).toBeGreaterThan(0);
    }
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe('Sprint 114 · per-template source-engine reads (FR-44 USE-SITE READS)', () => {
  it('transfer_pricing calls idea-7.listTPAudits', () => {
    const spy = vi.spyOn(Idea7, 'listTPAudits');
    autoPopulateWorkpaper({ template_id: 'transfer_pricing', fy: FY, entity_code: EC });
    expect(spy).toHaveBeenCalled();
  });
  it('depreciation_reconciliation calls multi-gaap.compareMultiGAAPBooks', () => {
    const spy = vi.spyOn(MultiGaap, 'compareMultiGAAPBooks');
    autoPopulateWorkpaper({ template_id: 'depreciation_reconciliation', fy: FY, entity_code: EC });
    expect(spy).toHaveBeenCalled();
  });
  it('tds_reconciliation calls tds-aggregator.aggregateBySection', () => {
    const spy = vi.spyOn(TdsAgg, 'aggregateBySection');
    autoPopulateWorkpaper({ template_id: 'tds_reconciliation', fy: FY, entity_code: EC });
    expect(spy).toHaveBeenCalled();
  });
  it('cost_audit calls cost-audit.listCostAuditorAppointments', () => {
    const spy = vi.spyOn(CostAudit, 'listCostAuditorAppointments');
    autoPopulateWorkpaper({ template_id: 'cost_audit', fy: FY, entity_code: EC });
    expect(spy).toHaveBeenCalled();
  });
  it('statutory_register_extract calls statutory-registers.listRegisterEntries', () => {
    const spy = vi.spyOn(StatReg, 'listRegisterEntries');
    autoPopulateWorkpaper({ template_id: 'statutory_register_extract', fy: FY, entity_code: EC });
    expect(spy).toHaveBeenCalled();
  });
  it('consolidation calls group-consolidation.buildConsolidatedPnL', () => {
    const spy = vi.spyOn(GroupCons, 'buildConsolidatedPnL');
    autoPopulateWorkpaper({ template_id: 'consolidation', fy: FY, entity_code: EC });
    expect(spy).toHaveBeenCalled();
  });
  it('gst_reconciliation calls consolidation-disclosure.buildDisclosurePack', () => {
    const spy = vi.spyOn(DiscPack, 'buildDisclosurePack');
    autoPopulateWorkpaper({ template_id: 'gst_reconciliation', fy: FY, entity_code: EC });
    expect(spy).toHaveBeenCalled();
  });
  it('related_party calls idea-7.listTPAudits', () => {
    const spy = vi.spyOn(Idea7, 'listTPAudits');
    autoPopulateWorkpaper({ template_id: 'related_party', fy: FY, entity_code: EC });
    expect(spy).toHaveBeenCalled();
  });
  it('fixed_asset_register calls multi-gaap.computeMultiGAAPDepreciation', () => {
    const spy = vi.spyOn(MultiGaap, 'computeMultiGAAPDepreciation');
    autoPopulateWorkpaper({ template_id: 'fixed_asset_register', fy: FY, entity_code: EC });
    expect(spy).toHaveBeenCalled();
  });
  it('provisions calls consolidated-balance-sheet.buildBalanceSheet', () => {
    const spy = vi.spyOn(ConsBS, 'buildBalanceSheet');
    autoPopulateWorkpaper({ template_id: 'provisions', fy: FY, entity_code: EC });
    expect(spy).toHaveBeenCalled();
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe('Sprint 114 · empty source → skeleton (honest · no fabrication)', () => {
  it('transfer_pricing returns populated:false when listTPAudits empty', () => {
    vi.spyOn(Idea7, 'listTPAudits').mockReturnValue([]);
    const wp = autoPopulateWorkpaper({ template_id: 'transfer_pricing', fy: FY, entity_code: EC });
    expect(wp.populated).toBe(false);
    expect(wp.rows.length).toBe(0);
    expect(wp.skeleton_reason).toBeTruthy();
  });
  it('cost_audit skeleton when listCostAuditorAppointments empty', () => {
    vi.spyOn(CostAudit, 'listCostAuditorAppointments').mockReturnValue([]);
    const wp = autoPopulateWorkpaper({ template_id: 'cost_audit', fy: FY, entity_code: EC });
    expect(wp.populated).toBe(false);
    expect(wp.skeleton_reason).toMatch(/empty|no/i);
  });
  it('skeleton workpaper still cites a source_engine (audit-traceable)', () => {
    vi.spyOn(Idea7, 'listTPAudits').mockReturnValue([]);
    const wp = autoPopulateWorkpaper({ template_id: 'transfer_pricing', fy: FY, entity_code: EC });
    expect(wp.source_engine).toBe('idea-7-transfer-pricing-audit-engine');
  });
});

describe('Sprint 114 · populated workpaper rows cite source_ref', () => {
  it('transfer_pricing rows carry source_ref to idea-7 record', () => {
    vi.spyOn(Idea7, 'listTPAudits').mockReturnValue([
      { tp_audit_id: 'TP-1', methodology: 'CUP', section92_applicable: true, threshold_basis_inr: 100000, form3ceb_snapshot_id: null } as unknown as Idea7.TPAuditRecord,
    ]);
    const wp = autoPopulateWorkpaper({ template_id: 'transfer_pricing', fy: FY, entity_code: EC });
    expect(wp.populated).toBe(true);
    expect(wp.rows[0].source_ref).toMatch(/idea-7-transfer-pricing-audit-engine\.listTPAudits#TP-1/);
  });
  it('tds_reconciliation rows carry source_ref to aggregateBySection section', () => {
    vi.spyOn(TdsAgg, 'aggregateBySection').mockReturnValue([
      { section: '194C', deduction_count: 3, gross_amount: 1000, tds_amount: 100, net_amount: 900, party_count: 2 },
    ]);
    const wp = autoPopulateWorkpaper({ template_id: 'tds_reconciliation', fy: FY, entity_code: EC });
    expect(wp.rows[0].source_ref).toMatch(/comply360-tds-aggregator-engine\.aggregateBySection#194C/);
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe('Sprint 114 · autoPopulateAll · 10 workpapers · audit · roll-up', () => {
  it('autoPopulateAll returns exactly 10 workpapers (one per template)', () => {
    const all = autoPopulateAll({ fy: FY, entity_code: EC });
    expect(all.length).toBe(10);
    const ids = all.map((w) => w.template_id).sort();
    expect(ids).toEqual([...WORKPAPER_TEMPLATES].sort());
  });
  it('listWorkpapers records every populated workpaper', () => {
    autoPopulateAll({ fy: FY, entity_code: EC });
    expect(listWorkpapers().length).toBe(10);
  });
  it('sumWorkpaperTotals returns a finite number', () => {
    const all = autoPopulateAll({ fy: FY, entity_code: EC });
    const total = sumWorkpaperTotals(all);
    expect(Number.isFinite(total)).toBe(true);
  });
  it('every workpaper has a generated_at ISO timestamp', () => {
    const all = autoPopulateAll({ fy: FY, entity_code: EC });
    for (const w of all) expect(w.generated_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe('Sprint 114 · FR-44 · engine does NOT reimplement source figure builders', () => {
  it('engine does NOT redefine generateTPAudit / listTPAudits', () => {
    expect(engineSrc).not.toMatch(/function\s+generateTPAudit\b/);
    expect(engineSrc).not.toMatch(/function\s+listTPAudits\b/);
  });
  it('engine does NOT redefine computeMultiGAAPDepreciation / compareMultiGAAPBooks', () => {
    expect(engineSrc).not.toMatch(/function\s+computeMultiGAAPDepreciation\b/);
    expect(engineSrc).not.toMatch(/function\s+compareMultiGAAPBooks\b/);
  });
  it('engine does NOT redefine aggregateBySection / aggregateTDSDeductions', () => {
    expect(engineSrc).not.toMatch(/function\s+aggregateBySection\b/);
    expect(engineSrc).not.toMatch(/function\s+aggregateTDSDeductions\b/);
  });
  it('engine does NOT redefine listCostAuditorAppointments', () => {
    expect(engineSrc).not.toMatch(/function\s+listCostAuditorAppointments\b/);
  });
  it('engine does NOT redefine buildConsolidatedPnL / buildBalanceSheet / buildDisclosurePack', () => {
    expect(engineSrc).not.toMatch(/function\s+buildConsolidatedPnL\b/);
    expect(engineSrc).not.toMatch(/function\s+buildBalanceSheet\b/);
    expect(engineSrc).not.toMatch(/function\s+buildDisclosurePack\b/);
  });
});

describe('Sprint 114 · 0-DIFF · upstream engines untouched', () => {
  it('idea-7 still exports listTPAudits / generateTPAudit', () => {
    const src = readFileSync(join(ROOT, 'src/lib/idea-7-transfer-pricing-audit-engine.ts'), 'utf8');
    expect(src).toMatch(/export function listTPAudits/);
    expect(src).toMatch(/export function generateTPAudit/);
  });
  it('multi-gaap-depreciation-engine still exports compareMultiGAAPBooks', () => {
    const src = readFileSync(join(ROOT, 'src/lib/multi-gaap-depreciation-engine.ts'), 'utf8');
    expect(src).toMatch(/export function compareMultiGAAPBooks/);
    expect(src).toMatch(/export function computeMultiGAAPDepreciation/);
  });
  it('comply360-tds-aggregator-engine still exports aggregateBySection', () => {
    const src = readFileSync(join(ROOT, 'src/lib/comply360-tds-aggregator-engine.ts'), 'utf8');
    expect(src).toMatch(/export function aggregateBySection/);
  });
  it('comply360-cost-audit-engine still exports listCostAuditorAppointments', () => {
    const src = readFileSync(join(ROOT, 'src/lib/comply360-cost-audit-engine.ts'), 'utf8');
    expect(src).toMatch(/export function listCostAuditorAppointments/);
  });
  it('group-consolidation-engine still exports buildConsolidatedPnL', () => {
    const src = readFileSync(join(ROOT, 'src/lib/group-consolidation-engine.ts'), 'utf8');
    expect(src).toMatch(/export function buildConsolidatedPnL/);
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe('Sprint 114 · SCOPE WALL · OOB-13 only', () => {
  it('engine does NOT export Pillar-C.3 governance functions (S115 scope)', () => {
    expect(engineSrc).not.toMatch(/pillar[-_]?c\.?3|governance[-_]engine/i);
  });
  it('engine does NOT add new financial-computation primitives', () => {
    // forbid common rebuild signatures
    expect(engineSrc).not.toMatch(/function\s+compute(Revenue|COGS|GrossProfit|NCI|Goodwill)\b/);
  });
  it('no S115 governance engine file exists yet', () => {
    expect(existsSync(join(ROOT, 'src/lib/pillar-c3-governance-engine.ts'))).toBe(false);
  });
});

describe('Sprint 114 · HONEST METRICS (DP-A4-8) · no machine "16/16" register', () => {
  it('engine source does NOT export any "16/16" certified counter', () => {
    expect(engineSrc).not.toMatch(/16\s*\/\s*16/);
    expect(engineSrc).not.toMatch(/OOB_CERTIFIED|oob_count_register/i);
  });
  it('no machine OOB-count export', () => {
    expect(engineSrc).not.toMatch(/export\s+(const|function|let|var)\s+OOB_COUNT/);
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe('Sprint 114 · audit · workpaper_autopop_event added (mca-roc)', () => {
  it('audit-trail.ts contains workpaper_autopop_event', () => {
    const src = readFileSync(AUDIT_TYPES_PATH, 'utf8');
    expect(src).toMatch(/'workpaper_autopop_event'/);
  });
  it('only ONE new S114 audit type id added (workpaper_autopop_event)', () => {
    const src = readFileSync(AUDIT_TYPES_PATH, 'utf8');
    const ids = src.match(/'workpaper_[a-z_]+'/g) ?? [];
    expect(new Set(ids).size).toBe(1);
  });
  it('ComplianceModule.tsx is untouched by this sprint (no workpaper imports)', () => {
    if (!existsSync(COMPLIANCE_MODULE_PATH)) return; // ok if file absent
    const src = readFileSync(COMPLIANCE_MODULE_PATH, 'utf8');
    expect(src).not.toMatch(/oob13-workpaper-autopop-engine|WorkpaperAutoPopPage/);
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe('Sprint 114 · page #41 wiring · NOT a sibling', () => {
  it('WorkpaperAutoPopPage file exists', () => {
    expect(existsSync(PAGE_PATH)).toBe(true);
  });
  it('page reads from oob13-workpaper-autopop-engine (no dead UI)', () => {
    const src = readFileSync(PAGE_PATH, 'utf8');
    expect(src).toMatch(/oob13-workpaper-autopop-engine/);
    expect(src).toMatch(/autoPopulateAll|autoPopulateWorkpaper/);
  });
  it('sidebar has fincore-workpaper-autopop type:item entry', () => {
    const src = readFileSync(SIDEBAR_PATH, 'utf8');
    expect(src).toMatch(/fincore-workpaper-autopop/);
    expect(src).toMatch(/Workpaper Auto-Population/);
  });
  it('CommandCenterPage wires fincore-workpaper-autopop case', () => {
    const src = readFileSync(CC_PATH, 'utf8');
    expect(src).toMatch(/case 'fincore-workpaper-autopop':\s+return <WorkpaperAutoPopPage/);
  });
  it('page is NOT registered as a SIBLING', () => {
    const ids = SIBLINGS.map((s) => s.id);
    expect(ids).not.toContain('workpaper-autopop-page');
    expect(ids).not.toContain('fincore-workpaper-autopop');
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe('Sprint 114 · sibling-register +1 (182 → 183) · uniqueness', () => {
  it('getSiblingCount >= 183 (REAL count post-S114)', () => {
    expect(getSiblingCount()).toBeGreaterThanOrEqual(183);
  });
  it('oob13-workpaper-autopop-engine appears exactly ONCE', () => {
    const matches = SIBLINGS.filter((s) => s.id === 'oob13-workpaper-autopop-engine');
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

// ───────────────────────────────────────────────────────────────────────────
describe('Sprint 114 · sprint-history · S113 backfilled + S114 appended (TIME-ROBUST · Guardrail 4)', () => {
  it('S113 headSha = 0b16fd04... (Block 1 backfill)', () => {
    const s113 = SPRINTS.find((s) => s.sprintNumber === 113);
    expect(s113?.headSha).toBe('0b16fd04433749a690761109741ef733ab96e315');
  });
  it('S114 entry exists with TBD_AT_BANK-or-real headSha (time-robust)', () => {
    const s114 = SPRINTS.find((s) => s.sprintNumber === 114);
    expect(s114).toBeTruthy();
    expect(typeof s114?.headSha).toBe('string');
    expect((s114?.headSha?.length ?? 0)).toBeGreaterThan(0);
    expect(s114?.predecessorSha).toBe('0b16fd04433749a690761109741ef733ab96e315');
    expect(s114?.newSiblings).toContain('oob13-workpaper-autopop-engine');
    expect(s114?.code).toBe('T-Phase-6.B.OOB.2');
  });
  it('if S115 entry exists, it is well-formed (if-present-then-valid · NOT toBeUndefined)', () => {
    const s115 = SPRINTS.find((s) => s.sprintNumber === 115);
    if (s115) expect(typeof s115.code).toBe('string');
  });
});
