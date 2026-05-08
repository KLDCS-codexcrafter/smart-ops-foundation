/**
 * @file        purchase-cost-variance-engine.ts
 * @purpose     3-tier purchase cost variance (Item · Group · Category) with reference rate priority:
 *              rate-contract → ItemRateHistory.std_purchase → rolling-avg fallback.
 *              Pure compute · canonical Operix variance pattern (modeled on production-variance-engine).
 * @who         Procurement / Finance / Costing
 * @when        2026-05-08
 * @sprint      T-Phase-1.A.3.d-Procure360-Variance-Trident-Polish
 * @iso         25010 · Functional Suitability + Reliability (deterministic · pure)
 * @whom        Procurement department (FR-40 · pain bucket #4)
 * @decisions   D-NEW-AR (3-tier purchase cost variance · canonical pattern)
 * @disciplines FR-19 (consume engines · zero rewrite) · FR-22 (canonical types) · FR-30 · FR-50
 * @reuses      po-management-engine (listPurchaseOrders · PurchaseOrderRecord · PurchaseOrderLine) ·
 *              rate-contract-engine (findActiveRate · 3-arg signature) ·
 *              decimal-helpers (dSub · dMul · round2)
 * @[JWT]       n/a · pure compute (reads localStorage via consumed engines)
 */

import {
  listPurchaseOrders,
  type PurchaseOrderRecord,
  type PurchaseOrderLine,
} from './po-management-engine';
import { findActiveRate } from './rate-contract-engine';
import type { ItemRateHistory } from '@/types/item-rate-history';
import { dSub, dMul, round2 } from './decimal-helpers';

export type VarianceTier = 'item' | 'group' | 'category';
export type VarianceDirection = 'favorable' | 'unfavorable' | 'flat';
export type ReferenceRateSource = 'contract' | 'std_purchase' | 'rolling_avg' | 'none';

export interface PurchaseCostVariance {
  tier: VarianceTier;
  dimension_id: string;
  dimension_name: string;
  reference_rate: number;
  reference_source: ReferenceRateSource;
  actual_rate: number;
  qty: number;
  variance_amount: number;
  variance_pct: number;
  direction: VarianceDirection;
  threshold_breach: boolean;
  contributing_pos: string[];
  computed_at: string;
}

export interface VarianceThresholds {
  pct_breach: number;       // default 10
  amount_breach: number;    // default ₹50,000
}

const DEFAULT_THRESHOLDS: VarianceThresholds = {
  pct_breach: 10,
  amount_breach: 50_000,
};

const VARIANCE_WINDOW_DAYS = 90;
const ROLLING_AVG_LOOKBACK_DAYS = 180;
const FLAT_AMOUNT_THRESHOLD = 100; // |amount| < ₹100 = flat

const ITEM_RATE_HISTORY_KEY = 'erp_item_rate_history';

// [JWT] GET /api/inventory/item-rates/history
function readItemRateHistory(): ItemRateHistory[] {
  try {
    return JSON.parse(localStorage.getItem(ITEM_RATE_HISTORY_KEY) ?? '[]') as ItemRateHistory[];
  } catch {
    return [];
  }
}

function isWithinWindow(isoDate: string, windowDays: number): boolean {
  const ageMs = Date.now() - new Date(isoDate).getTime();
  return ageMs <= windowDays * 86_400_000;
}

function isOlderThanWindow(isoDate: string, windowDays: number): boolean {
  const ageMs = Date.now() - new Date(isoDate).getTime();
  return ageMs > windowDays * 86_400_000;
}

/**
 * Resolve the reference rate for an item · priority: contract → std_purchase → rolling_avg.
 * Returns null if no source can produce a rate.
 */
function resolveReferenceRate(
  itemId: string,
  vendorId: string | null,
  entityCode: string,
  allPos: PurchaseOrderRecord[],
): { rate: number; source: ReferenceRateSource } | null {
  // Priority 1: active rate contract (only if vendor specified · contract is vendor-scoped)
  if (vendorId) {
    const contractMatch = findActiveRate(entityCode, vendorId, itemId);
    if (contractMatch && contractMatch.line.rate > 0) {
      return { rate: contractMatch.line.rate, source: 'contract' };
    }
  }

  // Priority 2: latest ItemRateHistory entry · rate_type = 'std_purchase'
  const history = readItemRateHistory();
  const stdPurchase = history
    .filter((h) => h.item_id === itemId && h.rate_type === 'std_purchase')
    .sort((a, b) => b.effective_from.localeCompare(a.effective_from))[0];
  if (stdPurchase && stdPurchase.new_rate > 0) {
    return { rate: stdPurchase.new_rate, source: 'std_purchase' };
  }

  // Priority 3: rolling avg of PO rates over last 180 days (excluding current 90-day window)
  const rollingLines: PurchaseOrderLine[] = [];
  for (const po of allPos) {
    if (!isWithinWindow(po.created_at, ROLLING_AVG_LOOKBACK_DAYS)) continue;
    if (!isOlderThanWindow(po.created_at, VARIANCE_WINDOW_DAYS)) continue;
    for (const line of po.lines) {
      if (line.item_id === itemId && line.rate > 0) rollingLines.push(line);
    }
  }
  if (rollingLines.length > 0) {
    const totalQty = rollingLines.reduce((s, l) => s + l.qty, 0);
    if (totalQty > 0) {
      const weighted = rollingLines.reduce((s, l) => s + l.rate * l.qty, 0);
      return { rate: round2(weighted / totalQty), source: 'rolling_avg' };
    }
  }

  return null;
}

function computeVarianceFromLines(
  lines: PurchaseOrderLine[],
  referenceRate: number,
  contributingPoIds: string[],
  thresholds: VarianceThresholds,
): Pick<PurchaseCostVariance,
  'actual_rate' | 'qty' | 'variance_amount' | 'variance_pct' | 'direction' | 'threshold_breach' | 'contributing_pos'
> {
  const totalQty = lines.reduce((s, l) => s + l.qty, 0);
  if (totalQty === 0) {
    return {
      actual_rate: 0, qty: 0, variance_amount: 0, variance_pct: 0,
      direction: 'flat', threshold_breach: false, contributing_pos: contributingPoIds,
    };
  }
  const weighted = lines.reduce((s, l) => s + l.rate * l.qty, 0);
  const actualRate = round2(weighted / totalQty);
  const varianceAmount = round2(dMul(dSub(actualRate, referenceRate), totalQty));
  const variancePct = referenceRate > 0
    ? round2((dSub(actualRate, referenceRate) / referenceRate) * 100)
    : 0;

  let direction: VarianceDirection = 'flat';
  if (Math.abs(varianceAmount) >= FLAT_AMOUNT_THRESHOLD) {
    direction = varianceAmount > 0 ? 'unfavorable' : 'favorable';
  }

  const breach = Math.abs(variancePct) >= thresholds.pct_breach
    || Math.abs(varianceAmount) >= thresholds.amount_breach;

  return {
    actual_rate: actualRate, qty: totalQty, variance_amount: varianceAmount,
    variance_pct: variancePct, direction, threshold_breach: breach,
    contributing_pos: contributingPoIds,
  };
}

export function computePurchaseCostVarianceItem(
  itemId: string,
  entityCode: string,
  thresholds: VarianceThresholds = DEFAULT_THRESHOLDS,
): PurchaseCostVariance | null {
  const allPos = listPurchaseOrders(entityCode);
  const recentLines: PurchaseOrderLine[] = [];
  const contributingPoIds = new Set<string>();
  let itemName = itemId;
  let primaryVendorId: string | null = null;

  for (const po of allPos) {
    if (!isWithinWindow(po.created_at, VARIANCE_WINDOW_DAYS)) continue;
    for (const line of po.lines) {
      if (line.item_id !== itemId) continue;
      if (line.rate <= 0) continue;
      recentLines.push(line);
      contributingPoIds.add(po.id);
      if (line.item_name) itemName = line.item_name;
      if (!primaryVendorId) primaryVendorId = po.vendor_id;
    }
  }

  if (recentLines.length === 0) return null;

  const ref = resolveReferenceRate(itemId, primaryVendorId, entityCode, allPos);
  if (!ref) return null;

  const computed = computeVarianceFromLines(recentLines, ref.rate, Array.from(contributingPoIds), thresholds);

  return {
    tier: 'item',
    dimension_id: itemId,
    dimension_name: itemName,
    reference_rate: ref.rate,
    reference_source: ref.source,
    ...computed,
    computed_at: new Date().toISOString(),
  };
}

export function listAllPurchaseCostVariances(
  entityCode: string,
  tier: VarianceTier = 'item',
  thresholds: VarianceThresholds = DEFAULT_THRESHOLDS,
): PurchaseCostVariance[] {
  const allPos = listPurchaseOrders(entityCode);

  if (tier === 'item') {
    const itemIds = new Set<string>();
    for (const po of allPos) {
      if (!isWithinWindow(po.created_at, VARIANCE_WINDOW_DAYS)) continue;
      for (const line of po.lines) itemIds.add(line.item_id);
    }
    return Array.from(itemIds)
      .map((id) => computePurchaseCostVarianceItem(id, entityCode, thresholds))
      .filter((v): v is PurchaseCostVariance => v !== null)
      .sort((a, b) => Math.abs(b.variance_amount) - Math.abs(a.variance_amount));
  }

  // Aggregate item-level into group / category dimensions.
  // Phase 1 heuristic: derive bucket from item_id prefix (e.g., "RAW-" · "FG-" · "CAP-").
  // [JWT] join with /api/inventory/items for true stock_group_id / classification_id (deferred · D-NEW-AR future enhancement)
  const itemVariances = listAllPurchaseCostVariances(entityCode, 'item', thresholds);

  const buckets = new Map<string, {
    name: string;
    lines: { actual: number; qty: number; ref: number; pos: string[] }[];
  }>();

  for (const v of itemVariances) {
    const prefix = v.dimension_id.split('-')[0] || 'OTHER';
    const bucketKey = tier === 'group' ? `GRP-${prefix}` : `CAT-${prefix}`;
    const bucketName = tier === 'group' ? `Group ${prefix}` : `Category ${prefix}`;

    if (!buckets.has(bucketKey)) {
      buckets.set(bucketKey, { name: bucketName, lines: [] });
    }
    buckets.get(bucketKey)!.lines.push({
      actual: v.actual_rate,
      qty: v.qty,
      ref: v.reference_rate,
      pos: v.contributing_pos,
    });
  }

  const out: PurchaseCostVariance[] = [];
  for (const [key, b] of buckets.entries()) {
    const totalQty = b.lines.reduce((s, l) => s + l.qty, 0);
    if (totalQty === 0) continue;
    const weightedActual = b.lines.reduce((s, l) => s + l.actual * l.qty, 0) / totalQty;
    const weightedRef = b.lines.reduce((s, l) => s + l.ref * l.qty, 0) / totalQty;
    const variance = round2(dMul(dSub(weightedActual, weightedRef), totalQty));
    const pct = weightedRef > 0 ? round2((dSub(weightedActual, weightedRef) / weightedRef) * 100) : 0;

    let dir: VarianceDirection = 'flat';
    if (Math.abs(variance) >= FLAT_AMOUNT_THRESHOLD) dir = variance > 0 ? 'unfavorable' : 'favorable';

    const allPoIds = Array.from(new Set(b.lines.flatMap((l) => l.pos)));

    out.push({
      tier,
      dimension_id: key,
      dimension_name: b.name,
      reference_rate: round2(weightedRef),
      reference_source: 'rolling_avg',
      actual_rate: round2(weightedActual),
      qty: totalQty,
      variance_amount: variance,
      variance_pct: pct,
      direction: dir,
      threshold_breach: Math.abs(pct) >= thresholds.pct_breach || Math.abs(variance) >= thresholds.amount_breach,
      contributing_pos: allPoIds,
      computed_at: new Date().toISOString(),
    });
  }

  return out.sort((a, b) => Math.abs(b.variance_amount) - Math.abs(a.variance_amount));
}
