/**
 * Sprint 83 · T-Phase-5.C.3.1 · Q29 Part 1 ROC-Suite · FLOOR 3 OPENS
 */
import { describe, it, expect, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { SPRINTS, getCurrentAStreak } from '@/lib/_institutional/sprint-history';
import { getSiblingCount } from '@/lib/_institutional/sibling-register';
import {
  READS_FROM as DIR3_RF, createDirectorMaster, listDirectors, generateDIR3KYCDraft,
  listDIR3KYCFilings, recordDIR12Resignation, checkDINStatus, computeDIR3KYCFee, getUpcomingDIR3Deadlines,
} from '@/lib/comply360-dir3-kyc-engine';
import {
  READS_FROM as AOC4_RF, createAOC4Filing, listAOC4Filings, mapXBRLTaxonomyEntry,
  recordFilingAttempt, computeAOC4Fee, exportAOC4JsonBundle,
} from '@/lib/comply360-aoc4-engine';
import {
  READS_FROM as MGT7_RF, createMGT7Filing, listMGT7Filings, recordShareholdingPattern,
  recordBoardComposition, recordMeetingSummary, determineMGT7Variant, getShareholdingPattern,
} from '@/lib/comply360-mgt7-engine';
import {
  READS_FROM as ADT1_RF, createADT1Filing, listADT1Filings, recordADT3Resignation,
  trackCoolingOff, isAuditorEligible, addDSCVaultEntry, listDSCVaultEntries,
} from '@/lib/comply360-adt1-engine';
import {
  READS_FROM as REG_RF, recordRegisterEntry, supersedeRegisterEntry,
  listRegisterEntries, getRegisterTypes,
} from '@/lib/comply360-statutory-registers-engine';

const SRC = (p: string): string => path.resolve(__dirname, '../../..', p);
const BAP = 'mr-a-client' as const;

describe('Sprint 83 · T-Phase-5.C.3.1 · Q29 Part 1 ROC-Suite · FLOOR 3 OPENS', () => {
  beforeEach(() => { localStorage.clear(); });

  // Institutional
  it('Sprint 83 entry exists', () => {
    expect(SPRINTS.some((s) => s.sprintNumber === 83 && s.code === 'T-Phase-5.C.3.1')).toBe(true);
  });
  it('Sprint 82 SHA backfilled', () => {
    const s82 = SPRINTS.find((s) => s.sprintNumber === 82);
    expect(s82?.headSha).toBe('6f9573e1db36beb25e376fa88d144e7a06ab9072');
  });
  it('A-streak >= 8', () => { expect(getCurrentAStreak()).toBeGreaterThanOrEqual(8); });
  it('SPRINTS >= 99 (target 100 MILESTONE post-bank)', () => { expect(SPRINTS.length).toBeGreaterThanOrEqual(99); });
  it('SIBLINGs runtime >= 117 (target 122 post-bank)', () => { expect(getSiblingCount()).toBeGreaterThanOrEqual(117); });

  // File existence
  it('5 NEW SIBLING files exist', () => {
    for (const f of [
      'src/lib/comply360-dir3-kyc-engine.ts',
      'src/lib/comply360-aoc4-engine.ts',
      'src/lib/comply360-mgt7-engine.ts',
      'src/lib/comply360-adt1-engine.ts',
      'src/lib/comply360-statutory-registers-engine.ts',
    ]) expect(fs.existsSync(SRC(f))).toBe(true);
  });
  it('S83 close-summary exists', () => {
    expect(fs.existsSync(SRC('audit_workspace/T-Phase-5.C.3.1/Z_close_evidence/sprint-83-arc-summary.md'))).toBe(true);
  });

  // READS_FROM canon
  it('dir3-kyc READS_FROM has 3 engines', () => { expect(DIR3_RF.engines.length).toBe(3); });
  it('aoc4 READS_FROM has 5 engines', () => { expect(AOC4_RF.engines.length).toBe(5); });
  it('mgt7 READS_FROM has 3 engines', () => { expect(MGT7_RF.engines.length).toBe(3); });
  it('adt1 READS_FROM includes S82 dsc-engine', () => {
    expect(ADT1_RF.engines.length).toBe(5);
    expect(ADT1_RF.engines).toContain('comply360-dsc-engine');
  });
  it('statutory-registers READS_FROM has 3 engines', () => { expect(REG_RF.engines.length).toBe(3); });

  // DIR-3 KYC
  it('createDirectorMaster + listDirectors roundtrip', () => {
    const d = createDirectorMaster({
      din: '00012345', name: 'Test', date_of_birth: '1980-01-01', pan: 'ABCDE1234F',
      passport_no: null, address: 'X', email: 'a@b.c', mobile: '9999900000',
      designation: 'Director', appointment_date: '2020-04-01', created_by_bap: BAP,
    });
    expect(listDirectors().some((x) => x.id === d.id)).toBe(true);
  });
  it('generateDIR3KYCDraft deadline = fy year-09-30', () => {
    const d = createDirectorMaster({
      din: '00012346', name: 'T', date_of_birth: '1980-01-01', pan: 'ABCDE1234F',
      passport_no: null, address: 'X', email: 'a@b.c', mobile: '9999900000',
      designation: 'Director', appointment_date: '2020-04-01', created_by_bap: BAP,
    });
    const f = generateDIR3KYCDraft({ director_id: d.id, filing_type: 'DIR_3_KYC', fy: '2025-26', prepared_by_bap: BAP });
    expect(f.deadline).toBe('2025-09-30');
    expect(listDIR3KYCFilings({ din: d.din }).length).toBe(1);
  });
  it('computeDIR3KYCFee first-time DIR_3_KYC = ₹0', () => {
    expect(computeDIR3KYCFee({ fy: '2025-26', filing_type: 'DIR_3_KYC', days_late: 0, is_first_time_filer: true }))
      .toEqual({ filing_fee_inr: 0, late_fee_inr: 0 });
  });
  it('computeDIR3KYCFee non-first-time + 30 days late = ₹10,000', () => {
    const r = computeDIR3KYCFee({ fy: '2025-26', filing_type: 'DIR_3_KYC', days_late: 30, is_first_time_filer: false });
    expect(r.filing_fee_inr + r.late_fee_inr).toBe(10000);
  });
  it('getUpcomingDIR3Deadlines returns array', () => {
    expect(Array.isArray(getUpcomingDIR3Deadlines(60))).toBe(true);
  });
  it('recordDIR12Resignation + checkDINStatus logAudit', () => {
    const r = recordDIR12Resignation({
      director_id: 'd', din: '00012345', resignation_date: '2025-01-01',
      reason: 'Personal', effective_date: '2025-01-15', filed_by_bap: BAP,
    });
    expect(r.id).toBeTruthy();
    const c = checkDINStatus('00012345', 'approved', BAP);
    expect(c.status).toBe('approved');
  });

  // AOC-4
  it('createAOC4Filing deadline = agm + 30 days', () => {
    const f = createAOC4Filing({
      filing_type: 'standalone', fy: '2024-25', agm_date: '2025-09-01',
      paid_up_capital_inr: 5000000, authorized_capital_inr: 10000000,
      balance_sheet_attestation_ref: null, pl_attestation_ref: null, cash_flow_attestation_ref: null,
      auditor_report_attachment: null, boards_report_attachment: null,
      csr_annexure_2_required: false, csr_annexure_2_attachment: null, prepared_by_bap: BAP,
    });
    expect(f.filing_deadline).toBe('2025-10-01');
  });
  it('AOC-4 supports 3 variants', () => {
    for (const t of ['standalone', 'consolidated', 'xbrl'] as const) {
      createAOC4Filing({
        filing_type: t, fy: '2024-25', agm_date: '2025-09-01',
        paid_up_capital_inr: 1000000, authorized_capital_inr: 2000000,
        balance_sheet_attestation_ref: null, pl_attestation_ref: null, cash_flow_attestation_ref: null,
        auditor_report_attachment: null, boards_report_attachment: null,
        csr_annexure_2_required: false, csr_annexure_2_attachment: null, prepared_by_bap: BAP,
      });
    }
    expect(listAOC4Filings().length).toBe(3);
  });
  it('computeAOC4Fee uses MCA slab', () => {
    expect(computeAOC4Fee(50000, 0).filing_fee_inr).toBe(200);
    expect(computeAOC4Fee(5000000, 0).filing_fee_inr).toBe(500);
    expect(computeAOC4Fee(200000000, 0).filing_fee_inr).toBe(600);
  });
  it('mapXBRLTaxonomyEntry roundtrip', () => {
    const m = mapXBRLTaxonomyEntry({
      aoc4_xbrl_id: 'x1', schedule_iii_element_code: 'BS_AssetCurrent_TradeReceivables',
      source_account_code: '1100', mapped_value_inr: 1000, mapping_confidence: 'high', mapped_by_bap: BAP,
    });
    expect(m.id).toBeTruthy();
  });
  it('exportAOC4JsonBundle returns Blob', () => {
    const f = createAOC4Filing({
      filing_type: 'xbrl', fy: '2024-25', agm_date: '2025-09-01',
      paid_up_capital_inr: 5000000, authorized_capital_inr: 10000000,
      balance_sheet_attestation_ref: null, pl_attestation_ref: null, cash_flow_attestation_ref: null,
      auditor_report_attachment: null, boards_report_attachment: null,
      csr_annexure_2_required: false, csr_annexure_2_attachment: null, prepared_by_bap: BAP,
    });
    const out = exportAOC4JsonBundle(f.id);
    expect(out.blob).toBeInstanceOf(Blob);
    expect(out.filename_suggested).toContain('.json');
  });
  it('recordFilingAttempt logAudit', () => {
    const a = recordFilingAttempt({
      aoc4_filing_id: 'x', attempt_date: '2025-10-15', outcome: 'success',
      mca_acknowledgment_no: 'ACK1', rejection_codes: [],
    });
    expect(a.id).toBeTruthy();
  });

  // MGT-7
  it('createMGT7Filing deadline = agm + 60 days', () => {
    const f = createMGT7Filing({
      filing_type: 'MGT_7', fy: '2024-25', agm_date: '2025-09-01',
      paid_up_capital_inr: 50000000, total_members: 50, prepared_by_bap: BAP,
    });
    expect(f.filing_deadline).toBe('2025-10-31');
  });
  it('determineMGT7Variant small co → MGT_7A', () => {
    expect(determineMGT7Variant({ paid_up_capital_inr: 1000000, turnover_inr: 50000000 })).toBe('MGT_7A');
  });
  it('determineMGT7Variant large co → MGT_7', () => {
    expect(determineMGT7Variant({ paid_up_capital_inr: 100000000, turnover_inr: 500000000 })).toBe('MGT_7');
  });
  it('recordShareholdingPattern + board + meeting roundtrip', () => {
    const sh = recordShareholdingPattern({
      mgt7_filing_id: 'm1', promoter_holding_pct: 60, promoter_pledged_pct: 0,
      public_holding_pct: 30, institutional_holding_pct: 8, fii_holding_pct: 2,
      total_outstanding_shares: 1000000, top_10_shareholders: [],
    });
    expect(getShareholdingPattern('m1')?.id).toBe(sh.id);
    expect(recordBoardComposition({
      mgt7_filing_id: 'm1', total_directors: 6, executive_directors: 2,
      non_executive_directors: 4, independent_directors: 2, women_directors: 1,
      audit_committee_count: 3, nomination_committee_count: 3, csr_committee_count: 3,
    }).id).toBeTruthy();
    expect(recordMeetingSummary({
      mgt7_filing_id: 'm1', agm_held: true, agm_date: '2025-09-01',
      board_meetings_count: 4, audit_committee_meetings_count: 4, csr_committee_meetings_count: 2,
      related_party_transactions_count: 0, indebtedness_inr: 0, penalties_history: [],
    }).id).toBeTruthy();
  });
  it('listMGT7Filings filters by FY', () => {
    createMGT7Filing({
      filing_type: 'MGT_7A', fy: '2023-24', agm_date: '2024-09-01',
      paid_up_capital_inr: 1000000, total_members: 5, prepared_by_bap: BAP,
    });
    expect(listMGT7Filings({ fy: '2023-24' }).length).toBeGreaterThanOrEqual(1);
  });

  // ADT-1 + DSC Vault
  it('createADT1Filing with deadline = appointment + 15 days', () => {
    const f = createADT1Filing({
      fy: '2024-25', appointment_type: 'first_appointment', auditor_class: 'CA_Firm',
      auditor_name: 'Demo & Co', icai_membership_no: 'M1', ca_firm_registration_no: '012345N',
      appointment_date: '2025-04-01', agm_date_resolution: '2025-04-01', term_years: 5, prepared_by_bap: BAP,
    });
    expect(f.filing_deadline).toBe('2025-04-16');
    expect(listADT1Filings().length).toBe(1);
  });
  it('recordADT3Resignation deadline = resignation + 30 days', () => {
    const r = recordADT3Resignation({
      adt1_filing_id: 'a1', resignation_date: '2025-06-01', reason: 'Other engagement', filed_by_bap: BAP,
    });
    expect(r.filing_deadline).toBe('2025-07-01');
  });
  it('trackCoolingOff sets eligible_again_date = +5 years', () => {
    const t = trackCoolingOff('A', 'M99', '2020-03-31', BAP);
    expect(t.eligible_again_date).toBe('2025-03-31');
  });
  it('addDSCVaultEntry + listDSCVaultEntries · S82 USE-SITE read', () => {
    const e = addDSCVaultEntry({
      director_id: null, din: '00099999', certificate_id: 'CERT-X', role: 'Director', added_by_bap: BAP,
    });
    expect(listDSCVaultEntries({ din: '00099999' }).some((x) => x.id === e.id)).toBe(true);
  });
  it('isAuditorEligible false during cooling-off', () => {
    const future = new Date(); future.setFullYear(future.getFullYear() + 1);
    trackCoolingOff('B', 'M-LOCK', future.toISOString().slice(0, 10), BAP);
    expect(isAuditorEligible('M-LOCK')).toBe(false);
  });

  // Statutory Registers
  it('recordRegisterEntry with all 7 types', () => {
    for (const t of getRegisterTypes()) {
      const e = recordRegisterEntry({
        register_type: t.register_type, entry_payload: { x: 1 },
        effective_date: '2025-01-01', recorded_by_bap: BAP,
      });
      expect(e.is_active).toBe(true);
    }
  });
  it('supersedeRegisterEntry marks old inactive + creates new', () => {
    const e = recordRegisterEntry({
      register_type: 'Register_of_Members', entry_payload: { v: 1 },
      effective_date: '2025-01-01', recorded_by_bap: BAP,
    });
    const { old_entry, new_entry } = supersedeRegisterEntry(e.id, { v: 2 }, BAP);
    expect(old_entry.is_active).toBe(false);
    expect(new_entry.is_active).toBe(true);
  });
  it('listRegisterEntries filters by is_active', () => {
    recordRegisterEntry({
      register_type: 'Register_of_Charges', entry_payload: { a: 1 },
      effective_date: '2025-01-01', recorded_by_bap: BAP,
    });
    expect(listRegisterEntries('Register_of_Charges', { is_active: true }).length).toBeGreaterThanOrEqual(1);
  });
  it('getRegisterTypes returns 7 typed register definitions', () => {
    expect(getRegisterTypes().length).toBe(7);
  });

  // Section393Page extension · FR-106 15th
  it('Section393Page has >= 7 TabsTrigger (Lesson 24 + Lesson 35)', () => {
    const src = fs.readFileSync(SRC('src/pages/erp/comply360/roc/Section393Page.tsx'), 'utf-8');
    expect(src.match(/<TabsTrigger/g)?.length).toBeGreaterThanOrEqual(7);
  });
  it('Section393Page preserves existing section393 tab value (S73b 0-DIFF)', () => {
    const src = fs.readFileSync(SRC('src/pages/erp/comply360/roc/Section393Page.tsx'), 'utf-8');
    expect(src).toContain('value="section393"');
    expect(src).toContain('loadArrangements');
  });
  it('Section393Page adds 6 new S83 tabs', () => {
    const src = fs.readFileSync(SRC('src/pages/erp/comply360/roc/Section393Page.tsx'), 'utf-8');
    for (const v of ['dir3-kyc', 'aoc4', 'mgt7', 'adt1', 'dsc-vault', 'statutory-registers']) {
      expect(src).toContain(`value="${v}"`);
    }
  });

  // logAudit smoke (MCA Rule 11(g)(b))
  it('generateDIR3KYCDraft writes audit log', () => {
    const d = createDirectorMaster({
      din: '00077777', name: 'Z', date_of_birth: '1980-01-01', pan: 'ABCDE1234F',
      passport_no: null, address: 'X', email: 'a@b.c', mobile: '9999900000',
      designation: 'Director', appointment_date: '2020-04-01', created_by_bap: BAP,
    });
    generateDIR3KYCDraft({ director_id: d.id, filing_type: 'DIR_3_KYC', fy: '2025-26', prepared_by_bap: BAP });
    const keys = Object.keys(localStorage).filter((k) => k.startsWith('erp_audit_trail_'));
    expect(keys.length).toBeGreaterThan(0);
  });

  // ESLint STRICT · environment-adaptive runner (Lesson 35 v1.24)
  it('ESLint STRICT 0 errors AND 0 warnings (v1.24 environment-adaptive runner)', () => {
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
      lintOutput = (e as { stdout?: string; stderr?: string }).stdout
        ?? (e as { stdout?: string; stderr?: string }).stderr ?? '';
    }
    expect(exitCode).toBe(0);
    const errorMatches = (lintOutput.match(/\b\d+\s+errors?\b/g) ?? []).filter((m) => !m.startsWith('0'));
    const warningMatches = (lintOutput.match(/\b\d+\s+warnings?\b/g) ?? []).filter((m) => !m.startsWith('0'));
    expect(errorMatches).toEqual([]);
    expect(warningMatches).toEqual([]);
  }, 120_000);
});
