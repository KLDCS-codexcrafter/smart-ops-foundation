/**
 * gateflow-engine.test.ts — Sprint T-Phase-1.2.6f-d-2-card4-4-pre-1 · Block B
 * 5 tests covering create + state machine + queue filter + linking.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  createInwardEntry, createOutwardEntry, transitionGatePass,
  attachLinkedVoucher, listInwardQueue, listOutwardQueue, listGatePasses,
} from '@/lib/gateflow-engine';
import { gatePassesKey } from '@/types/gate-pass';

const ENTITY = 'GFTEST';

beforeEach(() => {
  localStorage.clear();
});

describe('gateflow-engine', () => {
  it('createInwardEntry creates GatePass with direction=inward and status=pending', async () => {
    const gp = await createInwardEntry({
      vehicle_no: 'ka-01-ab-1234',
      vehicle_type: 'truck',
      driver_name: 'Rajesh',
      driver_phone: '+91-9876543210',
      counterparty_name: 'Vendor X',
      purpose: 'Material receipt',
    }, ENTITY, 'mock-user');
    expect(gp.direction).toBe('inward');
    expect(gp.status).toBe('pending');
    expect(gp.vehicle_no).toBe('KA-01-AB-1234');
    expect(gp.gate_pass_no).toMatch(/^GP\//);
    expect(gp.linked_voucher_type).toBeNull();
  });

  it('createOutwardEntry creates GatePass with direction=outward and status=pending', async () => {
    const gp = await createOutwardEntry({
      vehicle_no: 'KA-02-CD-5678',
      vehicle_type: 'tempo',
      driver_name: 'Suresh',
      driver_phone: '+91-9876543211',
      counterparty_name: 'Customer Y',
      purpose: 'Dispatch',
      linked_voucher_type: 'dln',
      linked_voucher_id: 'dln-1',
      linked_voucher_no: 'DLN/X/26-27/0001',
    }, ENTITY, 'mock-user');
    expect(gp.direction).toBe('outward');
    expect(gp.status).toBe('pending');
    expect(gp.linked_voucher_type).toBe('dln');
  });

  it('transitionGatePass enforces state machine rules', async () => {
    const gp = await createInwardEntry({
      vehicle_no: 'KA-99-XX-0001', vehicle_type: 'truck',
      driver_name: 'D', driver_phone: '9999999999',
      counterparty_name: 'V', purpose: 'p',
    }, ENTITY, 'u1');

    // pending → verified allowed
    const verified = await transitionGatePass(gp.id, 'verified', ENTITY, 'u1', 'User One');
    expect(verified?.status).toBe('verified');
    expect(verified?.verified_time).toBeDefined();

    // verified → completed NOT allowed (must go via in_progress)
    await expect(
      transitionGatePass(gp.id, 'completed', ENTITY, 'u1'),
    ).rejects.toThrow(/Invalid transition/);

    // verified → in_progress → completed allowed
    await transitionGatePass(gp.id, 'in_progress', ENTITY, 'u1');
    const completed = await transitionGatePass(gp.id, 'completed', ENTITY, 'u1');
    expect(completed?.status).toBe('completed');
    expect(completed?.exit_time).toBeDefined();
  });

  it('listInwardQueue filters out completed/cancelled passes', async () => {
    const a = await createInwardEntry({
      vehicle_no: 'KA-01-A-1', vehicle_type: 'truck',
      driver_name: 'A', driver_phone: '1', counterparty_name: 'V', purpose: 'p',
    }, ENTITY, 'u');
    await createInwardEntry({
      vehicle_no: 'KA-01-A-2', vehicle_type: 'truck',
      driver_name: 'B', driver_phone: '2', counterparty_name: 'V', purpose: 'p',
    }, ENTITY, 'u');
    await createOutwardEntry({
      vehicle_no: 'KA-01-A-3', vehicle_type: 'truck',
      driver_name: 'C', driver_phone: '3', counterparty_name: 'C', purpose: 'p',
    }, ENTITY, 'u');

    // Move first inward to completed
    await transitionGatePass(a.id, 'verified', ENTITY, 'u');
    await transitionGatePass(a.id, 'in_progress', ENTITY, 'u');
    await transitionGatePass(a.id, 'completed', ENTITY, 'u');

    const inward = listInwardQueue(ENTITY);
    expect(inward.length).toBe(1);
    expect(inward.every(gp => gp.direction === 'inward')).toBe(true);
    expect(inward.every(gp => gp.status !== 'completed' && gp.status !== 'cancelled')).toBe(true);

    const outward = listOutwardQueue(ENTITY);
    expect(outward.length).toBe(1);
    expect(listGatePasses(ENTITY).length).toBe(3);
  });

  it('attachLinkedVoucher updates linked_voucher fields on existing pass', async () => {
    const gp = await createInwardEntry({
      vehicle_no: 'KA-77-LL-7777', vehicle_type: 'truck',
      driver_name: 'D', driver_phone: '9', counterparty_name: 'V', purpose: 'p',
    }, ENTITY, 'u');
    expect(gp.linked_voucher_type).toBeNull();

    const updated = await attachLinkedVoucher({
      gate_pass_id: gp.id,
      linked_voucher_type: 'git_stage1',
      linked_voucher_id: 'git-1',
      linked_voucher_no: 'GIT/X/26-27/0001',
    }, ENTITY);

    expect(updated?.linked_voucher_type).toBe('git_stage1');
    expect(updated?.linked_voucher_id).toBe('git-1');
    expect(updated?.linked_voucher_no).toBe('GIT/X/26-27/0001');

    // Persisted in localStorage
    const raw = localStorage.getItem(gatePassesKey(ENTITY));
    expect(raw).toContain('git_stage1');
  });
});
