import { describe, it, expect, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { SPRINTS, getCurrentAStreak, getSprintCount } from '@/lib/_institutional/sprint-history';
import { getSiblingCount } from '@/lib/_institutional/sibling-register';
import {
  READS_FROM as CSR_RF, formCSRCommittee, registerImplementingAgency,
  createCSR1Filing, createCSR2Filing, listCSRCommittees, listImplementingAgencies,
  listCSR1Filings, listCSR2Filings,
} from '@/lib/comply360-csr-engine';
import {
  READS_FROM as M_RF, recordMeeting, recordAttendance, recordVoting,
  listMeetings, checkQuorum,
} from '@/lib/comply360-meetings-engine';
import {
  READS_FROM as W_RF, fileComplaint, assignInvestigator, recordInvestigation,
  escalateToAuditCommittee, resolveEscalation, listComplaints, listInvestigations,
  verifyAnonymousProtection, getWhistleblowerStats,
  type ComplaintCategory,
} from '@/lib/comply360-whistleblower-engine';
import {
  READS_FROM as CA_RF, appointCostAuditor, createCRAFormFiling, recordCostAuditReport,
  listCostAuditorAppointments, listCRAFormFilings, listCostAuditReports, isCostAuditorEligible,
  type CRAFormType,
} from '@/lib/comply360-cost-audit-engine';

const SRC = (p: string): string => path.resolve(__dirname, '../../..', p);
const BAP = 'mr-a-client' as const;

describe('Sprint 85 v2 · T-Phase-5.C.3.3 · Q29 Part 3 ROC-Suite · FLOOR 3 CLOSES · OOB-7 STANDALONE', () => {
  beforeEach(() => { localStorage.clear(); });

  // Institutional
  it('Sprint 85 entry exists · code T-Phase-5.C.3.3', () => {
    expect(SPRINTS.find((s) => s.sprintNumber === 85)?.code).toBe('T-Phase-5.C.3.3');
  });
  it('Sprint 84 SHA backfilled', () => {
    expect(SPRINTS.find((s) => s.sprintNumber === 84)?.headSha).toBe('f6389fc933515d4125fd7682f3caa53e390d71b5');
  });
  it('A-streak >= 10', () => { expect(getCurrentAStreak()).toBeGreaterThanOrEqual(10); });
  it('SPRINTS >= 101', () => { expect(getSprintCount()).toBeGreaterThanOrEqual(101); });
  it('SIBLINGs runtime >= 127', () => { expect(getSiblingCount()).toBeGreaterThanOrEqual(127); });

  // File existence
  it('4 NEW SIBLING engine files exist', () => {
    for (const f of [
      'src/lib/comply360-csr-engine.ts',
      'src/lib/comply360-meetings-engine.ts',
      'src/lib/comply360-whistleblower-engine.ts',
      'src/lib/comply360-cost-audit-engine.ts',
    ]) expect(fs.existsSync(SRC(f))).toBe(true);
  });
  it('WhistleblowerPage file exists', () => {
    expect(fs.existsSync(SRC('src/pages/erp/comply360/whistleblower/WhistleblowerPage.tsx'))).toBe(true);
  });
  it('S85 close-summary exists · FLOOR 3 CLOSES declaration', () => {
    const p = SRC('audit_workspace/T-Phase-5.C.3.3/Z_close_evidence/sprint-85-arc-summary.md');
    expect(fs.existsSync(p)).toBe(true);
    expect(fs.readFileSync(p, 'utf-8')).toMatch(/FLOOR 3 CLOSES/);
  });

  // READS_FROM canon
  it('csr-engine READS_FROM has 4 engines (USE-SITE READS S84 schedule-vii)', () => {
    expect(CSR_RF.engines.length).toBe(4);
    expect(CSR_RF.engines).toContain('comply360-schedule-vii-engine');
  });
  it('meetings-engine READS_FROM has 3 engines (USE-SITE READS S83 mgt7)', () => {
    expect(M_RF.engines.length).toBe(3);
    expect(M_RF.engines).toContain('comply360-mgt7-engine');
  });
  it('whistleblower-engine READS_FROM has 3 engines', () => { expect(W_RF.engines.length).toBe(3); });
  it('cost-audit-engine READS_FROM has 3 engines', () => { expect(CA_RF.engines.length).toBe(3); });

  // CSR Framework
  it('formCSRCommittee requires 3+ directors', () => {
    expect(() => formCSRCommittee({ fy: '2025-26', director_ids: ['a'], chairperson_director_id: 'a', formed_by_bap: BAP })).toThrow();
    const c = formCSRCommittee({ fy: '2025-26', director_ids: ['a', 'b', 'c'], chairperson_director_id: 'a', formed_by_bap: BAP });
    expect(c.id).toBeTruthy();
    expect(listCSRCommittees().length).toBe(1);
  });
  it('registerImplementingAgency with agency type', () => {
    const a = registerImplementingAgency({
      agency_name: 'Test NGO', agency_type: 'section_8_company',
      csr1_registration_no: 'CSR000001', pan: 'AAAAA1234A', registered_by_bap: BAP,
    });
    expect(a.agency_type).toBe('section_8_company');
    expect(listImplementingAgencies().length).toBe(1);
  });
  it('createCSR1Filing + listCSR1Filings roundtrip', () => {
    const f = createCSR1Filing({ agency_id: 'ag1', fy: '2025-26', prepared_by_bap: BAP });
    expect(f.filing_status).toBe('draft');
    expect(listCSR1Filings({ fy: '2025-26' }).length).toBe(1);
  });
  it('createCSR2Filing computes shortfall + carryforward', () => {
    const f = createCSR2Filing({ fy: '2025-26', required_spend_inr: 1000000, actual_spend_inr: 600000, prepared_by_bap: BAP });
    expect(f.shortfall_inr).toBe(400000);
    expect(f.carryforward_inr).toBe(400000);
    expect(listCSR2Filings().length).toBe(1);
  });

  // Meetings
  it('recordMeeting with all 6 MeetingType values', () => {
    const types = ['AGM', 'EGM', 'Board', 'Audit_Committee', 'CSR_Committee', 'Nomination_Committee'] as const;
    for (const t of types) {
      recordMeeting({
        meeting_type: t, fy: '2025-26', meeting_date: '2025-06-01',
        meeting_number: `${t}-1`, agenda_items: ['x'], minutes_summary: 'm',
        required_quorum: 2, attendees_count: 3, recorded_by_bap: BAP,
      });
    }
    expect(listMeetings().length).toBe(6);
  });
  it('recordAttendance with attendance modes', () => {
    const m = recordMeeting({
      meeting_type: 'Board', fy: '2025-26', meeting_date: '2025-06-01',
      meeting_number: 'B-1', agenda_items: [], minutes_summary: '',
      required_quorum: 2, attendees_count: 2, recorded_by_bap: BAP,
    });
    recordAttendance({ meeting_id: m.id, director_id: 'd1', attendance_mode: 'in_person' });
    recordAttendance({ meeting_id: m.id, director_id: 'd2', attendance_mode: 'video_conference' });
    expect(checkQuorum(m.id).attendees).toBe(2);
  });
  it('recordVoting with all 5 voting methods', () => {
    const m = recordMeeting({
      meeting_type: 'Board', fy: '2025-26', meeting_date: '2025-06-01',
      meeting_number: 'B-2', agenda_items: [], minutes_summary: '',
      required_quorum: 1, attendees_count: 1, recorded_by_bap: BAP,
    });
    const methods = ['voice_vote', 'show_of_hands', 'poll', 'postal_ballot', 'electronic'] as const;
    for (const vm of methods) {
      const v = recordVoting({ meeting_id: m.id, resolution_text: 'r', voting_method: vm, ayes: 2, nays: 1, abstain: 0 });
      expect(v.outcome).toBe('passed');
    }
  });
  it('checkQuorum reflects attendance', () => {
    const m = recordMeeting({
      meeting_type: 'AGM', fy: '2025-26', meeting_date: '2025-09-30',
      meeting_number: 'A-1', agenda_items: [], minutes_summary: '',
      required_quorum: 5, attendees_count: 4, recorded_by_bap: BAP,
    });
    expect(m.is_quorum_met).toBe(false);
    expect(checkQuorum(m.id).required).toBe(5);
  });

  // OOB-7 Whistleblower
  it('fileComplaint supports all 8 categories', () => {
    const cats: ComplaintCategory[] = ['financial_fraud', 'corruption_bribery', 'safety_violation', 'discrimination_harassment', 'data_breach', 'environmental_violation', 'regulatory_non_compliance', 'other'];
    for (const c of cats) {
      fileComplaint({
        fy: '2025-26', complaint_date: '2025-06-01', category: c, severity: 'medium',
        is_anonymous: false, complainant_identifier: 'jane@x',
        complaint_summary: 's', complaint_details_encrypted: 'x',
      });
    }
    expect(listComplaints().length).toBe(8);
  });
  it('fileComplaint anonymous · complainant_identifier null', () => {
    const c = fileComplaint({
      fy: '2025-26', complaint_date: '2025-06-01', category: 'other', severity: 'low',
      is_anonymous: true, complainant_identifier: 'leak', // engine must force null
      complaint_summary: 's', complaint_details_encrypted: 'x',
    });
    expect(c.complainant_identifier).toBeNull();
  });
  it('verifyAnonymousProtection enforces null identifier', () => {
    const c = fileComplaint({
      fy: '2025-26', complaint_date: '2025-06-01', category: 'other', severity: 'low',
      is_anonymous: true, complainant_identifier: null,
      complaint_summary: 's', complaint_details_encrypted: 'x',
    });
    expect(verifyAnonymousProtection(c.id).is_protected).toBe(true);
  });
  it('assignInvestigator + recordInvestigation roundtrip', () => {
    const c = fileComplaint({
      fy: '2025-26', complaint_date: '2025-06-01', category: 'financial_fraud', severity: 'high',
      is_anonymous: false, complainant_identifier: 'x',
      complaint_summary: 's', complaint_details_encrypted: 'x',
    });
    const updated = assignInvestigator(c.id, 'dir-1', BAP);
    expect(updated.assigned_investigator_id).toBe('dir-1');
    expect(updated.status).toBe('under_investigation');
    recordInvestigation({
      complaint_id: c.id, investigator_director_id: 'dir-1',
      investigation_start_date: '2025-06-02', investigation_end_date: null,
      findings_summary: 'f', evidence_refs: [], recommendation: 'corrective_action',
      recorded_by_bap: BAP,
    });
    expect(listInvestigations(c.id).length).toBe(1);
  });
  it('escalateToAuditCommittee + resolveEscalation flow', () => {
    const c = fileComplaint({
      fy: '2025-26', complaint_date: '2025-06-01', category: 'financial_fraud', severity: 'critical',
      is_anonymous: false, complainant_identifier: 'x',
      complaint_summary: 's', complaint_details_encrypted: 'x',
    });
    const e = escalateToAuditCommittee({
      complaint_id: c.id, escalation_date: '2025-06-05',
      escalation_reason: 'severity', recorded_by_bap: BAP,
    });
    const resolved = resolveEscalation(e.id, 'reviewed', 'action taken', BAP);
    expect(resolved.resolved_at).toBeTruthy();
    expect(listComplaints({ status: 'resolved' }).length).toBe(1);
  });
  it('getWhistleblowerStats aggregates by category/severity/status', () => {
    fileComplaint({
      fy: '2025-26', complaint_date: '2025-06-01', category: 'data_breach', severity: 'high',
      is_anonymous: true, complainant_identifier: null,
      complaint_summary: 's', complaint_details_encrypted: 'x',
    });
    const s = getWhistleblowerStats('2025-26');
    expect(s.total_complaints).toBe(1);
    expect(s.anonymous_count).toBe(1);
    expect(s.by_severity.high).toBe(1);
  });

  // Cost Audit
  it('appointCostAuditor requires ICMAI membership', () => {
    expect(() => appointCostAuditor({
      fy: '2025-26', appointment_type: 'first_appointment', cost_auditor_name: 'X',
      icmai_membership_no: '', firm_registration_no: null,
      appointment_date: '2025-04-01', term_years: 1, prepared_by_bap: BAP,
    })).toThrow();
    const a = appointCostAuditor({
      fy: '2025-26', appointment_type: 'first_appointment', cost_auditor_name: 'X',
      icmai_membership_no: 'M12345', firm_registration_no: null,
      appointment_date: '2025-04-01', term_years: 1, prepared_by_bap: BAP,
    });
    expect(listCostAuditorAppointments().length).toBe(1);
    expect(a.icmai_membership_no).toBe('M12345');
  });
  it('createCRAFormFiling supports all 4 CRA types', () => {
    const types: CRAFormType[] = ['CRA_1', 'CRA_2', 'CRA_3', 'CRA_4'];
    for (const t of types) createCRAFormFiling({ form_type: t, fy: '2025-26', appointment_id: null, prepared_by_bap: BAP });
    expect(listCRAFormFilings().length).toBe(4);
  });
  it('recordCostAuditReport with adverse_findings flag', () => {
    const r = recordCostAuditReport({
      fy: '2025-26', appointment_id: 'a1', total_cost_inr: 1000000,
      adverse_findings: true, findings_summary: 'issue', recorded_by_bap: BAP,
    });
    expect(r.adverse_findings).toBe(true);
    expect(listCostAuditReports().length).toBe(1);
  });
  it('isCostAuditorEligible checks cooling-off', () => {
    appointCostAuditor({
      fy: '2020-21', appointment_type: 'first_appointment', cost_auditor_name: 'X',
      icmai_membership_no: 'M99', firm_registration_no: null,
      appointment_date: '2020-04-01', term_years: 1, prepared_by_bap: BAP,
    });
    expect(isCostAuditorEligible('M99', '2022-23').eligible).toBe(false);
    expect(isCostAuditorEligible('M99', '2030-31').eligible).toBe(true);
    expect(isCostAuditorEligible('M-new', '2025-26').eligible).toBe(true);
  });

  // Section393Page · 14 tabs
  it('Section393Page has >= 14 TabsTrigger', () => {
    const src = fs.readFileSync(SRC('src/pages/erp/comply360/roc/Section393Page.tsx'), 'utf-8');
    const count = src.match(/<TabsTrigger/g)?.length ?? 0;
    expect(count).toBeGreaterThanOrEqual(14);
  });
  it('Section393Page grid-cols-14', () => {
    const src = fs.readFileSync(SRC('src/pages/erp/comply360/roc/Section393Page.tsx'), 'utf-8');
    expect(src).toContain('grid-cols-14');
  });
  it('Section393Page adds 3 new tabs (csr-framework + meetings + cost-audit · NOT whistleblower)', () => {
    const src = fs.readFileSync(SRC('src/pages/erp/comply360/roc/Section393Page.tsx'), 'utf-8');
    expect(src).toMatch(/value="csr-framework"/);
    expect(src).toMatch(/value="meetings"/);
    expect(src).toMatch(/value="cost-audit"/);
    expect(src).not.toMatch(/value="whistleblower"/);
  });

  // Standalone WhistleblowerPage + router + sidebar
  it('WhistleblowerPage has 5 TabsTrigger', () => {
    const src = fs.readFileSync(SRC('src/pages/erp/comply360/whistleblower/WhistleblowerPage.tsx'), 'utf-8');
    const count = src.match(/<TabsTrigger/g)?.length ?? 0;
    expect(count).toBeGreaterThanOrEqual(5);
  });
  it('Comply360Page has new case whistleblower returning WhistleblowerPage', () => {
    const src = fs.readFileSync(SRC('src/pages/erp/comply360/Comply360Page.tsx'), 'utf-8');
    expect(src).toMatch(/case 'whistleblower':/);
    expect(src).toMatch(/<WhistleblowerPage/);
  });
  it('Comply360Sidebar.types.ts union includes whistleblower', () => {
    const src = fs.readFileSync(SRC('src/pages/erp/comply360/Comply360Sidebar.types.ts'), 'utf-8');
    expect(src).toMatch(/'whistleblower'/);
  });
  it('comply360-sidebar-config has whistleblower entry', () => {
    const src = fs.readFileSync(SRC('src/apps/erp/configs/comply360-sidebar-config.ts'), 'utf-8');
    expect(src).toMatch(/id: 'whistleblower'/);
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
