/**
 * @file src/test/fai-engine.test.ts
 * @purpose Unit coverage for FAI engine · evaluateDimension · recomputeOverallStatus · createFai · approveFai
 * @sprint T-Phase-1.A.5.b-QualiCheck-CAPA-MTC-FAI
 */
import { beforeEach, describe, expect, it } from 'vitest';
import {
  createFai, transitionFai, approveFai, filterFais,
  evaluateDimension, recomputeOverallStatus, listFais,
} from '@/lib/fai-engine';
import { faiKey, type FaiDimension } from '@/types/fai';

const ENTITY = 'TEST_FAI';
const USER = 'u-test';

beforeEach(() => {
  localStorage.removeItem(faiKey(ENTITY));
});

function baseDraft(dimensions: FaiDimension[]) {
  return {
    entity_id: ENTITY,
    branch_id: null,
    part_no: 'P-001',
    part_name: 'Bracket Assembly',
    drawing_no: 'DRW-9921',
    drawing_rev: 'A',
    related_party_id: 'V-001',
    supplier_name: 'Acme Mfg',
    related_po_id: 'PO-001',
    related_production_order_id: null,
    sample_qty: 5,
    inspection_date: '2026-05-09',
    dimensions,
    notes: null,
  };
}

describe('fai-engine · evaluateDimension', () => {
  it('returns pass when within nominal ± tolerance', () => {
    expect(evaluateDimension({
      name: 'OD', unit: 'mm', nominal: 50, tol_minus: 0.1, tol_plus: 0.1,
      observed: '50.05', observed_numeric: 50.05, status: 'na',
    })).toBe('pass');
  });

  it('returns fail when out of tolerance', () => {
    expect(evaluateDimension({
      name: 'OD', nominal: 50, tol_minus: 0.1, tol_plus: 0.1,
      observed: '50.20', observed_numeric: 50.20, status: 'na',
    })).toBe('fail');
  });
});

describe('fai-engine · recomputeOverallStatus · createFai · approveFai', () => {
  it('createFai sets overall=pass when all dims pass', () => {
    const f = createFai(ENTITY, USER, baseDraft([
      { name: 'OD', nominal: 50, tol_minus: 0.1, tol_plus: 0.1,
        observed: '50.0', observed_numeric: 50.0, status: 'na' },
    ]));
    expect(f.overall).toBe('pass');
    expect(f.status).toBe('submitted');
    expect(listFais(ENTITY)).toHaveLength(1);
  });

  it('createFai sets overall=fail when any dim fails', () => {
    const f = createFai(ENTITY, USER, baseDraft([
      { name: 'OD', nominal: 50, tol_minus: 0.1, tol_plus: 0.1,
        observed: '50.0', observed_numeric: 50.0, status: 'na' },
      { name: 'Length', nominal: 100, tol_minus: 0.5, tol_plus: 0.5,
        observed: '101.0', observed_numeric: 101.0, status: 'na' },
    ]));
    expect(f.overall).toBe('fail');
  });

  it('recomputeOverallStatus returns conditional for all-na dims', () => {
    expect(recomputeOverallStatus([
      { name: 'Visual', observed: 'OK', status: 'na' },
    ])).toBe('conditional');
  });

  it('approveFai stamps approved_at/by and adds audit entry', () => {
    const f = createFai(ENTITY, USER, baseDraft([
      { name: 'OD', nominal: 50, tol_minus: 0.1, tol_plus: 0.1,
        observed: '50.0', observed_numeric: 50.0, status: 'na' },
    ]));
    const approved = approveFai(ENTITY, USER, f.id, 'OK to release');
    expect(approved?.status).toBe('approved');
    expect(approved?.approved_by).toBe(USER);
    expect(approved?.approved_at).toBeTruthy();
    expect(approved?.audit_log.at(-1)?.action).toBe('approve');
  });

  it('transitionFai rejects archived FAI updates', () => {
    const f = createFai(ENTITY, USER, baseDraft([
      { name: 'OD', nominal: 50, tol_minus: 0.1, tol_plus: 0.1,
        observed: '50.0', observed_numeric: 50.0, status: 'na' },
    ]));
    transitionFai(ENTITY, USER, f.id, 'archived');
    const reopened = transitionFai(ENTITY, USER, f.id, 'approved');
    expect(reopened).toBeNull();
  });

  it('filterFais by overall=fail isolates failures', () => {
    createFai(ENTITY, USER, baseDraft([
      { name: 'OD', nominal: 50, tol_minus: 0.1, tol_plus: 0.1,
        observed: '50.0', observed_numeric: 50.0, status: 'na' },
    ]));
    createFai(ENTITY, USER, baseDraft([
      { name: 'OD', nominal: 50, tol_minus: 0.1, tol_plus: 0.1,
        observed: '52.0', observed_numeric: 52.0, status: 'na' },
    ]));
    const fails = filterFais(ENTITY, { overall: ['fail'] });
    expect(fails).toHaveLength(1);
    expect(fails[0].overall).toBe('fail');
  });
});
