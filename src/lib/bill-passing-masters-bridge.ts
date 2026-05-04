/**
 * @file        bill-passing-masters-bridge.ts
 * @sprint      T-Phase-1.2.6f-c-3-fix · Fix-A · per D-295
 * @purpose     Sibling bridge for Bill Passing master fields persistence.
 *              MatchReviewPanel calls setBillMasterFields BEFORE approveBill.
 *              Restores Sprint 3-c-2 audited-clean discipline (D-285+D-286+D-287 streak).
 */

import type { BillPassingRecord } from '@/types/bill-passing';
import { billPassingKey } from '@/types/bill-passing';
import { appendAuditEntry } from './audit-trail-hash-chain';

export interface BillMasterFields {
  mode_of_payment_id?: string | null;
  terms_of_payment_id?: string | null;
  terms_of_delivery_id?: string | null;
  narration?: string;
  terms_conditions?: string;
}

/**
 * Set master fields on a Bill Passing record · sibling pattern.
 * Called BEFORE approveBill. NO modifications to bill-passing-engine.ts.
 */
export async function setBillMasterFields(
  billId: string,
  masters: BillMasterFields,
  entityCode: string,
  byUserId: string,
): Promise<BillPassingRecord | null> {
  // [JWT] PATCH /api/bill-passing/:id/masters
  const raw = localStorage.getItem(billPassingKey(entityCode));
  const list: BillPassingRecord[] = raw ? (JSON.parse(raw) as BillPassingRecord[]) : [];
  const idx = list.findIndex((b) => b.id === billId);
  if (idx < 0) return null;

  const cur = list[idx];
  const now = new Date().toISOString();
  const updated: BillPassingRecord = {
    ...cur,
    mode_of_payment_id: masters.mode_of_payment_id ?? cur.mode_of_payment_id,
    terms_of_payment_id: masters.terms_of_payment_id ?? cur.terms_of_payment_id,
    terms_of_delivery_id: masters.terms_of_delivery_id ?? cur.terms_of_delivery_id,
    narration: masters.narration ?? cur.narration,
    terms_conditions: masters.terms_conditions ?? cur.terms_conditions,
    updated_at: now,
  };
  list[idx] = updated;
  localStorage.setItem(billPassingKey(entityCode), JSON.stringify(list));

  await appendAuditEntry({
    entityCode,
    entityId: cur.entity_id,
    voucherId: cur.id,
    voucherKind: 'vendor_quotation',
    action: 'set_bill_master_fields',
    actorUserId: byUserId,
    payload: {
      bill_no: cur.bill_no,
      mode_of_payment_id: updated.mode_of_payment_id,
      terms_of_payment_id: updated.terms_of_payment_id,
      terms_of_delivery_id: updated.terms_of_delivery_id,
    },
  });

  return updated;
}
