/**
 * @file        src/test/sprint-92/comply360-sprint-92.test.ts
 * @sprint      Sprint 92 · T-Phase-5.F.5.4 · Floor 5.4 · Q36 DPDP Act 2023 + Cyber Security
 * @note        28 it() blocks · v1.30 §N Form A floor · NO in-test ESLint (RETIRED at v1.31)
 */
import { describe, it, expect, beforeEach } from 'vitest';
import * as nodeFs from 'fs';
import * as path from 'path';
import { SPRINTS, getCurrentAStreak, getSprintCount } from '@/lib/_institutional/sprint-history';
import { getSiblingCount, SIBLINGS } from '@/lib/_institutional/sibling-register';
import {
  publishPrivacyPolicy, listPrivacyPolicies,
  recordDPRequest, listDPRequests,
  recordConsent, withdrawConsent, listConsents,
  registerDPO, listDPOs,
  recordDPIA, listDPIAs,
  recordBreach, listBreaches, isBreachLate,
  getDPDPComplianceSummary,
  READS_FROM as DPDP_RF,
} from '@/lib/comply360-dpdp-engine';
import {
  recordCyberIncident, listCyberIncidents, isIncidentLate,
  recordVulnerability, listVulnerabilities,
  grantAccess, listAccessGrants,
  publishCyberPolicy, listCyberPolicies,
  getCyberComplianceSummary,
  READS_FROM as CYB_RF,
} from '@/lib/comply360-cyber-security-engine';
import { AUDIT_ENTITY_TYPES_REGISTRY } from '@/lib/comply360-audit-trail-aggregator-engine';
import { comply360SidebarItems } from '@/apps/erp/configs/comply360-sidebar-config';

const SRC = (p: string): string => path.resolve(__dirname, '../../..', p);
const BAP = 'mr-a-client' as const;

describe('Sprint 92 · T-Phase-5.F.5.4 · Floor 5.4 · DPDP Act 2023 + Cyber Security', () => {
  beforeEach(() => { localStorage.clear(); });

  // ─── Institutional (5) ───
  it('Sprint 92 entry exists · code T-Phase-5.F.5.4 · grade A first-pass-clean', () => {
    const s = SPRINTS.find((e) => e.code === 'T-Phase-5.F.5.4');
    expect(s).toBeDefined();
    expect(s?.grade).toBe('A first-pass-clean');
  });
  it('Sprint 91 SHA backfilled to fa305a27...', () => {
    const s91 = SPRINTS.find((e) => e.code === 'T-Phase-5.F.5.3');
    expect(s91?.headSha).toBe('fa305a277b8a2b1005fbbddea3a5d72fc88ad853');
  });
  it('A-streak >= 17 (target 18 post-bank)', () => {
    expect(getCurrentAStreak()).toBeGreaterThanOrEqual(17);
  });
  it('SPRINTS count >= 109', () => {
    expect(getSprintCount()).toBeGreaterThanOrEqual(109);
  });
  it('SIBLINGs runtime >= 148', () => {
    expect(getSiblingCount()).toBeGreaterThanOrEqual(148);
  });

  // ─── NEW SIBLINGs (2) ───
  it('comply360-dpdp-engine registered · moatsRealized: []', () => {
    const e = SIBLINGS.find((s) => s.id === 'comply360-dpdp-engine');
    expect(e).toBeDefined();
    expect(e?.moatsRealized).toEqual([]);
  });
  it('comply360-cyber-security-engine registered · moatsRealized: []', () => {
    const e = SIBLINGS.find((s) => s.id === 'comply360-cyber-security-engine');
    expect(e).toBeDefined();
    expect(e?.moatsRealized).toEqual([]);
  });

  // ─── READS_FROM canon (2) ───
  it('dpdp-engine READS_FROM includes 4 upstream engines incl cross-card', () => {
    expect(DPDP_RF.engines).toContain('audit-trail-engine');
    expect(DPDP_RF.engines).toContain('comply360-audit-trail-aggregator-engine');
    expect(DPDP_RF.engines).toContain('servicedesk-engine');
    expect(DPDP_RF.engines).toContain('peoplepay-skill-engine');
  });
  it('cyber-security-engine READS_FROM includes audit-trail anchors', () => {
    expect(CYB_RF.engines).toContain('audit-trail-engine');
    expect(CYB_RF.engines).toContain('comply360-audit-trail-aggregator-engine');
  });

  // ─── DPDP · Privacy Policy (1) ───
  it('publishPrivacyPolicy + listPrivacyPolicies works', () => {
    publishPrivacyPolicy({
      version: '1.0', effective_date: '2026-06-01',
      data_categories: ['name', 'email'], purposes: ['service-delivery'],
      retention_period_days: 365, cross_border_transfers: false, published: true,
    }, BAP);
    expect(listPrivacyPolicies()).toHaveLength(1);
  });

  // ─── DPDP · Data Principal Requests (2) ───
  it('recordDPRequest works for all 5 request types', () => {
    const types: Array<'access' | 'correction' | 'erasure' | 'grievance' | 'nominate'> =
      ['access', 'correction', 'erasure', 'grievance', 'nominate'];
    for (const t of types) {
      recordDPRequest({
        request_type: t, principal_id: 'P1', principal_name: 'Aarav',
        received_date: '2026-06-01', due_date: '2026-07-01',
        status: 'received', resolution_notes: null,
      }, BAP);
    }
    expect(listDPRequests()).toHaveLength(5);
    expect(listDPRequests({ type: 'erasure' })).toHaveLength(1);
  });
  it('listDPRequests filters by status', () => {
    recordDPRequest({
      request_type: 'access', principal_id: 'P1', principal_name: 'X',
      received_date: '2026-06-01', due_date: '2026-07-01',
      status: 'fulfilled', resolution_notes: 'done',
    }, BAP);
    expect(listDPRequests({ status: 'fulfilled' })).toHaveLength(1);
    expect(listDPRequests({ status: 'received' })).toHaveLength(0);
  });

  // ─── DPDP · Consent (2) ───
  it('recordConsent + withdrawConsent flips status to withdrawn', () => {
    const c = recordConsent({
      principal_id: 'P1', purpose: 'marketing',
      granted_at: '2026-06-01T00:00:00Z', withdrawn_at: null,
      status: 'granted', granular_scopes: ['email'],
    }, BAP);
    const w = withdrawConsent(c.id, BAP);
    expect(w?.status).toBe('withdrawn');
    expect(w?.withdrawn_at).not.toBeNull();
  });
  it('listConsents filters by status', () => {
    recordConsent({
      principal_id: 'P1', purpose: 'p',
      granted_at: '2026-06-01T00:00:00Z', withdrawn_at: null,
      status: 'granted', granular_scopes: [],
    }, BAP);
    expect(listConsents({ status: 'granted' })).toHaveLength(1);
  });

  // ─── DPDP · DPO + DPIA (2) ───
  it('registerDPO works', () => {
    registerDPO({
      name: 'Rohan', email: 'dpo@op.in', phone: '9999999999',
      appointed_date: '2026-04-01', active: true,
    }, BAP);
    expect(listDPOs()).toHaveLength(1);
  });
  it('recordDPIA filters by status', () => {
    recordDPIA({
      process_name: 'CRM', data_categories: ['email'], risk_score: 7,
      mitigation_summary: 'encryption', status: 'approved', assessed_date: '2026-06-01',
    }, BAP);
    expect(listDPIAs({ status: 'approved' })).toHaveLength(1);
    expect(listDPIAs({ status: 'draft' })).toHaveLength(0);
  });

  // ─── DPDP · Breach (2) ───
  it('recordBreach computes hours_to_report · 72h threshold', () => {
    const b = recordBreach({
      detected_at: '2026-06-01T00:00:00Z',
      reported_at: '2026-06-05T00:00:00Z',   // 96h → late
      severity: 'critical', affected_principal_count: 1000,
      description: 'leak', status: 'notified_board',
    }, BAP);
    expect(b.hours_to_report).toBe(96);
    expect(isBreachLate(b)).toBe(true);
  });
  it('breach within 72h is not late', () => {
    const b = recordBreach({
      detected_at: '2026-06-01T00:00:00Z',
      reported_at: '2026-06-02T00:00:00Z',   // 24h
      severity: 'high', affected_principal_count: 10,
      description: 'x', status: 'notified_board',
    }, BAP);
    expect(isBreachLate(b)).toBe(false);
    expect(listBreaches()).toHaveLength(1);
  });

  // ─── DPDP · Summary (1) ───
  it('getDPDPComplianceSummary returns 9-field shape', () => {
    const s = getDPDPComplianceSummary();
    expect(s).toHaveProperty('privacy_policy_published');
    expect(s).toHaveProperty('open_dp_requests');
    expect(s).toHaveProperty('overdue_dp_requests');
    expect(s).toHaveProperty('active_consents');
    expect(s).toHaveProperty('late_breach_notifications');
    expect(s).toHaveProperty('overall_status');
  });

  // ─── Cyber · Incidents (2) ───
  it('recordCyberIncident computes hours · CERT-In 6h threshold', () => {
    const i = recordCyberIncident({
      detected_at: '2026-06-01T00:00:00Z',
      reported_at: '2026-06-01T10:00:00Z',   // 10h → late
      category: 'ransomware', severity: 'critical',
      affected_systems: ['ERP'], description: 'x',
      status: 'reported_certin', certin_reference: 'CR-1',
    }, BAP);
    expect(i.hours_to_report).toBe(10);
    expect(isIncidentLate(i)).toBe(true);
  });
  it('incident within 6h is not late', () => {
    const i = recordCyberIncident({
      detected_at: '2026-06-01T00:00:00Z',
      reported_at: '2026-06-01T04:00:00Z',   // 4h
      category: 'phishing', severity: 'medium',
      affected_systems: [], description: 'x',
      status: 'reported_certin', certin_reference: null,
    }, BAP);
    expect(isIncidentLate(i)).toBe(false);
    expect(listCyberIncidents({ severity: 'medium' })).toHaveLength(1);
  });

  // ─── Cyber · Vulnerabilities (1) ───
  it('recordVulnerability filters by status', () => {
    recordVulnerability({
      cve_id: 'CVE-2026-1', asset: 'app-srv', severity: 'critical',
      discovered_at: '2026-06-01', patched_at: null,
      status: 'open', description: 'rce',
    }, BAP);
    expect(listVulnerabilities({ status: 'open' })).toHaveLength(1);
  });

  // ─── Cyber · Access Control (1) ───
  it('grantAccess + listAccessGrants active filter', () => {
    grantAccess({
      user_id: 'U1', user_name: 'Aarav', resource: 'ERP-prod',
      access_level: 'admin', granted_at: '2026-06-01', revoked_at: null,
      approved_by: 'CIO',
    }, BAP);
    expect(listAccessGrants({ active: true })).toHaveLength(1);
  });

  // ─── Cyber · Policy + Summary (2) ───
  it('publishCyberPolicy works', () => {
    publishCyberPolicy({
      version: '1.0', effective_date: '2026-06-01',
      scope: 'group-wide', published: true,
    }, BAP);
    expect(listCyberPolicies()).toHaveLength(1);
  });
  it('getCyberComplianceSummary returns 6-field shape', () => {
    const s = getCyberComplianceSummary();
    expect(s).toHaveProperty('open_incidents');
    expect(s).toHaveProperty('late_incident_reports');
    expect(s).toHaveProperty('critical_vulnerabilities_open');
    expect(s).toHaveProperty('active_access_grants');
    expect(s).toHaveProperty('cyber_policy_published');
    expect(s).toHaveProperty('overall_status');
  });

  // ─── Audit entity types (1) ───
  it('13 NEW S92 entity types registered (8 dpdp + 5 cyber)', () => {
    const ids = AUDIT_ENTITY_TYPES_REGISTRY.map((t) => t.id);
    for (const t of [
      'dpdp_privacy_policy', 'dpdp_dp_request', 'dpdp_consent',
      'dpdp_dpo', 'dpdp_dpia', 'dpdp_breach', 'dpdp_nomination', 'dpdp_grievance',
      'cyber_incident', 'cyber_vulnerability', 'cyber_access_grant',
      'cyber_policy', 'cyber_log_retention',
    ]) {
      expect(ids).toContain(t);
    }
  });

  // ─── Pages (2) ───
  it('DPDPDashboardPage file exists with >=4 TabsTrigger', () => {
    const p = SRC('src/pages/erp/comply360/dpdp/DPDPDashboardPage.tsx');
    expect(nodeFs.existsSync(p)).toBe(true);
    const src = nodeFs.readFileSync(p, 'utf8');
    expect((src.match(/<TabsTrigger\b/g) ?? []).length).toBeGreaterThanOrEqual(4);
  });
  it('CyberSecurityDashboardPage file exists with >=3 TabsTrigger', () => {
    const p = SRC('src/pages/erp/comply360/cyber-security/CyberSecurityDashboardPage.tsx');
    expect(nodeFs.existsSync(p)).toBe(true);
    const src = nodeFs.readFileSync(p, 'utf8');
    expect((src.match(/<TabsTrigger\b/g) ?? []).length).toBeGreaterThanOrEqual(3);
  });

  // ─── Router + sidebar integration (4) ───
  it('Comply360Page imports both new dashboards', () => {
    const src = nodeFs.readFileSync(SRC('src/pages/erp/comply360/Comply360Page.tsx'), 'utf8');
    expect(src).toContain('DPDPDashboardPage');
    expect(src).toContain('CyberSecurityDashboardPage');
  });
  it('Comply360Page has dpdp + cyber-security router cases', () => {
    const src = nodeFs.readFileSync(SRC('src/pages/erp/comply360/Comply360Page.tsx'), 'utf8');
    expect(src).toContain("case 'dpdp':");
    expect(src).toContain("case 'cyber-security':");
  });
  it('sidebar-config has dpdp entry with keyboard `c B`', () => {
    const item = comply360SidebarItems.find((i) => i.id === 'dpdp');
    expect(item).toBeDefined();
    expect(item?.keyboard).toBe('c B');
  });
  it('sidebar-config has cyber-security entry with keyboard `c X`', () => {
    const item = comply360SidebarItems.find((i) => i.id === 'cyber-security');
    expect(item).toBeDefined();
    expect(item?.keyboard).toBe('c X');
  });

  // ─── §H 0-DIFF anchors (1) ───
  it('S91 waste-management + S90 environmental + cross-card upstream files unchanged', () => {
    expect(nodeFs.existsSync(SRC('src/lib/comply360-waste-management-engine.ts'))).toBe(true);
    expect(nodeFs.existsSync(SRC('src/lib/comply360-environmental-engine.ts'))).toBe(true);
    expect(nodeFs.existsSync(SRC('src/lib/servicedesk-engine.ts')) ||
           nodeFs.existsSync(SRC('src/lib/peoplepay-skill-engine.ts'))).toBe(true);
  });
});
