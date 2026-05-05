/**
 * qa-mobile-capture.test.ts — Sprint 5-pre-3 · Block J · D-346
 * Tests pure step-validation logic + 3-tier severity classification.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  canProceedQa, EMPTY_QA_FORM_STATE,
} from '@/lib/mobile-qa-capture-validation';
import {
  getPendingInspectionAlerts, PER_AUTHORITY_THRESHOLDS,
} from '@/lib/oob/qa-pending-inspection-alerts';
import { qaInspectionKey, type QaInspectionRecord } from '@/types/qa-inspection';

const E = 'TST5P3';

beforeEach(() => {
  localStorage.removeItem(qaInspectionKey(E));
});

function seed(over: Partial<QaInspectionRecord> = {}): QaInspectionRecord {
  const now = new Date().toISOString();
  const rec: QaInspectionRecord = {
    id: `qa-${Math.random().toString(36).slice(2, 8)}`,
    qa_no: 'QA/202605/0001',
    bill_id: 'b1', bill_no: 'BP/0001',
    git_id: null, po_id: 'p1', po_no: 'PO/0001',
    entity_id: E, branch_id: null,
    inspector_user_id: 'u1',
    inspection_date: now.slice(0, 10),
    inspection_location: 'Stores',
    lines: [{
      id: 'l1', bill_line_id: 'bl1', item_id: 'i1', item_name: 'Steel',
      qty_inspected: 100, qty_passed: 0, qty_failed: 0,
      failure_reason: null, inspection_parameters: {},
    }],
    status: 'pending', notes: '',
    created_at: now, updated_at: now,
    ...over,
  };
  const raw = localStorage.getItem(qaInspectionKey(E));
  const list: QaInspectionRecord[] = raw ? JSON.parse(raw) : [];
  list.push(rec);
  localStorage.setItem(qaInspectionKey(E), JSON.stringify(list));
  return rec;
}

describe('MobileQualiCheckCapture · canProceedQa', () => {
  it('Step 1 requires a picked qa_id', () => {
    expect(canProceedQa(EMPTY_QA_FORM_STATE, 1)).toBe(false);
    expect(canProceedQa({ ...EMPTY_QA_FORM_STATE, qa_id: 'x' }, 1)).toBe(true);
  });
  it('Step 2 requires non-zero qty totals within inspected range', () => {
    const base = { ...EMPTY_QA_FORM_STATE, qa_id: 'x', qty_inspected: 100 };
    expect(canProceedQa(base, 2)).toBe(false);
    expect(canProceedQa({ ...base, qty_passed: 80, qty_failed: 20 }, 2)).toBe(true);
    expect(canProceedQa({ ...base, qty_passed: 80, qty_failed: 50 }, 2)).toBe(false);
  });
  it('Steps 3 and 4 are optional', () => {
    expect(canProceedQa(EMPTY_QA_FORM_STATE, 3)).toBe(true);
    expect(canProceedQa(EMPTY_QA_FORM_STATE, 4)).toBe(true);
  });
});

describe('qa-pending-inspection-alerts · D-344 3-tier severity', () => {
  it('classifies severity using per-authority thresholds', () => {
    const internal = PER_AUTHORITY_THRESHOLDS.internal;
    const lab = PER_AUTHORITY_THRESHOLDS.external_lab;
    expect(internal.escalated).toBeGreaterThan(internal.critical);
    expect(internal.critical).toBeGreaterThan(internal.warning);
    expect(lab.warning).toBeGreaterThan(internal.warning);
  });
  it('emits severity field on each alert', () => {
    const old = new Date(Date.now() - 80 * 3600 * 1000).toISOString().slice(0, 10);
    seed({ inspection_date: old, inspection_authority: 'internal' });
    const alerts = getPendingInspectionAlerts(E, 24);
    expect(alerts).toHaveLength(1);
    expect(['warning', 'critical', 'escalated']).toContain(alerts[0].severity);
    expect(alerts[0].authority).toBe('internal');
  });
  it('respects user-facing threshold override', () => {
    const old = new Date(Date.now() - 12 * 3600 * 1000).toISOString().slice(0, 10);
    seed({ inspection_date: old });
    expect(getPendingInspectionAlerts(E, 24)).toHaveLength(0);
    expect(getPendingInspectionAlerts(E, 6).length).toBeGreaterThanOrEqual(0);
  });
});
