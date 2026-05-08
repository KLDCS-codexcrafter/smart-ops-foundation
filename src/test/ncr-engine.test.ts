/**
 * @file src/test/ncr-engine.test.ts
 * @purpose 6 NEW Vitest cases for ncr-engine · raise · close · transition · filter
 * @sprint T-Phase-1.A.5.a-bis-Qulicheak-NCR-Foundation
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { raiseNcr, closeNcr, transitionNcr, filterNcrs, listNcrs } from '@/lib/ncr-engine';
import { ncrKey } from '@/types/ncr';

const E = 'TEST';
const U = 'user-1';

describe('ncr-engine', () => {
  beforeEach(() => {
    localStorage.removeItem(ncrKey(E));
  });

  it('raiseNcr creates NCR with audit log entry', () => {
    const ncr = raiseNcr(E, U, {
      entity_id: E,
      source: 'iqc',
      severity: 'major',
      description: 'Lot failed dimensional check',
    });
    expect(ncr.id).toMatch(/^NCR-/);
    expect(ncr.status).toBe('open');
    expect(ncr.audit_log).toHaveLength(1);
    expect(ncr.audit_log[0].action).toBe('raise');
    expect(ncr.audit_log[0].by).toBe(U);
    expect(listNcrs(E)).toHaveLength(1);
  });

  it('raiseNcr emits recordActivity with kind=voucher', async () => {
    const mod = await import('@/lib/cross-card-activity-engine');
    const spy = vi.spyOn(mod, 'recordActivity');
    raiseNcr(E, U, { entity_id: E, source: 'iqc', severity: 'minor', description: 'x' });
    expect(spy).toHaveBeenCalled();
    const call = spy.mock.calls[0];
    expect(call[2].kind).toBe('voucher');
    expect(call[2].card_id).toBe('qulicheak');
    spy.mockRestore();
  });

  it('closeNcr appends audit entry + sets outcome', () => {
    const ncr = raiseNcr(E, U, { entity_id: E, source: 'iqc', severity: 'major', description: 'x' });
    const closed = closeNcr(E, U, ncr.id, 'rework');
    expect(closed?.status).toBe('closed');
    expect(closed?.outcome).toBe('rework');
    expect(closed?.closed_by).toBe(U);
    expect(closed?.audit_log).toHaveLength(2);
    expect(closed?.audit_log[1].action).toBe('close');
  });

  it('closeNcr returns null for already-closed NCR', () => {
    const ncr = raiseNcr(E, U, { entity_id: E, source: 'iqc', severity: 'major', description: 'x' });
    closeNcr(E, U, ncr.id, 'reject');
    const second = closeNcr(E, U, ncr.id, 'rework');
    expect(second).toBeNull();
  });

  it('transitionNcr respects terminal states', () => {
    const ncr = raiseNcr(E, U, { entity_id: E, source: 'iqc', severity: 'major', description: 'x' });
    closeNcr(E, U, ncr.id, 'reject');
    const after = transitionNcr(E, U, ncr.id, 'investigating');
    expect(after).toBeNull();
  });

  it('filterNcrs combines multiple predicates correctly', () => {
    raiseNcr(E, U, { entity_id: E, source: 'iqc', severity: 'minor', description: 'a' });
    raiseNcr(E, U, { entity_id: E, source: 'fg', severity: 'critical', description: 'b' });
    raiseNcr(E, U, { entity_id: E, source: 'iqc', severity: 'critical', description: 'c' });

    const r = filterNcrs(E, { source: ['iqc'], severity: ['critical'] });
    expect(r).toHaveLength(1);
    expect(r[0].description).toBe('c');
  });
});
