/**
 * @file        src/test/sprint-90/comply360-sprint-90.test.ts
 * @sprint      Sprint 90 · T-Phase-5.F.5.2 · Floor 5.2 · Q34 Environmental Compliance Pt 1
 * @note        26 it() blocks · v1.30 §N Form A floor exceed · NO in-test ESLint (RETIRED at v1.31)
 */
import { describe, it, expect, beforeEach } from 'vitest';
import * as nodeFs from 'fs';
import * as path from 'path';
import { SPRINTS, getCurrentAStreak, getSprintCount } from '@/lib/_institutional/sprint-history';
import { getSiblingCount, SIBLINGS } from '@/lib/_institutional/sibling-register';
import {
  recordCTEPermit, listCTEPermits,
  recordCTOPermit, listCTOPermits,
  recordForm5Statement, listForm5Statements,
  recordFormVCess, listFormVCesses,
  getEnvironmentalComplianceSummary,
  READS_FROM as ENV_RF,
} from '@/lib/comply360-environmental-engine';
import {
  recordEIAProcess, listEIAProcesses,
  recordCRZCompliance, listCRZCompliances,
  recordPublicConsultation, listPublicConsultations,
  READS_FROM as EIA_RF,
} from '@/lib/comply360-eia-engine';
import { AUDIT_ENTITY_TYPES_REGISTRY } from '@/lib/comply360-audit-trail-aggregator-engine';
import { comply360SidebarItems } from '@/apps/erp/configs/comply360-sidebar-config';

const SRC = (p: string): string => path.resolve(__dirname, '../../..', p);
const TEST_BAP = 'mr-a-client' as const;

describe('Sprint 90 · T-Phase-5.F.5.2 · Floor 5.2 · Environmental Compliance Pt 1', () => {
  beforeEach(() => { localStorage.clear(); });

  // ─── Institutional (5) ───
  it('Sprint 90 entry exists · code T-Phase-5.F.5.2 · grade A first-pass-clean', () => {
    const s90 = SPRINTS.find((s) => s.code === 'T-Phase-5.F.5.2');
    expect(s90).toBeDefined();
    expect(s90?.grade).toBe('A first-pass-clean');
  });
  it('Sprint 89 SHA backfilled to 59b67d97...', () => {
    const s89 = SPRINTS.find((s) => s.code === 'T-Phase-5.F.5.1');
    expect(s89?.headSha).toBe('59b67d976e9afd8b89f3fda5aed408cb400fe0a0');
  });
  it('A-streak >= 15 (target 16 post-bank)', () => {
    expect(getCurrentAStreak()).toBeGreaterThanOrEqual(15);
  });
  it('SPRINTS count >= 107', () => {
    expect(getSprintCount()).toBeGreaterThanOrEqual(107);
  });
  it('SIBLINGs runtime >= 145', () => {
    expect(getSiblingCount()).toBeGreaterThanOrEqual(145);
  });

  // ─── 2 NEW SIBLINGs (2) ───
  it('comply360-environmental-engine registered · moatsRealized: []', () => {
    const e = SIBLINGS.find((s) => s.id === 'comply360-environmental-engine');
    expect(e).toBeDefined();
    expect(e?.moatsRealized).toEqual([]);
  });
  it('comply360-eia-engine registered · moatsRealized: []', () => {
    const e = SIBLINGS.find((s) => s.id === 'comply360-eia-engine');
    expect(e).toBeDefined();
    expect(e?.moatsRealized).toEqual([]);
  });

  // ─── READS_FROM canon (2) ───
  it('environmental-engine READS_FROM includes audit-framework + calendar + brsr-comprehensive + rule-11g', () => {
    expect(ENV_RF.engines).toContain('comply360-audit-framework-engine');
    expect(ENV_RF.engines).toContain('comply360-calendar-engine');
    expect(ENV_RF.engines).toContain('comply360-brsr-comprehensive-engine');
    expect(ENV_RF.engines).toContain('comply360-rule-11g-report-engine');
  });
  it('eia-engine READS_FROM includes environmental-engine + audit-framework + calendar', () => {
    expect(EIA_RF.engines).toContain('comply360-environmental-engine');
    expect(EIA_RF.engines).toContain('comply360-audit-framework-engine');
    expect(EIA_RF.engines).toContain('comply360-calendar-engine');
  });

  // ─── environmental-engine functional (4) ───
  it('recordCTEPermit creates CTE with id · listCTEPermits returns it', () => {
    const p = recordCTEPermit({
      permit_type: 'air', premises_id: 'P1', permit_number: 'CTE-AIR-1',
      issued_date: '2025-04-01', expiry_date: '2028-04-01',
      issuing_authority: 'SPCB', industry_category: 'orange', status: 'active',
    }, TEST_BAP);
    expect(p.id).toBeTruthy();
    expect(listCTEPermits({ permit_type: 'air' })).toHaveLength(1);
  });
  it('recordCTOPermit + recordForm5Statement + recordFormVCess work', () => {
    recordCTOPermit({
      permit_type: 'water', premises_id: 'P1', permit_number: 'CTO-W-1',
      issued_date: '2025-04-01', expiry_date: '2028-04-01',
      issuing_authority: 'SPCB', conditions: [], status: 'active',
    }, TEST_BAP);
    recordForm5Statement({
      fy: 'FY25-26', premises_id: 'P1', water_consumption_kld: 10,
      raw_material_consumption_mt: 5, pollution_load_summary: '',
      hazardous_waste_generated_mt: 1, filed_date: '2026-05-31', filing_status: 'filed',
    }, TEST_BAP);
    recordFormVCess({
      fy: 'FY25-26', premises_id: 'P1', water_consumed_kld: 10,
      cess_rate_per_kld: 4, total_cess_inr: 40, paid_date: '2026-05-31', filing_status: 'filed',
    }, TEST_BAP);
    expect(listCTOPermits()).toHaveLength(1);
    expect(listForm5Statements({ fy: 'FY25-26' })).toHaveLength(1);
    expect(listFormVCesses({ fy: 'FY25-26' })).toHaveLength(1);
  });
  it('getEnvironmentalComplianceSummary returns 6-field object', () => {
    const s = getEnvironmentalComplianceSummary('FY25-26');
    expect(s).toHaveProperty('active_cte_count');
    expect(s).toHaveProperty('active_cto_count');
    expect(s).toHaveProperty('expiring_permits_next_90_days');
    expect(s).toHaveProperty('form5_statements_filed_current_fy');
    expect(s).toHaveProperty('form_v_cess_paid_current_fy');
    expect(s).toHaveProperty('overall_status');
  });
  it('environmental entity types registered (6 NEW)', () => {
    const ids = AUDIT_ENTITY_TYPES_REGISTRY.map((t) => t.id);
    for (const t of ['cte_air', 'cto_air', 'cte_water', 'cto_water', 'form5_statement', 'form_v_cess']) {
      expect(ids).toContain(t);
    }
  });

  // ─── eia-engine functional (4) ───
  it('recordEIAProcess creates EIA process · listEIAProcesses returns it', () => {
    const p = recordEIAProcess({
      project_name: 'Proj-A', project_category: 'B1', process_stage: 'screening',
      initiated_date: '2026-01-01', expected_decision_date: '2026-12-31', status: 'in_progress',
    }, TEST_BAP);
    expect(p.id).toBeTruthy();
    expect(listEIAProcesses({ status: 'in_progress' })).toHaveLength(1);
  });
  it('listEIAProcesses filters by status correctly', () => {
    recordEIAProcess({ project_name: 'Proj-B', project_category: 'A', process_stage: 'decision',
      initiated_date: '2025-01-01', expected_decision_date: '2025-12-31', status: 'approved' }, TEST_BAP);
    expect(listEIAProcesses({ status: 'approved' })).toHaveLength(1);
    expect(listEIAProcesses({ status: 'rejected' })).toHaveLength(0);
  });
  it('recordCRZCompliance + recordPublicConsultation work', () => {
    recordCRZCompliance({
      project_name: 'Coast-1', crz_zone: 'CRZ-II', state: 'MH', approval_status: 'pending',
    }, TEST_BAP);
    recordPublicConsultation({
      eia_process_id: 'EIA-1', consultation_date: '2026-03-15',
      participants_count: 120, objections_received: 4, resolution_summary: 'Resolved',
    }, TEST_BAP);
    expect(listCRZCompliances({ crz_zone: 'CRZ-II' })).toHaveLength(1);
    expect(listPublicConsultations({ eia_process_id: 'EIA-1' })).toHaveLength(1);
  });
  it('eia entity types registered (3 NEW)', () => {
    const ids = AUDIT_ENTITY_TYPES_REGISTRY.map((t) => t.id);
    for (const t of ['eia_process', 'crz_compliance', 'public_consultation']) {
      expect(ids).toContain(t);
    }
  });

  // ─── Page existence + structure (3) · bounds-check ───
  it('EnvironmentalDashboardPage file exists', () => {
    expect(nodeFs.existsSync(SRC('src/pages/erp/comply360/environmental/EnvironmentalDashboardPage.tsx'))).toBe(true);
  });
  it('EnvironmentalDashboardPage has >=4 TabsTrigger (bounds-check)', () => {
    const src = nodeFs.readFileSync(SRC('src/pages/erp/comply360/environmental/EnvironmentalDashboardPage.tsx'), 'utf8');
    const matches = src.match(/<TabsTrigger\b/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(4);
  });
  it('Form5AnnualStatementPage file exists (sub-page)', () => {
    expect(nodeFs.existsSync(SRC('src/pages/erp/comply360/environmental/Form5AnnualStatementPage.tsx'))).toBe(true);
  });

  // ─── Router + sidebar integration (3) ───
  it('Comply360Page imports EnvironmentalDashboardPage', () => {
    const src = nodeFs.readFileSync(SRC('src/pages/erp/comply360/Comply360Page.tsx'), 'utf8');
    expect(src).toContain('EnvironmentalDashboardPage');
  });
  it('Comply360Page has environmental router case', () => {
    const src = nodeFs.readFileSync(SRC('src/pages/erp/comply360/Comply360Page.tsx'), 'utf8');
    expect(src).toContain("case 'environmental':");
  });
  it('sidebar-config has environmental entry with keyboard `c E`', () => {
    const item = comply360SidebarItems.find((i) => i.id === 'environmental');
    expect(item).toBeDefined();
    expect(item?.keyboard).toBe('c E');
  });

  // ─── §H 0-DIFF anchors (3) ───
  it('S89 fire-safety + industrial-safety engines unchanged — files exist', () => {
    expect(nodeFs.existsSync(SRC('src/lib/comply360-fire-safety-engine.ts'))).toBe(true);
    expect(nodeFs.existsSync(SRC('src/lib/comply360-industrial-safety-engine.ts'))).toBe(true);
  });
  it('upstream engines unchanged — files exist at expected paths', () => {
    expect(nodeFs.existsSync(SRC('src/lib/comply360-audit-framework-engine.ts'))).toBe(true);
    expect(nodeFs.existsSync(SRC('src/lib/comply360-calendar-engine.ts'))).toBe(true);
    expect(nodeFs.existsSync(SRC('src/lib/comply360-brsr-comprehensive-engine.ts'))).toBe(true);
    expect(nodeFs.existsSync(SRC('src/lib/comply360-rule-11g-report-engine.ts'))).toBe(true);
  });
  it('_shared/ components unchanged — files exist', () => {
    expect(nodeFs.existsSync(SRC('src/pages/erp/comply360/_shared/Comply360Breadcrumb.tsx'))).toBe(true);
    expect(nodeFs.existsSync(SRC('src/pages/erp/comply360/_shared/CrossMenuLinkCard.tsx'))).toBe(true);
  });
});
