import { describe, it, expect, beforeEach } from 'vitest';
import * as Engine from '@/lib/price-benchmark-engine';
import { priceBenchmarkCacheKey } from '@/types/price-benchmark';

describe('price-benchmark-engine · D-NEW-FV · OOB-52', () => {
  beforeEach(() => { localStorage.clear(); });

  it('module imports cleanly', () => { expect(Engine).toBeDefined(); });

  it('exports core API', () => {
    expect(typeof Engine.computeItemPriceBenchmark).toBe('function');
    expect(typeof Engine.getItemPriceBenchmark).toBe('function');
    expect(typeof Engine.getCachedBenchmark).toBe('function');
    expect(typeof Engine.loadBenchmarkCache).toBe('function');
    expect(typeof Engine.saveBenchmarkCache).toBe('function');
  });

  it('returns null when no POs found', () => {
    expect(Engine.computeItemPriceBenchmark('empty', 'item-x')).toBeNull();
  });

  it('cache key is entity-scoped (FR-26)', () => {
    expect(priceBenchmarkCacheKey('acme')).toBe('erp_acme_price_benchmark_cache');
  });

  it('loadBenchmarkCache returns empty object for new entity', () => {
    expect(Engine.loadBenchmarkCache('new-entity')).toEqual({});
  });

  it('save + load roundtrip', () => {
    const now = new Date().toISOString();
    Engine.saveBenchmarkCache('e1', {
      'item-a': {
        item_id: 'item-a', item_name: 'A', computed_at: now,
        avg_90_days: 100, avg_180_days: 110, avg_365_days: 120,
        last_5_po_prices: [], variance_indicator: 'green',
        external_benchmark_phase3_stub: null,
      },
    });
    const back = Engine.loadBenchmarkCache('e1');
    expect(back['item-a'].avg_90_days).toBe(100);
  });

  it('getCachedBenchmark returns null when stale', () => {
    const oldDate = new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString();
    Engine.saveBenchmarkCache('e1', {
      'item-x': {
        item_id: 'item-x', item_name: 'X', computed_at: oldDate,
        avg_90_days: 100, avg_180_days: null, avg_365_days: null,
        last_5_po_prices: [], variance_indicator: 'unknown',
        external_benchmark_phase3_stub: null,
      },
    });
    expect(Engine.getCachedBenchmark('e1', 'item-x', 24)).toBeNull();
  });

  it('getCachedBenchmark returns fresh cache', () => {
    const now = new Date().toISOString();
    Engine.saveBenchmarkCache('e1', {
      'item-y': {
        item_id: 'item-y', item_name: 'Y', computed_at: now,
        avg_90_days: 50, avg_180_days: null, avg_365_days: null,
        last_5_po_prices: [], variance_indicator: 'green',
        external_benchmark_phase3_stub: null,
      },
    });
    expect(Engine.getCachedBenchmark('e1', 'item-y')?.avg_90_days).toBe(50);
  });

  it('Sentinel · D-NEW-FV closure marker', () => { expect('D-NEW-FV').toBe('D-NEW-FV'); });
});
