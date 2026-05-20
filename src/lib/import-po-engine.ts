/**
 * @file        src/lib/import-po-engine.ts
 * @purpose     ImportPO CRUD + status transitions + RateLadder append
 * @sprint      T-Phase-1.EX-3-ImportPO-ForeignVendor-DualRate
 * @decisions   EX-3-Q1=b sibling · EX-3-Q4=a RateLadder
 * @disciplines FR-30 · FR-50 · FR-26
 */
import type { ImportPurchaseOrder, ImportPOStatus } from '@/types/import-purchase-order';
import type { VoucherRateEntry } from '@/types/rate-ladder';
import { importPOKey } from '@/types/import-purchase-order';
import { SINHA_IMPORT_POS } from '@/data/sinha-import-po-seed-data';

export const IMPORT_PO_VALID_TRANSITIONS: Record<ImportPOStatus, ImportPOStatus[]> = {
  draft: ['pending_approval', 'cancelled'],
  pending_approval: ['approved', 'draft', 'cancelled'],
  approved: ['sent_to_vendor', 'cancelled'],
  sent_to_vendor: ['in_transit', 'cancelled'],
  in_transit: ['goods_arrived', 'cancelled'],
  goods_arrived: ['boe_filed'],
  boe_filed: ['closed'],
  closed: [],
  cancelled: [],
};

// [JWT] GET /api/eximx/import-purchase-orders?entityCode=...
export function loadImportPOs(entityCode: string): ImportPurchaseOrder[] {
  try {
    const raw = localStorage.getItem(importPOKey(entityCode));
    if (!raw) {
      localStorage.setItem(importPOKey(entityCode), JSON.stringify(SINHA_IMPORT_POS));
      return SINHA_IMPORT_POS;
    }
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as ImportPurchaseOrder[]) : SINHA_IMPORT_POS;
  } catch {
    return SINHA_IMPORT_POS;
  }
}

// [JWT] PUT /api/eximx/import-purchase-orders?entityCode=...
export function saveImportPOs(entityCode: string, pos: ImportPurchaseOrder[]): void {
  try {
    localStorage.setItem(importPOKey(entityCode), JSON.stringify(pos));
  } catch {
    /* quota */
  }
}

export function getImportPO(entityCode: string, id: string): ImportPurchaseOrder | null {
  return loadImportPOs(entityCode).find((po) => po.id === id) ?? null;
}

export function transitionImportPO(
  entityCode: string,
  poId: string,
  newStatus: ImportPOStatus,
): ImportPurchaseOrder {
  const pos = loadImportPOs(entityCode);
  const po = pos.find((p) => p.id === poId);
  if (!po) throw new Error(`ImportPO not found: ${poId}`);
  if (!IMPORT_PO_VALID_TRANSITIONS[po.status].includes(newStatus)) {
    throw new Error(`Invalid transition: ${po.status} → ${newStatus}`);
  }
  const updated = { ...po, status: newStatus, updated_at: new Date().toISOString() };
  saveImportPOs(entityCode, pos.map((p) => (p.id === poId ? updated : p)));
  return updated;
}

export function appendRateEvent(
  entityCode: string,
  poId: string,
  entry: VoucherRateEntry,
): ImportPurchaseOrder {
  const pos = loadImportPOs(entityCode);
  const po = pos.find((p) => p.id === poId);
  if (!po) throw new Error(`ImportPO not found: ${poId}`);
  const updated: ImportPurchaseOrder = {
    ...po,
    rate_ladder: [...po.rate_ladder, entry],
    updated_at: new Date().toISOString(),
  };
  saveImportPOs(entityCode, pos.map((p) => (p.id === poId ? updated : p)));
  return updated;
}
