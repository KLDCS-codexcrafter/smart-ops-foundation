/**
 * social-proof-engine.ts — Derive social proof signals from order history
 * Out-of-box idea #1 of 5. No new data sources — uses existing order + rating stores.
 */

export interface SocialProofSignal {
  kind: 'recent_buyers' | 'rating_count' | 'top_rated' | 'trending_location';
  item_id: string;
  text: string;              // e.g. '14 customers in Kolkata bought this today'
  strength: number;          // 0..100 (for sorting when multiple signals apply)
}

interface OrderLite {
  item_id: string;
  qty: number;
  placed_at: string;
  city?: string;
}

interface RatingLite {
  item_id: string;
  stars: number;
  rated_at: string;
}

const MS_PER_DAY = 86_400_000;

/** Build signals for a single item — returns 0-3 strongest. */
export function signalsForItem(
  itemId: string, orders: OrderLite[], ratings: RatingLite[],
  viewerCity?: string,
): SocialProofSignal[] {
  const signals: SocialProofSignal[] = [];
  const now = Date.now();

  const todayStart = now - MS_PER_DAY;
  const weekStart  = now - 7 * MS_PER_DAY;

  // Signal A: Recent buyers today, same city if possible
  const itemOrders = orders.filter(o => o.item_id === itemId);
  const todayOrders = itemOrders.filter(o => new Date(o.placed_at).getTime() >= todayStart);
  if (todayOrders.length >= 3) {
    const sameCity = viewerCity
      ? todayOrders.filter(o => o.city === viewerCity).length
      : 0;
    if (sameCity >= 3) {
      signals.push({
        kind: 'recent_buyers', item_id: itemId,
        text: `${sameCity} customers in ${viewerCity} bought this today`,
        strength: 90,
      });
    } else {
      signals.push({
        kind: 'recent_buyers', item_id: itemId,
        text: `${todayOrders.length} customers bought this today`,
        strength: 70,
      });
    }
  }

  // Signal B: Trending in location — buyers this week
  const weekOrders = itemOrders.filter(o => new Date(o.placed_at).getTime() >= weekStart);
  if (weekOrders.length >= 20 && signals.length === 0) {
    signals.push({
      kind: 'trending_location', item_id: itemId,
      text: `Trending — ${weekOrders.length} bought this week`,
      strength: 60,
    });
  }

  // Signal C: Rating-based
  const itemRatings = ratings.filter(r => r.item_id === itemId);
  if (itemRatings.length >= 5) {
    const avg = itemRatings.reduce((s, r) => s + r.stars, 0) / itemRatings.length;
    if (avg >= 4.5) {
      signals.push({
        kind: 'top_rated', item_id: itemId,
        text: `Top-rated — ${Math.round(avg * 10) / 10}★ from ${itemRatings.length} customers`,
        strength: 80,
      });
    } else if (itemRatings.length >= 10) {
      signals.push({
        kind: 'rating_count', item_id: itemId,
        text: `${itemRatings.length} customers rated this`,
        strength: 40,
      });
    }
  }

  return signals.sort((a, b) => b.strength - a.strength).slice(0, 2);
}

/** Batch-compute signals for a list of items. */
export function signalsForCatalog(
  itemIds: string[], orders: OrderLite[], ratings: RatingLite[],
  viewerCity?: string,
): Map<string, SocialProofSignal[]> {
  const out = new Map<string, SocialProofSignal[]>();
  for (const id of itemIds) {
    out.set(id, signalsForItem(id, orders, ratings, viewerCity));
  }
  return out;
}
