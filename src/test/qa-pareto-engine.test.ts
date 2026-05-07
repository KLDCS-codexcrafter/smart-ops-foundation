/**
 * @file     qa-pareto-engine.test.ts
 * @sprint   T-Phase-1.3-3b-pre-3 · Block L · D-650
 */
import { describe, it, expect } from 'vitest';
import { computeParetoData, computeQCTrend } from '@/lib/qa-pareto-engine';
import type { QaInspectionRecord, QaInspectionLine, QaInspectionStatus } from '@/types/qa-inspection';

function line(
  id: string, item: string, passed: number, failed: number, params: Record<string, string> = {},
): QaInspectionLine {
  return {
    id, bill_line_id: 'bl', item_id: item, item_name: `Item-${item}`,
    qty_inspected: passed + failed, qty_passed: passed, qty_failed: failed,
    failure_reason: null, inspection_parameters: params,
  };
}

function ins(
  id: string, status: QaInspectionStatus, lines: QaInspectionLine[], date = '2026-05-05',
  extra: Partial<QaInspectionRecord> = {},
): QaInspectionRecord {
  return {
    id, qa_no: `QA/T/${id}`,
    bill_id: 'b', bill_no: 'B', git_id: null, po_id: 'p', po_no: 'P',
    entity_id: 'E', branch_id: null, inspector_user_id: 'insp-1',
    inspection_date: date, inspection_location: 'F', lines, status, notes: '',
    created_at: '', updated_at: '',
    ...extra,
  };
}

describe('qa-pareto-engine · 3b-pre-3', () => {
  it('Test 1 · per_parameter grouping · cumulative_pct correct + sorted desc', () => {
    const data = computeParetoData(
      [
        ins('1', 'failed', [line('l1', 'A', 0, 1, { hardness: 'fail', color: 'fail' })]),
        ins('2', 'failed', [line('l2', 'A', 0, 1, { hardness: 'fail' })]),
        ins('3', 'passed', [line('l3', 'A', 1, 0, { hardness: 'pass', color: 'pass' })]),
      ],
      'per_parameter',
    );
    expect(data.bins.length).toBeGreaterThan(0);
    // sorted by fail_count desc
    for (let i = 1; i < data.bins.length; i++) {
      expect(data.bins[i - 1].fail_count).toBeGreaterThanOrEqual(data.bins[i].fail_count);
    }
    // cumulative_pct must reach 100 at last bin (when failures > 0)
    const last = data.bins[data.bins.length - 1];
    expect(last.cumulative_pct).toBe(100);
    expect(data.grouping_mode).toBe('per_parameter');
  });

  it('Test 2 · per_item grouping · sorted by fail_count desc · pending skipped', () => {
    const data = computeParetoData(
      [
        ins('1', 'failed', [line('l1', 'A', 0, 5)]),
        ins('2', 'failed', [line('l2', 'B', 0, 2)]),
        ins('3', 'pending', [line('l3', 'A', 0, 99)]),
      ],
      'per_item',
    );
    expect(data.bins[0].key).toBe('A');
    expect(data.bins[0].fail_count).toBe(5); // pending excluded
    expect(data.bins[1].key).toBe('B');
    expect(data.total_failures).toBe(7);
  });

  it('Test 3 · computeQCTrend · groups by date · pass_rate computed', () => {
    const today = new Date().toISOString().slice(0, 10);
    const points = computeQCTrend(
      [
        ins('1', 'passed', [line('l', 'A', 1, 0)], today),
        ins('2', 'failed', [line('l', 'A', 0, 1)], today),
        ins('3', 'passed', [line('l', 'A', 1, 0)], today),
      ],
      30,
    );
    expect(points.length).toBe(1);
    expect(points[0].pass_count).toBe(2);
    expect(points[0].fail_count).toBe(1);
    expect(points[0].pass_rate_pct).toBeGreaterThanOrEqual(60);
  });
});
