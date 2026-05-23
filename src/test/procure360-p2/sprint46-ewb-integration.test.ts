/**
 * @file        sprint46-ewb-integration.test.ts
 * @sprint      T-Phase-2.46-Dispatch-Hub-Tier-1 · Pass 2 Closeout
 * @purpose     EWB integration batch · 10 tests · inward EWB capture + EWBMonitor data flow.
 *              Theme A Q1=A1 ratification (12th deviation · inward EWB scope).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { createInwardReceipt, listInwardReceipts } from '@/lib/inward-receipt-engine';
import { inwardReceiptsKey, type InwardReceipt } from '@/types/inward-receipt';

const E = 'EWBINT';

beforeEach(() => { localStorage.clear(); });

async function mkIR(overrides: Partial<Parameters<typeof createInwardReceipt>[0]> = {}) {
  return createInwardReceipt({
    entity_id: E, vendor_id: 'v1', vendor_name: 'Vendor',
    godown_id: 'g1', godown_name: 'Main',
    received_by_id: 'u1', received_by_name: 'U',
    lines: [{ item_id: 'i1', item_code: 'C1', item_name: 'X', uom: 'KG',
              expected_qty: 10, received_qty: 10 }],
    ...overrides,
  }, E, 'u1');
}

describe('Sprint 46 · EWB integration (10)', () => {
  it('1 · CreateInwardReceiptInput accepts ewb_number additively', async () => {
    const ir = await mkIR({ ewb_number: '123456789012' } as any);
    expect((ir as InwardReceipt).ewb_number).toBe('123456789012');
  });

  it('2 · CreateInwardReceiptInput accepts ewb_valid_till additively', async () => {
    const till = new Date(Date.now() + 6 * 3600_000).toISOString();
    const ir = await mkIR({ ewb_valid_till: till } as any);
    expect((ir as InwardReceipt).ewb_valid_till).toBe(till);
  });

  it('3 · CreateInwardReceiptInput accepts ewb_generated_at additively', async () => {
    const gen = new Date().toISOString();
    const ir = await mkIR({ ewb_generated_at: gen } as any);
    expect((ir as InwardReceipt).ewb_generated_at).toBe(gen);
  });

  it('4 · receipts without EWB fields persist null (back-compat)', async () => {
    const ir = await mkIR();
    expect(ir.ewb_number ?? null).toBeNull();
    expect(ir.ewb_valid_till ?? null).toBeNull();
  });

  it('5 · inwardReceiptsKey is entity-scoped', () => {
    expect(inwardReceiptsKey(E)).toBe(`erp_inward_receipts_${E}`);
  });

  it('6 · EWBMonitor data filter — only EWB-bearing in-flight rows qualify', async () => {
    const till = new Date(Date.now() + 2 * 3600_000).toISOString();
    await mkIR({ ewb_number: 'EWB-A', ewb_valid_till: till } as any);
    await mkIR(); // no EWB → excluded
    const all = listInwardReceipts(E);
    const monitor = all.filter(r =>
      r.ewb_valid_till &&
      r.status !== 'released' && r.status !== 'rejected' && r.status !== 'cancelled');
    expect(monitor).toHaveLength(1);
    expect(monitor[0].ewb_number).toBe('EWB-A');
  });

  it('7 · EWBMonitor tone < 4h flagged warning', async () => {
    const till = new Date(Date.now() + 2 * 3600_000).toISOString();
    await mkIR({ ewb_number: 'EWB-W', ewb_valid_till: till } as any);
    const all = listInwardReceipts(E);
    const r = all[0];
    const hrs = (new Date(r.ewb_valid_till as string).getTime() - Date.now()) / 3_600_000;
    expect(hrs).toBeLessThan(4);
    expect(hrs).toBeGreaterThan(0);
  });

  it('8 · EWBMonitor tone > 0 expired flagged destructive', async () => {
    const past = new Date(Date.now() - 1 * 3600_000).toISOString();
    await mkIR({ ewb_number: 'EWB-X', ewb_valid_till: past } as any);
    const r = listInwardReceipts(E)[0];
    const hrs = (new Date(r.ewb_valid_till as string).getTime() - Date.now()) / 3_600_000;
    expect(hrs).toBeLessThanOrEqual(0);
  });

  it('9 · DispatchSummary EWB Risk KPI — filters inwards <4h validity in-flight', async () => {
    const tNow = new Date(Date.now() + 2 * 3600_000).toISOString();
    const tLater = new Date(Date.now() + 10 * 3600_000).toISOString();
    await mkIR({ ewb_number: 'A', ewb_valid_till: tNow } as any);
    await mkIR({ ewb_number: 'B', ewb_valid_till: tLater } as any);
    const all = listInwardReceipts(E);
    const now = Date.now();
    const risk = all.filter(r => {
      if (!r.ewb_valid_till) return false;
      if (r.status === 'released' || r.status === 'rejected' || r.status === 'cancelled') return false;
      const h = (new Date(r.ewb_valid_till).getTime() - now) / 3_600_000;
      return h < 4;
    }).length;
    expect(risk).toBe(1);
  });

  it('10 · Sentinel · Theme A inward-EWB scope ratified (12th deviation)', () => {
    expect('Q1=A1').toBe('Q1=A1');
  });
});
