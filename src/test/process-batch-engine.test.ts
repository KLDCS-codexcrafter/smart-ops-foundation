import { describe, it, expect, beforeEach } from 'vitest';
import {
  createProcessBatch,
  startProcessBatch,
  completeProcessBatch,
  listProcessBatches,
  canProcessTransition,
} from '@/lib/process-batch-engine';

describe('process-batch-engine · Sprint 60 PROD-3.5 ST3', () => {
  const E = 'TEST';
  const USER = { id: 'u1', name: 'Test User' };

  beforeEach(() => {
    localStorage.clear();
  });

  it('createProcessBatch creates a batch in draft status', () => {
    const b = createProcessBatch({
      entity_id: E,
      batch_no: 'B-TEST-001',
      recipe_id: 'r-1',
      recipe_name: 'Test Recipe',
      recipe_version: '1.0.0',
      planned_yield: 1000,
      yield_uom: 'kg',
    }, USER);
    expect(b.status).toBe('draft');
    expect(b.batch_no).toBe('B-TEST-001');
    expect(b.planned_yield).toBe(1000);
  });

  it('startProcessBatch transitions draft → running', () => {
    const b = createProcessBatch({
      entity_id: E, batch_no: 'B-002', recipe_id: 'r-1', recipe_name: 'R', recipe_version: '1.0.0',
      planned_yield: 500, yield_uom: 'kg',
    }, USER);
    const started = startProcessBatch(E, b.id, USER);
    expect(started.status).toBe('running');
    expect(started.start_time).not.toBeNull();
  });

  it('completeProcessBatch transitions running → completed with yield variance', () => {
    const b = createProcessBatch({
      entity_id: E, batch_no: 'B-003', recipe_id: 'r-1', recipe_name: 'R', recipe_version: '1.0.0',
      planned_yield: 1000, yield_uom: 'kg',
    }, USER);
    startProcessBatch(E, b.id, USER);
    const c = completeProcessBatch(E, b.id, { actual_yield: 950 }, USER);
    expect(c.status).toBe('completed');
    expect(c.actual_yield).toBe(950);
    expect(c.yield_variance).toBeCloseTo(-5, 1);
  });

  it('canProcessTransition validates 8-state machine', () => {
    expect(canProcessTransition('draft', 'running')).toBe(true);
    expect(canProcessTransition('completed', 'running')).toBe(false);
    expect(canProcessTransition('running', 'completed')).toBe(true);
    expect(canProcessTransition('cancelled', 'running')).toBe(false);
  });

  it('listProcessBatches returns batches in newest-first order', () => {
    createProcessBatch({
      entity_id: E, batch_no: 'B-A', recipe_id: 'r-1', recipe_name: 'R', recipe_version: '1.0.0',
      planned_yield: 100, yield_uom: 'kg',
    }, USER);
    createProcessBatch({
      entity_id: E, batch_no: 'B-B', recipe_id: 'r-1', recipe_name: 'R', recipe_version: '1.0.0',
      planned_yield: 100, yield_uom: 'kg',
    }, USER);
    const list = listProcessBatches(E);
    expect(list.length).toBe(2);
    expect(list[0].batch_no).toBe('B-B');
  });

  it('rejects double-start of running batch', () => {
    const b = createProcessBatch({
      entity_id: E, batch_no: 'B-D', recipe_id: 'r-1', recipe_name: 'R', recipe_version: '1.0.0',
      planned_yield: 100, yield_uom: 'kg',
    }, USER);
    startProcessBatch(E, b.id, USER);
    expect(() => startProcessBatch(E, b.id, USER)).toThrow();
  });

  it('storage key pattern is entity-scoped', () => {
    createProcessBatch({
      entity_id: E, batch_no: 'B-E', recipe_id: 'r-1', recipe_name: 'R', recipe_version: '1.0.0',
      planned_yield: 100, yield_uom: 'kg',
    }, USER);
    expect(localStorage.getItem(`process_batches_${E}`)).not.toBeNull();
    expect(localStorage.getItem(`process_batches_OTHER`)).toBeNull();
  });

  it('completes batch with by_products and co_products', () => {
    const b = createProcessBatch({
      entity_id: E, batch_no: 'B-F', recipe_id: 'r-1', recipe_name: 'R', recipe_version: '1.0.0',
      planned_yield: 100, yield_uom: 'kg',
    }, USER);
    startProcessBatch(E, b.id, USER);
    const c = completeProcessBatch(E, b.id, {
      actual_yield: 95,
      by_products: [{ item_id: 'bp-1', item_name: 'Glycerol', qty: 10, uom: 'kg', revenue_credit_per_uom: 50, total_revenue_credit: 500 }],
    }, USER);
    expect(c.by_products.length).toBe(1);
    expect(c.by_products[0].total_revenue_credit).toBe(500);
  });
});
