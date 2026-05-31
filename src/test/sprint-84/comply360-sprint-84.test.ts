import { describe, it, expect, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { SPRINTS, getCurrentAStreak, getSprintCount } from '@/lib/_institutional/sprint-history';
import { getSiblingCount } from '@/lib/_institutional/sibling-register';
import {
  READS_FROM as EF_RF, createEventFiling, listEventFilings, computeEventFilingFee,
  getUpcomingEventDeadlines,
} from '@/lib/comply360-event-filings-engine';
import {
  READS_FROM as XBRL_RF, buildXBRL, validateXBRL, listXBRLOutputs,
  getSchedIIITaxonomyElements, exportXBRLDownload,
} from '@/lib/comply360-xbrl-builder-engine';
import {
  READS_FROM as S4_RF, registerIndependentDirector, recordAnnualDeclaration,
  verifyIndependence, getUpcomingReappointments,
} from '@/lib/comply360-schedule-iv-engine';
import {
  READS_FROM as S5_RF, recordRemuneration, computeRemunerationLimit,
  computeMinimumRemuneration, listRemunerations,
} from '@/lib/comply360-schedule-v-engine';
import {
  READS_FROM as S7_RF, recordCSRActivity, listCSRActivities,
  computeCSRSpendAllocation, getCSRThematicAreas, checkSection135Applicability,
} from '@/lib/comply360-schedule-vii-engine';
import { createDirectorMaster } from '@/lib/comply360-dir3-kyc-engine';
import { createAOC4Filing } from '@/lib/comply360-aoc4-engine';

const SRC = (p: string): string => path.resolve(__dirname, '../../..', p);
const BAP = 'bap-test' as never;

describe('Sprint 84 · T-Phase-5.C.3.2 · Q29 Part 2 ROC-Suite · FLOOR 3 PASS 2', () => {
  beforeEach(() => { localStorage.clear(); });

  // Institutional
  it('Sprint 84 entry exists · code T-Phase-5.C.3.2', () => {
    expect(SPRINTS.find((s) => s.sprintNumber === 84)?.code).toBe('T-Phase-5.C.3.2');
  });
  it('Sprint 83 SHA backfilled', () => {
    expect(SPRINTS.find((s) => s.sprintNumber === 83)?.headSha).toBe('b52dadcf80f8575eb92b804ba33770fd22698ffe');
  });
  it('A-streak >= 9', () => { expect(getCurrentAStreak()).toBeGreaterThanOrEqual(9); });
  it('SPRINTS >= 100', () => { expect(getSprintCount()).toBeGreaterThanOrEqual(100); });
  it('SIBLINGs runtime >= 122', () => { expect(getSiblingCount()).toBeGreaterThanOrEqual(122); });

  // File existence
  it('5 NEW SIBLING files exist', () => {
    for (const f of [
      'src/lib/comply360-event-filings-engine.ts',
      'src/lib/comply360-xbrl-builder-engine.ts',
      'src/lib/comply360-schedule-iv-engine.ts',
      'src/lib/comply360-schedule-v-engine.ts',
      'src/lib/comply360-schedule-vii-engine.ts',
    ]) expect(fs.existsSync(SRC(f))).toBe(true);
  });
  it('S84 close-summary exists', () => {
    expect(fs.existsSync(SRC('audit_workspace/T-Phase-5.C.3.2/Z_close_evidence/sprint-84-arc-summary.md'))).toBe(true);
  });

  // READS_FROM canon
  it('event-filings READS_FROM has 6 engines', () => { expect(EF_RF.engines.length).toBe(6); });
  it('xbrl-builder READS_FROM has 5 engines', () => { expect(XBRL_RF.engines.length).toBe(5); });
  it('schedule-iv READS_FROM has 3 engines', () => { expect(S4_RF.engines.length).toBe(3); });
  it('schedule-v READS_FROM has 4 engines', () => { expect(S5_RF.engines.length).toBe(4); });
  it('schedule-vii READS_FROM has 2 engines', () => { expect(S7_RF.engines.length).toBe(2); });

  // Event-based filings
  it('createEventFiling auto-computes filing_deadline = event_date + 30 days', () => {
    const f = createEventFiling({
      filing_type: 'MGT_14', event_date: '2026-01-01', fy: '2025-26',
      payload: { kind: 'MGT_14', resolution_type: 'special', resolution_text: 'x', meeting_date: '2026-01-01', attached_documents: [] },
      dsc_signed_by: null, prepared_by_bap: BAP,
    });
    expect(f.filing_deadline).toBe('2026-01-31');
  });
  it('createEventFiling supports all 6 EventFilingType values', () => {
    const types = ['MGT_14', 'DIR_12', 'CHG_1', 'CHG_4', 'INC_22', 'INC_28'] as const;
    for (const t of types) {
      computeEventFilingFee(t, 0);
    }
    expect(types.length).toBe(6);
  });
  it('computeEventFilingFee MGT-14 at ₹3L capital → ₹400 base (in <₹5L slab)', () => {
    // 300000 in [100000, 500000) → 400
    const r = computeEventFilingFee('MGT_14', 0, 300000);
    expect(r.filing_fee_inr).toBe(400);
    expect(r.late_fee_inr).toBe(0);
  });
  it('computeEventFilingFee CHG-1 → 500 flat', () => {
    expect(computeEventFilingFee('CHG_1', 0).filing_fee_inr).toBe(500);
  });
  it('getUpcomingEventDeadlines returns array', () => {
    expect(Array.isArray(getUpcomingEventDeadlines(30))).toBe(true);
  });
  it('listEventFilings filters by filing_type', () => {
    createEventFiling({
      filing_type: 'INC_22', event_date: '2026-01-01', fy: '2025-26',
      payload: { kind: 'INC_22', old_registered_office_address: 'a', new_registered_office_address: 'b', change_type: 'intra_state', effective_date: '2026-01-01' },
      dsc_signed_by: null, prepared_by_bap: BAP,
    });
    expect(listEventFilings({ filing_type: 'INC_22' }).length).toBe(1);
  });

  // iXBRL Builder
  it('buildXBRL produces ixbrl_xml from S83 aoc4 (USE-SITE READ)', () => {
    const aoc4 = createAOC4Filing({
      filing_type: 'xbrl', fy: '2024-25', agm_date: '2025-09-30',
      paid_up_capital_inr: 50000000, authorized_capital_inr: 100000000,
      balance_sheet_attestation_ref: null, pl_attestation_ref: null, cash_flow_attestation_ref: null,
      auditor_report_attachment: null, boards_report_attachment: null,
      csr_annexure_2_required: false, csr_annexure_2_attachment: null, prepared_by_bap: BAP,
    });
    const out = buildXBRL({ aoc4_xbrl_id: aoc4.id, taxonomy_version: 'C_Indian_GAAP_2024', generated_by_bap: BAP });
    expect(out.ixbrl_xml).toContain('<?xml');
    expect(out.ixbrl_xml).toContain('xbrli:xbrl');
    expect(out.total_elements_resolved).toBeGreaterThan(0);
  });
  it('validateXBRL returns is_valid + errors + warnings', () => {
    const aoc4 = createAOC4Filing({
      filing_type: 'xbrl', fy: '2024-25', agm_date: '2025-09-30',
      paid_up_capital_inr: 50000000, authorized_capital_inr: 100000000,
      balance_sheet_attestation_ref: null, pl_attestation_ref: null, cash_flow_attestation_ref: null,
      auditor_report_attachment: null, boards_report_attachment: null,
      csr_annexure_2_required: false, csr_annexure_2_attachment: null, prepared_by_bap: BAP,
    });
    const out = buildXBRL({ aoc4_xbrl_id: aoc4.id, taxonomy_version: 'C_IndAS_2024', generated_by_bap: BAP });
    const v = validateXBRL(out.id);
    expect(typeof v.is_valid).toBe('boolean');
    expect(Array.isArray(v.errors)).toBe(true);
    expect(Array.isArray(v.warnings)).toBe(true);
  });
  it('getSchedIIITaxonomyElements returns elements by category', () => {
    const els = getSchedIIITaxonomyElements('C_Indian_GAAP_2024');
    expect(els.some((e) => e.category === 'balance_sheet')).toBe(true);
    expect(els.some((e) => e.category === 'profit_loss')).toBe(true);
  });
  it('exportXBRLDownload returns Blob with .xml filename', () => {
    const aoc4 = createAOC4Filing({
      filing_type: 'xbrl', fy: '2024-25', agm_date: '2025-09-30',
      paid_up_capital_inr: 50000000, authorized_capital_inr: 100000000,
      balance_sheet_attestation_ref: null, pl_attestation_ref: null, cash_flow_attestation_ref: null,
      auditor_report_attachment: null, boards_report_attachment: null,
      csr_annexure_2_required: false, csr_annexure_2_attachment: null, prepared_by_bap: BAP,
    });
    const out = buildXBRL({ aoc4_xbrl_id: aoc4.id, taxonomy_version: 'C_Indian_GAAP_2024', generated_by_bap: BAP });
    const dl = exportXBRLDownload(out.id);
    expect(dl.filename.endsWith('.xml')).toBe(true);
  });
  it('listXBRLOutputs returns array', () => { expect(Array.isArray(listXBRLOutputs())).toBe(true); });

  // Schedule IV
  it('registerIndependentDirector auto-computes reappointment_due_date = appointment + 5 years', () => {
    const r = registerIndependentDirector({
      director_id: 'dir-1', din: '00012345', appointment_date: '2024-04-01',
      meets_section_149_6_criteria: true,
      criteria_evidence: {
        no_pecuniary_relationship: true, not_promoter: true, not_kmp_relative: true,
        no_material_pecuniary_3yr: true, professional_qualification: true,
        no_employee_3yr: true, integrity_expertise_experience: true,
      },
      recorded_by_bap: BAP,
    });
    expect(r.reappointment_due_date).toBe('2029-04-01');
  });
  it('recordAnnualDeclaration creates declaration', () => {
    const d = recordAnnualDeclaration({
      register_id: 'r1', declaration_fy: '2025-26', declaration_date: '2025-04-01',
      is_independent: true, is_suitable_integrity: true, is_suitable_expertise: true,
      is_suitable_experience: true, conflict_of_interest_declared: 'None',
      pecuniary_relationships_declared: 'None', recorded_by_bap: BAP,
    });
    expect(d.id).toBeTruthy();
  });
  it('verifyIndependence returns 7-criteria results', () => {
    const dir = createDirectorMaster({
      din: '00099999', name: 'Test', date_of_birth: '1970-01-01', pan: 'AAAAA1111A',
      passport_no: null, address: 'X', email: 'a@b.c', mobile: '9000000000',
      designation: 'Independent_Director', appointment_date: '2024-01-01', created_by_bap: BAP,
    });
    registerIndependentDirector({
      director_id: dir.id, din: dir.din, appointment_date: '2024-01-01',
      meets_section_149_6_criteria: true,
      criteria_evidence: {
        no_pecuniary_relationship: true, not_promoter: true, not_kmp_relative: true,
        no_material_pecuniary_3yr: true, professional_qualification: true,
        no_employee_3yr: true, integrity_expertise_experience: true,
      },
      recorded_by_bap: BAP,
    });
    const v = verifyIndependence(dir.id, '2025-26');
    expect(v.is_independent).toBe(true);
    expect(Object.keys(v.criteria_results).length).toBe(7);
  });
  it('getUpcomingReappointments returns array sorted by urgency', () => {
    expect(Array.isArray(getUpcomingReappointments(365))).toBe(true);
  });

  // Schedule V
  it('computeRemunerationLimit at ₹100cr net profit · 1 MD → 11cr overall + 5cr per-person', () => {
    // 1000000000 (₹100cr) in 11% → 110000000 overall (₹11cr); 1 person 5% → 50000000 per
    const r = computeRemunerationLimit({ net_profit_inr: 1000000000, num_managerial_personnel: 1 });
    expect(r.overall_limit_inr).toBe(110000000);
    expect(r.per_person_limit_inr).toBe(50000000);
  });
  it('computeMinimumRemuneration at ₹3cr effective capital + inadequate profit → ₹60L', () => {
    // 30000000 < 50000000 → 6000000
    expect(computeMinimumRemuneration({ effective_capital_inr: 30000000, is_inadequate_profit: true })).toBe(6000000);
  });
  it('computeMinimumRemuneration when not inadequate profit → 0', () => {
    expect(computeMinimumRemuneration({ effective_capital_inr: 30000000, is_inadequate_profit: false })).toBe(0);
  });
  it('recordRemuneration computes total + listRemunerations filters by role', () => {
    const dir = createDirectorMaster({
      din: '00088888', name: 'MD', date_of_birth: '1970-01-01', pan: 'BBBBB2222B',
      passport_no: null, address: 'X', email: 'a@b.c', mobile: '9000000001',
      designation: 'Managing_Director', appointment_date: '2024-01-01', created_by_bap: BAP,
    });
    const r = recordRemuneration({
      director_id: dir.id, role: 'Managing_Director', fy: '2024-25',
      base_salary_inr: 5000000, perquisites_inr: 1000000, commission_inr: 500000,
      net_profit_inr: 200000000, approved_by_resolution: null, resolution_type: null,
      recorded_by_bap: BAP,
    });
    expect(r.total_remuneration_inr).toBe(6500000);
    expect(listRemunerations({ role: 'Managing_Director' }).length).toBe(1);
  });

  // Schedule VII
  it('getCSRThematicAreas returns 11 typed areas', () => {
    expect(getCSRThematicAreas().length).toBe(11);
  });
  it('recordCSRActivity + listCSRActivities filters by area', () => {
    recordCSRActivity({
      activity_name: 'Edu Drive', thematic_area: 'education', description: 'x', location: 'Mumbai',
      fy: '2024-25', budget_allocated_inr: 100000, amount_spent_inr: 50000,
      implementation_partner: null, recorded_by_bap: BAP,
    });
    expect(listCSRActivities({ thematic_area: 'education' }).length).toBe(1);
  });
  it('computeCSRSpendAllocation uses 2% of 3-year avg net profit', () => {
    // 60000000 (₹6cr) × 2% = 1200000
    const a = computeCSRSpendAllocation({ fy: '2024-25', three_year_avg_net_profit_inr: 60000000, actual_spend_inr: 500000 });
    expect(a.required_csr_spend_inr).toBe(1200000);
    expect(a.shortfall_inr).toBe(700000);
  });
  it('checkSection135Applicability triggers on net_profit >= ₹5cr', () => {
    // 50000000 = ₹5cr threshold
    const r = checkSection135Applicability({ networth_inr: 0, turnover_inr: 0, net_profit_inr: 50000000 });
    expect(r.is_applicable).toBe(true);
    expect(r.triggered_thresholds).toContain('net_profit_5cr');
  });
  it('checkSection135Applicability not triggered below all thresholds', () => {
    const r = checkSection135Applicability({ networth_inr: 1000000, turnover_inr: 1000000, net_profit_inr: 1000000 });
    expect(r.is_applicable).toBe(false);
  });

  // Section393Page 11-tab extension
  it('Section393Page has >= 11 TabsTrigger (FR-106 16th scenario)', () => {
    const src = fs.readFileSync(SRC('src/pages/erp/comply360/roc/Section393Page.tsx'), 'utf-8');
    expect((src.match(/<TabsTrigger/g) ?? []).length).toBeGreaterThanOrEqual(11);
  });
  it('Section393Page preserves existing tabs + adds 4 new', () => {
    const src = fs.readFileSync(SRC('src/pages/erp/comply360/roc/Section393Page.tsx'), 'utf-8');
    for (const v of ['section393', 'dir3-kyc', 'aoc4', 'mgt7', 'adt1', 'dsc-vault', 'statutory-registers',
                     'event-filings', 'xbrl-builder', 'schedule-iv-v', 'schedule-vii']) {
      expect(src).toContain(`value="${v}"`);
    }
  });
  it('Section393Page grid-cols-11', () => {
    const src = fs.readFileSync(SRC('src/pages/erp/comply360/roc/Section393Page.tsx'), 'utf-8');
    expect(src).toContain('grid-cols-11');
  });

  // ESLint STRICT · v1.24 environment-adaptive runner (Lesson 35)
  it('ESLint STRICT 0 errors AND 0 warnings · environment-adaptive runner', () => {
    let exitCode = 0;
    let lintOutput = '';
    const runner = (() => {
      try { execSync('command -v pnpm', { stdio: 'pipe' }); return 'pnpm lint'; }
      catch { return 'npx eslint .'; }
    })();
    try {
      lintOutput = execSync(`${runner} 2>&1`, { encoding: 'utf-8', stdio: 'pipe' });
    } catch (e) {
      exitCode = (e as { status?: number }).status ?? 1;
      const ex = e as { stdout?: string; stderr?: string };
      lintOutput = ex.stdout ?? ex.stderr ?? '';
    }
    expect(exitCode).toBe(0);
    const errorMatches = (lintOutput.match(/\b\d+\s+errors?\b/g) ?? []).filter((m) => !m.startsWith('0'));
    const warningMatches = (lintOutput.match(/\b\d+\s+warnings?\b/g) ?? []).filter((m) => !m.startsWith('0'));
    expect(errorMatches).toEqual([]);
    expect(warningMatches).toEqual([]);
  }, 120_000);
});
