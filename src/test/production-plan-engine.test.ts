/**
 * @file     production-plan-engine.test.ts
 * @sprint   T-Phase-1.3-3a-pre-2.5 · Block L · D-541
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  createProductionPlan,
  approveProductionPlan,
  startProductionPlanExecution,
  closeProductionPlan,
  cancelProductionPlan,
  canTransition,
  rollupFulfillment,
  runCapacityCheck,
  applyCapacityCheck,
  linkProductionOrder,
  listProductionPlans,
  getProductionPlanById,
} from '@/lib/production-plan-engine';
import type { CreateProductionPlanInput } from '@/lib/production-plan-engine';

const user = { id: 'u1', name: 'Tester' };

const baseInput: CreateProductionPlanInput = {
  entity_id: 'e1',
  plan_period_start: '2026-05-01',
  plan_period_end: '2026-05-31',
  plan_type: 'standalone',
  department_id: 'd1',
  lines: [
    { item_id: 'i1', item_code: 'I-1', item_name: 'Item 1', planned_qty: 100, uom: 'nos', target_date: '2026-05-15' },
    { item_id: 'i2', item_code: 'I-2', item_name: 'Item 2', planned_qty: 50, uom: 'kg', target_date: '2026-05-20', max_batch_size: 1 },
  ],
  created_by: 'u1',
};

beforeEach(() => { localStorage.clear(); });

describe('production-plan-engine', () => {
  it('creates plan with PP doc-no, multi-line, and rollups initialized to 0', () => {
    const plan = createProductionPlan(baseInput, user);
    expect(plan.doc_no).toMatch(/^PP\/\d{2}-\d{2}\/\d{4}$/);
    expect(plan.status).toBe('draft');
    expect(plan.lines.length).toBe(2);
    expect(plan.total_planned_qty).toBe(150);
    expect(plan.total_ordered_qty).toBe(0);
    expect(plan.fulfillment_pct).toBe(0);
    expect(listProductionPlans('e1').length).toBe(1);
  });

  it('rejects empty lines and inverted period', () => {
    expect(() => createProductionPlan({ ...baseInput, lines: [] }, user)).toThrow();
    expect(() => createProductionPlan({ ...baseInput, plan_period_end: '2026-04-01' }, user)).toThrow();
  });

  it('enforces 5-state machine transitions', () => {
    expect(canTransition('draft', 'approved')).toBe(true);
    expect(canTransition('draft', 'closed')).toBe(false);
    expect(canTransition('cancelled', 'approved')).toBe(false);
    const plan = createProductionPlan(baseInput, user);
    const approved = approveProductionPlan(plan, user);
    const exec = startProductionPlanExecution(approved, user);
    const closed = closeProductionPlan(exec, user);
    expect(closed.status).toBe('closed');
    expect(() => cancelProductionPlan(closed, user, 'x')).toThrow();
  });

  it('rolls up fulfillment_pct from line updates', () => {
    const plan = createProductionPlan(baseInput, user);
    const updated = rollupFulfillment(
      plan,
      [
        { line_id: plan.lines[0].id, ordered_qty: 100, produced_qty: 80 },
        { line_id: plan.lines[1].id, ordered_qty: 50, produced_qty: 25 },
      ],
      user,
    );
    expect(updated.total_ordered_qty).toBe(150);
    expect(updated.total_produced_qty).toBe(105);
    expect(updated.fulfillment_pct).toBeCloseTo(70, 1);
  });

  it('runs capacity check stub and persists status', () => {
    const plan = createProductionPlan(baseInput, user);
    const result = runCapacityCheck(plan);
    // Line 2 has planned_qty=50 / max_batch_size=1 → 50 batches > 30 → warn
    expect(result.status).toBe('warn');
    const applied = applyCapacityCheck(plan, user);
    expect(applied.capacity_check_status).toBe('warn');
    expect(applied.capacity_warnings.length).toBeGreaterThan(0);
  });

  it('links a production order to a plan (M:N · D-551 · Q14=a)', () => {
    const plan = createProductionPlan(baseInput, user);
    const linked = linkProductionOrder(plan, 'po-xyz', user);
    expect(linked.linked_production_order_ids).toContain('po-xyz');
    // Idempotent
    const again = linkProductionOrder(linked, 'po-xyz', user);
    expect(again.linked_production_order_ids.length).toBe(1);
    const fetched = getProductionPlanById('e1', plan.id);
    expect(fetched?.linked_production_order_ids).toContain('po-xyz');
  });
});
