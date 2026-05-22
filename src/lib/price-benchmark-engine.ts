/**
 * @file        src/lib/price-benchmark-engine.ts
 * @purpose     OOB-52 · Price Benchmark Stub · 16th SIBLING application
 * @sprint      T-Phase-2.A-Procure360-Phase2-Polish-Part-A · Block C · D-NEW-FV
 * @decisions   Q-LOCK-5(a) FR-19 SIBLING · po-management-engine 0-DIFF · Phase 3 external API stub markers
 * @disciplines FR-19 · FR-22 · FR-26 cached persistence
 * @reuses      listPurchaseOrders (po-management-engine · pure read)
 * @[JWT]       GET /api/procure360/benchmark/:itemId
 */
import { listPurchaseOrders } from '@/lib/po-management-engine';
import type { ItemPriceBenchmark, PriceBenchmarkPoint } from '@/types/price-benchmark';
import { priceBenchmarkCacheKey } from '@/types/price-benchmark';

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

function avg(arr: PriceBenchmarkPoint[]): number | null {
  return arr.length > 0 ? arr.reduce((s, p) => s + p.rate, 0) / arr.length : null;
}

export function computeItemPriceBenchmark(
  entityCode: string,
  itemId: string,
): ItemPriceBenchmark | null {
  const allPOs = listPurchaseOrders(entityCode);
  const points: PriceBenchmarkPoint[] = [];

  for (const po of allPOs) {
    for (const line of po.lines ?? []) {
      if (line.item_id === itemId && line.rate > 0) {
        points.push({
          item_id: itemId,
          item_name: line.item_name ?? '',
          vendor_id: po.vendor_id,
          vendor_name: po.vendor_name ?? '',
          rate: line.rate,
          uom: line.uom ?? '',
          po_id: po.id,
          po_date: po.po_date,
        });
      }
    }
  }

  if (points.length === 0) return null;

  const d90 = daysAgo(90);
  const d180 = daysAgo(180);
  const d365 = daysAgo(365);

  const last90 = points.filter((p) => new Date(p.po_date) >= d90);
  const last180 = points.filter((p) => new Date(p.po_date) >= d180);
  const last365 = points.filter((p) => new Date(p.po_date) >= d365);

  const sorted = [...points].sort(
    (a, b) => new Date(b.po_date).getTime() - new Date(a.po_date).getTime(),
  );
  const last5 = sorted.slice(0, 5);

  const avg180 = avg(last180);
  let variance: ItemPriceBenchmark['variance_indicator'] = 'unknown';
  if (avg180 !== null && last5[0]) {
    const ratio = last5[0].rate / avg180;
    if (ratio <= 0.95) variance = 'green';
    else if (ratio <= 1.10) variance = 'amber';
    else variance = 'red';
  }

  return {
    item_id: itemId,
    item_name: last5[0]?.item_name ?? '',
    computed_at: new Date().toISOString(),
    avg_90_days: avg(last90),
    avg_180_days: avg180,
    avg_365_days: avg(last365),
    last_5_po_prices: last5,
    variance_indicator: variance,
    external_benchmark_phase3_stub: null,
  };
}

export function loadBenchmarkCache(entityCode: string): Record<string, ItemPriceBenchmark> {
  try {
    const raw = localStorage.getItem(priceBenchmarkCacheKey(entityCode));
    return raw ? (JSON.parse(raw) as Record<string, ItemPriceBenchmark>) : {};
  } catch {
    return {};
  }
}

export function saveBenchmarkCache(
  entityCode: string,
  cache: Record<string, ItemPriceBenchmark>,
): void {
  localStorage.setItem(priceBenchmarkCacheKey(entityCode), JSON.stringify(cache));
}

export function getCachedBenchmark(
  entityCode: string,
  itemId: string,
  maxAgeHours: number = 24,
): ItemPriceBenchmark | null {
  const cache = loadBenchmarkCache(entityCode);
  const cached = cache[itemId];
  if (!cached) return null;
  const ageMs = Date.now() - new Date(cached.computed_at).getTime();
  if (ageMs > maxAgeHours * 60 * 60 * 1000) return null;
  return cached;
}

export function getItemPriceBenchmark(
  entityCode: string,
  itemId: string,
): ItemPriceBenchmark | null {
  const cached = getCachedBenchmark(entityCode, itemId);
  if (cached) return cached;
  const fresh = computeItemPriceBenchmark(entityCode, itemId);
  if (fresh) {
    const cache = loadBenchmarkCache(entityCode);
    cache[itemId] = fresh;
    saveBenchmarkCache(entityCode, cache);
  }
  return fresh;
}
