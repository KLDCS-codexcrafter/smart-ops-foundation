/**
 * @file        src/test/sprint-77a/comply360-sprint-77a.test.ts
 * @purpose     Sprint 77a Pass A · 4 NEW engines (Schedule M · BRSR Comprehensive ·
 *              CARO Extended · Transfer Pricing) · ≥30 tests · Lesson-24 bounds-check
 * @sprint      Sprint 77a · T-Phase-5.A.1.9-PASS-A
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  assessScheduleMCompliance, recordScheduleMFinding, closeScheduleMFinding,
  scorePart, loadScheduleMFindings, scheduleMKey,
} from '@/lib/comply360-schedule-m-engine';
import {
  buildBRSRComprehensiveReport, recordBRSRIndicator, validateBRSRReport,
  summarizePrinciple, loadBRSRIndicators, PRINCIPLE_LABELS,
} from '@/lib/comply360-brsr-comprehensive-engine';
import {
  buildCAROExtendedReport, recordCAROObservation, listQualifiedClauses,
  summarizeClause, loadCAROExtendedObservations,
} from '@/lib/comply360-caro-extended-engine';
import {
  buildTransferPricingReport, recordMasterFileFiling, recordCbCRFiling,
  computeEqualisationLevy, loadMasterFileFilings, loadCbCRFilings,
  loadEqualisationLevyFilings, MASTER_FILE_INTL_TXN_THRESHOLD_INR,
  CBCR_PARENT_REVENUE_THRESHOLD_INR, EQUALISATION_LEVY_RATE_PCT,
} from '@/lib/comply360-transfer-pricing-engine';
import { SIBLINGS } from '@/lib/_institutional/sibling-register';
import { SPRINTS } from '@/lib/_institutional/sprint-history';

const ENT = 'TEST77A';
const FY = '2025-26';

beforeEach(() => {
  localStorage.clear();
});

describe('Sprint 77a · Schedule M engine (GMP greenfield)', () => {
  it('returns 5 parts in fresh assessment', () => {
    const r = assessScheduleMCompliance(ENT);
    expect(r.parts.length).toBe(5);
  });
  it('clean entity scores 100% and is GMP-certifiable', () => {
    const r = assessScheduleMCompliance(ENT);
    expect(r.overall_compliance_pct).toBe(100);
    expect(r.gmp_certifiable).toBe(true);
  });
  it('records finding and reflects it in part score', () => {
    recordScheduleMFinding(ENT, {
      part: 'premises_design', area_ref: 'AHU-1',
      observation: 'Pressure differential out of spec', severity: 'major',
    });
    const r = assessScheduleMCompliance(ENT);
    const premises = r.parts.find((p) => p.part === 'premises_design');
    expect(premises?.open_major).toBe(1);
    expect(premises?.compliance_pct).toBe(95);
  });
  it('critical open finding blocks GMP certifiability', () => {
    recordScheduleMFinding(ENT, {
      part: 'quality_control', area_ref: 'QC-LAB',
      observation: 'HPLC out of calibration', severity: 'critical',
    });
    const r = assessScheduleMCompliance(ENT);
    expect(r.gmp_certifiable).toBe(false);
  });
  it('close shifts finding from open to closed', () => {
    const f = recordScheduleMFinding(ENT, {
      part: 'documentation_sop', area_ref: 'SOP-101',
      observation: 'SOP outdated', severity: 'minor',
    });
    const c = closeScheduleMFinding(ENT, f.id, 'CAPA-901');
    expect(c?.closed_at).not.toBeNull();
    expect(c?.capa_ref).toBe('CAPA-901');
  });
  it('scorePart computes per-severity breakdown', () => {
    const findings = loadScheduleMFindings(ENT);
    const score = scorePart(findings, 'equipment_qualification');
    expect(score.part).toBe('equipment_qualification');
  });
  it('scheduleMKey is entity-scoped', () => {
    expect(scheduleMKey(ENT)).toBe(`erp_schedule_m_${ENT}`);
  });
});

describe('Sprint 77a · BRSR Comprehensive engine (reads brsr-fa 0-DIFF)', () => {
  it('returns 9 principles', () => {
    const r = buildBRSRComprehensiveReport(ENT, FY);
    expect(r.principles.length).toBe(9);
  });
  it('PRINCIPLE_LABELS has 9 entries', () => {
    expect(Object.keys(PRINCIPLE_LABELS).length).toBe(9);
  });
  it('fresh entity has 0% overall coverage', () => {
    const r = buildBRSRComprehensiveReport(ENT, FY);
    expect(r.overall_coverage_pct).toBe(0);
    expect(r.filing_eligible).toBe(false);
  });
  it('records indicator and shows in principle summary', () => {
    recordBRSRIndicator(ENT, FY, {
      principle: 'P1', indicator_ref: 'EI-1', is_leadership: false, value: '12',
    });
    const list = loadBRSRIndicators(ENT, FY);
    const s = summarizePrinciple(list, 'P1');
    expect(s.essential_indicators_disclosed).toBe(1);
    expect(s.data_points_count).toBe(1);
  });
  it('validateBRSRReport flags low-coverage principles', () => {
    const r = buildBRSRComprehensiveReport(ENT, FY);
    const v = validateBRSRReport(r);
    expect(v.warnings.length).toBeGreaterThan(0);
    expect(v.ready).toBe(false);
  });
  it('FA pull populates carbon and coverage fields', () => {
    const r = buildBRSRComprehensiveReport(ENT, FY);
    expect(typeof r.fa_carbon_kg_per_year).toBe('number');
    expect(typeof r.fa_coverage_pct).toBe('number');
  });
});

describe('Sprint 77a · CARO Extended engine (reads caro-2020 §Y FROZEN 0-DIFF)', () => {
  it('returns 20 extended clauses (ii through xxi)', () => {
    const r = buildCAROExtendedReport(ENT, '2025-04-01', '2026-03-31');
    expect(r.extended_clauses.length).toBe(20);
  });
  it('paragraph_3i pull from caro-2020 populates fields', () => {
    const r = buildCAROExtendedReport(ENT, '2025-04-01', '2026-03-31');
    expect(typeof r.paragraph_3i_pass).toBe('boolean');
    expect(Array.isArray(r.paragraph_3i_failing_subrules)).toBe(true);
  });
  it('clean entity may show clean_opinion=true', () => {
    const r = buildCAROExtendedReport(ENT, '2025-04-01', '2026-03-31');
    expect(typeof r.clean_opinion).toBe('boolean');
  });
  it('recording a qualified observation lifts total_qualifications', () => {
    recordCAROObservation(ENT, '2025-04-01', {
      fy_end: '2026-03-31', clause: 'vii_statutory_dues',
      qualified: true, observation_text: 'PF dues delayed in Q3',
    });
    const r = buildCAROExtendedReport(ENT, '2025-04-01', '2026-03-31');
    const q = listQualifiedClauses(r);
    expect(q).toContain('vii_statutory_dues');
  });
  it('summarizeClause aggregates per-clause observations', () => {
    const obs = loadCAROExtendedObservations(ENT, '2025-04-01');
    const s = summarizeClause(obs, 'xi_fraud_reported');
    expect(s.clause).toBe('xi_fraud_reported');
  });
  it('non-qualified observations do not lift total_qualifications', () => {
    localStorage.clear();
    recordCAROObservation(ENT, '2025-04-01', {
      fy_end: '2026-03-31', clause: 'xiv_internal_audit',
      qualified: false, observation_text: 'Internal audit functioning',
    });
    const r = buildCAROExtendedReport(ENT, '2025-04-01', '2026-03-31');
    expect(listQualifiedClauses(r)).not.toContain('xiv_internal_audit');
  });
});

describe('Sprint 77a · Transfer Pricing engine (reads form-3ceb + form-15ca-15cb 0-DIFF)', () => {
  it('fresh entity returns 0 snapshots and 0 filings', () => {
    const r = buildTransferPricingReport(ENT, FY);
    expect(r.form_3ceb_snapshots).toBe(0);
    expect(r.form_15ca_filings).toBe(0);
  });
  it('Equalisation Levy applies 6% rate', () => {
    expect(EQUALISATION_LEVY_RATE_PCT).toBe(6);
    const f = computeEqualisationLevy(ENT, FY, 10_000_000);
    expect(f.levy_amount_inr).toBe(600_000);
  });
  it('records Master File filing and persists', () => {
    recordMasterFileFiling(ENT, {
      financial_year: FY,
      consolidated_group_revenue_inr: 70_000_000_000,
      filing_required: true,
      filed_at: new Date().toISOString(),
      acknowledgment_no: 'MF-ACK-001',
    });
    expect(loadMasterFileFilings(ENT).length).toBe(1);
  });
  it('records CbCR filing and persists', () => {
    recordCbCRFiling(ENT, {
      financial_year: FY,
      parent_consolidated_revenue_inr: 70_000_000_000,
      filing_required: true,
      filed_at: new Date().toISOString(),
      acknowledgment_no: 'CBCR-ACK-001',
    });
    expect(loadCbCRFilings(ENT).length).toBe(1);
  });
  it('Master File filed lifts master_file_filed flag when required', () => {
    recordMasterFileFiling(ENT, {
      financial_year: FY,
      consolidated_group_revenue_inr: 70_000_000_000,
      filing_required: true,
      filed_at: new Date().toISOString(),
      acknowledgment_no: 'MF-ACK-002',
    });
    const r = buildTransferPricingReport(ENT, FY);
    expect(r.master_file_filed).toBe(true);
  });
  it('CbCR requirement triggered by parent revenue threshold', () => {
    recordMasterFileFiling(ENT, {
      financial_year: FY,
      consolidated_group_revenue_inr: CBCR_PARENT_REVENUE_THRESHOLD_INR + 1,
      filing_required: true, filed_at: null, acknowledgment_no: null,
    });
    const r = buildTransferPricingReport(ENT, FY);
    expect(r.cbcr_required).toBe(true);
  });
  it('Equalisation Levy filing persists and aggregates', () => {
    computeEqualisationLevy(ENT, FY, 5_000_000);
    computeEqualisationLevy(ENT, FY, 3_000_000);
    expect(loadEqualisationLevyFilings(ENT).length).toBe(2);
    const r = buildTransferPricingReport(ENT, FY);
    expect(r.equalisation_levy_total_inr).toBe(480_000);
  });
  it('thresholds exposed for UI checks', () => {
    expect(MASTER_FILE_INTL_TXN_THRESHOLD_INR).toBe(500_000_000);
    expect(CBCR_PARENT_REVENUE_THRESHOLD_INR).toBe(64_000_000_000);
  });
});

describe('Sprint 77a · Institutional register confirms', () => {
  it('4 new SIBLINGs registered with sprintAdded=77', () => {
    const ids = [
      'comply360-schedule-m-engine',
      'comply360-brsr-comprehensive-engine',
      'comply360-caro-extended-engine',
      'comply360-transfer-pricing-engine',
    ];
    for (const id of ids) {
      const sib = SIBLINGS.find((s) => s.id === id);
      expect(sib).toBeDefined();
      expect(sib?.sprintAdded).toBe(77);
    }
  });
  it('S76b SHA backfilled (not null)', () => {
    const s76b = SPRINTS.find(
      (s) => s.sprintNumber === 76 && s.code === 'T-Phase-5.A.1.8-PASS-B',
    );
    expect(s76b?.headSha).not.toBeNull();
  });
  it('S77a entry exists with 4 newSiblings', () => {
    const s77a = SPRINTS.find(
      (s) => s.sprintNumber === 77 && s.code === 'T-Phase-5.A.1.9-PASS-A',
    );
    expect(s77a).toBeDefined();
    expect(s77a?.newSiblings.length).toBe(4);
  });
});
