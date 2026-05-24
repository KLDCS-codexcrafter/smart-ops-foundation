import { describe, it, expect, beforeEach } from 'vitest';
import {
  buildGenealogy,
  traceUpstream,
  traceDownstream,
  exportFDAGenealogy,
} from '@/lib/process-genealogy-engine';
import { createProcessBatch, completeProcessBatch, startProcessBatch } from '@/lib/process-batch-engine';

describe('process-genealogy-engine · Sprint 60 PROD-3.5 ST7', () => {
  const E = 'TEST';
  const USER = { id: 'u1', name: 'U' };

  beforeEach(() => { localStorage.clear(); });

  it('buildGenealogy creates tree with root batch', () => {
    const b = createProcessBatch({
      entity_id: E, batch_no: 'B-1', recipe_id: 'r1', recipe_name: 'R', recipe_version: '1.0.0',
      planned_yield: 100, yield_uom: 'kg',
    }, USER);
    const tree = buildGenealogy(E, b.id);
    expect(tree.root_id).toBe(b.id);
    expect(tree.nodes[b.id]).toBeDefined();
  });

  it('traceUpstream returns empty for new batch with no raw lots', () => {
    const b = createProcessBatch({
      entity_id: E, batch_no: 'B-2', recipe_id: 'r1', recipe_name: 'R', recipe_version: '1.0.0',
      planned_yield: 100, yield_uom: 'kg',
    }, USER);
    const tree = buildGenealogy(E, b.id);
    const up = traceUpstream(tree, b.id);
    expect(up).toEqual([]);
  });

  it('traceDownstream returns empty for in-flight batch', () => {
    const b = createProcessBatch({
      entity_id: E, batch_no: 'B-3', recipe_id: 'r1', recipe_name: 'R', recipe_version: '1.0.0',
      planned_yield: 100, yield_uom: 'kg',
    }, USER);
    const tree = buildGenealogy(E, b.id);
    const down = traceDownstream(tree, b.id);
    expect(down).toEqual([]);
  });

  it('exportFDAGenealogy returns FDA-format object', () => {
    const b = createProcessBatch({
      entity_id: E, batch_no: 'B-FDA-1', recipe_id: 'r1', recipe_name: 'Aspirin', recipe_version: '1.0.0',
      planned_yield: 100, yield_uom: 'kg',
    }, USER);
    startProcessBatch(E, b.id, USER);
    completeProcessBatch(E, b.id, { actual_yield: 98 }, USER);
    const tree = buildGenealogy(E, b.id);
    const exp = exportFDAGenealogy(tree, {
      entityCode: E,
      facility_name: 'Test Plant',
      facility_registration_no: 'REG-1',
      product_code: 'P-ASP',
      product_name: 'Aspirin',
      manufacturing_date: '2026-05-24',
      expiry_date: '2027-05-24',
      released_by: 'QA',
      released_at: '2026-05-24',
      exported_by: 'U',
    });
    expect(exp.batch_no).toBe('B-FDA-1');
    expect(exp.product_name).toBe('Aspirin');
    expect(exp.facility_name).toBe('Test Plant');
  });
});
