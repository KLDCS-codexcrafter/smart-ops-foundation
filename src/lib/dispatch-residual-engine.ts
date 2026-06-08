/**
 * @file        src/lib/dispatch-residual-engine.ts
 * @sprint      A.4-Residual · T-A4R-Dispatch-Residual · Pillar-A · 103 ⭐ target
 * @realizes    A.4-Residual Bucket-3 (7 Tier-L FT items)
 * @doctrine    CONSUMES existing dispatch/WMS surfaces · NEVER rebuilds.
 *              005/006 wrap sample-expense-voucher-engine (FinCore path · no
 *              duplicate accounting). 007 reads PackingMaterialMaster levels.
 *              012 reads demo-outward-memo.serial_no. 018 pure math. 020 reads
 *              ReturnablePackaging. 022 reads TransporterRateCard. 023 aggregates
 *              existing stores. NO fabricated metrics/serials/rates.
 * @[JWT]       Wave-2 (Bucket-2): real courier APIs · GPS · ML · driver-app
 *              are EXCLUDED here. Outbox-stub for supplier feedback (018).
 */
import type { SampleOutwardMemo } from '@/types/sample-outward-memo';
import type { DemoOutwardMemo } from '@/types/demo-outward-memo';
import {
  type PackingMaterial,
  packingMaterialsKey,
} from '@/types/packing-material';
import {
  type TransporterRateCard,
  type TransportMode,
  type ZoneCode,
  transporterRateCardsKey,
} from '@/types/transporter-rate';
import {
  type ReturnablePackaging,
  returnablePackagingKey,
} from '@/types/returnable-packaging';
import { deliveryMemosKey } from '@/types/delivery-memo';
import { demoOutwardMemosKey } from '@/types/demo-outward-memo';
import { sampleOutwardMemosKey } from '@/types/sample-outward-memo';
import {
  postSampleExpenseVoucherForSOM,
  postMarketingExpenseVoucherForDOM,
  postStockTransferForReturnedSampleSOM,
  type SampleExpenseVoucherResult,
} from '@/lib/sample-expense-voucher-engine';
import { logAudit } from '@/lib/audit-trail-engine';

// ────────────────────────────────────────────────────────────────────
// Storage helper (FR-93 ls<T> dispatch doctrine)
// ────────────────────────────────────────────────────────────────────
function ls<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

// ────────────────────────────────────────────────────────────────────
// 005 · Sample non-refundable → marketing expense (CONSUMES FinCore path)
// 005 · DOM lost/converted → marketing expense
// Returns the existing engine's result verbatim — no duplicate accounting.
// ────────────────────────────────────────────────────────────────────
export function bookSampleExpense(
  memo: SampleOutwardMemo | DemoOutwardMemo,
  entityCode: string,
): SampleExpenseVoucherResult {
  if (!entityCode) return { posted: false, reason: 'no_entity' };
  // Discriminator: SOM has is_refundable + total_value; DOM has demo_period_days
  if ('demo_period_days' in memo) {
    return postMarketingExpenseVoucherForDOM(memo as DemoOutwardMemo, entityCode);
  }
  return postSampleExpenseVoucherForSOM(memo as SampleOutwardMemo, entityCode);
}

// ────────────────────────────────────────────────────────────────────
// 006 · Refundable sample return → Stock Transfer voucher
// CONSUMES existing stock path (postStockTransferForReturnedSampleSOM)
// ────────────────────────────────────────────────────────────────────
export function returnRefundableSampleToStock(
  memo: SampleOutwardMemo,
  entityCode: string,
): SampleExpenseVoucherResult {
  if (!entityCode) return { posted: false, reason: 'no_entity' };
  return postStockTransferForReturnedSampleSOM(memo, entityCode);
}

// ────────────────────────────────────────────────────────────────────
// 007 · Packing-material consumption → replenishment suggestion
// CONSUMES PackingMaterial.current_stock / reorder_level (no rebuild)
// ────────────────────────────────────────────────────────────────────
export interface PackingReplenishmentSuggestion {
  material_id: string;
  code: string;
  name: string;
  uom: string;
  current_stock: number;
  reorder_level: number;
  reorder_qty: number;
  shortfall: number;
  urgency: 'critical' | 'low' | 'ok';
}

export function triggerPackingReplenishment(
  entityCode: string,
): PackingReplenishmentSuggestion[] {
  const materials = ls<PackingMaterial>(packingMaterialsKey(entityCode))
    .filter((m) => m.active);
  return materials
    .filter((m) => m.current_stock <= m.reorder_level)
    .map((m) => {
      const shortfall = Math.max(0, m.reorder_level - m.current_stock);
      const urgency: PackingReplenishmentSuggestion['urgency'] =
        m.current_stock <= 0
          ? 'critical'
          : m.current_stock < m.reorder_level / 2
            ? 'critical'
            : 'low';
      return {
        material_id: m.id,
        code: m.code,
        name: m.name,
        uom: m.uom,
        current_stock: m.current_stock,
        reorder_level: m.reorder_level,
        reorder_qty: m.reorder_qty,
        shortfall,
        urgency,
      };
    })
    .sort((a, b) => b.shortfall - a.shortfall);
}

// ────────────────────────────────────────────────────────────────────
// 022 · Courier rate compare (CONSUMES TransporterRateCard · honest empty)
// Tier-L: rate-card driven only. NO external courier APIs (Bucket-2 Wave-2).
// ────────────────────────────────────────────────────────────────────
export interface ShipmentSpec {
  zone: ZoneCode;
  mode: TransportMode;
  weight_kg: number;
}

export interface CourierRateRow {
  logistic_id: string;
  rate_card_id: string;
  label: string;
  zone: ZoneCode;
  mode: TransportMode;
  chargeable_weight: number;
  rate_per_kg: number;
  freight_amount: number;
  transit_days_min: number;
  transit_days_max: number;
}

export function compareCourierRates(
  entityCode: string,
  shipment: ShipmentSpec,
): CourierRateRow[] {
  if (!entityCode || !shipment || shipment.weight_kg <= 0) return [];
  const cards = ls<TransporterRateCard>(transporterRateCardsKey(entityCode));
  if (cards.length === 0) return [];
  const rows: CourierRateRow[] = [];
  for (const card of cards) {
    const min = card.minimum_chargeable?.[shipment.mode] ?? 0;
    const chargeable = Math.max(shipment.weight_kg, min);
    const zr = card.zone_rates?.find(
      (z) => z.zone === shipment.zone && z.mode === shipment.mode,
    );
    if (!zr) continue;
    rows.push({
      logistic_id: card.logistic_id,
      rate_card_id: card.id,
      label: card.label,
      zone: shipment.zone,
      mode: shipment.mode,
      chargeable_weight: chargeable,
      rate_per_kg: zr.rate_per_kg,
      freight_amount: Math.round(chargeable * zr.rate_per_kg * 100) / 100,
      transit_days_min: zr.transit_days_min,
      transit_days_max: zr.transit_days_max,
    });
  }
  // cheapest first
  return rows.sort((a, b) => a.freight_amount - b.freight_amount);
}

// ────────────────────────────────────────────────────────────────────
// 018 · Packing-BOM variance (pure math · planned − actual)
// ────────────────────────────────────────────────────────────────────
export interface BomLine {
  material_id: string;
  code: string;
  name: string;
  qty: number;
}
export interface BomVarianceRow {
  material_id: string;
  code: string;
  name: string;
  planned_qty: number;
  actual_qty: number;
  variance_qty: number; // positive = over-consumption · negative = saving
  variance_pct: number; // 0 when planned=0
}

export function computePackingBomVariance(
  planned: BomLine[],
  actual: BomLine[],
): BomVarianceRow[] {
  const byId = new Map<string, BomVarianceRow>();
  for (const p of planned) {
    byId.set(p.material_id, {
      material_id: p.material_id,
      code: p.code,
      name: p.name,
      planned_qty: p.qty,
      actual_qty: 0,
      variance_qty: -p.qty,
      variance_pct: -100,
    });
  }
  for (const a of actual) {
    const ex = byId.get(a.material_id);
    if (ex) {
      ex.actual_qty = a.qty;
      ex.variance_qty = a.qty - ex.planned_qty;
      ex.variance_pct = ex.planned_qty > 0
        ? Math.round(((a.qty - ex.planned_qty) / ex.planned_qty) * 1000) / 10
        : 0;
    } else {
      byId.set(a.material_id, {
        material_id: a.material_id,
        code: a.code,
        name: a.name,
        planned_qty: 0,
        actual_qty: a.qty,
        variance_qty: a.qty,
        variance_pct: 0,
      });
    }
  }
  return Array.from(byId.values()).sort(
    (x, y) => Math.abs(y.variance_qty) - Math.abs(x.variance_qty),
  );
}

// 018 · Bridge outbox stub (Wave-2 will deliver to Procure360 / supplier portal)
export const SUPPLIER_FEEDBACK_OUTBOX_KEY =
  'dispatch_bom_variance_supplier_feedback_outbox_v1';

export interface SupplierFeedbackOutboxEntry {
  id: string;
  entity_id: string;
  emitted_at: string;
  supplier_ref: string | null;
  variance_rows: BomVarianceRow[];
  /** Wave-2 reason · this is a SEAM-ONLY stub today. */
  delivered: false;
  reason: 'wave2_supplier_portal_absent';
}

export function emitBomVarianceToSupplier(
  entityCode: string,
  variance: BomVarianceRow[],
  supplierRef: string | null,
): SupplierFeedbackOutboxEntry {
  const entry: SupplierFeedbackOutboxEntry = {
    id: `bvfb-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    entity_id: entityCode,
    emitted_at: new Date().toISOString(),
    supplier_ref: supplierRef,
    variance_rows: variance,
    delivered: false,
    reason: 'wave2_supplier_portal_absent',
  };
  try {
    const raw = localStorage.getItem(SUPPLIER_FEEDBACK_OUTBOX_KEY);
    const arr: SupplierFeedbackOutboxEntry[] = raw ? JSON.parse(raw) : [];
    arr.push(entry);
    // [JWT] POST /api/procure360/supplier-feedback — Wave-2
    localStorage.setItem(SUPPLIER_FEEDBACK_OUTBOX_KEY, JSON.stringify(arr));
  } catch { /* honest no-op on quota */ }
  logAudit({
    entityCode,
    action: 'create',
    entityType: 'dispatch_event',
    recordId: entry.id,
    recordLabel: `BOM variance feedback · ${variance.length} rows`,
    beforeState: null,
    afterState: { variance_rows: variance.length, supplier_ref: supplierRef },
    sourceModule: 'dispatch-residual-engine',
    reason: 'bom_variance_supplier_feedback_seam',
  });
  return entry;
}

// ────────────────────────────────────────────────────────────────────
// 020 · Reusable packing return tracking (CONSUMES ReturnablePackaging)
// ────────────────────────────────────────────────────────────────────
export interface ReusablePackingStatus {
  total: number;
  with_customer: number;
  in_stock: number;
  returned: number;
  damaged: number;
  lost: number;
  overdue: number;
  return_rate_pct: number; // returned / (sent_ever) — sent_ever = total - in_stock_only_ever (approx with_customer+returned+damaged+lost)
}

export function summarizeReusablePacking(
  entityCode: string,
): ReusablePackingStatus {
  const units = ls<ReturnablePackaging>(returnablePackagingKey(entityCode));
  const total = units.length;
  const buckets = {
    with_customer: 0, in_stock: 0, returned: 0, damaged: 0, lost: 0,
  };
  let overdue = 0;
  const today = new Date().toISOString().slice(0, 10);
  for (const u of units) {
    if (u.status === 'with_customer') buckets.with_customer++;
    else if (u.status === 'in_stock') buckets.in_stock++;
    else if (u.status === 'returned') buckets.returned++;
    else if (u.status === 'damaged') buckets.damaged++;
    else if (u.status === 'lost') buckets.lost++;
    if (
      u.status === 'with_customer' &&
      u.return_due_date &&
      u.return_due_date < today
    ) overdue++;
  }
  const sent = buckets.with_customer + buckets.returned +
               buckets.damaged + buckets.lost;
  const return_rate_pct = sent > 0
    ? Math.round((buckets.returned / sent) * 1000) / 10
    : 0;
  return { total, ...buckets, overdue, return_rate_pct };
}

// ────────────────────────────────────────────────────────────────────
// 012 · Demo serial register (CONSUMES demo-outward-memo.serial_no honestly)
// ────────────────────────────────────────────────────────────────────
export interface DemoSerialRow {
  memo_id: string;
  memo_no: string;
  memo_date: string;
  item_id: string;
  item_name: string;
  serial_no: string; // empty rows excluded — honest, no fabrication
  recipient_name: string;
  status: string;
  return_due_date: string | null;
  is_overdue: boolean;
}

export function buildDemoSerialRegister(entityCode: string): DemoSerialRow[] {
  const memos = ls<DemoOutwardMemo>(demoOutwardMemosKey(entityCode));
  const today = new Date().toISOString().slice(0, 10);
  const rows: DemoSerialRow[] = [];
  for (const m of memos) {
    for (const it of m.items) {
      const sn = (it.serial_no ?? '').trim();
      if (!sn) continue; // HONEST: no serial → no fabricated row
      rows.push({
        memo_id: m.id,
        memo_no: m.memo_no,
        memo_date: m.memo_date,
        item_id: it.id,
        item_name: it.item_name,
        serial_no: sn,
        recipient_name: m.recipient_name,
        status: m.status,
        return_due_date: m.return_due_date,
        is_overdue:
          !!m.return_due_date && m.return_due_date < today &&
          m.status !== 'returned' && m.status !== 'converted' && m.status !== 'lost',
      });
    }
  }
  return rows.sort((a, b) => (a.memo_date < b.memo_date ? 1 : -1));
}

// ────────────────────────────────────────────────────────────────────
// 023 · Dispatch analytics snapshot (CONSUMES existing stores · no fabrication)
// ────────────────────────────────────────────────────────────────────
export interface DispatchAnalyticsSnapshot {
  generated_at: string;
  entity_id: string;
  delivery_memos: {
    total: number;
    delivered: number;
    in_transit: number;
    pending: number;
  };
  samples: {
    total: number;
    refundable: number;
    non_refundable: number;
    returned: number;
    pending_dispatch: number;
  };
  demos: {
    total: number;
    active: number;
    returned: number;
    converted: number;
    lost: number;
    overdue: number;
  };
  packing_replenishment_alerts: number;
  reusable_packing: ReusablePackingStatus;
  honest_empty: boolean;
}

interface DMShape { status?: string }
export function buildDispatchAnalyticsSnapshot(
  entityCode: string,
): DispatchAnalyticsSnapshot {
  const dms = ls<DMShape>(deliveryMemosKey(entityCode));
  const soms = ls<SampleOutwardMemo>(sampleOutwardMemosKey(entityCode));
  const doms = ls<DemoOutwardMemo>(demoOutwardMemosKey(entityCode));
  const today = new Date().toISOString().slice(0, 10);

  const delivery_memos = {
    total: dms.length,
    delivered: dms.filter((d) => d.status === 'delivered').length,
    in_transit: dms.filter((d) => d.status === 'in_transit' || d.status === 'shipped').length,
    pending: dms.filter((d) => d.status === 'draft' || d.status === 'pending').length,
  };

  const samples = {
    total: soms.length,
    refundable: soms.filter((s) => s.is_refundable).length,
    non_refundable: soms.filter((s) => !s.is_refundable).length,
    returned: soms.filter((s) => s.status === 'returned').length,
    pending_dispatch: soms.filter((s) => !s.issued_by_dispatch).length,
  };

  const demos = {
    total: doms.length,
    active: doms.filter((d) => d.status === 'demo_active' || d.status === 'dispatched').length,
    returned: doms.filter((d) => d.status === 'returned').length,
    converted: doms.filter((d) => d.status === 'converted').length,
    lost: doms.filter((d) => d.status === 'lost').length,
    overdue: doms.filter(
      (d) => d.return_due_date && d.return_due_date < today &&
             d.status !== 'returned' && d.status !== 'converted' && d.status !== 'lost',
    ).length,
  };

  const replenishment = triggerPackingReplenishment(entityCode);
  const reusable = summarizeReusablePacking(entityCode);

  const honest_empty =
    delivery_memos.total === 0 && samples.total === 0 &&
    demos.total === 0 && reusable.total === 0 &&
    replenishment.length === 0;

  return {
    generated_at: new Date().toISOString(),
    entity_id: entityCode,
    delivery_memos,
    samples,
    demos,
    packing_replenishment_alerts: replenishment.length,
    reusable_packing: reusable,
    honest_empty,
  };
}
