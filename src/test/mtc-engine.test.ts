/**
 * @file src/test/mtc-engine.test.ts
 * @purpose Unit coverage for MTC engine · evaluateParameter · deriveOverall · createMtc · transitionMtc
 * @sprint T-Phase-1.A.5.b-Qulicheak-CAPA-MTC-FAI
 */
import { beforeEach, describe, expect, it } from 'vitest';
import {
  createMtc, transitionMtc, filterMtcs,
  evaluateParameter, deriveOverall, listMtcs,
} from '@/lib/mtc-engine';
import { mtcKey, type MtcParameter } from '@/types/mtc';

const ENTITY = 'TEST_MTC';
const USER = 'u-test';

beforeEach(() => {
  localStorage.removeItem(mtcKey(ENTITY));
});

function baseDraft(parameters: MtcParameter[]) {
  return {
    entity_id: ENTITY,
    branch_id: null,
    certificate_no: 'CERT-001',
    issue_date: '2026-05-01',
    supplier_name: 'Acme Steel',
    related_party_id: 'V-001',
    related_grn_id: 'GRN-001',
    item_id: 'I-001',
    item_name: 'MS Plate 10mm',
    lot_no: 'LOT-A',
    heat_no: 'H-9921',
    parameters,
    notes: null,
  };
}

describe('mtc-engine · evaluateParameter', () => {
  it('returns pass when within spec', () => {
    expect(evaluateParameter({
      name: 'Tensile', unit: 'MPa', spec_min: 400, spec_max: 550,
      observed: '480', observed_numeric: 480, status: 'na',
    })).toBe('pass');
  });

  it('returns fail when below spec_min', () => {
    expect(evaluateParameter({
      name: 'Tensile', spec_min: 400, spec_max: 550,
      observed: '350', observed_numeric: 350, status: 'na',
    })).toBe('fail');
  });

  it('preserves explicit pass for non-numeric observed', () => {
    expect(evaluateParameter({
      name: 'Visual', observed: 'OK', observed_numeric: null, status: 'pass',
    })).toBe('pass');
  });
});

describe('mtc-engine · deriveOverall · createMtc · transitionMtc', () => {
  it('createMtc sets overall=pass when all pass', () => {
    const m = createMtc(ENTITY, USER, baseDraft([
      { name: 'YS', spec_min: 250, spec_max: 400, observed: '300', observed_numeric: 300, status: 'na' },
    ]));
    expect(m.overall).toBe('pass');
    expect(m.status).toBe('submitted');
    expect(listMtcs(ENTITY)).toHaveLength(1);
  });

  it('createMtc sets overall=fail when any param fails', () => {
    const m = createMtc(ENTITY, USER, baseDraft([
      { name: 'YS', spec_min: 250, spec_max: 400, observed: '200', observed_numeric: 200, status: 'na' },
      { name: 'Hardness', spec_min: 150, spec_max: 200, observed: '170', observed_numeric: 170, status: 'na' },
    ]));
    expect(m.overall).toBe('fail');
  });

  it('deriveOverall returns conditional for all-na params', () => {
    expect(deriveOverall([
      { name: 'X', observed: '-', status: 'na' },
    ])).toBe('conditional');
  });

  it('transitionMtc approve stamps approved_at/by', () => {
    const m = createMtc(ENTITY, USER, baseDraft([
      { name: 'YS', spec_min: 250, spec_max: 400, observed: '300', observed_numeric: 300, status: 'na' },
    ]));
    const updated = transitionMtc(ENTITY, USER, m.id, 'approved', 'OK');
    expect(updated?.status).toBe('approved');
    expect(updated?.approved_by).toBe(USER);
    expect(updated?.approved_at).toBeTruthy();
  });

  it('filterMtcs by overall=fail isolates failures', () => {
    createMtc(ENTITY, USER, baseDraft([
      { name: 'YS', spec_min: 250, spec_max: 400, observed: '300', observed_numeric: 300, status: 'na' },
    ]));
    createMtc(ENTITY, USER, baseDraft([
      { name: 'YS', spec_min: 250, spec_max: 400, observed: '100', observed_numeric: 100, status: 'na' },
    ]));
    const fails = filterMtcs(ENTITY, { overall: ['fail'] });
    expect(fails).toHaveLength(1);
    expect(fails[0].overall).toBe('fail');
  });
});
