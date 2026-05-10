/**
 * @file src/test/capa-engine.test.ts
 * @purpose 6 NEW Vitest cases for capa-engine · raise · raiseFromNcr · close (effective/ineffective) · 8D step · verification
 * @sprint T-Phase-1.A.5.b-QualiCheck-CAPA-MTC-FAI
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  raiseCapa, raiseCapaFromNcr, updateEightDStep,
  recordVerification, closeCapa,
} from '@/lib/capa-engine';
import { raiseNcr, getNcrById } from '@/lib/ncr-engine';
import { capaKey } from '@/types/capa';
import { ncrKey } from '@/types/ncr';

const E = 'TEST_SMRT';
const U = 'test_user';

describe('capa-engine', () => {
  beforeEach(() => {
    localStorage.removeItem(capaKey(E));
    localStorage.removeItem(ncrKey(E));
  });

  it('raiseCapa creates CAPA with 8 EightDSteps pending and 3 verifications scheduled (30/60/90)', () => {
    const capa = raiseCapa(E, U, {
      entity_id: E,
      source: 'preventive_only',
      severity: 'minor',
      title: 'Pre-emptive review',
    });
    expect(capa.id).toMatch(/^CAPA-/);
    expect(capa.eight_d_steps).toHaveLength(8);
    expect(capa.eight_d_steps.every((s) => s.status === 'pending')).toBe(true);
    expect(capa.verifications).toHaveLength(3);
    expect(capa.verifications.map((v) => v.milestone)).toEqual([30, 60, 90]);
    expect(capa.audit_log[0].action).toBe('raise');
    expect(capa.raised_by).toBe(U);
  });

  it('raiseCapaFromNcr sets related_ncr_id and transitions NCR to capa_pending', () => {
    const ncr = raiseNcr(E, U, {
      entity_id: E, source: 'iqc', severity: 'major',
      description: 'Surface defect',
    });
    const capa = raiseCapaFromNcr(E, U, ncr.id, {
      entity_id: E, severity: 'major', title: 'Investigate surface defect',
    });
    expect(capa).not.toBeNull();
    expect(capa!.related_ncr_id).toBe(ncr.id);
    const refreshed = getNcrById(E, ncr.id);
    expect(refreshed!.status).toBe('capa_pending');
  });

  it('closeCapa effective emits event but leaves NCR in capa_pending (human-ack required)', () => {
    const ncr = raiseNcr(E, U, { entity_id: E, source: 'iqc', severity: 'major', description: 'x' });
    const capa = raiseCapaFromNcr(E, U, ncr.id, { entity_id: E, severity: 'major', title: 't' })!;
    closeCapa(E, U, capa.id, 'effective');
    const refreshed = getNcrById(E, ncr.id);
    expect(refreshed!.status).toBe('capa_pending');
  });

  it('closeCapa ineffective_re_open_ncr transitions NCR back to investigating', () => {
    const ncr = raiseNcr(E, U, { entity_id: E, source: 'iqc', severity: 'major', description: 'x' });
    const capa = raiseCapaFromNcr(E, U, ncr.id, { entity_id: E, severity: 'major', title: 't' })!;
    closeCapa(E, U, capa.id, 'ineffective_re_open_ncr');
    const refreshed = getNcrById(E, ncr.id);
    expect(refreshed!.status).toBe('investigating');
  });

  it('updateEightDStep advances step status and appends audit log entry', () => {
    const capa = raiseCapa(E, U, { entity_id: E, source: 'audit', severity: 'minor', title: 't' });
    const updated = updateEightDStep(E, U, capa.id, 1, {
      status: 'complete',
      completed_by: U,
      completed_at: new Date().toISOString(),
    });
    expect(updated!.eight_d_steps[0].status).toBe('complete');
    expect(updated!.audit_log.find((a) => a.action === 'update_step')).toBeDefined();
  });

  it('recordVerification flips effective flag and appends audit entry', () => {
    const capa = raiseCapa(E, U, { entity_id: E, source: 'audit', severity: 'minor', title: 't' });
    const updated = recordVerification(E, U, capa.id, 30, true, 'visual inspection passed');
    const v30 = updated!.verifications.find((v) => v.milestone === 30)!;
    expect(v30.effective).toBe(true);
    expect(v30.verified_by).toBe(U);
    expect(v30.evidence).toBe('visual inspection passed');
  });
});
