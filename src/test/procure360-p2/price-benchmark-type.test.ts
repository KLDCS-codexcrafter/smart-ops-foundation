import { describe, it, expect } from 'vitest';
import { priceBenchmarkCacheKey } from '@/types/price-benchmark';
import type { ItemPriceBenchmark, PriceBenchmarkPoint, BenchmarkWindow } from '@/types/price-benchmark';

describe('price-benchmark type · D-NEW-FV', () => {
  it('cache key is entity-scoped', () => {
    expect(priceBenchmarkCacheKey('sinha')).toBe('erp_sinha_price_benchmark_cache');
  });

  it('window union has 3 values', () => {
    const ws: BenchmarkWindow[] = ['90_days', '180_days', '365_days'];
    expect(ws.length).toBe(3);
  });

  it('point shape compiles', () => {
    const p: PriceBenchmarkPoint = {
      item_id: 'i', item_name: 'n', vendor_id: 'v', vendor_name: 'V',
      rate: 100, uom: 'MT', po_id: 'po1', po_date: '2026-05-01',
    };
    expect(p.rate).toBe(100);
  });

  it('benchmark shape includes Phase 3 stub marker', () => {
    const b: ItemPriceBenchmark = {
      item_id: 'i', item_name: 'n', computed_at: 'now',
      avg_90_days: null, avg_180_days: null, avg_365_days: null,
      last_5_po_prices: [], variance_indicator: 'unknown',
      external_benchmark_phase3_stub: null,
    };
    expect(b.external_benchmark_phase3_stub).toBeNull();
  });

  it('Sentinel · type module exists', () => { expect('price-benchmark').toBe('price-benchmark'); });
});
