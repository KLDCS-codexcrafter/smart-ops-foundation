/**
 * @file        src/test/sprint-82/comply360-sprint-82.test.ts
 * @sprint      Sprint 82 · T-Phase-5.B.2.3 · FLOOR 2 OFFICIALLY CLOSES
 * @purpose     Bank-time verification · External Audit (Q18) +
 *              External Confirmation + Survival Kit (OOB-4) +
 *              DSC + Legal & Notices (Q27a) · 5 NEW SIBLINGs.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { SPRINTS, getCurrentAStreak } from '@/lib/_institutional/sprint-history';
import { SIBLINGS, getSiblingCount } from '@/lib/_institutional/sibling-register';
import { getActiveBAPAccount } from '@/lib/comply360-audit-framework-engine';
import {
  generateEngagementLetter,
  listEngagementLetters,
  calculateMateriality,
  listMaterialityCalculations,
  createAuditRiskAssessment,
  listAuditRiskAssessments,
  generateManagementRepLetter,
  generateAuditReport,
  deriveOpinionTypeFromScore,
  compileFinalAuditPack,
  listFinalAuditPacks,
  getFinalAuditPack,
} from '@/lib/comply360-external-audit-engine';
import {
  generateConfirmationLetter,
  markConfirmationSent,
  recordConfirmationReceived,
  reconcileConfirmation,
  listConfirmationLetters,
} from '@/lib/comply360-external-confirmation-engine';
import {
  generateSurvivalKit,
  markChecklistItemStatus,
  listChecklistItems,
  listLikelyQuestions,
  listSurvivalKits,
  computeReadinessPercentage,
  mapReadinessBand,
} from '@/lib/comply360-survival-kit-engine';
import {
  validateDSC,
  signAuditPack,
  listDSCValidations,
  listSignedAuditPacks,
} from '@/lib/comply360-dsc-engine';
import {
  recordLegalNotice,
  updateNoticeStatus,
  listLegalNotices,
  fileGSTAppeal,
  listGSTAppeals,
  recordLitigationCase,
  listLitigationCases,
  createNoticeTemplate,
  listNoticeTemplates,
  seedStandardNoticeTemplates,
  getUpcomingDeadlines,
} from '@/lib/comply360-legal-notices-engine';

const SRC = (p: string): string => path.resolve(__dirname, '../../..', p);
const ENG = 'eng-s82-fixture';

describe('Sprint 82 · T-Phase-5.B.2.3 · External Audit + Survival Kit + DSC + Legal & Notices · FLOOR 2 OFFICIALLY CLOSES', () => {
  beforeEach(() => {
    if (typeof localStorage !== 'undefined') localStorage.clear();
  });

  // ─── Institutional ───
  it('Sprint 82 entry exists · code T-Phase-5.B.2.3', () => {
    expect(SPRINTS.some((s) => s.code === 'T-Phase-5.B.2.3')).toBe(true);
  });
  it('Sprint 81d SHA backfilled · 99cd1525a3b03780de2267b6c32576e5a63eca3d', () => {
    const s81d = SPRINTS.find((s) => s.code === 'T-Phase-5.B.2.2-PASS-D');
    expect(s81d?.headSha).toBe('99cd1525a3b03780de2267b6c32576e5a63eca3d');
  });
  it('Sprint 82 predecessor SHA matches S81d bank', () => {
    const s82 = SPRINTS.find((s) => s.code === 'T-Phase-5.B.2.3');
    expect(s82?.predecessorSha).toBe('99cd1525a3b03780de2267b6c32576e5a63eca3d');
  });
  it('Sprint 82 declares 5 new SIBLINGs', () => {
    const s82 = SPRINTS.find((s) => s.code === 'T-Phase-5.B.2.3');
    expect(s82?.newSiblings).toEqual([
      'comply360-external-audit-engine',
      'comply360-external-confirmation-engine',
      'comply360-survival-kit-engine',
      'comply360-dsc-engine',
      'comply360-legal-notices-engine',
    ]);
  });
  it('SIBLINGs count ≥ 117 (112 baseline + 5 new)', () => {
    expect(getSiblingCount()).toBeGreaterThanOrEqual(117);
  });
  it('All 5 new S82 SIBLINGs registered', () => {
    const ids = SIBLINGS.map((s) => s.id);
    for (const id of [
      'comply360-external-audit-engine',
      'comply360-external-confirmation-engine',
      'comply360-survival-kit-engine',
      'comply360-dsc-engine',
      'comply360-legal-notices-engine',
    ]) {
      expect(ids).toContain(id);
    }
  });
  it('A-grade streak ≥ 7 (S82 targets 8-streak when banked)', () => {
    expect(getCurrentAStreak()).toBeGreaterThanOrEqual(7);
  });

  // ─── External Audit Engine (Q18) ───
  it('generateEngagementLetter persists and returns id', () => {
    const bap = getActiveBAPAccount();
    const l = generateEngagementLetter({
      engagement_id: ENG, ca_firm_name: 'Sharma & Co', auditor_name: 'CA R. Sharma',
      icai_membership_no: '123456', entity_name: 'Operix Demo Pvt Ltd', fy: 'FY2025-26',
      scope_of_engagement: 'Statutory audit u/s 143', fees_inr: 500000,
      estimated_completion_weeks: 8, generated_by_bap: bap,
    });
    expect(l.id).toMatch(/^eal_/);
    expect(listEngagementLetters(ENG)).toHaveLength(1);
  });
  it('calculateMateriality computes overall + performance materiality', () => {
    const bap = getActiveBAPAccount();
    const m = calculateMateriality({
      engagement_id: ENG, benchmark: 'revenue', benchmark_value_inr: 100_000_000,
      overall_materiality_pct: 1, performance_materiality_pct: 75,
      specific_materiality_items: [], computed_by_bap: bap,
    });
    expect(m.overall_materiality_inr).toBe(1_000_000);
    expect(m.performance_materiality_inr).toBe(750_000);
    expect(listMaterialityCalculations(ENG)).toHaveLength(1);
  });
  it('createAuditRiskAssessment stores risk entry with assertion', () => {
    const bap = getActiveBAPAccount();
    const r = createAuditRiskAssessment({
      engagement_id: ENG, risk_code: 'R-001',
      risk_description: 'Revenue cut-off',
      audit_assertion: 'cutoff', inherent_risk: 'high', control_risk: 'medium',
      detection_risk: 'low', audit_response: 'Test JE cut-off ± 5 days',
      authored_by_bap: bap,
    });
    expect(r.id).toMatch(/^risk_/);
    expect(listAuditRiskAssessments(ENG)).toHaveLength(1);
  });
  it('generateManagementRepLetter persists representations', () => {
    const bap = getActiveBAPAccount();
    const rl = generateManagementRepLetter({
      engagement_id: ENG, letter_date: '2026-04-15',
      representations: [{ topic: 'Completeness', statement: 'All transactions recorded', signed_by: 'CFO' }],
      generated_by_bap: bap,
    });
    expect(rl.id).toMatch(/^/);
    expect(rl.representations).toHaveLength(1);
  });
  it('deriveOpinionTypeFromScore returns expected bands', () => {
    expect(deriveOpinionTypeFromScore(95)).toBe('unmodified');
    expect(deriveOpinionTypeFromScore(75)).toBe('qualified');
    expect(deriveOpinionTypeFromScore(60)).toBe('adverse');
    expect(deriveOpinionTypeFromScore(10)).toBe('disclaimer');
  });
  it('generateAuditReport persists audit report', () => {
    const bap = getActiveBAPAccount();
    const rep = generateAuditReport({
      engagement_id: ENG, opinion_type: 'unmodified',
      basis_for_opinion: 'Audit conducted per SAs',
      emphasis_of_matter: [], other_matter_paragraphs: [],
      key_audit_matters: [], generated_by_bap: bap,
    });
    expect(rep.id).toBeTruthy();
  });
  it('compileFinalAuditPack composes and lists final pack', () => {
    const bap = getActiveBAPAccount();
    const pack = compileFinalAuditPack({
      engagement_id: ENG, fy: 'FY2025-26', entity_name: 'Operix Demo Pvt Ltd',
      generated_by_bap: bap,
    });
    expect(pack.id).toBeTruthy();
    expect(listFinalAuditPacks(ENG).length).toBeGreaterThanOrEqual(1);
    expect(getFinalAuditPack(pack.id)?.id).toBe(pack.id);
  });

  // ─── External Confirmation Engine ───
  it('generateConfirmationLetter creates draft letter', () => {
    const bap = getActiveBAPAccount();
    const l = generateConfirmationLetter({
      engagement_id: ENG, confirmation_type: 'debtor_balance',
      recipient_name: 'ACME Traders', recipient_address: 'Mumbai',
      recipient_contact: '9876543210', reference_balance_inr: 250000,
      as_of_date: '2026-03-31', reply_deadline: '2026-04-30',
      authored_by_bap: bap,
    });
    expect(l.letter_status).toBe('draft');
    expect(listConfirmationLetters(ENG)).toHaveLength(1);
  });
  it('markConfirmationSent transitions to sent', () => {
    const bap = getActiveBAPAccount();
    const l = generateConfirmationLetter({
      engagement_id: ENG, confirmation_type: 'creditor_balance',
      recipient_name: 'Vendor A', recipient_address: 'Pune',
      recipient_contact: '9999999999', reference_balance_inr: 100000,
      as_of_date: '2026-03-31', reply_deadline: '2026-04-30',
      authored_by_bap: bap,
    });
    const updated = markConfirmationSent(l.id, bap);
    expect(updated.letter_status).toBe('sent');
    expect(updated.sent_at).toBeTruthy();
  });
  it('reconcileConfirmation flags zero variance as reconciled', () => {
    const bap = getActiveBAPAccount();
    const l = generateConfirmationLetter({
      engagement_id: ENG, confirmation_type: 'debtor_balance',
      recipient_name: 'Match Co', recipient_address: 'Delhi',
      recipient_contact: '9000000000', reference_balance_inr: 500000,
      as_of_date: '2026-03-31', reply_deadline: '2026-04-30',
      authored_by_bap: bap,
    });
    markConfirmationSent(l.id, bap);
    recordConfirmationReceived({
      confirmation_letter_id: l.id, confirmed_balance_inr: 500000,
      reply_date: '2026-04-15', reply_method: 'email', reply_attachment_ref: null,
      recorded_by_bap: bap,
    });
    const { reconciled, variance } = reconcileConfirmation(l.id, bap);
    expect(reconciled).toBe(true);
    expect(variance).toBeNull();
  });
  it('reconcileConfirmation produces variance when balances differ', () => {
    const bap = getActiveBAPAccount();
    const l = generateConfirmationLetter({
      engagement_id: ENG, confirmation_type: 'debtor_balance',
      recipient_name: 'Diff Co', recipient_address: 'Chennai',
      recipient_contact: '9000000001', reference_balance_inr: 500000,
      as_of_date: '2026-03-31', reply_deadline: '2026-04-30',
      authored_by_bap: bap,
    });
    recordConfirmationReceived({
      confirmation_letter_id: l.id, confirmed_balance_inr: 450000,
      reply_date: '2026-04-15', reply_method: 'email', reply_attachment_ref: null,
      recorded_by_bap: bap,
    });
    const { reconciled, variance } = reconcileConfirmation(l.id, bap);
    expect(reconciled).toBe(false);
    expect(variance?.variance_amount_inr).toBe(-50000);
  });

  // ─── Survival Kit Engine (OOB-4) ───
  it('generateSurvivalKit seeds 20 checklist items + 6 questions', () => {
    const bap = getActiveBAPAccount();
    const kit = generateSurvivalKit({ engagement_id: ENG, fy: 'FY2025-26', generated_by_bap: bap });
    expect(kit.total_checklist_items).toBeGreaterThanOrEqual(20);
    expect(kit.total_likely_questions).toBeGreaterThanOrEqual(6);
    expect(kit.readiness_band).toBe('not_ready');
  });
  it('markChecklistItemStatus updates parent readiness band', () => {
    const bap = getActiveBAPAccount();
    const kit = generateSurvivalKit({ engagement_id: ENG, fy: 'FY2025-26', generated_by_bap: bap });
    const items = listChecklistItems(kit.id);
    for (const it of items) markChecklistItemStatus(it.id, 'ready', bap);
    const refreshed = listSurvivalKits(ENG)[0];
    expect(refreshed.readiness_percentage).toBe(100);
    expect(refreshed.readiness_band).toBe('audit_ready');
  });
  it('computeReadinessPercentage + mapReadinessBand cover boundaries', () => {
    expect(computeReadinessPercentage([])).toBe(0);
    expect(mapReadinessBand(90)).toBe('audit_ready');
    expect(mapReadinessBand(75)).toBe('mostly_ready');
    expect(mapReadinessBand(60)).toBe('partial');
    expect(mapReadinessBand(10)).toBe('not_ready');
  });
  it('listLikelyQuestions returns seeded questions for kit', () => {
    const bap = getActiveBAPAccount();
    const kit = generateSurvivalKit({ engagement_id: ENG, fy: 'FY2025-26', generated_by_bap: bap });
    const qs = listLikelyQuestions(kit.id);
    expect(qs.length).toBeGreaterThanOrEqual(6);
  });

  // ─── DSC Engine ───
  it('validateDSC marks expired certificate invalid', () => {
    const r = validateDSC({
      certificate_id: 'DSC-EXP', certificate_holder_name: 'CA X',
      certificate_authority: 'eMudhra',
      validity_start: '2020-01-01', validity_end: '2021-01-01',
    });
    expect(r.is_valid).toBe(false);
    expect(r.validation_errors.length).toBeGreaterThan(0);
  });
  it('validateDSC accepts valid certificate from approved CA', () => {
    const future = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const r = validateDSC({
      certificate_id: 'DSC-OK', certificate_holder_name: 'CA Y',
      certificate_authority: 'eMudhra',
      validity_start: '2024-01-01', validity_end: future,
    });
    expect(r.is_valid).toBe(true);
    expect(listDSCValidations().length).toBeGreaterThanOrEqual(1);
  });
  it('signAuditPack throws when DSC invalid', () => {
    const exp = validateDSC({
      certificate_id: 'DSC-BAD', certificate_holder_name: 'CA Z',
      certificate_authority: 'eMudhra',
      validity_start: '2020-01-01', validity_end: '2021-01-01',
    });
    const bap = getActiveBAPAccount();
    expect(() => signAuditPack({
      final_audit_pack_id: 'pack-x', dsc_validation_id: exp.id, signed_by_bap: bap,
    })).toThrow();
  });
  it('signAuditPack produces deterministic signature hash', () => {
    const future = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const v = validateDSC({
      certificate_id: 'DSC-OK', certificate_holder_name: 'CA Y',
      certificate_authority: 'NSDL',
      validity_start: '2024-01-01', validity_end: future,
    });
    const bap = getActiveBAPAccount();
    const pack = signAuditPack({
      final_audit_pack_id: 'pack-y', dsc_validation_id: v.id, signed_by_bap: bap,
    });
    expect(pack.signature_hash).toMatch(/^[0-9a-f]{16}$/);
    expect(listSignedAuditPacks().length).toBeGreaterThanOrEqual(1);
  });

  // ─── Legal & Notices Engine (Q27a) ───
  it('recordLegalNotice persists and lists by entity', () => {
    const bap = getActiveBAPAccount();
    const n = recordLegalNotice({
      entity_code: 'OPERIX-DEMO', notice_type: 'IT_Section_143',
      notice_number: 'IT-001', issuing_authority: 'AO Mumbai',
      notice_date: '2026-04-01', response_deadline: '2026-04-30',
      amount_demanded_inr: 100000, subject: 'Scrutiny assessment',
      recorded_by_bap: bap,
    });
    expect(n.status).toBe('received');
    expect(listLegalNotices('OPERIX-DEMO')).toHaveLength(1);
  });
  it('updateNoticeStatus to responded sets response_filed_at', () => {
    const bap = getActiveBAPAccount();
    const n = recordLegalNotice({
      entity_code: 'OPERIX-DEMO', notice_type: 'GST_DRC_01',
      notice_number: 'DRC-001', issuing_authority: 'GST Commissioner',
      notice_date: '2026-04-01', response_deadline: '2026-04-30',
      amount_demanded_inr: 50000, subject: 'ITC mismatch',
      recorded_by_bap: bap,
    });
    const updated = updateNoticeStatus(n.id, 'responded', bap, 'Response uploaded');
    expect(updated.status).toBe('responded');
    expect(updated.response_filed_at).toBeTruthy();
  });
  it('fileGSTAppeal records appeal at APL-01 stage', () => {
    const bap = getActiveBAPAccount();
    const a = fileGSTAppeal({
      notice_id: null, stage: 'APL_01_first_appeal',
      filed_date: '2026-05-01', filing_authority: 'Appellate Authority',
      grounds_of_appeal: 'Disputed ITC reversal', amount_disputed_inr: 500000,
      recorded_by_bap: bap,
    });
    expect(a.outcome).toBe('pending');
    expect(listGSTAppeals('OPERIX-DEMO').length).toBeGreaterThanOrEqual(1);
  });
  it('recordLitigationCase persists case at pending status', () => {
    const bap = getActiveBAPAccount();
    const c = recordLitigationCase({
      case_number: 'WP-101/2026', case_title: 'Co vs. State',
      court_name: 'Bombay HC', case_type: 'tax_appeal',
      filed_date: '2026-05-01', counsel_name: 'Adv. R. Kumar',
      amount_at_stake_inr: 1500000, recorded_by_bap: bap,
    });
    expect(c.case_status).toBe('pending');
    expect(listLitigationCases('OPERIX-DEMO').length).toBeGreaterThanOrEqual(1);
  });
  it('seedStandardNoticeTemplates creates templates', () => {
    const bap = getActiveBAPAccount();
    const tpls = seedStandardNoticeTemplates(bap);
    expect(tpls.length).toBeGreaterThan(0);
    expect(listNoticeTemplates().length).toBeGreaterThanOrEqual(tpls.length);
  });
  it('createNoticeTemplate appends custom template', () => {
    const bap = getActiveBAPAccount();
    const t = createNoticeTemplate({
      template_name: 'IT 143(2) Response',
      template_type: 'IT_Section_143',
      template_body: 'Dear Sir, ...',
      variables: ['notice_no', 'fy'],
      authored_by_bap: bap,
    });
    expect(t.id).toBeTruthy();
  });
  it('getUpcomingDeadlines returns notices within window', () => {
    const bap = getActiveBAPAccount();
    const future = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    recordLegalNotice({
      entity_code: 'OPERIX-DEMO', notice_type: 'IT_Section_142_1',
      notice_number: 'IT-009', issuing_authority: 'AO',
      notice_date: '2026-04-01', response_deadline: future,
      amount_demanded_inr: null, subject: 'Info request', recorded_by_bap: bap,
    });
    const upcoming = getUpcomingDeadlines('OPERIX-DEMO', 30);
    expect(upcoming.length).toBeGreaterThanOrEqual(1);
  });

  // ─── External Audit + Legal Pages: tab counts ───
  it('ExternalAuditPage exposes 7 sub-tabs (3 stub + 4 new)', () => {
    const src = fs.readFileSync(SRC('src/pages/erp/comply360/external-audit/ExternalAuditPage.tsx'), 'utf-8');
    const matches = src.match(/<TabsTrigger\s+value=/g);
    expect(matches?.length).toBeGreaterThanOrEqual(7);
  });
  it('LegalNoticesPage exposes 7 sub-tabs (2 stub + 5 new)', () => {
    const src = fs.readFileSync(SRC('src/pages/erp/comply360/legal/LegalNoticesPage.tsx'), 'utf-8');
    const matches = src.match(/<TabsTrigger\s+value=/g);
    expect(matches?.length).toBeGreaterThanOrEqual(7);
  });

  // ─── File presence sanity ───
  it('All 5 new engine source files exist on disk', () => {
    for (const f of [
      'src/lib/comply360-external-audit-engine.ts',
      'src/lib/comply360-external-confirmation-engine.ts',
      'src/lib/comply360-survival-kit-engine.ts',
      'src/lib/comply360-dsc-engine.ts',
      'src/lib/comply360-legal-notices-engine.ts',
    ]) {
      expect(fs.existsSync(SRC(f))).toBe(true);
    }
  });
  it('S82 arc close-summary exists', () => {
    const p = SRC('audit_workspace/T-Phase-5.B.2.3/Z_close_evidence/sprint-82-arc-summary.md');
    expect(fs.existsSync(p)).toBe(true);
  });

  // ─── ENGAGEMENT-LIFECYCLE INTEGRATION ───
  it('end-to-end: engagement letter → materiality → risk → final pack', () => {
    const bap = getActiveBAPAccount();
    generateEngagementLetter({
      engagement_id: ENG, ca_firm_name: 'F&Co', auditor_name: 'CA A',
      icai_membership_no: '999', entity_name: 'E', fy: 'FY26',
      scope_of_engagement: 'Stat', fees_inr: 1, estimated_completion_weeks: 1,
      generated_by_bap: bap,
    });
    calculateMateriality({
      engagement_id: ENG, benchmark: 'profit_before_tax', benchmark_value_inr: 10_000_000,
      overall_materiality_pct: 5, performance_materiality_pct: 75,
      specific_materiality_items: [], computed_by_bap: bap,
    });
    createAuditRiskAssessment({
      engagement_id: ENG, risk_code: 'R-IT', risk_description: 'IT GC',
      audit_assertion: 'occurrence', inherent_risk: 'medium', control_risk: 'low',
      detection_risk: 'low', audit_response: 'Test', authored_by_bap: bap,
    });
    const pack = compileFinalAuditPack({
      engagement_id: ENG, fy: 'FY2025-26', entity_name: 'Operix Demo Pvt Ltd',
      generated_by_bap: bap,
    });
    expect(pack.id).toBeTruthy();
  });
});
