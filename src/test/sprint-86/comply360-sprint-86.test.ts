/**
 * @file        src/test/sprint-86/comply360-sprint-86.test.ts
 * @purpose     Sprint 86 · T-Phase-5.D.4.1 · Floor 4 Sector-Pack Arc 4.1 OPENS
 *              Verifies 3 NEW SIBLINGs (labour-codes + posh + gig-workers) + 3 NEW PAGES.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { SPRINTS, getCurrentAStreak, getSprintCount } from '@/lib/_institutional/sprint-history';
import { SIBLINGS, getSiblingCount } from '@/lib/_institutional/sibling-register';
import {
  READS_FROM as LC_RF, recordComplianceEntry, createLabourCodeFiling, listComplianceEntries,
  listLabourCodeFilings, getCodeProvisions, computeComplianceScore, getLabourCodeTypes,
  getSocialSecurityAuditCrossRefs,
} from '@/lib/comply360-labour-codes-engine';
import {
  READS_FROM as POSH_RF, appointICCMember, fileposhComplaint, assignICCInvestigator,
  resolveposhComplaint, listICCMembers, listposhComplaints, generateAnnualReport,
  listAnnualReports, verifyICCComposition, getICCMeetingsForFY, getOverlappingHarassmentComplaints,
} from '@/lib/comply360-posh-engine';
import {
  READS_FROM as GW_RF, registerAggregator, enrolGigWorker, recordWelfareContribution,
  computeWelfareContribution, listAggregators, listGigWorkers, listWelfareContributions,
  markContributionPaid, getPlatformCategories, getWelfareAuditCrossRefs,
} from '@/lib/comply360-gig-workers-engine';

const SRC = (p: string): string => path.resolve(__dirname, '../../..', p);
const BAP = 'mr-a-client' as const;

describe('Sprint 86 · T-Phase-5.D.4.1 · Q30 Sector-Pack · FLOOR 4 OPENS', () => {
  beforeEach(() => { localStorage.clear(); });

  // ── Institutional registers ────────────────────────────────────────
  it('Sprint 86 entry exists · code T-Phase-5.D.4.1 · grade A first-pass-clean', () => {
    const s86 = SPRINTS.find((s) => s.sprintNumber === 86);
    expect(s86?.code).toBe('T-Phase-5.D.4.1');
    expect(s86?.grade).toBe('A first-pass-clean');
    expect(s86?.predecessorSha).toBe('7fa57f626caa6df61a0acc1afa171abba32e4016');
    expect(s86?.newSiblings).toEqual([
      'comply360-labour-codes-engine',
      'comply360-posh-engine',
      'comply360-gig-workers-engine',
    ]);
  });
  it('A-streak >= 11 (S86 OPENS · target 12)', () => { expect(getCurrentAStreak()).toBeGreaterThanOrEqual(11); });
  it('SPRINTS >= 102', () => { expect(getSprintCount()).toBeGreaterThanOrEqual(102); });
  it('SIBLINGs runtime >= 130 (post S86 +3)', () => { expect(getSiblingCount()).toBeGreaterThanOrEqual(130); });
  it('3 NEW SIBLING entries registered with CONFIRMED provenance', () => {
    for (const id of ['comply360-labour-codes-engine', 'comply360-posh-engine', 'comply360-gig-workers-engine']) {
      const s = SIBLINGS.find((x) => x.id === id);
      expect(s?.provenance).toBe('CONFIRMED');
      expect(s?.sprintAdded).toBe(86);
    }
  });

  // ── File existence ────────────────────────────────────────────────
  it('3 NEW SIBLING engine files exist', () => {
    for (const f of [
      'src/lib/comply360-labour-codes-engine.ts',
      'src/lib/comply360-posh-engine.ts',
      'src/lib/comply360-gig-workers-engine.ts',
    ]) expect(fs.existsSync(SRC(f))).toBe(true);
  });
  it('3 NEW PAGE files exist', () => {
    for (const f of [
      'src/pages/erp/comply360/labour-codes/LabourCodesPage.tsx',
      'src/pages/erp/comply360/posh/POSHPage.tsx',
      'src/pages/erp/comply360/gig-workers/GigWorkersPage.tsx',
    ]) expect(fs.existsSync(SRC(f))).toBe(true);
  });
  it('S86 close-summary exists · FLOOR 4 OPENS declaration', () => {
    const p = SRC('audit_workspace/T-Phase-5.D.4.1/Z_close_evidence/sprint-86-arc-summary.md');
    expect(fs.existsSync(p)).toBe(true);
    expect(fs.readFileSync(p, 'utf-8')).toMatch(/FLOOR 4 OPENS/);
  });

  // ── READS_FROM contracts ──────────────────────────────────────────
  it('READS_FROM contracts declared for all 3 engines', () => {
    expect(LC_RF.engines).toContain('comply360-payroll-audit-engine');
    expect(POSH_RF.engines).toContain('comply360-meetings-engine');
    expect(POSH_RF.engines).toContain('comply360-whistleblower-engine');
    expect(GW_RF.engines).toContain('comply360-payroll-audit-engine');
  });

  // ── Labour Codes engine ───────────────────────────────────────────
  it('Labour Codes · records compliance entry + computes score', () => {
    const e = recordComplianceEntry({
      code_type: 'Code_on_Wages', fy: '2026-27', establishment_id: 'EST-001',
      applicable_provisions: ['S 6', 'S 15'], compliance_status: 'compliant',
      evidence_refs: ['ev-1'], reviewed_by_bap: BAP,
    });
    expect(e.id).toMatch(/^lce_/);
    expect(listComplianceEntries({ code_type: 'Code_on_Wages', fy: '2026-27' }).length).toBe(1);
    expect(computeComplianceScore('Code_on_Wages', '2026-27').score).toBe(100);
  });
  it('Labour Codes · filing draft created', () => {
    const f = createLabourCodeFiling({
      code_type: 'Code_on_Social_Security', form_number: 'EPF-ECR', fy: '2026-27',
      filing_deadline: '2026-04-15', prepared_by_bap: BAP,
    });
    expect(f.filing_status).toBe('draft');
    expect(listLabourCodeFilings({ fy: '2026-27' }).length).toBe(1);
  });
  it('Labour Codes · 4 code types · provisions registry + cross-ref', () => {
    expect(getLabourCodeTypes().length).toBe(4);
    expect(getCodeProvisions('Code_on_Wages').length).toBeGreaterThanOrEqual(4);
    expect(getCodeProvisions('Code_on_Social_Security').length).toBeGreaterThanOrEqual(5);
    expect(Array.isArray(getSocialSecurityAuditCrossRefs())).toBe(true);
  });

  // ── POSH engine ───────────────────────────────────────────────────
  it('POSH · ICC composition · invalid before quorum · valid after Section 4(2) compliance', () => {
    expect(verifyICCComposition().is_valid).toBe(false);
    appointICCMember({ member_name: 'Asha Rao', role: 'Presiding_Officer', is_woman: true, appointment_date: '2026-04-01', term_end_date: '2029-03-31', recorded_by_bap: BAP });
    appointICCMember({ member_name: 'Kavita Singh', role: 'Employee_Member', is_woman: true, appointment_date: '2026-04-01', term_end_date: '2029-03-31', recorded_by_bap: BAP });
    appointICCMember({ member_name: 'Sunita Desai', role: 'NGO_Representative', is_woman: true, appointment_date: '2026-04-01', term_end_date: '2029-03-31', recorded_by_bap: BAP });
    const v = verifyICCComposition();
    expect(v.is_valid).toBe(true);
    expect(v.women_count).toBe(3);
    expect(listICCMembers({ active_only: true }).length).toBe(3);
  });
  it('POSH · complaint lifecycle · file → assign → resolve · anonymous protection', () => {
    const m = appointICCMember({ member_name: 'Asha Rao', role: 'Presiding_Officer', is_woman: true, appointment_date: '2026-04-01', term_end_date: '2029-03-31', recorded_by_bap: BAP });
    const c = fileposhComplaint({
      fy: '2026-27', complaint_date: '2026-05-10', complainant_identifier: 'EMP-101',
      is_anonymous: true, category: 'verbal_harassment', severity: 'medium',
      complaint_summary: 'Verbal harassment by supervisor', complaint_details_encrypted: 'ENC:xxx',
    });
    expect(c.complainant_identifier).toBeNull(); // anonymous protection enforced
    assignICCInvestigator(c.id, m.id, BAP);
    expect(listposhComplaints({ status: 'under_investigation' }).length).toBe(1);
    resolveposhComplaint(c.id, 'Mediated · written warning issued', BAP);
    expect(listposhComplaints({ status: 'resolved' }).length).toBe(1);
  });
  it('POSH · Section 21 Annual Report aggregates complaints by category', () => {
    fileposhComplaint({ fy: '2026-27', complaint_date: '2026-05-10', complainant_identifier: null, is_anonymous: true, category: 'verbal_harassment', severity: 'low', complaint_summary: 'x', complaint_details_encrypted: 'ENC' });
    fileposhComplaint({ fy: '2026-27', complaint_date: '2026-06-10', complainant_identifier: null, is_anonymous: true, category: 'visual_harassment', severity: 'medium', complaint_summary: 'y', complaint_details_encrypted: 'ENC' });
    const r = generateAnnualReport({ fy: '2026-27', preventive_actions_taken: ['quarterly training'], awareness_programs_conducted: 4, prepared_by_bap: BAP });
    expect(r.total_complaints_received).toBe(2);
    expect(r.category_breakdown.verbal_harassment).toBe(1);
    expect(r.category_breakdown.visual_harassment).toBe(1);
    expect(listAnnualReports({ fy: '2026-27' }).length).toBe(1);
    expect(typeof getICCMeetingsForFY('2026-27')).toBe('number');
    expect(typeof getOverlappingHarassmentComplaints('2026-27')).toBe('number');
  });

  // ── Gig Workers engine ────────────────────────────────────────────
  it('Gig Workers · aggregator registration + worker enrolment', () => {
    const agg = registerAggregator({
      aggregator_name: 'SwiftRide India', registration_number: 'AGG-MH-2026-001',
      platform_category: 'transportation', state: 'Maharashtra', total_gig_workers: 1200,
      registration_date: '2026-04-01', recorded_by_bap: BAP,
    });
    expect(listAggregators().length).toBe(1);
    enrolGigWorker({ aggregator_id: agg.id, worker_name: 'Ravi Kumar', worker_id: 'GW-001', category: 'transportation', enrolment_date: '2026-04-05' });
    expect(listGigWorkers({ aggregator_id: agg.id, is_active: true }).length).toBe(1);
  });
  it('Gig Workers · welfare contribution 1-2% turnover · Section 113A/114', () => {
    expect(computeWelfareContribution(10_000_000, 1)).toBe(100_000);
    expect(computeWelfareContribution(10_000_000, 2)).toBe(200_000);
    const c = recordWelfareContribution({
      aggregator_id: 'agg-x', fy: '2026-27', quarter: 'Q1',
      turnover_inr: 50_000_000, contribution_pct: 1, recorded_by_bap: BAP,
    });
    expect(c.contribution_amount_inr).toBe(500_000);
    expect(c.paid_at).toBeNull();
    markContributionPaid(c.id, 'UTR-12345', BAP);
    expect(listWelfareContributions({ fy: '2026-27', quarter: 'Q1' })[0].paid_at).not.toBeNull();
  });
  it('Gig Workers · 7 platform categories + audit cross-refs', () => {
    expect(getPlatformCategories().length).toBe(7);
    expect(Array.isArray(getWelfareAuditCrossRefs())).toBe(true);
  });

  // ── Sidebar + routing ─────────────────────────────────────────────
  it('Sidebar config includes 3 new modules (labour-codes + posh + gig-workers)', () => {
    const src = fs.readFileSync(SRC('src/apps/erp/configs/comply360-sidebar-config.ts'), 'utf-8');
    expect(src).toMatch(/id: 'labour-codes'/);
    expect(src).toMatch(/id: 'posh'/);
    expect(src).toMatch(/id: 'gig-workers'/);
  });
  it('Comply360Page routes 3 new modules', () => {
    const src = fs.readFileSync(SRC('src/pages/erp/comply360/Comply360Page.tsx'), 'utf-8');
    expect(src).toMatch(/case 'labour-codes'/);
    expect(src).toMatch(/case 'posh'/);
    expect(src).toMatch(/case 'gig-workers'/);
  });
});
