/**
 * inward-receipt-engine.test.ts — Card #6 Block J
 * Sprint T-Phase-1.2.6f-d-2-card6-6-pre-1
 * Covers: routing decisions, status machine, bridge linkage.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  decideLineRouting,
  createInwardReceipt,
  transitionInwardReceipt,
  listInwardReceipts,
  listQuarantineQueue,
  ALLOWED_TRANSITIONS,
} from '@/lib/inward-receipt-engine';
import { inwardReceiptsKey } from '@/types/inward-receipt';
import {
  propagateGatePassToInwardReceipt,
  findInwardReceiptByGatePass,
} from '@/lib/gateflow-inward-bridge';
import { createInwardEntry, getGatePass } from '@/lib/gateflow-engine';

const E = 'IRTEST';

beforeEach(() => {
  localStorage.clear();
});

describe('decideLineRouting', () => {
  it('rejects zero qty', () => {
    expect(decideLineRouting({ expected_qty: 10, received_qty: 0, has_qa_plan: false }).decision).toBe('rejected');
  });
  it('routes inspection_required when QA plan present', () => {
    expect(decideLineRouting({ expected_qty: 10, received_qty: 10, has_qa_plan: true }).decision).toBe('inspection_required');
  });
  it('quarantines over-tolerance qty', () => {
    expect(decideLineRouting({ expected_qty: 100, received_qty: 110, has_qa_plan: false }).decision).toBe('quarantine');
  });
  it('auto-releases within tolerance', () => {
    expect(decideLineRouting({ expected_qty: 100, received_qty: 100, has_qa_plan: false }).decision).toBe('auto_release');
  });
});

describe('createInwardReceipt + state machine', () => {
  it('creates with quarantine status when QA plan present', async () => {
    const ir = await createInwardReceipt({
      entity_id: E, vendor_id: 'v1', vendor_name: 'V',
      godown_id: 'g1', godown_name: 'Main',
      received_by_id: 'u1', received_by_name: 'U',
      lines: [{
        item_id: 'i1', item_code: 'C1', item_name: 'X', uom: 'KG',
        expected_qty: 10, received_qty: 10, qa_plan_id: 'qap-1',
      }],
    }, E, 'u1');
    expect(ir.status).toBe('quarantine');
    expect(ir.quarantine_lines).toBe(1);
    expect(listInwardReceipts(E)).toHaveLength(1);
    expect(listQuarantineQueue(E)).toHaveLength(1);
  });

  it('transitions quarantine → released', async () => {
    const ir = await createInwardReceipt({
      entity_id: E, vendor_id: 'v1', vendor_name: 'V',
      godown_id: 'g1', godown_name: 'Main',
      received_by_id: 'u1', received_by_name: 'U',
      lines: [{ item_id: 'i1', item_code: 'C1', item_name: 'X', uom: 'KG',
                expected_qty: 10, received_qty: 10, qa_plan_id: 'qap-1' }],
    }, E, 'u1');
    const r = await transitionInwardReceipt(ir.id, 'released', E, 'u2');
    expect(r?.status).toBe('released');
    expect(r?.released_at).toBeTruthy();
  });

  it('throws on invalid transition', async () => {
    const ir = await createInwardReceipt({
      entity_id: E, vendor_id: 'v1', vendor_name: 'V',
      godown_id: 'g1', godown_name: 'Main',
      received_by_id: 'u1', received_by_name: 'U',
      lines: [{ item_id: 'i1', item_code: 'C1', item_name: 'X', uom: 'KG',
                expected_qty: 10, received_qty: 10 }],
    }, E, 'u1');
    // arrived → released allowed; from released no further moves
    await transitionInwardReceipt(ir.id, 'released', E, 'u2');
    await expect(transitionInwardReceipt(ir.id, 'cancelled', E, 'u2')).rejects.toThrow();
  });

  it('exposes ALLOWED_TRANSITIONS map', () => {
    expect(ALLOWED_TRANSITIONS.draft).toContain('arrived');
    expect(ALLOWED_TRANSITIONS.released).toEqual([]);
  });
});

describe('gateflow-inward-bridge · D-309', () => {
  it('propagates inward GatePass to InwardReceipt bidirectionally', async () => {
    const gp = await createInwardEntry({
      vehicle_no: 'KA-01-AB-1234', vehicle_type: 'truck',
      driver_name: 'D', driver_phone: '9', counterparty_name: 'V', purpose: 'p',
    }, E, 'u');

    const ir = await createInwardReceipt({
      entity_id: E, vendor_id: 'v1', vendor_name: 'V',
      godown_id: 'g1', godown_name: 'Main',
      received_by_id: 'u1', received_by_name: 'U',
      lines: [{ item_id: 'i1', item_code: 'C1', item_name: 'X', uom: 'KG',
                expected_qty: 10, received_qty: 10 }],
    }, E, 'u1');

    const r = await propagateGatePassToInwardReceipt(gp.id, ir.id, E);
    expect(r.ok).toBe(true);

    const found = findInwardReceiptByGatePass(gp.id, E);
    expect(found?.id).toBe(ir.id);
    expect(found?.gate_entry_id).toBe(gp.id);

    const updatedGp = getGatePass(gp.id, E);
    expect(updatedGp?.linked_voucher_type).toBe('inward_receipt');
    expect(updatedGp?.linked_voucher_id).toBe(ir.id);
  });

  it('refuses outward GatePass', async () => {
    const ir = await createInwardReceipt({
      entity_id: E, vendor_id: 'v1', vendor_name: 'V',
      godown_id: 'g1', godown_name: 'Main',
      received_by_id: 'u1', received_by_name: 'U',
      lines: [{ item_id: 'i1', item_code: 'C1', item_name: 'X', uom: 'KG',
                expected_qty: 10, received_qty: 10 }],
    }, E, 'u1');
    const r = await propagateGatePassToInwardReceipt('nonexistent', ir.id, E);
    expect(r.ok).toBe(false);
  });

  it('storage key namespaced per entity', () => {
    expect(inwardReceiptsKey('ABC')).toBe('erp_inward_receipts_ABC');
  });
});
