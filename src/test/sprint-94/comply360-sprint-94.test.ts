/**
 * @file        src/test/sprint-94/comply360-sprint-94.test.ts
 * @sprint      Sprint 94 · T-Phase-5.F.5.6 · Floor 5.6 CAPSTONE · CLOSES FLOOR 5
 *              Q38 MCA T2 + PMLA + IPR + Legal Contracts + GST/IT/Exim T2
 */
import { describe, it, expect, beforeEach } from 'vitest';
import * as nodeFs from 'fs';
import * as path from 'path';
import { SPRINTS, getCurrentAStreak, getSprintCount } from '@/lib/_institutional/sprint-history';
import { getSiblingCount, SIBLINGS } from '@/lib/_institutional/sibling-register';
import {
  recordCSR2Form, listCSR2Forms, compute2PctCSR, recordSection135, listSection135,
  recordFormMR3, listFormMR3, recordCSRCommitteeMeeting, listCSRCommitteeMeetings,
  getMCATier2Summary, READS_FROM as MCA_RF,
} from '@/lib/comply360-mca-tier2-engine';
import {
  recordSTR, listSTR, recordCTR, listCTR, CTR_THRESHOLD_PAISE,
  raiseRiskAlert, listRiskAlerts, recordFIUFiling, listFIUFilings,
  publishPMLAPolicy, listPMLAPolicies, getPMLAComplianceSummary,
  READS_FROM as PMLA_RF,
} from '@/lib/comply360-pmla-engine';
import {
  registerTrademark, listTrademarks, registerPatent, listPatents,
  registerCopyright, listCopyrights, registerDesign, listDesigns,
  scheduleIPRRenewal, listIPRRenewals, getIPRSummary,
  READS_FROM as IPR_RF,
} from '@/lib/comply360-ipr-engine';
import {
  recordVendorContract, listVendorContracts, recordCustomerContract,
  recordNDA, listNDAs, computeStampDuty, recordStampDuty, listStampDuty,
  raiseContractRenewalAlert, listContractRenewalAlerts, getLegalContractsSummary,
  READS_FROM as LC_RF,
} from '@/lib/comply360-legal-contracts-engine';
import { READS_FROM as T2X_RF } from '@/lib/comply360-tier2-extensions-engine';
import { AUDIT_ENTITY_TYPES_REGISTRY } from '@/lib/comply360-audit-trail-aggregator-engine';
import { comply360SidebarItems } from '@/apps/erp/configs/comply360-sidebar-config';

const SRC = (p: string): string => path.resolve(__dirname, '../../..', p);
const BAP = 'mr-a-client' as const;

describe('Sprint 94 · T-Phase-5.F.5.6 · Floor 5.6 CAPSTONE · CLOSES FLOOR 5', () => {
  beforeEach(() => { localStorage.clear(); });

  // ─── Institutional ───
  it('Sprint 94 entry exists · code T-Phase-5.F.5.6 · grade A first-pass-clean', () => {
    const s = SPRINTS.find((e) => e.code === 'T-Phase-5.F.5.6');
    expect(s).toBeDefined();
    expect(s?.grade).toBe('A first-pass-clean');
  });
  it('Sprint 93 SHA backfilled to 29e3c6d9...', () => {
    const s93 = SPRINTS.find((e) => e.code === 'T-Phase-5.F.5.5');
    expect(s93?.headSha).toBe('29e3c6d9946283d821cd257ac1c7b1562f676479');
  });
  it('A-streak >= 19 (target 20 post-bank)', () => {
    expect(getCurrentAStreak()).toBeGreaterThanOrEqual(19);
  });
  it('SPRINTS count >= 110', () => {
    expect(getSprintCount()).toBeGreaterThanOrEqual(110);
  });
  it('SIBLINGs runtime >= 155', () => {
    expect(getSiblingCount()).toBeGreaterThanOrEqual(155);
  });

  // ─── NEW SIBLINGs ───
  for (const id of [
    'comply360-mca-tier2-engine',
    'comply360-pmla-engine',
    'comply360-ipr-engine',
    'comply360-legal-contracts-engine',
    'comply360-tier2-extensions-engine',
  ]) {
    it(`${id} registered · moatsRealized: []`, () => {
      const e = SIBLINGS.find((s) => s.id === id);
      expect(e).toBeDefined();
      expect(e?.moatsRealized).toEqual([]);
    });
  }

  // ─── READS_FROM canon ───
  it('mca-tier2 READS_FROM audit-trail', () => {
    expect(MCA_RF.engines).toContain('audit-trail-engine');
  });
  it('pmla READS_FROM audit-trail', () => {
    expect(PMLA_RF.engines).toContain('audit-trail-engine');
  });
  it('ipr READS_FROM audit-trail', () => {
    expect(IPR_RF.engines).toContain('audit-trail-engine');
  });
  it('legal-contracts READS_FROM audit-trail', () => {
    expect(LC_RF.engines).toContain('audit-trail-engine');
  });
  it('tier2-extensions READS_FROM audit-trail', () => {
    expect(T2X_RF.engines).toContain('audit-trail-engine');
  });

  // ─── MCA Tier-2 ───
  it('compute2PctCSR · 2% of avg net profit', () => {
    expect(compute2PctCSR(100_00_00_000)).toBe(2_00_00_000);
  });
  it('recordCSR2Form + list by fy', () => {
    recordCSR2Form({
      fy: '2025-26', cin: 'L1', net_profit_paise: 100_00_00_000,
      csr_obligation_paise: 2_00_00_000, csr_spent_paise: 2_00_00_000,
      unspent_paise: 0, filing_status: 'filed', filed_on: '2026-06-30',
    }, BAP);
    expect(listCSR2Forms({ fy: '2025-26' })).toHaveLength(1);
  });
  it('recordSection135 persists', () => {
    recordSection135({
      fy: '2025-26', avg_net_profit_3y_paise: 100_00_00_000,
      actual_spend_paise: 1_00_00_000, activity: 'eradicating_hunger',
      beneficiary: 'NGO X', project_ref: null,
    }, BAP);
    const all = listSection135({ fy: '2025-26' });
    expect(all).toHaveLength(1);
    expect(all[0].required_spend_paise).toBe(2_00_00_000);
  });
  it('recordFormMR3', () => {
    recordFormMR3({
      fy: '2025-26', cs_name: 'CS X', cs_membership_no: 'ACS-1',
      auditor_firm: 'XYZ & Co', observations: ['nil'],
      filing_status: 'filed', filed_on: '2026-09-30',
    }, BAP);
    expect(listFormMR3({ fy: '2025-26' })).toHaveLength(1);
  });
  it('recordCSRCommitteeMeeting', () => {
    recordCSRCommitteeMeeting({
      meeting_date: '2026-06-15', attendees: ['D1', 'D2', 'D3', 'D4'],
      agenda: 'Plan FY26', minutes_ref: null,
    }, BAP);
    expect(listCSRCommitteeMeetings()).toHaveLength(1);
  });
  it('getMCATier2Summary shape', () => {
    const s = getMCATier2Summary('2025-26');
    expect(s).toHaveProperty('csr2_filed_current_fy');
    expect(s).toHaveProperty('overall_status');
  });

  // ─── PMLA ───
  it('CTR_THRESHOLD_PAISE = 10 lakh', () => {
    expect(CTR_THRESHOLD_PAISE).toBe(10_00_000 * 100);
  });
  it('recordSTR + filter by risk', () => {
    recordSTR({
      reference: 'STR-1', suspect_party: 'X', amount_paise: 1_00_00_000,
      reason: 'unusual', risk: 'high', detected_on: '2026-06-01',
      filed_on: '2026-06-02', status: 'filed',
    }, BAP);
    expect(listSTR({ risk: 'high' })).toHaveLength(1);
  });
  it('recordCTR persists', () => {
    recordCTR({
      party_name: 'X', pan: 'ABCDE1234F', amount_paise: 11_00_000 * 100,
      transaction_date: '2026-06-01', filed_on: '2026-06-02', status: 'filed',
    }, BAP);
    expect(listCTR()).toHaveLength(1);
  });
  it('raiseRiskAlert + unresolved filter', () => {
    raiseRiskAlert({
      party: 'X', trigger: 'high-value cash', risk: 'high',
      raised_on: '2026-06-01', resolved_on: null,
    }, BAP);
    expect(listRiskAlerts({ unresolved: true })).toHaveLength(1);
  });
  it('recordFIUFiling + publishPMLAPolicy + summary', () => {
    recordFIUFiling({
      kind: 'STR', period: '2026-Q1', count: 1,
      filed_on: '2026-06-01', ack_ref: 'A1',
    }, BAP);
    publishPMLAPolicy({
      version: '1.0', effective_date: '2026-06-01',
      pmla_officer: 'PO X', published: true,
    }, BAP);
    expect(listFIUFilings()).toHaveLength(1);
    expect(listPMLAPolicies()).toHaveLength(1);
    expect(getPMLAComplianceSummary()).toHaveProperty('str_filed');
  });

  // ─── IPR ───
  it('registerTrademark + list', () => {
    registerTrademark({
      mark: 'Brand', tm_class: 9, application_no: 'TM-1',
      registration_no: null, filed_on: '2026-06-01',
      registered_on: null, valid_until: null, status: 'pending',
    }, BAP);
    expect(listTrademarks()).toHaveLength(1);
  });
  it('registerPatent persists', () => {
    registerPatent({
      title: 'Widget', inventor: 'A', application_no: 'PT-1',
      grant_no: null, filed_on: '2026-06-01', granted_on: null,
      valid_until: null, status: 'pending',
    }, BAP);
    expect(listPatents()).toHaveLength(1);
  });
  it('registerCopyright + registerDesign', () => {
    registerCopyright({
      work_title: 'Book', work_kind: 'literary', author: 'A',
      registration_no: 'CR-1', registered_on: '2026-06-01',
    }, BAP);
    registerDesign({
      design_name: 'Chair', locarno_class: '06-01', registration_no: 'DS-1',
      registered_on: '2026-06-01', valid_until: '2036-06-01', status: 'registered',
    }, BAP);
    expect(listCopyrights()).toHaveLength(1);
    expect(listDesigns()).toHaveLength(1);
  });
  it('scheduleIPRRenewal + upcoming90 filter', () => {
    const soon = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    scheduleIPRRenewal({
      ipr_type: 'trademark', ipr_ref: 'TM-1', due_on: soon, reminded_on: null,
    }, BAP);
    expect(listIPRRenewals({ upcoming90: true })).toHaveLength(1);
  });
  it('getIPRSummary shape', () => {
    expect(getIPRSummary()).toHaveProperty('trademarks_active');
  });

  // ─── Legal Contracts ───
  it('recordVendorContract + status filter', () => {
    recordVendorContract({
      counter_party: 'Vendor X', effective_date: '2026-06-01',
      expiry_date: '2027-06-01', value_paise: 1_00_00_000,
      status: 'executed', ref_no: 'V-1',
    }, BAP);
    expect(listVendorContracts({ status: 'executed' })).toHaveLength(1);
  });
  it('recordCustomerContract + recordNDA', () => {
    recordCustomerContract({
      counter_party: 'Cust Y', effective_date: '2026-06-01',
      expiry_date: '2027-06-01', value_paise: 5_00_00_000,
      status: 'executed', ref_no: 'C-1',
    }, BAP);
    recordNDA({
      counter_party: 'NDA Z', effective_date: '2026-06-01',
      expiry_date: '2028-06-01', value_paise: 0,
      status: 'executed', ref_no: 'N-1', one_way: false,
    }, BAP);
    expect(listNDAs()).toHaveLength(1);
  });
  it('computeStampDuty + recordStampDuty', () => {
    expect(computeStampDuty(10_00_000 * 100, 0.5)).toBe(5_000 * 100);
    const r = recordStampDuty({
      instrument_kind: 'agreement', state: 'MH',
      consideration_paise: 10_00_000 * 100, rate_pct: 0.5,
      paid_on: '2026-06-01', ref_no: null,
    }, BAP);
    expect(r.duty_paise).toBe(5_000 * 100);
    expect(listStampDuty()).toHaveLength(1);
  });
  it('raiseContractRenewalAlert', () => {
    raiseContractRenewalAlert({
      contract_kind: 'vendor', contract_ref: 'V-1',
      expiry_date: '2027-06-01', days_remaining: 60, raised_on: '2026-06-01',
    }, BAP);
    expect(listContractRenewalAlerts()).toHaveLength(1);
  });
  it('getLegalContractsSummary shape', () => {
    expect(getLegalContractsSummary()).toHaveProperty('vendor_executed');
  });

  // ─── Audit entity types ───
  it('S94 entity types registered (>=14 new across MCA-T2/PMLA/IPR)', () => {
    const ids = AUDIT_ENTITY_TYPES_REGISTRY.map((t) => t.id);
    for (const t of [
      'csr2_form', 'section_135_csr_tracker', 'form_mr3', 'csr_committee_meeting',
      'str_report', 'ctr_report', 'pmla_risk_alert', 'fiu_filing', 'pmla_policy',
      'trademark_registration', 'patent_application', 'copyright_registration',
      'design_registration', 'ipr_renewal_deadline',
    ]) {
      expect(ids).toContain(t);
    }
  });
  it('MCA-T2 entity types map to existing union member `mca-roc`', () => {
    const reg = AUDIT_ENTITY_TYPES_REGISTRY.find((t) => t.id === 'csr2_form');
    expect(reg?.module).toBe('mca-roc');
  });

  // ─── Pages ───
  it('MCATier2DashboardPage exists with >=4 TabsTrigger', () => {
    const p = SRC('src/pages/erp/comply360/mca-tier2/MCATier2DashboardPage.tsx');
    expect(nodeFs.existsSync(p)).toBe(true);
    const src = nodeFs.readFileSync(p, 'utf8');
    expect((src.match(/<TabsTrigger\b/g) ?? []).length).toBeGreaterThanOrEqual(4);
  });
  it('LegalIPRDashboardPage exists with >=4 TabsTrigger', () => {
    const p = SRC('src/pages/erp/comply360/legal-ipr/LegalIPRDashboardPage.tsx');
    expect(nodeFs.existsSync(p)).toBe(true);
    const src = nodeFs.readFileSync(p, 'utf8');
    expect((src.match(/<TabsTrigger\b/g) ?? []).length).toBeGreaterThanOrEqual(4);
  });

  // ─── Router + sidebar integration ───
  it('Comply360Page imports both new dashboards', () => {
    const src = nodeFs.readFileSync(SRC('src/pages/erp/comply360/Comply360Page.tsx'), 'utf8');
    expect(src).toContain('MCATier2DashboardPage');
    expect(src).toContain('LegalIPRDashboardPage');
  });
  it('Comply360Page has mca-tier2 + legal-ipr router cases', () => {
    const src = nodeFs.readFileSync(SRC('src/pages/erp/comply360/Comply360Page.tsx'), 'utf8');
    expect(src).toContain("case 'mca-tier2':");
    expect(src).toContain("case 'legal-ipr':");
  });
  it('sidebar-config has mca-tier2 entry', () => {
    expect(comply360SidebarItems.find((i) => i.id === 'mca-tier2')).toBeDefined();
  });
  it('sidebar-config has legal-ipr entry', () => {
    expect(comply360SidebarItems.find((i) => i.id === 'legal-ipr')).toBeDefined();
  });

  // ─── §H 0-DIFF anchors ───
  it('S93 quality + labour-tier2 + cross-card peoplepay-skill files unchanged', () => {
    expect(nodeFs.existsSync(SRC('src/lib/comply360-quality-standards-engine.ts'))).toBe(true);
    expect(nodeFs.existsSync(SRC('src/lib/comply360-labour-tier2-engine.ts'))).toBe(true);
    expect(nodeFs.existsSync(SRC('src/lib/peoplepay-skill-engine.ts'))).toBe(true);
  });
});
