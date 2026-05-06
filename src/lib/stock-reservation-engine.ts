/**
 * stock-reservation-engine.ts — Stock visibility + soft-hold reservation
 * Sprint T-Phase-1.1.1m · Operix MOAT #19 · D-186
 *
 * EXTENDS stock-out-engine.ts (never replaces · D-190 anti-duplication).
 * Adds: reservation CRUD + available-qty computation + stale-reservation cleanup.
 *
 * D-194 PHASE 1/2 BOUNDARY:
 *   All storage via localStorage. No real API calls.
 *   Phase 2 replaces localStorage.getItem/setItem with REST endpoints.
 *
 * D-127/D-128 ZERO-TOUCH:
 *   Never reads or writes voucher.ts · voucher-type.ts · voucher form .tsx files.
 *
 * HOW AVAILABLE QTY IS COMPUTED (Phase 1):
 *   opening_stock comes from erp_inventory_items[item].openingStock
 *   active_reservations = erp_stock_reservations_${e} filtered by status='active'
 *   available_qty = opening_stock - sum(active_reservations[item_name].reserved_qty)
 *
 * IMPORTANT: This is a DISPLAY-ONLY computation for Phase 1.
 * Real stock movements (GRN · DN · SI) belong in Phase 1.2 Inward and Phase 1.3 Make.
 * The opening_stock field is used as the Phase 1 proxy for on-hand stock.
 */

import {
  stockReservationsKey,
  QUOTE_RESERVATION_TTL_MS,
  type StockReservation,
} from '@/types/stock-reservation';

// ── Internal helpers ────────────────────────────────────────────────

function loadReservations(entityCode: string): StockReservation[] {
  try {
    // [JWT] GET /api/inventory/reservations/:entityCode
    return JSON.parse(localStorage.getItem(stockReservationsKey(entityCode)) || '[]');
  } catch {
    return [];
  }
}

function saveReservations(entityCode: string, list: StockReservation[]): void {
  // [JWT] PUT /api/inventory/reservations/:entityCode
  localStorage.setItem(stockReservationsKey(entityCode), JSON.stringify(list));
}

interface InventoryItemSeed {
  itemName?: string;
  name?: string;
  openingStock?: number;
  on_hand_qty?: number;
}

function loadOnHandMap(): Map<string, number> {
  try {
    // [JWT] GET /api/inventory/items
    const items: InventoryItemSeed[] = JSON.parse(
      localStorage.getItem('erp_inventory_items') || '[]',
    );
    const map = new Map<string, number>();
    for (const it of items) {
      const name = it.itemName ?? it.name ?? '';
      if (!name) continue;
      const onHand = typeof it.on_hand_qty === 'number'
        ? it.on_hand_qty
        : typeof it.openingStock === 'number' ? it.openingStock : 0;
      map.set(name, onHand);
    }
    return map;
  } catch {
    return new Map();
  }
}

// ── 1. Single item availability ─────────────────────────────────────

export function getAvailableQty(itemName: string, entityCode: string): number {
  if (!itemName) return 0;
  const onHand = loadOnHandMap().get(itemName) ?? 0;
  const reserved = loadReservations(entityCode)
    .filter(r => r.status === 'active' && r.item_name === itemName)
    .reduce((s, r) => s + r.reserved_qty, 0);
  return onHand - reserved;
}

// ── 2. Batch availability map ───────────────────────────────────────

export function getAvailabilityMap(
  itemNames: string[],
  entityCode: string,
): Map<string, { onHand: number; reserved: number; available: number }> {
  const onHandMap = loadOnHandMap();
  const reservations = loadReservations(entityCode).filter(r => r.status === 'active');
  const out = new Map<string, { onHand: number; reserved: number; available: number }>();
  const unique = Array.from(new Set(itemNames.filter(n => n && n.trim())));
  for (const name of unique) {
    const onHand = onHandMap.get(name) ?? 0;
    const reserved = reservations
      .filter(r => r.item_name === name)
      .reduce((s, r) => s + r.reserved_qty, 0);
    out.set(name, { onHand, reserved, available: onHand - reserved });
  }
  return out;
}

// ── 3. Upsert quote-level reservation ───────────────────────────────

export function upsertQuoteReservation(
  entityCode: string,
  quotationId: string,
  quotationNo: string,
  customerName: string | null,
  salesmanName: string | null,
  items: Array<{ item_name: string; qty: number }>,
): void {
  const now = new Date().toISOString();
  const expires = new Date(Date.now() + QUOTE_RESERVATION_TTL_MS).toISOString();
  const existing = loadReservations(entityCode);
  // Remove any prior active reservations for this quotation
  const remaining = existing.filter(
    r => !(r.source_type === 'quotation' && r.source_id === quotationId && r.status === 'active'),
  );
  const fresh: StockReservation[] = items
    .filter(it => it.item_name && it.item_name.trim() && it.qty > 0)
    .map((it, idx) => ({
      id: `res-q-${quotationId}-${idx}-${Date.now()}`,
      entity_id: entityCode,
      item_name: it.item_name,
      reserved_qty: it.qty,
      level: 'quote',
      status: 'active',
      source_type: 'quotation',
      source_id: quotationId,
      source_no: quotationNo,
      customer_name: customerName,
      salesman_name: salesmanName,
      reserved_at: now,
      expires_at: expires,
      released_at: null,
      created_at: now,
      updated_at: now,
      // Sprint T-Phase-1.2.1 · ProjX cross-module · null = not project-tagged
      project_centre_id: null,
    }));
  // [JWT] POST /api/inventory/reservations (bulk upsert)
  saveReservations(entityCode, [...remaining, ...fresh]);
}

// ── 4. Release quote reservations on conversion ─────────────────────

export function releaseQuoteReservations(entityCode: string, quotationId: string): void {
  const now = new Date().toISOString();
  const list = loadReservations(entityCode).map(r =>
    r.source_type === 'quotation' && r.source_id === quotationId && r.status === 'active'
      ? { ...r, status: 'released' as const, released_at: now, updated_at: now }
      : r,
  );
  // [JWT] PATCH /api/inventory/reservations/release?source=quotation&id=:id
  saveReservations(entityCode, list);
}

// ── 5. Order-level reservations ─────────────────────────────────────

export function createOrderReservations(
  entityCode: string,
  orderId: string,
  orderNo: string,
  customerName: string | null,
  items: Array<{ item_name: string; qty: number }>,
): void {
  const now = new Date().toISOString();
  const existing = loadReservations(entityCode);
  const remaining = existing.filter(
    r => !(r.source_type === 'sales_order' && r.source_id === orderId && r.status === 'active'),
  );
  const fresh: StockReservation[] = items
    .filter(it => it.item_name && it.item_name.trim() && it.qty > 0)
    .map((it, idx) => ({
      id: `res-o-${orderId}-${idx}-${Date.now()}`,
      entity_id: entityCode,
      item_name: it.item_name,
      reserved_qty: it.qty,
      level: 'order',
      status: 'active',
      source_type: 'sales_order',
      source_id: orderId,
      source_no: orderNo,
      customer_name: customerName,
      salesman_name: null,
      reserved_at: now,
      expires_at: null,
      released_at: null,
      created_at: now,
      updated_at: now,
      // Sprint T-Phase-1.2.1 · ProjX cross-module · null = not project-tagged
      project_centre_id: null,
    }));
  // [JWT] POST /api/inventory/reservations (order-level)
  saveReservations(entityCode, [...remaining, ...fresh]);
}

// ── 5b. Production-order reservations (Sprint T-Phase-1.3-3a-pre-1-fix-1 · D-186 lineage) ──

export function createProductionOrderReservations(
  entityCode: string,
  poId: string,
  poNo: string,
  items: Array<{ item_name: string; qty: number }>,
): StockReservation[] {
  const now = new Date().toISOString();
  const existing = loadReservations(entityCode);
  const remaining = existing.filter(
    r => !(r.source_type === 'production_order' && r.source_id === poId && r.status === 'active'),
  );
  const fresh: StockReservation[] = items
    .filter(it => it.item_name && it.item_name.trim() && it.qty > 0)
    .map((it, idx) => ({
      id: `res-mo-${poId}-${idx}-${Date.now()}`,
      entity_id: entityCode,
      item_name: it.item_name,
      reserved_qty: it.qty,
      level: 'order',
      status: 'active',
      source_type: 'production_order',
      source_id: poId,
      source_no: poNo,
      customer_name: null,
      salesman_name: null,
      reserved_at: now,
      expires_at: null,
      released_at: null,
      created_at: now,
      updated_at: now,
      project_centre_id: null,
    }));
  // [JWT] POST /api/inventory/reservations (production-order-level)
  saveReservations(entityCode, [...remaining, ...fresh]);
  return fresh;
}

// ── 6. Sweep expired quote reservations ─────────────────────────────

export function sweepExpiredReservations(entityCode: string): void {
  const now = Date.now();
  const list = loadReservations(entityCode);
  let dirty = false;
  const updated = list.map(r => {
    if (
      r.status === 'active' &&
      r.level === 'quote' &&
      r.expires_at &&
      new Date(r.expires_at).getTime() < now
    ) {
      dirty = true;
      return { ...r, status: 'expired' as const, updated_at: new Date().toISOString() };
    }
    return r;
  });
  if (dirty) {
    // [JWT] PATCH /api/inventory/reservations/sweep-expired
    saveReservations(entityCode, updated);
  }
}

// ── 7. WIP estimate stub (Phase 1.3 + Phase 2 wires real) ───────────

export function getWIPEstimate(
  itemName: string,
  _entityCode: string,
): { expected_date: string | null; wip_qty: number } {
  // [JWT] GET /api/production/wip/:itemName (Phase 2 + Phase 1.3 Make)
  // Phase 1 stub: always returns null + 0. itemName accepted for future signature.
  void itemName;
  return { expected_date: null, wip_qty: 0 };
}

// ── 8. Detailed availability map (Sprint 2.7-d-1 · Q1-d) ────────────

export interface DetailedAvailabilityCell {
  onHand: number;
  reservedByQuotes: number;       // level === 'quote'
  reservedByOrders: number;       // level === 'order'
  totalReserved: number;          // sum of above
  available: number;              // onHand - totalReserved
  status: 'red' | 'amber' | 'green';   // computed against requestedQty if provided
}

/** Sibling to getAvailabilityMap · returns level-tagged breakdown for OOB-5 visual.
 *  When requestedQtyByItem is provided, status is computed:
 *    - red:   available < requested
 *    - amber: requested <= available < 2 * requested
 *    - green: available >= 2 * requested
 *  When no requested qty (or requested === 0): always 'green'.
 */
export function getDetailedAvailabilityMap(
  itemNames: string[],
  entityCode: string,
  requestedQtyByItem?: Map<string, number>,
): Map<string, DetailedAvailabilityCell> {
  const onHandMap = loadOnHandMap();
  const reservations = loadReservations(entityCode).filter(r => r.status === 'active');
  const out = new Map<string, DetailedAvailabilityCell>();
  const unique = Array.from(new Set(itemNames.filter(n => n && n.trim())));
  for (const name of unique) {
    const onHand = onHandMap.get(name) ?? 0;
    const itemRes = reservations.filter(r => r.item_name === name);
    const reservedByQuotes = itemRes
      .filter(r => r.level === 'quote')
      .reduce((s, r) => s + r.reserved_qty, 0);
    const reservedByOrders = itemRes
      .filter(r => r.level === 'order')
      .reduce((s, r) => s + r.reserved_qty, 0);
    const totalReserved = reservedByQuotes + reservedByOrders;
    const available = onHand - totalReserved;
    const requested = requestedQtyByItem?.get(name) ?? 0;
    let status: 'red' | 'amber' | 'green' = 'green';
    if (requested > 0) {
      if (available < requested) status = 'red';
      else if (available < 2 * requested) status = 'amber';
      else status = 'green';
    }
    out.set(name, { onHand, reservedByQuotes, reservedByOrders, totalReserved, available, status });
  }
  return out;
}
