/**
 * Sprint 68 FAR-4 · Block 16 · fa-audit-trail-engine smoke tests
 * Covers FAR-CAP-24 (audit trail) + FAR-CAP-19 (revaluation absorbed via event-type).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  appendAuditEvent,
  getAuditTrail,
  recordRevaluation,
  daysSinceLastAudit,
  auditTrailKey,
} from '@/lib/fa-audit-trail-engine';

const ENTITY = 'TST68A';

describe('fa-audit-trail-engine · append-only trail + revaluation', () => {
  beforeEach(() => localStorage.clear());

  it('appendAuditEvent persists with generated event_id + timestamp', () => {
    const e = appendAuditEvent(ENTITY, 'a1', {
      asset_unit_record_id: 'a1',
      event_type: 'verification',
      actor: 'tester',
    });
    expect(e.event_id).toMatch(/^evt_/);
    expect(e.timestamp).toBeDefined();
  });

  it('getAuditTrail returns events in append order', () => {
    appendAuditEvent(ENTITY, 'a2', { asset_unit_record_id: 'a2', event_type: 'creation', actor: 'system' });
    appendAuditEvent(ENTITY, 'a2', { asset_unit_record_id: 'a2', event_type: 'modification', actor: 'tester' });
    const trail = getAuditTrail(ENTITY, 'a2');
    expect(trail.length).toBe(2);
    expect(trail[0].event_type).toBe('creation');
  });

  it('recordRevaluation emits revaluation event with reserve delta', () => {
    const ev = recordRevaluation(ENTITY, 'a3', {
      old_book_value: 100000,
      new_book_value: 150000,
      method: 'fair_value',
      actor: 'cfo',
    });
    expect(ev.event_type).toBe('revaluation');
    expect((ev as { revaluation_reserve_delta: number }).revaluation_reserve_delta).toBe(50000);
  });

  it('daysSinceLastAudit returns number for asset with events', () => {
    appendAuditEvent(ENTITY, 'a4', { asset_unit_record_id: 'a4', event_type: 'verification', actor: 't' });
    expect(daysSinceLastAudit(ENTITY, 'a4')).toBeGreaterThanOrEqual(0);
  });

  it('auditTrailKey is entity+asset scoped', () => {
    expect(auditTrailKey(ENTITY, 'a5')).toContain(ENTITY);
    expect(auditTrailKey(ENTITY, 'a5')).toContain('a5');
  });
});
