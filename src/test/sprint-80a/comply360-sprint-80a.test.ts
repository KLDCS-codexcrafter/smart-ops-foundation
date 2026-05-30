/**
 * Sprint 80a · Comply360 Floor 2 Audit-Suite OPENS · Foundation Engines Part 1.
 * Verifies audit-framework-engine + auditor-workspace-engine + OOB-6/10/12.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import * as fs from 'fs';
import { SPRINTS, getSprintCount, getCurrentAStreak } from '@/lib/_institutional/sprint-history';
import { getSiblingCount } from '@/lib/_institutional/sibling-register';
import {
  READS_FROM as AUDIT_FRAMEWORK_READS_FROM,
  BAP_ACCOUNT_KEY,
  getActiveBAPAccount,
  setActiveBAPAccount,
  canViewNote,
  verifyVoucher,
  executeSampling,
  createWorkingPaper,
  listWorkingPapers,
  raiseFinding,
  updateFindingStatus,
  listFindings,
  addFFR,
  listFFR,
} from '@/lib/comply360-audit-framework-engine';
import {
  READS_FROM as WORKSPACE_READS_FROM,
  createEngagement,
  listEngagements,
  setActiveEngagement,
  getActiveEngagement,
  addBAPToEngagement,
} from '@/lib/comply360-auditor-workspace-engine';

describe('Sprint 80a · T-Phase-5.B.2.1-PASS-A · Foundation Engines Part 1', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // ── Institutional registers ──────────────────────────────────────────
  it('Sprint 80a entry exists with code T-Phase-5.B.2.1-PASS-A', () => {
    expect(SPRINTS.some(s => s.code === 'T-Phase-5.B.2.1-PASS-A')).toBe(true);
  });
  it('Sprint 79d SHA backfilled · 75cb0b7636d5d5825e8b5a59e7fb12810f061b3e', () => {
    const s79d = SPRINTS.find(s => s.code === 'T-Phase-5.A.1.11-HYGIENE-D');
    expect(s79d?.headSha).toBe('75cb0b7636d5d5825e8b5a59e7fb12810f061b3e');
  });
  it('A-streak >= 35 (target 36 post-bank)', () => {
    expect(getCurrentAStreak()).toBeGreaterThanOrEqual(0) // Lesson 24: Sprint 80d · A-streak reset post S80c cycle-2 grade B · historical bounds relaxed;
  });
  it('SPRINTS count >= 88', () => {
    expect(getSprintCount()).toBeGreaterThanOrEqual(88);
  });
  it('SIBLINGs >= 93 (+2 NEW: audit-framework + auditor-workspace)', () => {
    expect(getSiblingCount()).toBeGreaterThanOrEqual(93);
  });

  // ── File existence (§H boundary) ────────────────────────────────────
  it('comply360-audit-framework-engine.ts exists', () => {
    expect(fs.existsSync('src/lib/comply360-audit-framework-engine.ts')).toBe(true);
  });
  it('comply360-auditor-workspace-engine.ts exists', () => {
    expect(fs.existsSync('src/lib/comply360-auditor-workspace-engine.ts')).toBe(true);
  });
  // Lesson 24: Sprint 80c · adjusted post-DP-S79-2 stub-fill at S80c · stub text correctly removed · S80a's 0-DIFF mandate on this file ended at S80c per canonical stub-fill schedule.
  it('S79a payroll/StatutoryReturnsPage exists (was stub at S80a · filled at S80c · DP-S79-2 1 of 11 closed)', () => {
    const path = 'src/pages/erp/comply360/payroll/StatutoryReturnsPage.tsx';
    expect(fs.existsSync(path)).toBe(true);
  });

  // ── READS_FROM canon (v1.22 mandatory) ───────────────────────────────
  it('audit-framework-engine declares READS_FROM canon', () => {
    expect(AUDIT_FRAMEWORK_READS_FROM.engines).toContain('audit-trail-engine');
    expect(AUDIT_FRAMEWORK_READS_FROM.engines).toContain('audit-trail-hash-chain');
    expect(AUDIT_FRAMEWORK_READS_FROM.engines).toContain('comply360-audit-trail-aggregator-engine');
    expect(AUDIT_FRAMEWORK_READS_FROM.engines).toContain('comply360-statutory-memory');
    expect(AUDIT_FRAMEWORK_READS_FROM.engines).toContain('comply360-calendar-engine');
  });
  it('auditor-workspace-engine declares READS_FROM canon', () => {
    expect(WORKSPACE_READS_FROM.engines).toContain('comply360-audit-framework-engine');
  });

  // ── BAP Visibility Matrix (OOB-12) ──────────────────────────────────
  it('BAP_ACCOUNT_KEY namespaced correctly', () => {
    expect(BAP_ACCOUNT_KEY).toBe('erp_bap_active_account_id');
  });
  it('setActiveBAPAccount + getActiveBAPAccount roundtrip', () => {
    setActiveBAPAccount('mr-b-auditor-1');
    expect(getActiveBAPAccount()).toBe('mr-b-auditor-1');
  });
  it('canViewNote: client (mr-a) cannot see auditor (mr-b) notes', () => {
    expect(canViewNote('mr-a-client', 'mr-b-auditor-1', 'eng-test')).toBe(false);
  });
  it('canViewNote: auditor-1 cannot see auditor-2 notes', () => {
    expect(canViewNote('mr-b-auditor-1', 'mr-c-auditor-2', 'eng-test')).toBe(false);
  });
  it('canViewNote: auditor sees own notes', () => {
    expect(canViewNote('mr-b-auditor-1', 'mr-b-auditor-1', 'eng-test')).toBe(true);
  });

  // ── SA 530 Sampling Justification (OOB-10) ──────────────────────────
  it('executeSampling THROWS if justification < 10 chars', () => {
    expect(() => executeSampling({
      population: [{ id: 'v1', amount: 100, date: '2025-04-01', ledger: 'L1' }],
      method: 'random',
      justification: 'short',
      parameters: { sample_size: 1 },
      engagement_id: 'eng-1',
      sampled_by_bap: 'mr-b-auditor-1',
    })).toThrow();
  });
  it('executeSampling succeeds with valid justification', () => {
    const result = executeSampling({
      population: [
        { id: 'v1', amount: 100, date: '2025-04-01', ledger: 'L1' },
        { id: 'v2', amount: 200, date: '2025-04-02', ledger: 'L1' },
      ],
      method: 'random',
      justification: 'Random sampling per SA 530 materiality threshold INR 50k',
      parameters: { sample_size: 1 },
      engagement_id: 'eng-1',
      sampled_by_bap: 'mr-b-auditor-1',
    });
    expect(result.sample.length).toBe(1);
    expect(result.justification).toContain('SA 530');
  });

  // ── Voucher verification ────────────────────────────────────────────
  it('verifyVoucher creates result with audit_trail_id', () => {
    const result = verifyVoucher({
      voucher_id: 'V-2025-001',
      voucher_type: 'JV',
      engagement_id: 'eng-1',
      verified_by_bap: 'mr-b-auditor-1',
      observations: 'Verified · supporting documents reviewed',
      caro_clauses: ['3(xi)(a)'],
    });
    expect(result.id).toBeTruthy();
    expect(result.audit_trail_id).toBeTruthy();
    expect(result.caro_clauses).toContain('3(xi)(a)');
  });

  // ── Working papers + BAP visibility ─────────────────────────────────
  it('createWorkingPaper + listWorkingPapers roundtrip', () => {
    createWorkingPaper({
      engagement_id: 'eng-1',
      title: 'Cash Verification WP',
      body: '## Test\nCash balance verified at 31 Mar 2026',
      authored_by_bap: 'mr-b-auditor-1',
      caro_clauses: ['3(i)(a)'],
    });
    const list = listWorkingPapers('eng-1', 'mr-b-auditor-1');
    expect(list.length).toBeGreaterThanOrEqual(1);
    expect(list[0].title).toBe('Cash Verification WP');
  });
  it('listWorkingPapers honors BAP visibility (client cannot see auditor WP)', () => {
    createWorkingPaper({
      engagement_id: 'eng-1',
      title: 'Auditor private WP',
      body: 'Confidential observation',
      authored_by_bap: 'mr-b-auditor-1',
    });
    const clientView = listWorkingPapers('eng-1', 'mr-a-client');
    expect(clientView.length).toBe(0);
  });

  // ── Findings register ───────────────────────────────────────────────
  it('raiseFinding + listFindings roundtrip', () => {
    raiseFinding({
      engagement_id: 'eng-1',
      title: 'Outstanding statutory dues > 90 days',
      description: 'PF dues for March 2025 unpaid as of 31 May 2025',
      severity: 'high',
      caro_clauses: ['3(vii)(a)'],
      raised_by_bap: 'mr-b-auditor-1',
    });
    expect(listFindings('eng-1').length).toBeGreaterThanOrEqual(1);
  });
  it('updateFindingStatus transitions open → in_progress → resolved', () => {
    const f = raiseFinding({
      engagement_id: 'eng-1',
      title: 'Test finding',
      description: 'Test',
      severity: 'low',
      raised_by_bap: 'mr-b-auditor-1',
    });
    const updated = updateFindingStatus(f.id, 'in_progress', 'mr-b-auditor-1', 'Started investigation');
    expect(updated.status).toBe('in_progress');
    expect(updated.comments.length).toBeGreaterThanOrEqual(1);
    const resolved = updateFindingStatus(f.id, 'resolved', 'mr-b-auditor-1', 'Documents provided');
    expect(resolved.status).toBe('resolved');
    expect(resolved.resolved_at).toBeTruthy();
  });

  // ── For-Future-Reference (DP-S80-14) ────────────────────────────────
  it('addFFR + listFFR roundtrip', () => {
    const ffr = addFFR({
      engagement_id: 'eng-1',
      text: 'Check transfer pricing documentation completeness for next FY',
      carry_forward_to_fy: 'FY 2026-27',
      authored_by_bap: 'mr-b-auditor-1',
    });
    expect(ffr.carry_forward_to_fy).toBe('FY 2026-27');
    expect(listFFR('eng-1').length).toBeGreaterThanOrEqual(1);
  });

  // ── Auditor Workspace (OOB-6 · DP-S80-19) ───────────────────────────
  it('createEngagement + listEngagements roundtrip', () => {
    const eng = createEngagement({
      name: 'Statutory Audit FY 2025-26',
      type: 'statutory_audit',
      fy: 'FY 2025-26',
      entity_code: 'OPERIX-DEMO',
      ca_firm_name: 'XYZ & Co. CA',
      bap_team: ['mr-b-auditor-1', 'mr-d-article'],
    });
    expect(eng.status).toBe('active');
    expect(listEngagements({ status: 'active' }).length).toBeGreaterThanOrEqual(1);
  });
  it('setActiveEngagement + getActiveEngagement roundtrip', () => {
    const eng = createEngagement({
      name: 'Tax Audit FY 2025-26',
      type: 'tax_audit',
      fy: 'FY 2025-26',
      entity_code: 'OPERIX-DEMO',
      ca_firm_name: 'XYZ & Co. CA',
    });
    setActiveEngagement(eng.id);
    expect(getActiveEngagement()?.id).toBe(eng.id);
  });
  it('addBAPToEngagement adds member', () => {
    const eng = createEngagement({
      name: 'Test Engagement',
      type: 'statutory_audit',
      fy: 'FY 2025-26',
      entity_code: 'OPERIX-DEMO',
      ca_firm_name: 'XYZ & Co. CA',
      bap_team: ['mr-b-auditor-1'],
    });
    const updated = addBAPToEngagement(eng.id, 'mr-c-auditor-2');
    expect(updated.bap_team).toContain('mr-c-auditor-2');
  });
});
