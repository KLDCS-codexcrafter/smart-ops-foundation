/**
 * @file        src/test/sprint-87/comply360-sprint-87.test.ts
 * @purpose     Sprint 87 · T-Phase-5.D.4.2 · Floor 4 Sector-Pack Arc 4.2 CLOSES
 *              Verifies 6 NEW SIBLINGs + 6 NEW PAGES · OOB-2/3/9 functional.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { SPRINTS, getCurrentAStreak, getSprintCount } from '@/lib/_institutional/sprint-history';
import { SIBLINGS, getSiblingCount } from '@/lib/_institutional/sibling-register';
import {
  READS_FROM as NBFC_RF, classifyNPA, recordLoanAccount, listLoanAccounts,
  recordALMReport, listALMReports, computeLCR, listLCRCalculations,
} from '@/lib/comply360-sector-nbfc-engine';
import {
  READS_FROM as SEBI_RF, createQuarterlyFiling, listQuarterlyFilings,
  recordAuditCommitteeComposition, listAuditCommitteeCompositions,
  recordMaterialDisclosure, listMaterialDisclosures,
  verifyAuditCommitteeCompliance, getAuditCommitteeMeetingsForFY,
} from '@/lib/comply360-sector-sebi-lodr-engine';
import {
  READS_FROM as RERA_RF, registerRERAProject, listRERAProjects,
  recordQuarterlyProgress, listProgressReports,
} from '@/lib/comply360-sector-rera-engine';
import {
  READS_FROM as FEMA_RF, createFCGPRFiling, listFCGPRFilings,
  createFCTRSFiling, listFCTRSFilings,
  createAnnualReturn, listAnnualReturns, markFilingFiled,
} from '@/lib/comply360-sector-fema-engine';
import {
  READS_FROM as AI_RF, executeAIModule, listAIModuleExecutions,
  computeComplianceROI, listROICalculations,
  askComplianceTutor, listTutorSessions,
  recordRecommendation, listRecommendations, updateRecommendationStatus,
  getAIModules,
} from '@/lib/comply360-ai-control-center-engine';
import {
  READS_FROM as CFO_RF, buildPitchDeckSections, generateCFOPitchDeckPDF,
  listCFOPitchDecks, getLatestROISnapshot,
} from '@/lib/comply360-cfo-pitch-deck-engine';

const SRC = (p: string): string => path.resolve(__dirname, '../../..', p);
const BAP = 'mr-a-client' as const;

describe('Sprint 87 · T-Phase-5.D.4.2 · Q31 Sector-Pack + Q27b AI Control Center · FLOOR 4 CLOSES', () => {
  beforeEach(() => { localStorage.clear(); });

  // ── Institutional registers ────────────────────────────────────────
  it('Sprint 87 entry exists · code T-Phase-5.D.4.2 · grade A first-pass-clean', () => {
    const s87 = SPRINTS.find((s) => s.sprintNumber === 87);
    expect(s87?.code).toBe('T-Phase-5.D.4.2');
    expect(s87?.grade).toBe('A first-pass-clean');
    expect(s87?.predecessorSha).toBe('4aa2a8e71ab35666ff2d1471771ff65c940705e9');
    expect(s87?.newSiblings).toEqual([
      'comply360-sector-nbfc-engine',
      'comply360-sector-sebi-lodr-engine',
      'comply360-sector-rera-engine',
      'comply360-sector-fema-engine',
      'comply360-ai-control-center-engine',
      'comply360-cfo-pitch-deck-engine',
    ]);
  });
  it('A-streak >= 12 (S87 CLOSES Floor 4 · target 13)', () => { expect(getCurrentAStreak()).toBeGreaterThanOrEqual(12); });
  it('SPRINTS >= 103', () => { expect(getSprintCount()).toBeGreaterThanOrEqual(103); });
  it('SIBLINGs runtime >= 140 (post S87 +6 = 140)', () => { expect(getSiblingCount()).toBeGreaterThanOrEqual(140); });
  it('6 NEW SIBLING entries registered with CONFIRMED provenance', () => {
    for (const id of [
      'comply360-sector-nbfc-engine', 'comply360-sector-sebi-lodr-engine',
      'comply360-sector-rera-engine', 'comply360-sector-fema-engine',
      'comply360-ai-control-center-engine', 'comply360-cfo-pitch-deck-engine',
    ]) {
      const s = SIBLINGS.find((x) => x.id === id);
      expect(s?.provenance).toBe('CONFIRMED');
      expect(s?.sprintAdded).toBe(87);
    }
  });

  // ── File existence ────────────────────────────────────────────────
  it('6 NEW SIBLING engine files exist', () => {
    for (const f of [
      'src/lib/comply360-sector-nbfc-engine.ts',
      'src/lib/comply360-sector-sebi-lodr-engine.ts',
      'src/lib/comply360-sector-rera-engine.ts',
      'src/lib/comply360-sector-fema-engine.ts',
      'src/lib/comply360-ai-control-center-engine.ts',
      'src/lib/comply360-cfo-pitch-deck-engine.ts',
    ]) expect(fs.existsSync(SRC(f))).toBe(true);
  });
  it('6 NEW PAGE files exist', () => {
    for (const f of [
      'src/pages/erp/comply360/sector-nbfc/SectorNBFCPage.tsx',
      'src/pages/erp/comply360/sector-sebi/SectorSEBIPage.tsx',
      'src/pages/erp/comply360/sector-rera/SectorRERAPage.tsx',
      'src/pages/erp/comply360/sector-fema/SectorFEMAPage.tsx',
      'src/pages/erp/comply360/ai-control-center/AIControlCenterPage.tsx',
      'src/pages/erp/comply360/cfo-pitch-deck/CFOPitchDeckPage.tsx',
    ]) expect(fs.existsSync(SRC(f))).toBe(true);
  });
  it('S87 close-summary exists · FLOOR 4 CLOSES declaration', () => {
    const p = SRC('audit_workspace/T-Phase-5.D.4.2/Z_close_evidence/sprint-87-arc-summary.md');
    expect(fs.existsSync(p)).toBe(true);
    expect(fs.readFileSync(p, 'utf-8')).toMatch(/FLOOR 4 CLOSES/);
  });

  // ── v1.28 preemptive · grid-cols-N dynamic class guard ────────────
  it('AIControlCenterPage uses fixed grid-cols-4 (no dynamic grid-cols-11)', () => {
    const src = fs.readFileSync(SRC('src/pages/erp/comply360/ai-control-center/AIControlCenterPage.tsx'), 'utf-8');
    expect(src).toMatch(/grid-cols-4/);
    expect(src).not.toMatch(/grid-cols-11/);
    expect(src).not.toMatch(/grid-cols-\$\{/);
  });

  // ── READS_FROM contracts ──────────────────────────────────────────
  it('READS_FROM contracts declared for all 6 engines', () => {
    expect(NBFC_RF.engines).toContain('audit-trail-engine');
    expect(SEBI_RF.engines).toContain('audit-trail-engine');
    expect(RERA_RF.engines).toContain('audit-trail-engine');
    expect(FEMA_RF.engines).toContain('audit-trail-engine');
    expect(AI_RF.engines).toContain('comply360-nlp-audit-ask-engine');
    expect(AI_RF.engines).toContain('comply360-mock-audit-simulator-engine');
    expect(CFO_RF.engines).toContain('comply360-ai-control-center-engine');
  });

  // ── NBFC ──────────────────────────────────────────────────────────
  it('NBFC · classifyNPA · 6-class matrix + provision %', () => {
    expect(classifyNPA(0).npa_class).toBe('standard');
    expect(classifyNPA(120).npa_class).toBe('sub_standard');
    expect(classifyNPA(1500).npa_class).toBe('loss');
    expect(classifyNPA(0).provision_required_pct).toBeGreaterThanOrEqual(0);
  });
  it('NBFC · loan account + ALM + LCR lifecycle', () => {
    const l = recordLoanAccount({
      borrower_name: 'Acme Pvt Ltd', borrower_id: 'BRW-001',
      loan_amount_inr: 1_000_000, outstanding_inr: 800_000, days_past_due: 45, recorded_by_bap: BAP,
    });
    expect(l.id).toBeDefined();
    expect(listLoanAccounts().length).toBe(1);
    recordALMReport({
      fy: '2026-27', report_date: '2026-06-30',
      buckets: {
        '1_7_days':     { assets_inr: 1_000_000, liabilities_inr: 800_000, gap_inr: 200_000, cumulative_gap_inr: 200_000 },
        '8_14_days':    { assets_inr: 500_000,   liabilities_inr: 600_000, gap_inr: -100_000, cumulative_gap_inr: 100_000 },
        '15_30_days':   { assets_inr: 0, liabilities_inr: 0, gap_inr: 0, cumulative_gap_inr: 100_000 },
        '31_90_days':   { assets_inr: 0, liabilities_inr: 0, gap_inr: 0, cumulative_gap_inr: 100_000 },
        '91_180_days':  { assets_inr: 0, liabilities_inr: 0, gap_inr: 0, cumulative_gap_inr: 100_000 },
        '181_365_days': { assets_inr: 0, liabilities_inr: 0, gap_inr: 0, cumulative_gap_inr: 100_000 },
        '1_3_years':    { assets_inr: 0, liabilities_inr: 0, gap_inr: 0, cumulative_gap_inr: 100_000 },
        '3_5_years':    { assets_inr: 0, liabilities_inr: 0, gap_inr: 0, cumulative_gap_inr: 100_000 },
        'over_5_years': { assets_inr: 0, liabilities_inr: 0, gap_inr: 0, cumulative_gap_inr: 100_000 },
      },
      recorded_by_bap: BAP,
    });
    expect(listALMReports({ fy: '2026-27' }).length).toBe(1);
    const lcr = computeLCR({
      fy: '2026-27', quarter: 'Q1',
      hqla_inr: 10_000_000, net_cash_outflow_inr: 8_000_000,
    });
    expect(lcr.lcr_ratio).toBeCloseTo(1.25, 2);
    expect(lcr.is_compliant).toBe(true);
    expect(listLCRCalculations({ fy: '2026-27' }).length).toBe(1);
  });

  // ── SEBI LODR ─────────────────────────────────────────────────────
  it('SEBI · quarterly filing + audit committee + material disclosure', () => {
    createQuarterlyFiling({
      fy: '2026-27', quarter: 'Q1', filing_deadline: '2026-08-14',
      reg33_data: { revenue_inr: 100_000_000, pat_inr: 10_000_000, eps_inr: 12.5, qualifications: [] },
      recorded_by_bap: BAP,
    });
    expect(listQuarterlyFilings({ fy: '2026-27' }).length).toBe(1);
    const comp = recordAuditCommitteeComposition({
      fy: '2026-27', composition_date: '2026-04-01',
      member_count: 3, independent_director_count: 2, is_chairman_independent: true,
      meetings_held_count: 4, recorded_by_bap: BAP,
    });
    expect(verifyAuditCommitteeCompliance(comp.id).is_compliant).toBe(true);
    expect(listAuditCommitteeCompositions({ fy: '2026-27' }).length).toBe(1);
    expect(typeof getAuditCommitteeMeetingsForFY('2026-27')).toBe('number');
    recordMaterialDisclosure({
      fy: '2026-27', event_date: '2026-05-01T00:00:00Z', disclosure_date: '2026-05-01T06:00:00Z',
      category: 'financial', event_summary: 'Q1 results approved',
      recorded_by_bap: BAP,
    });
    expect(listMaterialDisclosures({ fy: '2026-27', category: 'financial' }).length).toBe(1);
  });

  // ── RERA ──────────────────────────────────────────────────────────
  it('RERA · project registration + QPR', () => {
    const p = registerRERAProject({
      project_name: 'Sunrise Heights', rera_registration_no: null,
      state_rera_authority: 'MahaRERA',
      promoter_name: 'Operix Realty', project_type: 'residential',
      total_units: 120, total_area_sqft: 250_000,
      estimated_completion_date: '2028-12-31', recorded_by_bap: BAP,
    });
    expect(listRERAProjects().length).toBe(1);
    recordQuarterlyProgress({
      project_id: p.id, fy: '2026-27', quarter: 'Q1',
      reporting_date: '2026-06-30',
      physical_progress_pct: 25, financial_progress_pct: 30,
      units_sold: 30, units_remaining: 90, receivables_inr: 50_000_000,
      recorded_by_bap: BAP,
    });
    expect(listProgressReports({ project_id: p.id, fy: '2026-27' }).length).toBe(1);
  });

  // ── FEMA ──────────────────────────────────────────────────────────
  it('FEMA · FC-GPR + FC-TRS + Annual Return + mark filed', () => {
    const g = createFCGPRFiling({
      filing_date: '2026-04-15', investor_name: 'XYZ Holdings LLC',
      investor_country: 'United States',
      investment_amount_inr: 83_000_000, investment_amount_usd: 1_000_000,
      shares_allotted: 1_000_000, share_price_inr: 83,
      filing_deadline: '2026-05-15',
      recorded_by_bap: BAP,
    });
    expect(listFCGPRFilings().length).toBe(1);
    createFCTRSFiling({
      filing_date: '2026-05-01', transferor_name: 'A', transferee_name: 'B',
      shares_transferred: 50_000, transfer_price_inr: 5_000_000,
      is_resident_to_non_resident: true, filing_deadline: '2026-06-30',
      recorded_by_bap: BAP,
    });
    expect(listFCTRSFilings().length).toBe(1);
    createAnnualReturn({
      fy: '2026-27', total_foreign_equity_inr: 80_000_000,
      total_foreign_debt_inr: 20_000_000, filing_deadline: '2026-07-15',
      recorded_by_bap: BAP,
    });
    expect(listAnnualReturns({ fy: '2026-27' }).length).toBe(1);
    markFilingFiled('fc_gpr', g.id, BAP);
    expect(listFCGPRFilings({ filing_status: 'filed' }).length).toBe(1);
  });

  // ── AI Control Center · OOB-2 + OOB-9 ─────────────────────────────
  it('AI · 11 modules registered', () => {
    expect(getAIModules().length).toBe(11);
  });
  it('AI · executeAIModule + audit_ask + mock_audit_simulator', () => {
    const a = executeAIModule({ module_type: 'audit_ask', query: 'show top exceptions', bap: BAP });
    expect(a.id).toBeDefined();
    const m = executeAIModule({ module_type: 'mock_audit_simulator', query: 'run mock audit', bap: BAP });
    expect(m.result_summary).toMatch(/readiness/);
    expect(listAIModuleExecutions({ module_type: 'audit_ask' }).length).toBe(1);
  });
  it('AI · OOB-2 Compliance ROI · cost savings + payback', () => {
    const r = computeComplianceROI({
      fy: '2026-27', industry_baseline_inr: 5_000_000, operix_actual_inr: 2_000_000,
      manual_hours_baseline: 4000, operix_hours_actual: 1500, recorded_by_bap: BAP,
    });
    expect(r.cost_savings_inr).toBe(3_000_000);
    expect(r.time_savings_hours).toBe(2500);
    expect(r.roi_percentage).toBeGreaterThan(0);
    expect(r.payback_months).toBeGreaterThan(0);
    expect(listROICalculations({ fy: '2026-27' }).length).toBe(1);
  });
  it('AI · OOB-9 AI Tutor · response with citations', () => {
    const t = askComplianceTutor({
      question: 'What is MCA Rule 3(1)?', context_module: 'audit', context_fy: '2026-27',
      recorded_by_bap: BAP,
    });
    expect(t.tutor_response.length).toBeGreaterThan(0);
    expect(t.citations.length).toBeGreaterThan(0);
    expect(listTutorSessions({ context_module: 'audit' }).length).toBe(1);
  });
  it('AI · recommendations lifecycle · record → update status', () => {
    const r = recordRecommendation({
      module_type: 'risk_predictor', recommendation_text: 'Review NPA classification policy',
      priority: 'high',
    });
    expect(r.status).toBe('open');
    const upd = updateRecommendationStatus(r.id, 'acted_upon', BAP);
    expect(upd.status).toBe('acted_upon');
    expect(listRecommendations({ status: 'acted_upon' }).length).toBe(1);
  });

  // ── CFO Pitch Deck · OOB-3 FUNCTIONAL ─────────────────────────────
  it('CFO · buildPitchDeckSections returns 6 sections', () => {
    const s = buildPitchDeckSections({
      fy: '2026-27', company_name: 'Operix Demo Pvt Ltd',
      audit_ready_score: 85, roi_percentage: 150, cost_savings_inr: 3_000_000,
    });
    expect(s.length).toBe(6);
    expect(s[0].title).toMatch(/Executive Summary/);
  });
  it('CFO · generate pitch deck PDF · OOB-3 functional · audit logged', () => {
    const d = generateCFOPitchDeckPDF({
      fy: '2026-27', company_name: 'Operix Demo Pvt Ltd',
      audit_ready_score: 85, roi_percentage: 150, cost_savings_inr: 3_000_000,
      prepared_by_bap: BAP,
    });
    expect(d.id).toBeDefined();
    expect(d.pdf_bytes_base64).not.toBeNull();
    expect((d.pdf_bytes_base64 ?? '').length).toBeGreaterThan(100);
    expect(listCFOPitchDecks({ fy: '2026-27' }).length).toBe(1);
  });
  it('CFO · getLatestROISnapshot reads from AI Control Center', () => {
    computeComplianceROI({
      fy: '2026-27', industry_baseline_inr: 5_000_000, operix_actual_inr: 2_000_000,
      manual_hours_baseline: 4000, operix_hours_actual: 1500, recorded_by_bap: BAP,
    });
    const snap = getLatestROISnapshot('2026-27');
    expect(snap.cost_savings_inr).toBe(3_000_000);
    expect(snap.roi_percentage).toBeGreaterThan(0);
  });

  // ── Sidebar + routing ─────────────────────────────────────────────
  it('Sidebar config includes 6 new modules', () => {
    const src = fs.readFileSync(SRC('src/apps/erp/configs/comply360-sidebar-config.ts'), 'utf-8');
    for (const id of ['sector-nbfc', 'sector-sebi', 'sector-rera', 'sector-fema', 'ai-control-center', 'cfo-pitch-deck']) {
      expect(src).toContain(`id: '${id}'`);
    }
  });
  it('Comply360Page routes 6 new modules', () => {
    const src = fs.readFileSync(SRC('src/pages/erp/comply360/Comply360Page.tsx'), 'utf-8');
    for (const id of ['sector-nbfc', 'sector-sebi', 'sector-rera', 'sector-fema', 'ai-control-center', 'cfo-pitch-deck']) {
      expect(src).toContain(`case '${id}'`);
    }
  });
});
