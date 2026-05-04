/**
 * weighbridge-engine.test.ts — Sprint 4-pre-2 · Block A
 * 4 tests covering create + state machine + net computation.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  createTicket, weighIn, weighOut, closeTicket,
} from '@/lib/weighbridge-engine';

const ENTITY = 'WBTEST';

beforeEach(() => {
  localStorage.clear();
});

describe('weighbridge-engine', () => {
  it('createTicket creates ticket with status=pending_in and WB/ prefix', async () => {
    const t = await createTicket({
      gate_pass_id: 'gp-1', gate_pass_no: 'GP/X/26-27/0001',
      direction: 'inward', vehicle_no: 'ka-01-ab-1234',
    }, ENTITY, 'mock-user');
    expect(t.status).toBe('pending_in');
    expect(t.ticket_no).toMatch(/^WB\//);
    expect(t.vehicle_no).toBe('KA-01-AB-1234');
    expect(t.direction).toBe('inward');
  });

  it('weighIn transitions pending_in → pending_out and computes net_in_kg', async () => {
    const t = await createTicket({
      gate_pass_id: 'gp-1', gate_pass_no: 'GP/X/26-27/0001',
      direction: 'inward', vehicle_no: 'KA-01-AB-1234',
    }, ENTITY, 'u');
    const after = await weighIn({
      ticket_id: t.id, gross_in_kg: 8500, tare_in_kg: 5500,
    }, ENTITY, 'u');
    expect(after?.status).toBe('pending_out');
    expect(after?.gross_in_kg).toBe(8500);
    expect(after?.net_in_kg).toBe(3000);
    expect(after?.weighed_in_at).toBeDefined();
  });

  it('weighOut transitions pending_out → weighed_out and computes net_dispatched_kg', async () => {
    const t = await createTicket({
      gate_pass_id: 'gp-2', gate_pass_no: 'GP/X/26-27/0002',
      direction: 'inward', vehicle_no: 'KA-02-CD-5678',
    }, ENTITY, 'u');
    await weighIn({ ticket_id: t.id, gross_in_kg: 8500, tare_in_kg: 5500 }, ENTITY, 'u');
    const out = await weighOut({ ticket_id: t.id, gross_out_kg: 5500 }, ENTITY, 'u');
    expect(out?.status).toBe('weighed_out');
    expect(out?.net_dispatched_kg).toBe(3000); // |5500 - 8500| = 3000
  });

  it('weighIn from invalid status (closed) throws', async () => {
    const t = await createTicket({
      gate_pass_id: 'gp-3', gate_pass_no: 'GP/X/26-27/0003',
      direction: 'inward', vehicle_no: 'KA-03-EF-9999',
    }, ENTITY, 'u');
    await weighIn({ ticket_id: t.id, gross_in_kg: 8000, tare_in_kg: 5000 }, ENTITY, 'u');
    await weighOut({ ticket_id: t.id, gross_out_kg: 5000 }, ENTITY, 'u');
    await closeTicket({ ticket_id: t.id }, ENTITY, 'u');
    await expect(
      weighIn({ ticket_id: t.id, gross_in_kg: 100, tare_in_kg: 50 }, ENTITY, 'u'),
    ).rejects.toThrow(/Invalid transition/);
  });
});
