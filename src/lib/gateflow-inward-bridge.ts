/**
 * @file        gateflow-inward-bridge.ts
 * @sprint      T-Phase-1.2.6f-d-2-card6-6-pre-1 · Block E
 * @purpose     Bidirectional bridge between GateFlow GatePass (inward) and
 *              Card #6 InwardReceipt. Mirrors gateflow-git-bridge sibling
 *              discipline: neither gateflow-engine.ts nor inward-receipt-engine.ts
 *              are modified — this bridge writes inward-receipt storage
 *              directly and uses gateflow-engine's existing public API
 *              (attachLinkedVoucher) to update the GatePass.
 *
 * @decisions   D-127 (lib · not voucher · OK), D-128 (IR is NOT a voucher),
 *              sibling discipline lesson D-285+D-286+D-287 (preserve audited
 *              engines BYTE-IDENTICAL · D-309 precedent from 4-pre-2 · same
 *              pattern as gateflow-git-bridge.ts).
 *
 * @reuses      types/inward-receipt (read · inwardReceiptsKey)
 *              · inward-receipt-engine.getInwardReceipt (read-only)
 *              · gateflow-engine.attachLinkedVoucher / getGatePass
 *              · audit-trail-hash-chain
 *
 * [JWT] PATCH /api/logistic/inward-receipts/:id (gate_entry linkage)
 * [JWT] PATCH /api/gateflow/passes/:id/attach-linked-voucher
 */

import type { InwardReceipt } from '@/types/inward-receipt';
import { inwardReceiptsKey } from '@/types/inward-receipt';
import { getInwardReceipt } from '@/lib/inward-receipt-engine';
import { attachLinkedVoucher, getGatePass } from '@/lib/gateflow-engine';
import { appendAuditEntry } from '@/lib/audit-trail-hash-chain';

export interface InwardBridgeResult {
  ok: boolean;
  reason?: string;
}

/**
 * Propagate an inward GatePass linkage to an existing InwardReceipt.
 * Sibling discipline: writes IR storage directly; updates GatePass via
 * gateflow-engine public API only.
 */
export async function propagateGatePassToInwardReceipt(
  gatePassId: string,
  inwardReceiptId: string,
  entityCode: string,
  byUserId: string = 'system',
): Promise<InwardBridgeResult> {
  const gp = getGatePass(gatePassId, entityCode);
  if (!gp) return { ok: false, reason: 'GatePass not found' };
  if (gp.direction !== 'inward') {
    return { ok: false, reason: 'GatePass is not inward direction' };
  }

  const ir = getInwardReceipt(inwardReceiptId, entityCode);
  if (!ir) return { ok: false, reason: 'InwardReceipt not found' };

  // Direct write to inward-receipt storage
  // (sibling discipline · inward-receipt-engine.ts BYTE-IDENTICAL preserved)
  try {
    const raw = localStorage.getItem(inwardReceiptsKey(entityCode));
    if (!raw) return { ok: false, reason: 'InwardReceipt storage empty' };
    const list: InwardReceipt[] = JSON.parse(raw);
    const idx = list.findIndex((r) => r.id === inwardReceiptId);
    if (idx < 0) return { ok: false, reason: 'InwardReceipt not found in storage' };

    list[idx] = {
      ...list[idx],
      gate_entry_id: gatePassId,
      gate_entry_no: gp.gate_pass_no,
      updated_at: new Date().toISOString(),
      updated_by: byUserId,
    };
    localStorage.setItem(inwardReceiptsKey(entityCode), JSON.stringify(list));
  } catch (e) {
    return { ok: false, reason: `Storage error: ${String(e)}` };
  }

  // Update GatePass via gateflow-engine public API
  await attachLinkedVoucher({
    gate_pass_id: gatePassId,
    linked_voucher_type: 'inward_receipt',
    linked_voucher_id: inwardReceiptId,
    linked_voucher_no: ir.receipt_no,
  }, entityCode);

  await appendAuditEntry({
    entityCode,
    entityId: entityCode,
    voucherId: inwardReceiptId,
    // IR is NOT a voucher (D-128) · use closest existing audit kind
    voucherKind: 'vendor_quotation',
    action: 'gateflow_inward_bridge_linked',
    actorUserId: byUserId,
    payload: {
      gate_pass_id: gatePassId,
      gate_pass_no: gp.gate_pass_no,
      inward_receipt_id: inwardReceiptId,
      inward_receipt_no: ir.receipt_no,
    },
  });

  return { ok: true };
}

/** Find InwardReceipt linked to a given GatePass (by gate_entry_id). */
export function findInwardReceiptByGatePass(
  gatePassId: string,
  entityCode: string,
): InwardReceipt | null {
  try {
    const raw = localStorage.getItem(inwardReceiptsKey(entityCode));
    if (!raw) return null;
    const list: InwardReceipt[] = JSON.parse(raw);
    return list.find((r) => r.gate_entry_id === gatePassId) ?? null;
  } catch {
    return null;
  }
}

/** Convenience reverse lookup: GatePass for a given InwardReceipt. */
export function findGatePassForInwardReceipt(
  inwardReceiptId: string,
  entityCode: string,
) {
  const ir = getInwardReceipt(inwardReceiptId, entityCode);
  if (!ir || !ir.gate_entry_id) return null;
  return getGatePass(ir.gate_entry_id, entityCode);
}
