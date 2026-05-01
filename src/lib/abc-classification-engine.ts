/**
 * abc-classification-engine.ts — Pareto-based ABC analysis on issue value.
 * Sprint T-Phase-1.2.5
 *
 * Algorithm:
 *   1. For each item, compute issue value over windowDays from MINs + CEs
 *   2. Sort items DESC by issue value
 *   3. Walk cumulatively:
 *      - First 80% cumulative value → 'A'
 *      - Next 15% (80→95%) → 'B'
 *      - Last 5% (>95%) → 'C'
 *   4. Items with abc_class_pinned=true: skipped by applyAbcClassification
 *   5. Items with zero issues: 'C' by default
 */
import type { InventoryItem } from '@/types/inventory-item';
import type { MaterialIssueNote, ConsumptionEntry } from '@/types/consumption';
import { dAdd, dMul, round2 } from '@/lib/decimal-helpers';

export interface AbcClassificationResult {
  item_id: string;
  item_name: string;
  annualized_value: number;
  cumulative_pct: number;
  recommended_class: 'A' | 'B' | 'C';
  current_class: 'A' | 'B' | 'C' | null;
  is_pinned: boolean;
  will_change: boolean;
}

interface MinLineLite { item_id: string; qty: number }
interface CeLineLite { item_id: string; actual_qty: number; rate: number }

/** Returns true when an ISO date is within windowDays back from "now". */
function withinWindow(iso: string, windowDays: number): boolean {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return false;
  const cutoff = Date.now() - windowDays * 24 * 60 * 60 * 1000;
  return t >= cutoff;
}

export function classifyItemsABC(
  items: InventoryItem[],
  mins: MaterialIssueNote[],
  consumptionEntries: ConsumptionEntry[],
  windowDays: number = 365,
): AbcClassificationResult[] {
  // Build value-by-item map
  const valueByItem = new Map<string, number>();

  // MIN: rate is unknown on MIN.lines (snapshotted in CE), so use std_purchase_rate fallback
  const itemRate = new Map<string, number>();
  for (const it of items) {
    itemRate.set(it.id, it.std_purchase_rate ?? it.std_cost_rate ?? 0);
  }

  for (const m of mins) {
    if (m.status !== 'issued') continue;
    if (!m.issued_at || !withinWindow(m.issued_at, windowDays)) continue;
    for (const ln of (m.lines as MinLineLite[])) {
      const r = itemRate.get(ln.item_id) ?? 0;
      const cur = valueByItem.get(ln.item_id) ?? 0;
      valueByItem.set(ln.item_id, dAdd(cur, dMul(ln.qty, r)));
    }
  }

  for (const ce of consumptionEntries) {
    if (ce.status !== 'posted') continue;
    if (!ce.posted_at || !withinWindow(ce.posted_at, windowDays)) continue;
    for (const ln of (ce.lines as CeLineLite[])) {
      const cur = valueByItem.get(ln.item_id) ?? 0;
      valueByItem.set(ln.item_id, dAdd(cur, dMul(ln.actual_qty, ln.rate)));
    }
  }

  // Build initial result rows for ALL items
  const rows = items.map(it => ({
    item_id: it.id,
    item_name: it.name,
    annualized_value: round2(valueByItem.get(it.id) ?? 0),
    is_pinned: it.abc_class_pinned === true,
    current_class: it.abc_class ?? null,
  }));

  const totalValue = rows.reduce((s, r) => dAdd(s, r.annualized_value), 0);

  // Sort DESC by value
  rows.sort((a, b) => b.annualized_value - a.annualized_value);

  let cumulative = 0;
  const results: AbcClassificationResult[] = rows.map(r => {
    cumulative = dAdd(cumulative, r.annualized_value);
    const pct = totalValue > 0 ? round2((cumulative / totalValue) * 100) : 0;
    let recommended: 'A' | 'B' | 'C';
    if (r.annualized_value <= 0) recommended = 'C';
    else if (pct <= 80) recommended = 'A';
    else if (pct <= 95) recommended = 'B';
    else recommended = 'C';
    return {
      item_id: r.item_id,
      item_name: r.item_name,
      annualized_value: r.annualized_value,
      cumulative_pct: pct,
      recommended_class: recommended,
      current_class: r.current_class,
      is_pinned: r.is_pinned,
      will_change: !r.is_pinned && r.current_class !== recommended,
    };
  });

  return results;
}

/**
 * Apply classification — returns a NEW items array.
 * Pinned items are preserved (not modified). Caller persists the array.
 */
export function applyAbcClassification(
  results: AbcClassificationResult[],
  items: InventoryItem[],
): InventoryItem[] {
  const now = new Date().toISOString();
  const byId = new Map(results.map(r => [r.item_id, r]));
  return items.map(it => {
    const r = byId.get(it.id);
    if (!r) return it;
    if (r.is_pinned) return it;
    if (it.abc_class === r.recommended_class) return it;
    return {
      ...it,
      abc_class: r.recommended_class,
      abc_classified_at: now,
      updated_at: now,
    };
  });
}
