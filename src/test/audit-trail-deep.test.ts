/**
 * audit-trail-deep.test.ts — Sprint T-Phase-1.2.5h-c1 · M-1
 * Deep coverage beyond z14-A23: filters, append-only, MCA Rule 3(1).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { logAudit, readAuditTrail, exportAuditTrailCsv } from '@/lib/audit-trail-engine';
import { auditTrailKey } from '@/types/audit-trail';

describe('audit-trail-engine · deep · MCA Rule 3(1)', () => {
  const ENT = 'TST';
  beforeEach(() => localStorage.clear());

  function seed(action: 'create' | 'update' | 'post' | 'cancel' = 'create', recordId = 'r1') {
    return logAudit({
      entityCode: ENT, action, entityType: 'voucher',
      recordId, recordLabel: `JV/${recordId}`,
      beforeState: action === 'create' ? null : { v: 1 },
      afterState: { v: action === 'create' ? 1 : 2 },
      sourceModule: 'finecore',
    });
  }

  it('AT1 · logAudit ALWAYS writes (no skip path)', () => {
    seed('create');
    const raw = localStorage.getItem(auditTrailKey(ENT));
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw!)).toHaveLength(1);
  });
  it('AT2 · logged entry contains all MCA-required fields', () => {
    const e = seed('create', 'r99');
    expect(e.id).toMatch(/^aud_/);
    expect(e.timestamp).toMatch(/\d{4}-\d{2}-\d{2}T/);
    expect(e.user_id).toBeTruthy();
    expect(e.entity_id).toBe(ENT);
    expect(e.action).toBe('create');
    expect(e.record_id).toBe('r99');
  });
  it('AT3 · empty entityCode falls back to UNKNOWN bucket (no silent drop)', () => {
    logAudit({
      entityCode: '', action: 'create', entityType: 'voucher',
      recordId: 'x', recordLabel: 'x', beforeState: null, afterState: {}, sourceModule: 'test',
    });
    expect(localStorage.getItem(auditTrailKey('UNKNOWN'))).toBeTruthy();
  });
  it('AT4 · readAuditTrail returns descending by timestamp', async () => {
    seed('create', 'a');
    await new Promise(r => setTimeout(r, 5));
    seed('update', 'b');
    const list = readAuditTrail(ENT);
    expect(list).toHaveLength(2);
    expect(list[0].timestamp >= list[1].timestamp).toBe(true);
  });
  it('AT5 · readAuditTrail filters by action', () => {
    seed('create', 'a'); seed('update', 'b'); seed('cancel', 'c');
    const updates = readAuditTrail(ENT, { action: 'update' });
    expect(updates).toHaveLength(1);
    expect(updates[0].action).toBe('update');
  });
  it('AT6 · readAuditTrail filters by recordId (forensic recall)', () => {
    seed('create', 'foo'); seed('update', 'bar'); seed('post', 'foo');
    const fooEntries = readAuditTrail(ENT, { recordId: 'foo' });
    expect(fooEntries).toHaveLength(2);
  });
  it('AT7 · exportAuditTrailCsv produces a header + row per entry', () => {
    seed('create', 'r1'); seed('update', 'r1');
    const csv = exportAuditTrailCsv(readAuditTrail(ENT));
    const lines = csv.split('\n');
    expect(lines[0]).toContain('Audit ID');
    expect(lines[0]).toContain('Before State (JSON)');
    expect(lines).toHaveLength(3);
  });
  it('AT8 · multiple entities use separate buckets (Q2-a isolation)', () => {
    logAudit({ entityCode: 'A1', action: 'create', entityType: 'voucher', recordId: 'x',
      recordLabel: 'x', beforeState: null, afterState: {}, sourceModule: 'test' });
    logAudit({ entityCode: 'B2', action: 'create', entityType: 'voucher', recordId: 'y',
      recordLabel: 'y', beforeState: null, afterState: {}, sourceModule: 'test' });
    expect(readAuditTrail('A1')).toHaveLength(1);
    expect(readAuditTrail('B2')).toHaveLength(1);
  });
});
