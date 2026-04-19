/**
 * customer-recommendation-engine.ts — Co-occurrence collaborative filtering
 * 'Customers who bought X also bought Y' — pure in-memory algorithm.
 * No ML library needed; co-occurrence matrix is sufficient for ERP scale.
 * Pure: no React, no localStorage.
 */

export interface OrderHistoryLite {
  customer_id: string;
  item_id: string;
}

export interface RecommendationResult {
  item_id: string;
  score: number;                    // 0..1 co-occurrence confidence
  also_bought_count: number;        // how many customers bought both
  reason: string;                   // e.g. 'Bought by 12 customers who also bought Atta'
}

/** Build item co-occurrence matrix from order history. */
function buildCoOccurrence(orders: OrderHistoryLite[]): Map<string, Map<string, number>> {
  // customer_id -> Set of item_ids
  const byCust = new Map<string, Set<string>>();
  for (const o of orders) {
    const set = byCust.get(o.customer_id) ?? new Set<string>();
    set.add(o.item_id);
    byCust.set(o.customer_id, set);
  }
  // For each pair of items in a customer's basket, increment co-occurrence
  const matrix = new Map<string, Map<string, number>>();
  for (const items of byCust.values()) {
    const arr = Array.from(items);
    for (let i = 0; i < arr.length; i++) {
      for (let j = 0; j < arr.length; j++) {
        if (i === j) continue;
        const row = matrix.get(arr[i]) ?? new Map<string, number>();
        row.set(arr[j], (row.get(arr[j]) ?? 0) + 1);
        matrix.set(arr[i], row);
      }
    }
  }
  return matrix;
}

/** Recommend top-N items for a given item. */
export function recommendForItem(
  itemId: string, orders: OrderHistoryLite[], limit: number = 5,
  itemNameLookup?: Map<string, string>,
): RecommendationResult[] {
  const matrix = buildCoOccurrence(orders);
  const row = matrix.get(itemId);
  if (!row) return [];

  const total = Array.from(row.values()).reduce((s, n) => s + n, 0);
  if (total === 0) return [];

  const anchorName = itemNameLookup?.get(itemId) ?? itemId;

  return Array.from(row.entries())
    .map(([id, count]) => ({
      item_id: id,
      score: Math.round((count / total) * 100) / 100,
      also_bought_count: count,
      reason: `Bought by ${count} customers who also bought ${anchorName}`,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/** Recommend for entire cart — unions suggestions across all cart items. */
export function recommendForCart(
  cartItemIds: string[], orders: OrderHistoryLite[], limit: number = 6,
  itemNameLookup?: Map<string, string>,
): RecommendationResult[] {
  const combined = new Map<string, RecommendationResult>();
  for (const itemId of cartItemIds) {
    const recs = recommendForItem(itemId, orders, limit * 2, itemNameLookup);
    for (const r of recs) {
      if (cartItemIds.includes(r.item_id)) continue; // don't recommend what's already in cart
      const existing = combined.get(r.item_id);
      if (existing) {
        existing.score = Math.max(existing.score, r.score);
        existing.also_bought_count += r.also_bought_count;
      } else {
        combined.set(r.item_id, { ...r });
      }
    }
  }
  return Array.from(combined.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
