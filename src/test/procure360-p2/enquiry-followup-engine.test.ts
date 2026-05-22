import { describe, it, expect, beforeEach } from 'vitest';
import * as Engine from '@/lib/enquiry-followup-engine';

describe('enquiry-followup-engine · D-NEW-GA · 45b-i Block F', () => {
  beforeEach(() => { localStorage.clear(); });

  it('exports core API', () => {
    expect(typeof Engine.initiateCascade).toBe('function');
    expect(typeof Engine.scanAndAdvanceCascades).toBe('function');
    expect(typeof Engine.markVendorResponded).toBe('function');
    expect(typeof Engine.triggerAlternate).toBe('function');
    expect(typeof Engine.listActiveCascades).toBe('function');
    expect(typeof Engine.summarizeCascades).toBe('function');
  });

  it('initiateCascade persists with 3-5-7 day pattern', () => {
    const c = Engine.initiateCascade('e1', 'enq1', 'v1', 'Acme', new Date('2026-01-01'));
    expect(c.enquiry_id).toBe('enq1');
    expect(c.vendor_id).toBe('v1');
    expect(c.current_stage).toBe('initial');
    expect(new Date(c.day_3_reminder_due).getDate()).toBe(4);
    expect(new Date(c.day_5_reminder_due).getDate()).toBe(6);
    expect(new Date(c.day_7_escalation_due).getDate()).toBe(8);
  });

  it('scanAndAdvanceCascades advances through stages', () => {
    Engine.initiateCascade('e1', 'enq1', 'v1', 'Acme', new Date('2026-01-01'));
    const r1 = Engine.scanAndAdvanceCascades('e1', new Date('2026-01-04'));
    expect(r1.advanced.length).toBe(1);
    expect(r1.advanced[0].current_stage).toBe('reminder_1');

    const r2 = Engine.scanAndAdvanceCascades('e1', new Date('2026-01-06'));
    expect(r2.advanced[0].current_stage).toBe('reminder_2');

    const r3 = Engine.scanAndAdvanceCascades('e1', new Date('2026-01-09'));
    expect(r3.escalated.length).toBe(1);
    expect(r3.escalated[0].current_stage).toBe('escalation');
    expect(r3.escalated[0].result).toBe('vendor_unresponsive');
  });

  it('markVendorResponded closes cascade', () => {
    const c = Engine.initiateCascade('e1', 'enq1', 'v1', 'Acme');
    const updated = Engine.markVendorResponded('e1', c.id);
    expect(updated?.result).toBe('vendor_responded');
    expect(updated?.current_stage).toBe('closed');
  });

  it('triggerAlternate records alternate vendor', () => {
    const c = Engine.initiateCascade('e1', 'enq1', 'v1', 'Acme');
    const r = Engine.triggerAlternate('e1', c.id, 'v2');
    expect(r?.alternate_vendor_id).toBe('v2');
    expect(r?.result).toBe('alternate_triggered');
  });

  it('listActiveCascades excludes closed', () => {
    const c = Engine.initiateCascade('e1', 'enq1', 'v1', 'Acme');
    Engine.markVendorResponded('e1', c.id);
    expect(Engine.listActiveCascades('e1').length).toBe(0);
  });

  it('summarizeCascades counts buckets', () => {
    Engine.initiateCascade('e1', 'enq1', 'v1', 'Acme');
    Engine.initiateCascade('e1', 'enq2', 'v2', 'Beta');
    const s = Engine.summarizeCascades('e1');
    expect(s.total).toBe(2);
    expect(s.pending).toBe(2);
  });

  it('listCascadesForEnquiry filters by enquiry', () => {
    Engine.initiateCascade('e1', 'enq1', 'v1', 'Acme');
    Engine.initiateCascade('e1', 'enq2', 'v2', 'Beta');
    expect(Engine.listCascadesForEnquiry('e1', 'enq1').length).toBe(1);
  });

  it('scan no-op when not yet due', () => {
    Engine.initiateCascade('e1', 'enq1', 'v1', 'Acme', new Date('2026-01-01'));
    const r = Engine.scanAndAdvanceCascades('e1', new Date('2026-01-02'));
    expect(r.advanced.length).toBe(0);
  });

  it('entity-scoped persistence isolates entities', () => {
    Engine.initiateCascade('e1', 'enq1', 'v1', 'Acme');
    Engine.initiateCascade('e2', 'enq2', 'v2', 'Beta');
    expect(Engine.loadCascades('e1').length).toBe(1);
    expect(Engine.loadCascades('e2').length).toBe(1);
  });
});
