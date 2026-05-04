/**
 * @file        store-hub-engine.ts
 * @sprint      T-Phase-1.2.6f-d-2 · Block A · per D-298 (Q1=A 3-panel · Q2=A live computation)
 * @purpose     Stock Check + Reorder Suggestions + Demand Forecast for Store Hub.
 *              Live computation from voucher inventory_lines · NO new storage key.
 *              D-128 ZERO TOUCH · reads vouchersKey · iterates VoucherInventoryLine.
 * @decisions   D-298 · D-128 (voucher schemas ZERO TOUCH · we READ only) · D-194
 * @reuses      vouchersKey (finecore-engine) · Voucher · VoucherInventoryLine (types/voucher)
 *              · types/location-reorder-rule
 * @consumers   Block B · StoreHubPage 3 panels.
 * @notes       Direction is derived from base_voucher_type (matches finecore-engine
 *              isOutward heuristic) since VoucherInventoryLine has no direction field.
 *              Reorder threshold uses LocationReorderRule.min_stock (no reorder_level field).
 */

import type { Voucher, VoucherInventoryLine } from '@/types/voucher';
import { vouchersKey } from '@/lib/finecore-engine';
import type { LocationReorderRule } from '@/types/location-reorder-rule';

// ============================================================
// PUBLIC TYPES
// ============================================================

export interface StockBalance {
  item_id: string;
  item_name: string;
  godown_id: string;
  godown_name: string;
  qty_in: number;       // sum of inward voucher lines (Purchase, GRN, Stock Transfer in, etc.)
  qty_out: number;      // sum of outward voucher lines (Sales, Issue, Delivery Note, etc.)
  qty_balance: number;  // qty_in - qty_out
  uom: string;
  last_movement_date: string | null;
}

export interface ReorderSuggestion {
  item_id: string;
  item_name: string;
  godown_id: string;
  godown_name: string;
  current_balance: number;
  reorder_level: number;       // sourced from LocationReorderRule.min_stock
  reorder_qty: number;         // suggested quantity to order
  shortfall: number;           // reorder_level - current_balance
  uom: string;
  urgency: 'critical' | 'warning' | 'normal';
  safety_stock: number;
}

export interface DemandForecast {
  item_id: string;
  item_name: string;
  godown_id: string;
  consumed_30d: number;
  consumed_60d: number;
  consumed_90d: number;
  avg_daily_consumption: number;       // 90-day average
  days_of_cover: number | null;        // current_balance / avg_daily_consumption
  forecast_30d: number;                // avg_daily * 30
  uom: string;
}

// ============================================================
// DIRECTION RESOLVER · derived from base_voucher_type (D-128 zero-touch READ)
// Matches finecore-engine.ts:345 isOutward heuristic, generalised for inward types.
// ============================================================

const OUTWARD_TYPES: ReadonlySet<string> = new Set([
  'Sales',
  'Delivery Note',
  'Credit Note',
  'Material Issue',
  'Stock Issue',
]);

const INWARD_TYPES: ReadonlySet<string> = new Set([
  'Purchase',
  'GRN',
  'Goods Receipt Note',
  'Debit Note',
  'Capital Purchase',
  'Stock Receipt',
  'Manufacturing Journal',
]);

type Direction = 'in' | 'out' | 'neutral';

function resolveDirection(v: Voucher): Direction {
  const t = v.base_voucher_type as string;
  if (OUTWARD_TYPES.has(t)) return 'out';
  if (INWARD_TYPES.has(t)) return 'in';
  return 'neutral';
}

// ============================================================
// PUBLIC FUNCTIONS · 3 panels worth of logic
// ============================================================

/**
 * Compute stock balance per (item × godown) · live from voucher inventory_lines.
 * Cancelled vouchers are skipped. Date filter is inclusive (asOfDate).
 */
export function computeStockBalance(
  entityCode: string,
  filter?: { item_id?: string; godown_id?: string; asOfDate?: string },
): StockBalance[] {
  const vouchers = readVouchers(entityCode);
  const asOfTime = filter?.asOfDate ? new Date(filter.asOfDate).getTime() : Date.now();

  const buckets = new Map<string, StockBalance>();

  for (const v of vouchers) {
    if (v.status === 'cancelled' || v.is_cancelled) continue;
    if (!v.date || new Date(v.date).getTime() > asOfTime) continue;
    if (!v.inventory_lines || v.inventory_lines.length === 0) continue;

    const direction = resolveDirection(v);
    if (direction === 'neutral') continue;

    for (const line of v.inventory_lines as VoucherInventoryLine[]) {
      if (filter?.item_id && line.item_id !== filter.item_id) continue;
      if (filter?.godown_id && line.godown_id !== filter.godown_id) continue;

      const godownId = line.godown_id || 'NA';
      const key = `${line.item_id}:${godownId}`;
      const existing = buckets.get(key) ?? {
        item_id: line.item_id,
        item_name: line.item_name ?? '',
        godown_id: godownId,
        godown_name: line.godown_name || 'No Godown',
        qty_in: 0,
        qty_out: 0,
        qty_balance: 0,
        uom: line.uom ?? 'NOS',
        last_movement_date: null as string | null,
      };

      if (direction === 'in') existing.qty_in += line.qty;
      else existing.qty_out += line.qty;

      existing.qty_balance = existing.qty_in - existing.qty_out;
      if (!existing.last_movement_date || v.date > existing.last_movement_date) {
        existing.last_movement_date = v.date;
      }
      buckets.set(key, existing);
    }
  }

  return Array.from(buckets.values()).sort((a, b) => a.item_name.localeCompare(b.item_name));
}

/**
 * List items below reorder threshold · uses LocationReorderRule for thresholds.
 * reorder_level = rule.min_stock (LocationReorderRule has no explicit reorder_level field).
 * Inactive rules are skipped.
 */
export function listReorderSuggestions(entityCode: string): ReorderSuggestion[] {
  const balances = computeStockBalance(entityCode);
  const rules = readReorderRules(entityCode);
  const ruleMap = new Map<string, LocationReorderRule>();
  for (const r of rules) {
    if (!r.is_active) continue;
    ruleMap.set(`${r.item_id}:${r.godown_id}`, r);
  }

  const suggestions: ReorderSuggestion[] = [];
  for (const bal of balances) {
    const rule = ruleMap.get(`${bal.item_id}:${bal.godown_id}`);
    if (!rule) continue;
    const reorderLevel = rule.min_stock;
    if (bal.qty_balance >= reorderLevel) continue;

    const urgency: ReorderSuggestion['urgency'] = bal.qty_balance <= rule.safety_stock
      ? 'critical'
      : bal.qty_balance <= reorderLevel * 0.5
        ? 'warning'
        : 'normal';

    suggestions.push({
      item_id: bal.item_id,
      item_name: bal.item_name,
      godown_id: bal.godown_id,
      godown_name: bal.godown_name,
      current_balance: bal.qty_balance,
      reorder_level: reorderLevel,
      reorder_qty: rule.reorder_qty,
      shortfall: Math.max(0, reorderLevel - bal.qty_balance),
      uom: bal.uom,
      urgency,
      safety_stock: rule.safety_stock,
    });
  }

  const order: Record<ReorderSuggestion['urgency'], number> = { critical: 0, warning: 1, normal: 2 };
  return suggestions.sort((a, b) => order[a.urgency] - order[b.urgency] || a.item_name.localeCompare(b.item_name));
}

/**
 * 30/60/90-day consumption forecast · simple moving-average pattern.
 * Phase 1: average-of-90 forecast. Phase 2 may swap in ML.
 */
export function computeDemandForecast(entityCode: string): DemandForecast[] {
  const vouchers = readVouchers(entityCode);
  const balances = computeStockBalance(entityCode);
  const balanceMap = new Map(balances.map((b) => [`${b.item_id}:${b.godown_id}`, b]));

  const now = Date.now();
  const dayMs = 86400000;
  const buckets = new Map<string, DemandForecast>();

  for (const v of vouchers) {
    if (v.status === 'cancelled' || v.is_cancelled) continue;
    if (!v.inventory_lines || v.inventory_lines.length === 0) continue;
    if (resolveDirection(v) !== 'out') continue;        // forecast = consumption only
    if (!v.date) continue;

    const ageDays = (now - new Date(v.date).getTime()) / dayMs;
    if (ageDays < 0 || ageDays > 90) continue;

    for (const line of v.inventory_lines as VoucherInventoryLine[]) {
      const godownId = line.godown_id || 'NA';
      const key = `${line.item_id}:${godownId}`;
      const existing = buckets.get(key) ?? {
        item_id: line.item_id,
        item_name: line.item_name ?? '',
        godown_id: godownId,
        consumed_30d: 0,
        consumed_60d: 0,
        consumed_90d: 0,
        avg_daily_consumption: 0,
        days_of_cover: null as number | null,
        forecast_30d: 0,
        uom: line.uom ?? 'NOS',
      };

      if (ageDays <= 30) existing.consumed_30d += line.qty;
      if (ageDays <= 60) existing.consumed_60d += line.qty;
      if (ageDays <= 90) existing.consumed_90d += line.qty;
      buckets.set(key, existing);
    }
  }

  for (const [key, b] of buckets.entries()) {
    b.avg_daily_consumption = b.consumed_90d / 90;
    b.forecast_30d = Math.round(b.avg_daily_consumption * 30);
    const bal = balanceMap.get(key);
    if (bal && b.avg_daily_consumption > 0) {
      b.days_of_cover = Math.round(bal.qty_balance / b.avg_daily_consumption);
    }
  }

  return Array.from(buckets.values()).sort((a, b) => b.consumed_30d - a.consumed_30d);
}

// ============================================================
// PRIVATE HELPERS · localStorage reads · D-194 canonical pattern
// ============================================================

function readVouchers(entityCode: string): Voucher[] {
  // [JWT] GET /api/accounting/vouchers?entityCode=...
  try {
    const raw = localStorage.getItem(vouchersKey(entityCode));
    return raw ? (JSON.parse(raw) as Voucher[]) : [];
  } catch { return []; }
}

function readReorderRules(entityCode: string): LocationReorderRule[] {
  // [JWT] GET /api/inventory/location-reorder-rules?entityCode=...
  try {
    const raw = localStorage.getItem(`erp_location_reorder_rules_${entityCode}`);
    return raw ? (JSON.parse(raw) as LocationReorderRule[]) : [];
  } catch { return []; }
}
