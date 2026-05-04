/**
 * @file        procure-fincore-po-bridge.ts
 * @sprint      T-Phase-1.2.6f-c-3 · Block A · per D-288 + D-294
 * @purpose     Bridge from Procure360 PO approval to FinCore Order creation.
 *              Auto-creates FinCore Order when Procure360 PO transitions to 'approved'.
 *              Order.ref_no = po.po_no for cross-reference.
 *              Respects Comply360 gate (isOrderProcessingEnabled) per D-294.
 * @decisions   D-288 (bridge architecture) · D-294 (graceful gate handling) · D-127 (PO.tsx ZERO TOUCH)
 * @reuses      po-management-engine (PO read · IMPORT only)
 *              · audit-trail-hash-chain · leak-register-engine
 * @[JWT]       POST /api/procure-fincore/bridge
 */

import type { PurchaseOrderLine } from '@/types/po';
import { getPurchaseOrder } from './po-management-engine';
import type { Order, OrderLine } from '@/types/order';
import { ordersKey } from '@/types/order';
import { generateDocNo } from './finecore-engine';
import { appendAuditEntry } from './audit-trail-hash-chain';
import { emitLeakEvent } from './leak-register-engine';

export interface BridgeLinkRecord {
  id: string;
  po_id: string;
  po_no: string;
  fincore_order_id: string | null;
  fincore_order_no: string | null;
  bridge_status: 'linked' | 'gate_disabled' | 'failed';
  failure_reason: string | null;
  created_at: string;
}

export const bridgeLinkKey = (entityCode: string): string =>
  `erp_procure_fincore_bridge_${entityCode}`;

/** Read Comply360 gate · per D-294 */
export function isOrderProcessingEnabled(): boolean {
  try {
    // [JWT] GET /api/accounting/compliance-settings-automation
    const raw = localStorage.getItem('erp_comply360_group_config');
    if (raw) {
      const cfg = JSON.parse(raw);
      return cfg.enableOrderProcessing === true;
    }
  } catch { /* ignore */ }
  return false;
}

function listBridgeLinksInternal(entityCode: string): BridgeLinkRecord[] {
  try {
    const raw = localStorage.getItem(bridgeLinkKey(entityCode));
    return raw ? (JSON.parse(raw) as BridgeLinkRecord[]) : [];
  } catch { return []; }
}

function persistLinkRecord(record: BridgeLinkRecord, entityCode: string): void {
  // [JWT] POST /api/procure-fincore/bridge
  const all = listBridgeLinksInternal(entityCode);
  all.push(record);
  localStorage.setItem(bridgeLinkKey(entityCode), JSON.stringify(all));
}

/** List all bridge links for entity */
export function listBridgeLinks(entityCode: string): BridgeLinkRecord[] {
  // [JWT] GET /api/procure-fincore/bridge?entityCode={e}
  return listBridgeLinksInternal(entityCode);
}

/** Get link by PO id */
export function getBridgeLinkByPoId(poId: string, entityCode: string): BridgeLinkRecord | null {
  return listBridgeLinksInternal(entityCode).find((l) => l.po_id === poId) ?? null;
}

/** Map Procure360 PO line to FinCore OrderLine */
function mapPoLineToOrderLine(poLine: PurchaseOrderLine, idx: number): OrderLine {
  const taxable = Math.round(poLine.qty * poLine.rate * 100) / 100;
  return {
    id: `ol-${Date.now()}-${idx}`,
    item_id: poLine.item_id,
    item_code: poLine.item_id,
    item_name: poLine.item_name,
    hsn_sac_code: '',
    qty: poLine.qty,
    uom: poLine.uom,
    rate: poLine.rate,
    discount_percent: 0,
    taxable_value: taxable,
    gst_rate: poLine.tax_pct,
    pending_qty: poLine.qty,
    fulfilled_qty: 0,
    status: 'open',
  };
}

/**
 * Bridge: create FinCore Order from approved Procure360 PO.
 * Per D-294 · graceful skip if Comply360 gate disabled.
 */
export async function bridgePoToFincoreOrder(
  poId: string,
  entityCode: string,
  byUserId: string,
): Promise<BridgeLinkRecord> {
  const po = getPurchaseOrder(poId, entityCode);
  const now = new Date().toISOString();
  if (!po) {
    const rec: BridgeLinkRecord = {
      id: `link-${Date.now()}`,
      po_id: poId,
      po_no: '',
      fincore_order_id: null,
      fincore_order_no: null,
      bridge_status: 'failed',
      failure_reason: 'PO not found',
      created_at: now,
    };
    persistLinkRecord(rec, entityCode);
    return rec;
  }

  // Per D-294 · respect Comply360 gate
  if (!isOrderProcessingEnabled()) {
    emitLeakEvent({
      entity_id: po.entity_id,
      category: 'process',
      sub_kind: 'comply360_gate_disabled',
      ref_type: 'po',
      ref_id: po.id,
      ref_label: po.po_no,
      notes: 'PO bridge skipped: Comply360 enableOrderProcessing=false',
      emitted_by: byUserId,
    });
    const rec: BridgeLinkRecord = {
      id: `link-${Date.now()}`,
      po_id: poId,
      po_no: po.po_no,
      fincore_order_id: null,
      fincore_order_no: null,
      bridge_status: 'gate_disabled',
      failure_reason: 'Comply360 enableOrderProcessing is false',
      created_at: now,
    };
    persistLinkRecord(rec, entityCode);
    await appendAuditEntry({
      entityCode,
      entityId: po.entity_id,
      voucherId: po.id,
      voucherKind: 'order',
      action: 'bridge_skipped_gate_disabled',
      actorUserId: byUserId,
      payload: { po_id: poId, po_no: po.po_no },
    });
    return rec;
  }

  // Gate enabled · create FinCore Order
  try {
    const orderNo = generateDocNo('PO', entityCode);
    const lines: OrderLine[] = po.lines.map((pl, i) => mapPoLineToOrderLine(pl, i));
    const grossAmount = Math.round(lines.reduce((s, l) => s + l.taxable_value, 0) * 100) / 100;
    const totalTax = Math.round(po.total_tax_value * 100) / 100;
    const order: Order = {
      id: `order-${Date.now()}`,
      order_no: orderNo,
      base_voucher_type: 'Purchase Order',
      entity_id: po.entity_id,
      date: now.slice(0, 10),
      party_id: po.vendor_id,
      party_name: po.vendor_name,
      ref_no: po.po_no,
      lines,
      gross_amount: grossAmount,
      total_tax: totalTax,
      net_amount: Math.round((grossAmount + totalTax) * 100) / 100,
      narration: `Bridged from Procure360 PO ${po.po_no}`,
      terms_conditions: '',
      status: 'open',
      created_at: now,
      updated_at: now,
    };

    const ordersStorageKey = ordersKey(entityCode);
    const existingRaw = localStorage.getItem(ordersStorageKey);
    const existing = existingRaw ? (JSON.parse(existingRaw) as Order[]) : [];
    existing.push(order);
    // [JWT] POST /api/orders
    localStorage.setItem(ordersStorageKey, JSON.stringify(existing));

    const rec: BridgeLinkRecord = {
      id: `link-${Date.now()}`,
      po_id: poId,
      po_no: po.po_no,
      fincore_order_id: order.id,
      fincore_order_no: order.order_no,
      bridge_status: 'linked',
      failure_reason: null,
      created_at: now,
    };
    persistLinkRecord(rec, entityCode);
    await appendAuditEntry({
      entityCode,
      entityId: po.entity_id,
      voucherId: order.id,
      voucherKind: 'order',
      action: 'bridge_po_to_fincore_order',
      actorUserId: byUserId,
      payload: { po_id: poId, po_no: po.po_no, order_id: order.id, order_no: order.order_no },
    });
    return rec;
  } catch (e) {
    const rec: BridgeLinkRecord = {
      id: `link-${Date.now()}`,
      po_id: poId,
      po_no: po.po_no,
      fincore_order_id: null,
      fincore_order_no: null,
      bridge_status: 'failed',
      failure_reason: (e as Error).message,
      created_at: now,
    };
    persistLinkRecord(rec, entityCode);
    return rec;
  }
}
