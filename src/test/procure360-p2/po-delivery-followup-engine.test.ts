import { describe, it, expect, beforeEach } from 'vitest';
import * as Engine from '@/lib/po-delivery-followup-engine';

describe('po-delivery-followup-engine · D-NEW-GB · 45b-i Block G', () => {
  beforeEach(() => { localStorage.clear(); });

  it('exports core API', () => {
    expect(typeof Engine.initiateCascade).toBe('function');
    expect(typeof Engine.scanAndAdvanceCascades).toBe('function');
    expect(typeof Engine.markGoodsReceived).toBe('function');
    expect(typeof Engine.cancelPo).toBe('function');
    expect(typeof Engine.listActiveCascades).toBe('function');
    expect(typeof Engine.summarizeCascades).toBe('function');
    expect(Engine.VENDOR_SCORING_PENALTIES.late_day_7).toBe(-3);
    expect(Engine.VENDOR_SCORING_PENALTIES.late_day_14).toBe(-10);
  });

  it('initiateCascade computes -7/+1/+7/+14 milestones', () => {
    const eta = new Date('2026-02-01');
    const c = Engine.initiateCascade('e1', 'po1', 'PO-001', 'v1', 'Acme', eta);
    expect(new Date(c.day_minus_7_check_due).getDate()).toBe(25);
    expect(new Date(c.day_plus_1_late_due).getDate()).toBe(2);
    expect(new Date(c.day_plus_7_escalation_due).getDate()).toBe(8);
    expect(new Date(c.day_plus_14_cancel_option_due).getDate()).toBe(15);
    expect(c.current_stage).toBe('pre_delivery');
  });

  it('scanAndAdvance progresses pre→delivery_due→late_day_1', () => {
    Engine.initiateCascade('e1', 'po1', 'PO-001', 'v1', 'Acme', new Date('2026-02-01'));
    const r1 = Engine.scanAndAdvanceCascades('e1', new Date('2026-01-26'));
    expect(r1.advanced[0].current_stage).toBe('delivery_due');
    const r2 = Engine.scanAndAdvanceCascades('e1', new Date('2026-02-03'));
    expect(r2.advanced[0].current_stage).toBe('late_day_1');
  });

  it('day_+7 escalation applies vendor scoring delta', () => {
    Engine.initiateCascade('e1', 'po1', 'PO-001', 'v1', 'Acme', new Date('2026-02-01'));
    Engine.scanAndAdvanceCascades('e1', new Date('2026-02-03'));
    const r = Engine.scanAndAdvanceCascades('e1', new Date('2026-02-09'));
    expect(r.escalated.length).toBe(1);
    expect(r.scoring_deltas_applied).toBeGreaterThanOrEqual(1);
    expect(r.escalated[0].vendor_scoring_delta_applied).toBe(true);
  });

  it('markGoodsReceived closes cascade', () => {
    const c = Engine.initiateCascade('e1', 'po1', 'PO-001', 'v1', 'Acme', new Date('2026-02-01'));
    const r = Engine.markGoodsReceived('e1', c.id);
    expect(r?.current_stage).toBe('received');
    expect(r?.goods_received_at).toBeTruthy();
  });

  it('cancelPo requires late_day_14 stage', () => {
    const c = Engine.initiateCascade('e1', 'po1', 'PO-001', 'v1', 'Acme', new Date('2026-02-01'));
    expect(() => Engine.cancelPo('e1', c.id, 'demo')).toThrow();
  });

  it('cancelPo works at late_day_14', () => {
    Engine.initiateCascade('e1', 'po1', 'PO-001', 'v1', 'Acme', new Date('2026-02-01'));
    Engine.scanAndAdvanceCascades('e1', new Date('2026-02-03'));
    Engine.scanAndAdvanceCascades('e1', new Date('2026-02-09'));
    Engine.scanAndAdvanceCascades('e1', new Date('2026-02-16'));
    const c = Engine.loadCascades('e1')[0];
    const r = Engine.cancelPo('e1', c.id, 'vendor non-performance');
    expect(r?.current_stage).toBe('cancelled');
  });

  it('listActiveCascades excludes received/cancelled', () => {
    const c = Engine.initiateCascade('e1', 'po1', 'PO-001', 'v1', 'Acme', new Date('2026-02-01'));
    Engine.markGoodsReceived('e1', c.id);
    expect(Engine.listActiveCascades('e1').length).toBe(0);
  });

  it('summarizeCascades counts stage buckets', () => {
    Engine.initiateCascade('e1', 'po1', 'PO-001', 'v1', 'Acme', new Date('2026-02-01'));
    Engine.initiateCascade('e1', 'po2', 'PO-002', 'v2', 'Beta', new Date('2026-02-01'));
    const s = Engine.summarizeCascades('e1');
    expect(s.total).toBe(2);
    expect(s.pre_delivery).toBe(2);
  });

  it('entity-scoped persistence isolates entities', () => {
    Engine.initiateCascade('e1', 'po1', 'PO-001', 'v1', 'Acme', new Date('2026-02-01'));
    Engine.initiateCascade('e2', 'po2', 'PO-002', 'v2', 'Beta', new Date('2026-02-01'));
    expect(Engine.loadCascades('e1').length).toBe(1);
    expect(Engine.loadCascades('e2').length).toBe(1);
  });
});
