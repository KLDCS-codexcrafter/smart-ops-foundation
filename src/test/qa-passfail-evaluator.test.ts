/**
 * @file     qa-passfail-evaluator.test.ts
 * @sprint   T-Phase-1.3-3b-pre-2 · Block L · D-637 · Q54=a polymorphic Pass/Fail
 */
import { describe, it, expect } from 'vitest';
import { evaluatePassFail } from '@/lib/qa-passfail-evaluator';
import type { QaInspectionRecord, QaInspectionLine } from '@/types/qa-inspection';
import type { ItemQCParam } from '@/types/item-qc-param';

function line(id: string, item: string, passed: number, failed: number, reason: string | null = null): QaInspectionLine {
  return {
    id, bill_line_id: 'bl', item_id: item, item_name: `Item-${item}`,
    qty_inspected: passed + failed, qty_passed: passed, qty_failed: failed,
    failure_reason: reason, inspection_parameters: {},
  };
}

function inspection(lines: QaInspectionLine[]): QaInspectionRecord {
  return {
    id: 'qa-t', qa_no: 'QA/T/0001',
    bill_id: 'b', bill_no: 'B', git_id: null, po_id: 'p', po_no: 'P',
    entity_id: 'E', branch_id: null, inspector_user_id: 'u', inspection_date: '2026-05-05',
    inspection_location: 'F', lines, status: 'pending', notes: '',
    created_at: '', updated_at: '',
  };
}

const critical = (item: string): ItemQCParam => ({
  id: `qp-${item}`, item_id: item, sl_no: 1,
  specification: 'crit', standard: null, test_method: null, frequency: null,
  is_critical: true, party_specific: false, party_id: null, party_name: null,
  created_at: '', updated_at: '',
});

describe('qa-passfail-evaluator · 3b-pre-2', () => {
  it('Test 1 · per_param_and · STRICT · any failed line → overall FAIL', () => {
    const ins = inspection([line('l1', 'A', 10, 0), line('l2', 'B', 5, 5, 'crack')]);
    const r = evaluatePassFail(ins, 'per_param_and', []);
    expect(r.overall).toBe('fail');
    expect(r.failed_lines_count).toBe(1);
    expect(r.reasons.some(s => s.includes('crack'))).toBe(true);
  });

  it('Test 2 · weighted_score · critical params 2x weight · pass if score ≥ 80', () => {
    // 1 critical-item line 100% pass (weight 2), 1 non-critical 50% pass (weight 1).
    // weighted = (1.0*2 + 0.5*1) / 3 = 2.5/3 = 0.833... → 83% PASS
    const ins = inspection([line('l1', 'A', 10, 0), line('l2', 'B', 5, 5)]);
    const r = evaluatePassFail(ins, 'weighted_score', [critical('A')]);
    expect(r.overall).toBe('pass');
    expect(r.weighted_score).toBeGreaterThanOrEqual(80);

    // Critical fails → score drops below 80
    const ins2 = inspection([line('l1', 'A', 0, 10), line('l2', 'B', 10, 0)]);
    const r2 = evaluatePassFail(ins2, 'weighted_score', [critical('A')]);
    expect(r2.overall).toBe('fail');
    expect(r2.failed_critical_params).toContain('Item-A');
  });

  it('Test 3 · per_param_or · LENIENT · any passed line → overall PASS', () => {
    const ins = inspection([line('l1', 'A', 0, 10, 'fail'), line('l2', 'B', 1, 9)]);
    const r = evaluatePassFail(ins, 'per_param_or', []);
    expect(r.overall).toBe('pass');
    expect(r.passed_lines_count).toBe(1);

    const insAllFail = inspection([line('l1', 'A', 0, 10, 'fail')]);
    const r2 = evaluatePassFail(insAllFail, 'per_param_or', []);
    expect(r2.overall).toBe('fail');
  });
});
