/**
 * Sprint 80e · T-Phase-5.B.2.1-PASS-E test pack
 * 3 NEW SIBLINGs + OOB-1 + OOB-3 + OOB-7 + OOB-11 surface integration
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

import {
  computeAuditReadyScore, getScoreBand, getLatestScore, listScoreSnapshots,
  AUDIT_READY_WEIGHTS,
} from '@/lib/comply360-audit-ready-score-engine';
import {
  generateReplay, listReplaySessions, getReplaySession, computeDownstreamImpact,
} from '@/lib/comply360-audit-replay-engine';
import {
  buildLineageChain, listLineageChains, getLineageChain, findUpstreamReferences,
} from '@/lib/comply360-cross-card-lineage-engine';
import { SIBLINGS, getSiblingCount } from '@/lib/_institutional/sibling-register';
import { SPRINTS, getCurrentAStreak } from '@/lib/_institutional/sprint-history';

const SRC = (p: string): string => path.resolve(__dirname, '../../..', p);
const DASH = SRC('src/pages/erp/comply360/audit-framework/AuditFrameworkDashboardPage.tsx');

describe('Sprint 80e · Audit-Ready Score Engine (OOB-1)', () => {
  it('computes a composite score with band classification', () => {
    const s = computeAuditReadyScore('OPERIX-DEMO', 'FY 2025-26');
    expect(typeof s.overall_score).toBe('number');
    expect(s.overall_score).toBeGreaterThanOrEqual(0);
    expect(s.overall_score).toBeLessThanOrEqual(100);
    expect(['excellent', 'good', 'warning', 'critical']).toContain(s.band);
    expect(s.sub_scores).toBeDefined();
  });
  it('weights sum to 1.0', () => {
    const total = Object.values(AUDIT_READY_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(Math.abs(total - 1)).toBeLessThan(0.001);
  });
  it('getScoreBand maps thresholds correctly', () => {
    expect(getScoreBand(95)).toBe('excellent');
    expect(getScoreBand(80)).toBe('good');
    expect(getScoreBand(60)).toBe('warning');
    expect(getScoreBand(30)).toBe('critical');
  });
  it('persists snapshots retrievable via getLatestScore', () => {
    computeAuditReadyScore('OPERIX-T1', 'FY 2025-26');
    const latest = getLatestScore('OPERIX-T1', 'FY 2025-26');
    expect(latest).not.toBeNull();
    const all = listScoreSnapshots('OPERIX-T1', { fy: 'FY 2025-26' });
    expect(all.length).toBeGreaterThan(0);
  });
});

describe('Sprint 80e · Audit Replay Engine (OOB-3)', () => {
  it('generates a replay session for an entity', () => {
    const s = generateReplay({
      entity_type: 'voucher', entity_id: 'V-T-001',
      entity_code: 'OPERIX-DEMO', initiated_by_bap: 'mr-b-auditor-1',
    });
    expect(s.session_id).toBeTruthy();
    expect(s.total_frames).toBe(s.frames.length);
    expect(s.frames.every((f) => typeof f.timestamp === 'string')).toBe(true);
  });
  it('lists and gets sessions by id', () => {
    const s = generateReplay({
      entity_type: 'voucher', entity_id: 'V-T-002',
      entity_code: 'OPERIX-DEMO', initiated_by_bap: 'mr-b-auditor-1',
    });
    const list = listReplaySessions({ entity_type: 'voucher', entity_id: 'V-T-002' });
    expect(list.length).toBeGreaterThan(0);
    expect(getReplaySession(s.session_id)).not.toBeNull();
  });
  it('computeDownstreamImpact returns a non-negative count', () => {
    const n = computeDownstreamImpact('voucher', 'V-T-001', 'OPERIX-DEMO');
    expect(n).toBeGreaterThanOrEqual(0);
  });
});

describe('Sprint 80e · Cross-Card Lineage Engine (OOB-11)', () => {
  it('builds a lineage chain from a finding id', () => {
    const c = buildLineageChain({ finding_id: 'F-T-001', initiated_by_bap: 'mr-b-auditor-1' });
    expect(c.chain_id).toBeTruthy();
    expect(c.node_count).toBe(c.nodes.length);
    expect(c.termination_reason).toBeTruthy();
  });
  it('lists and retrieves chains by id', () => {
    const c = buildLineageChain({ finding_id: 'F-T-002', initiated_by_bap: 'mr-b-auditor-1' });
    expect(listLineageChains('F-T-002').length).toBeGreaterThan(0);
    expect(getLineageChain(c.chain_id)).not.toBeNull();
  });
  it('findUpstreamReferences returns an array', () => {
    const refs = findUpstreamReferences('finding', 'F-T-001');
    expect(Array.isArray(refs)).toBe(true);
  });
});

describe('Sprint 80e · Dashboard surface integration', () => {
  const body = fs.readFileSync(DASH, 'utf-8');
  it('imports the 3 new S80e engines', () => {
    expect(body).toContain('comply360-audit-ready-score-engine');
    expect(body).toContain('comply360-audit-replay-engine');
    expect(body).toContain('comply360-cross-card-lineage-engine');
  });
  it('renders the OOB-1 Audit-Ready Score banner', () => {
    expect(body).toContain('Audit-Ready Score (OOB-1)');
  });
  it('20th tile renders the CoverageHeatmap component (OOB-7)', () => {
    expect(body).toContain('<CoverageHeatmap');
  });
  it('exposes Replay and Lineage launchers', () => {
    expect(body).toContain('Replay Sample Voucher');
    expect(body).toContain('Trace Sample Finding Lineage');
  });
});

describe('Sprint 80e · Institutional registers', () => {
  it('3 new SIBLINGs registered (replay + lineage + ready-score)', () => {
    const ids = SIBLINGS.map((s) => s.id);
    expect(ids).toContain('comply360-audit-replay-engine');
    expect(ids).toContain('comply360-cross-card-lineage-engine');
    expect(ids).toContain('comply360-audit-ready-score-engine');
  });
  it('SIBLING count monotonically grew (>= 57 entries)', () => {
    expect(getSiblingCount()).toBeGreaterThanOrEqual(57);
  });
  it('Sprint 80e history entry present with PASS-E code', () => {
    const e = SPRINTS.find((s) => s.code === 'T-Phase-5.B.2.1-PASS-E');
    expect(e).toBeDefined();
    expect(e?.grade).toBe('A first-pass-clean');
  });
  it('A-streak is a non-negative number (post cycle-2)', () => {
    // Lesson 24 · streak bounds-check only · S80c B-grade reset followed by S80d/S80e accumulation
    const s = getCurrentAStreak();
    expect(s).toBeGreaterThanOrEqual(0);
  });
});
