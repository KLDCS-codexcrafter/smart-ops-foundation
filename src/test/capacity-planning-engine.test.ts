/**
 * capacity-planning-engine.test.ts — Sprint T-Phase-1.3-3-PlantOps-pre-3a · Block L
 */
import { describe, it, expect } from 'vitest';
import { aggregateCapacity, runCapacityCheck } from '@/lib/capacity-planning-engine';
import type { CapacitySnapshotAtomic } from '@/types/capacity-snapshot';
import type { ProductionPlan } from '@/types/production-plan';

const mkAtomic = (over: Partial<CapacitySnapshotAtomic>): CapacitySnapshotAtomic => ({
  id: 'cs-1', entity_id: 'E1', factory_id: 'F1', machine_id: 'M1',
  date: '2026-05-04', shift_id: 'SH1',
  shift_hours: 8, planned_maintenance_hours: 0, available_hours: 8,
  planned_hours: 0, committed_hours: 4,
  required_operators: 1, available_operators: 1,
  source_plan_ids: [], source_po_ids: [], source_jc_ids: [],
  computed_at: new Date().toISOString(),
  ...over,
});

describe('capacity-planning-engine · 3-PlantOps-pre-3a', () => {
  it('Test 1 · aggregateCapacity per_day · groups shift atomics into 1 row per machine per day', () => {
    const atomics = [
      mkAtomic({ shift_id: 'SH1', committed_hours: 4 }),
      mkAtomic({ id: 'cs-2', shift_id: 'SH2', committed_hours: 6 }),
    ];
    const rows = aggregateCapacity(atomics, 'per_day', 'config_pct', { passPct: 90, warnPct: 75 });
    expect(rows).toHaveLength(1);
    expect(rows[0].available_hours).toBe(16);
    expect(rows[0].committed_hours).toBe(10);
  });

  it('Test 2 · aggregateCapacity per_week · weekStart-Monday groups 7 days', () => {
    const atomics = [
      mkAtomic({ date: '2026-05-04' }),
      mkAtomic({ id: 'cs-2', date: '2026-05-05' }),
      mkAtomic({ id: 'cs-3', date: '2026-05-06' }),
    ];
    const rows = aggregateCapacity(atomics, 'per_week', 'config_pct', { passPct: 90, warnPct: 75 });
    expect(rows).toHaveLength(1);
    expect(rows[0].source_count).toBe(3);
    expect(rows[0].week_start).toBe('2026-05-04');
  });

  it('Test 3 · runCapacityCheck · all 3 threshold modes (Q37=ALL) return valid status', () => {
    const plan: ProductionPlan = {
      id: 'pp-1', entity_id: 'E1', doc_no: 'PP/2026/0001',
      plan_period_start: '2026-05-04', plan_period_end: '2026-05-04',
      plan_type: 'standalone', status: 'draft', source_links: {},
      department_id: 'D1', business_unit_id: null, lines: [],
      linked_production_order_ids: [],
      total_planned_qty: 0, total_ordered_qty: 0, total_produced_qty: 0, fulfillment_pct: 0,
      approval_history: [], status_history: [],
      capacity_check_status: 'not_run', capacity_warnings: [],
      capacity_check_run_at: null, capacity_check_details: {},
      notes: '',
      created_at: '', created_by: 'sys', updated_at: '', updated_by: 'sys',
    };
    const ctx = {
      machines: [], shifts: [], pos: [], job_cards: [], operators: [],
      factories: [{ id: 'F1' } as never],
    };
    for (const mode of ['config_pct', 'hard_absolute', 'per_factory'] as const) {
      const r = runCapacityCheck(plan, {
        ...ctx,
        productionConfig: {
          capacityThresholdMode: mode,
          capacityCheckPassThreshold: 90,
          capacityCheckWarnThreshold: 75,
        },
      });
      expect(['pass', 'warn', 'fail']).toContain(r.status);
      expect(r.details.threshold_mode_used).toBe(mode);
    }
  });
});
