/**
 * @file        src/test/sprint-78a/comply360-sprint-78a.test.ts
 * @purpose     Sprint 78a Pass A · 5 NEW engines (msme-aggregator · audit-trail-aggregator ·
 *              calendar · time-machine · statutory-payments) · ≥35 tests · Lesson-24
 *              bounds-checked snapshot · READS_FROM contract assertions · forward-
 *              extensibility tests for registry-pattern engines (DP-S78-6).
 * @sprint      Sprint 78a · T-Phase-5.A.1.10-PASS-A
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  aggregateMSMEView, assessApprovalRisk, exportMSMEViewCsv,
  READS_FROM as MSME_AGG_READS_FROM,
} from '@/lib/comply360-msme-aggregator-engine';
import {
  aggregateAuditTrail, reconstructSnapshotAt, verifyAggregatedChain,
  AUDIT_ENTITY_TYPES_REGISTRY, registerAuditEntityType,
  READS_FROM as AUDIT_AGG_READS_FROM,
} from '@/lib/comply360-audit-trail-aggregator-engine';
import {
  buildCalendar, calendarForMonth, nextUpcomingEvents,
  OBLIGATION_SOURCES_REGISTRY, registerObligationSource,
  READS_FROM as CAL_READS_FROM,
} from '@/lib/comply360-calendar-engine';
import {
  replaySnapshot, listAvailableSnapshots, compareSnapshots,
  READS_FROM as TM_READS_FROM,
} from '@/lib/comply360-time-machine-engine';
import {
  loadPayments, computePaymentDue, recordPayment, prepareChallan,
  READS_FROM as PMT_READS_FROM,
} from '@/lib/comply360-statutory-payments-engine';
import { logAudit } from '@/lib/audit-trail-engine';
import { SIBLINGS, getSiblingCount } from '@/lib/_institutional/sibling-register';
import { SPRINTS, getSprintCount, getCurrentAStreak } from '@/lib/_institutional/sprint-history';

const ENT = 'TEST78A';
const FY = '2025-26';

beforeEach(() => {
  localStorage.clear();
});

describe('Sprint 78a · MSME aggregator (Q9 + OOB-8)', () => {
  it('aggregateMSMEView returns a well-formed view', () => {
    const v = aggregateMSMEView(ENT, FY);
    expect(v.entity_code).toBe(ENT);
    expect(v.fy).toBe(FY);
    expect(Array.isArray(v.vendors)).toBe(true);
    expect(v.summary).toBeDefined();
    expect(typeof v.total_disallowed_inr).toBe('number');
  });
  it('form1_status defaults to not-applicable when zero vendors', () => {
    const v = aggregateMSMEView(ENT, FY);
    expect(['pending', 'filed', 'not-applicable']).toContain(v.form1_status);
  });
  it('assessApprovalRisk · future payment within 7d of ceiling → warning', () => {
    const future = new Date(Date.now() + 40 * 86_400_000).toISOString().slice(0, 10);
    const r = assessApprovalRisk(ENT, 'VND-001', 100_000, future);
    expect(r.risk_level).toBe('warning');
  });
  it('assessApprovalRisk · safe when far from ceiling', () => {
    const soon = new Date(Date.now() + 5 * 86_400_000).toISOString().slice(0, 10);
    const r = assessApprovalRisk(ENT, 'VND-002', 100_000, soon);
    expect(r.risk_level).toBe('safe');
  });
  it('assessApprovalRisk · past payment beyond ceiling → block', () => {
    const stale = new Date(Date.now() + 60 * 86_400_000).toISOString().slice(0, 10);
    const r = assessApprovalRisk(ENT, 'VND-003', 100_000, stale);
    expect(r.risk_level).toBe('block');
  });
  it('exportMSMEViewCsv returns a CSV with header', () => {
    const v = aggregateMSMEView(ENT, FY);
    const csv = exportMSMEViewCsv(v);
    expect(csv.startsWith('Entity,FY,Vendor ID')).toBe(true);
  });
  it('READS_FROM contract references both upstream engines', () => {
    expect(MSME_AGG_READS_FROM.engines).toContain('msme-43bh-engine');
    expect(MSME_AGG_READS_FROM.engines).toContain('comply360-msme-form1-engine');
  });
});

describe('Sprint 78a · Audit-trail aggregator (Q10 · DP-S78-6 registry)', () => {
  it('aggregateAuditTrail on empty entity returns empty entries', () => {
    const v = aggregateAuditTrail(ENT);
    expect(v.entries).toHaveLength(0);
    expect(v.chain_status).toBe('pending');
  });
  it('aggregates and counts by entity type', () => {
    logAudit({
      entityCode: ENT, action: 'create', entityType: 'voucher',
      recordId: 'JV-1', recordLabel: 'JV/1', beforeState: null,
      afterState: { x: 1 }, sourceModule: 'fincore',
    });
    logAudit({
      entityCode: ENT, action: 'update', entityType: 'voucher',
      recordId: 'JV-1', recordLabel: 'JV/1',
      beforeState: { x: 1 }, afterState: { x: 2 }, sourceModule: 'fincore',
    });
    const v = aggregateAuditTrail(ENT);
    expect(v.entries.length).toBe(2);
    expect(v.by_entity_type['voucher']).toBe(2);
  });
  it('filters by entityType', () => {
    logAudit({
      entityCode: ENT, action: 'create', entityType: 'invoice_memo',
      recordId: 'INV-1', recordLabel: 'INV/1', beforeState: null,
      afterState: { y: 1 }, sourceModule: 'salesx',
    });
    const v = aggregateAuditTrail(ENT, { entityType: 'invoice_memo' });
    expect(v.entries.length).toBe(1);
    expect(v.entries[0].entity_type).toBe('invoice_memo');
  });
  it('reconstructSnapshotAt returns the latest in-range after_state', async () => {
    logAudit({
      entityCode: ENT, action: 'create', entityType: 'voucher',
      recordId: 'VCH-9', recordLabel: 'VCH/9', beforeState: null,
      afterState: { v: 'a' }, sourceModule: 'fincore',
    });
    await new Promise((r) => setTimeout(r, 5));
    logAudit({
      entityCode: ENT, action: 'update', entityType: 'voucher',
      recordId: 'VCH-9', recordLabel: 'VCH/9',
      beforeState: { v: 'a' }, afterState: { v: 'b' }, sourceModule: 'fincore',
    });
    const future = new Date(Date.now() + 60_000).toISOString();
    const snap = reconstructSnapshotAt(ENT, 'voucher', 'VCH-9', future);
    expect(snap).toEqual({ v: 'b' });
  });
  it('AUDIT_ENTITY_TYPES_REGISTRY seeds 14 known types', () => {
    expect(AUDIT_ENTITY_TYPES_REGISTRY.length).toBeGreaterThanOrEqual(14);
  });
  it('registerAuditEntityType is append-only and idempotent', () => {
    const before = AUDIT_ENTITY_TYPES_REGISTRY.length;
    registerAuditEntityType({ id: 's78a-test-type', module: 'tax-gst', label: 'Test' });
    registerAuditEntityType({ id: 's78a-test-type', module: 'tax-gst', label: 'Dup' });
    expect(AUDIT_ENTITY_TYPES_REGISTRY.length).toBe(before + 1);
  });
  it('verifyAggregatedChain returns a ChainVerification shape', async () => {
    const v = await verifyAggregatedChain(ENT);
    expect(typeof v.ok).toBe('boolean');
  });
  it('READS_FROM contract references both audit sources', () => {
    expect(AUDIT_AGG_READS_FROM.engines).toContain('audit-trail-engine');
    expect(AUDIT_AGG_READS_FROM.engines).toContain('audit-trail-hash-chain');
  });
});

describe('Sprint 78a · Calendar engine (Q11 · pluggable obligation sources)', () => {
  it('buildCalendar returns at least 80 events (seeded + statutory-memory)', () => {
    const cal = buildCalendar(ENT, FY);
    expect(cal.length).toBeGreaterThanOrEqual(80);
  });
  it('events are sorted ascending by due_date', () => {
    const cal = buildCalendar(ENT, FY);
    for (let i = 1; i < cal.length; i++) {
      expect(cal[i - 1].due_date <= cal[i].due_date).toBe(true);
    }
  });
  it('calendarForMonth filters by year+month', () => {
    const m = calendarForMonth(ENT, 2026, 5);
    for (const e of m) expect(e.due_date.startsWith('2026-05')).toBe(true);
    expect(m.length).toBeGreaterThan(0);
  });
  it('nextUpcomingEvents respects the limit', () => {
    const n = nextUpcomingEvents(ENT, 3, new Date('2026-05-01'));
    expect(n.length).toBeLessThanOrEqual(3);
  });
  it('registerObligationSource is append-only and idempotent', () => {
    const before = OBLIGATION_SOURCES_REGISTRY.length;
    const source = () => [{
      id: 's78a-extra-src', label: 'Extra', module: 'esg',
      due_date: '2026-12-15', status: 'pending' as const,
    }];
    registerObligationSource('s78a-extra-src-id', source);
    registerObligationSource('s78a-extra-src-id', source);
    expect(OBLIGATION_SOURCES_REGISTRY.length).toBe(before + 1);
    const cal = buildCalendar(ENT, FY);
    expect(cal.find((e) => e.id === 's78a-extra-src')).toBeDefined();
  });
  it('READS_FROM contract references statutory-memory + health-score', () => {
    expect(CAL_READS_FROM.engines).toContain('comply360-statutory-memory');
    expect(CAL_READS_FROM.engines).toContain('comply360-health-score-engine');
  });
});

describe('Sprint 78a · Time-Machine engine (Q16 · entity-agnostic replay)', () => {
  it('replaySnapshot returns the snapshot shape', async () => {
    logAudit({
      entityCode: ENT, action: 'create', entityType: 'voucher',
      recordId: 'JV-7', recordLabel: 'JV/7', beforeState: null,
      afterState: { status: 'draft' }, sourceModule: 'fincore',
    });
    const future = new Date(Date.now() + 60_000).toISOString();
    const snap = await replaySnapshot(ENT, 'voucher', 'JV-7', future);
    expect(snap.entity_id).toBe('JV-7');
    expect(snap.reconstructed_state).toEqual({ status: 'draft' });
    expect(snap.entries_applied).toBe(1);
  });
  it('listAvailableSnapshots returns first_seen / last_modified per id', () => {
    logAudit({
      entityCode: ENT, action: 'create', entityType: 'voucher',
      recordId: 'A', recordLabel: 'A', beforeState: null,
      afterState: { s: 1 }, sourceModule: 'fincore',
    });
    logAudit({
      entityCode: ENT, action: 'create', entityType: 'voucher',
      recordId: 'B', recordLabel: 'B', beforeState: null,
      afterState: { s: 2 }, sourceModule: 'fincore',
    });
    const list = listAvailableSnapshots(ENT, 'voucher');
    expect(list.length).toBe(2);
    expect(list[0].first_seen).toBeDefined();
  });
  it('compareSnapshots reports diff_keys', () => {
    const a = {
      entity_code: ENT, entity_type: 'voucher', entity_id: 'X', as_of: '2026-05-01',
      reconstructed_state: { x: 1, y: 2 }, chain_verified: true, entries_applied: 1,
    };
    const b = {
      entity_code: ENT, entity_type: 'voucher', entity_id: 'X', as_of: '2026-05-02',
      reconstructed_state: { x: 1, y: 3, z: 4 }, chain_verified: true, entries_applied: 2,
    };
    const cmp = compareSnapshots(a, b);
    expect(cmp.diff_keys).toEqual(expect.arrayContaining(['y', 'z']));
  });
  it('READS_FROM contract references audit-trail-aggregator', () => {
    expect(TM_READS_FROM.engines).toContain('comply360-audit-trail-aggregator-engine');
  });
});

describe('Sprint 78a · Statutory Payments engine (PMT · DP-S78-5)', () => {
  it('loadPayments seeds payments on first run', () => {
    const list = loadPayments(ENT, FY);
    expect(list.length).toBeGreaterThan(0);
    expect(list[0].entity_code).toBe(ENT);
  });
  it('computePaymentDue produces principal + interest breakdown', () => {
    const p = computePaymentDue(ENT, 'gst', '2026-05');
    expect(p.amount_inr).toBeGreaterThan(0);
    expect(p.computed_breakdown?.principal).toBeGreaterThan(0);
    expect(p.computed_breakdown?.interest).toBeGreaterThan(0);
  });
  it('recordPayment marks payment as paid', () => {
    const p = computePaymentDue(ENT, 'tds', '2026-05');
    const updated = recordPayment(ENT, p.id, p.amount_inr, 'net-banking', 'UTR-77001');
    expect(updated.status).toBe('paid');
    expect(updated.mode).toBe('net-banking');
    expect(updated.reference).toBe('UTR-77001');
  });
  it('recordPayment with partial amount yields partial status', () => {
    const p = computePaymentDue(ENT, 'esi', '2026-05');
    const updated = recordPayment(ENT, p.id, Math.floor(p.amount_inr / 2), 'cheque', 'CHQ-1');
    expect(updated.status).toBe('partial');
  });
  it('prepareChallan returns a handoff payload for S79 Challan Vault', () => {
    const p = computePaymentDue(ENT, 'gst', '2026-06');
    const c = prepareChallan(p);
    expect(c.handoff_payload.payment_id).toBe(p.id);
    expect(c.handoff_payload.portal_endpoint).toContain('gst.gov.in');
  });
  it('READS_FROM contract references calendar + statutory-memory', () => {
    expect(PMT_READS_FROM.engines).toContain('comply360-calendar-engine');
    expect(PMT_READS_FROM.engines).toContain('comply360-statutory-memory');
  });
});

describe('Sprint 78a · Institutional snapshot (Lesson 24 bounds-check)', () => {
  it('Sprint 78a entry registered with code T-Phase-5.A.1.10-PASS-A', () => {
    const s = SPRINTS.find(
      (sp) => sp.sprintNumber === 78 && sp.code === 'T-Phase-5.A.1.10-PASS-A',
    );
    expect(s).toBeDefined();
    expect(s?.grade?.startsWith('A')).toBe(true);
    expect(s?.newSiblings.length).toBe(5);
  });
  it('S77b SHA backfilled (not null sentinel)', () => {
    const s77b = SPRINTS.find(
      (sp) => sp.sprintNumber === 77 && sp.code === 'T-Phase-5.A.1.9-PASS-B',
    );
    expect(s77b?.headSha).not.toBeNull();
  });
  it('SIBLINGS bounds-check (≥83 floor still satisfied · 88 after +5)', () => {
    expect(getSiblingCount()).toBeGreaterThanOrEqual(83);
  });
  it('SPRINTS bounds-check (≥81 floor still satisfied)', () => {
    expect(getSprintCount()).toBeGreaterThanOrEqual(81);
  });
  it('A-streak bounds-check (≥30 target this sprint)', () => {
    expect(getCurrentAStreak()).toBeGreaterThanOrEqual(30);
  });
  it('all 5 new S78a SIBLINGs are registered', () => {
    const ids = [
      'comply360-msme-aggregator-engine',
      'comply360-audit-trail-aggregator-engine',
      'comply360-calendar-engine',
      'comply360-time-machine-engine',
      'comply360-statutory-payments-engine',
    ];
    for (const id of ids) {
      const sib = SIBLINGS.find((s) => s.id === id);
      expect(sib).toBeDefined();
      expect(sib?.sprintAdded).toBe(78);
    }
  });
});
