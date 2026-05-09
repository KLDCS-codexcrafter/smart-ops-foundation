import { describe, it, expect, beforeEach } from 'vitest';
import {
  createWelder, createWps, createPqr, createWpq,
  recomputeWpqStatus, listExpiringWpqs, getWpqById, approveWps,
} from '@/lib/welder-engine';

const ENTITY = 'TEST_SMRT';
const USER = 'test_user';

beforeEach(() => { localStorage.clear(); });

describe('welder-engine', () => {
  it('createWelder links to existing party_id and produces WLD- id', () => {
    const w = createWelder(ENTITY, USER, {
      entity_id: ENTITY,
      party_id: 'PARTY-001',
      full_name: 'Ravi Kumar',
      joined_at: new Date().toISOString(),
      active: true,
    });
    expect(w.party_id).toBe('PARTY-001');
    expect(w.id).toMatch(/^WLD-/);
  });

  it('createWpq requires existing welder + WPS · status starts qualified · approveWps stamps approver', () => {
    const w = createWelder(ENTITY, USER, {
      entity_id: ENTITY, party_id: 'P1', full_name: 'X',
      joined_at: new Date().toISOString(), active: true,
    });
    const wps = createWps(ENTITY, USER, {
      entity_id: ENTITY, wps_no: 'WPS-1', standard: 'asme_ix',
      processes: ['smaw'], positions: ['1G'],
      base_metal_spec: 'A36', filler_metal_spec: 'E7018',
      prepared_by: USER, prepared_at: new Date().toISOString(),
    });
    const approved = approveWps(ENTITY, USER, wps.id);
    expect(approved?.approved_by).toBe(USER);
    const wpq = createWpq(ENTITY, USER, {
      entity_id: ENTITY, wpq_no: 'WPQ-1',
      related_welder_id: w.id, related_wps_id: wps.id,
      standard: 'asme_ix', processes: ['smaw'], positions: ['1G'],
      qualified_at: new Date().toISOString(),
      qualified_through: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
      qualified_by: USER, status: 'qualified',
    });
    expect(wpq?.status).toBe('qualified');
    // PQR also needs WPS
    const pqr = createPqr(ENTITY, USER, {
      entity_id: ENTITY, pqr_no: 'PQR-1', related_wps_id: wps.id,
      test_date: new Date().toISOString(), tensile_strength_mpa: 480,
      bend_test_result: 'pass', certified_by: USER,
    });
    expect(pqr?.id).toMatch(/^PQR-/);
  });

  it('recomputeWpqStatus flips to expired when qualified_through has passed', () => {
    const w = createWelder(ENTITY, USER, {
      entity_id: ENTITY, party_id: 'P', full_name: 'Y',
      joined_at: new Date().toISOString(), active: true,
    });
    const wps = createWps(ENTITY, USER, {
      entity_id: ENTITY, wps_no: 'WPS-2', standard: 'aws_d1_1',
      processes: ['gmaw'], positions: ['2G'],
      base_metal_spec: 'A36', filler_metal_spec: 'ER70S-6',
      prepared_by: USER, prepared_at: new Date().toISOString(),
    });
    const wpq = createWpq(ENTITY, USER, {
      entity_id: ENTITY, wpq_no: 'WPQ-2',
      related_welder_id: w.id, related_wps_id: wps.id,
      standard: 'aws_d1_1', processes: ['gmaw'], positions: ['2G'],
      qualified_at: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
      qualified_through: new Date(Date.now() - 1000).toISOString(),
      qualified_by: USER, status: 'qualified',
    })!;
    const refreshed = recomputeWpqStatus(ENTITY, wpq.id);
    expect(refreshed?.status).toBe('expired');
    expect(getWpqById(ENTITY, wpq.id)?.status).toBe('expired');
  });

  it('listExpiringWpqs returns WPQs expiring within window', () => {
    const w = createWelder(ENTITY, USER, {
      entity_id: ENTITY, party_id: 'P', full_name: 'Z',
      joined_at: new Date().toISOString(), active: true,
    });
    const wps = createWps(ENTITY, USER, {
      entity_id: ENTITY, wps_no: 'WPS-3', standard: 'asme_ix',
      processes: ['gtaw'], positions: ['3G'],
      base_metal_spec: 'SS304', filler_metal_spec: 'ER308L',
      prepared_by: USER, prepared_at: new Date().toISOString(),
    });
    createWpq(ENTITY, USER, {
      entity_id: ENTITY, wpq_no: 'soon',
      related_welder_id: w.id, related_wps_id: wps.id,
      standard: 'asme_ix', processes: ['gtaw'], positions: ['3G'],
      qualified_at: new Date().toISOString(),
      qualified_through: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
      qualified_by: USER, status: 'qualified',
    });
    createWpq(ENTITY, USER, {
      entity_id: ENTITY, wpq_no: 'far',
      related_welder_id: w.id, related_wps_id: wps.id,
      standard: 'asme_ix', processes: ['gtaw'], positions: ['3G'],
      qualified_at: new Date().toISOString(),
      qualified_through: new Date(Date.now() + 200 * 24 * 60 * 60 * 1000).toISOString(),
      qualified_by: USER, status: 'qualified',
    });
    const soon30 = listExpiringWpqs(ENTITY, 30);
    expect(soon30.length).toBe(1);
    expect(soon30[0].wpq_no).toBe('soon');
  });
});
