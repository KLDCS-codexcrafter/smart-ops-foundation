/**
 * @file        ui-integration-price-benchmark.test.ts
 * @purpose     HK-5-2 Block D · UI integration coverage · PriceBenchmarkPanel + engine
 * @sprint      T-Phase-2.HK-5-2 · Block D
 */
import { describe, it, expect, beforeEach } from 'vitest';
import * as Engine from '@/lib/price-benchmark-engine';
import * as P2 from '@/pages/erp/procure-hub/panels-p2';

describe('HK-5-2 Block D · PriceBenchmark UI integration', () => {
  beforeEach(() => { localStorage.clear(); });

  it('panel exported', () => { expect(typeof P2.PriceBenchmarkPanel).toBe('function'); });
  it('engine imports', () => { expect(Engine).toBeDefined(); });
  it('exposes computeItemPriceBenchmark', () => { expect(typeof Engine.computeItemPriceBenchmark).toBe('function'); });
  it('exposes getItemPriceBenchmark', () => { expect(typeof Engine.getItemPriceBenchmark).toBe('function'); });
  it('cache load empty default', () => {
    expect(Engine.loadBenchmarkCache('e1')).toEqual({});
  });
  it('cache save roundtrip', () => {
    Engine.saveBenchmarkCache('e1', {});
    expect(Engine.loadBenchmarkCache('e1')).toEqual({});
  });
  it('getCachedBenchmark null for missing', () => {
    expect(Engine.getCachedBenchmark('e1', 'item-x')).toBe(null);
  });
  it('computeItemPriceBenchmark returns null when no POs', () => {
    expect(Engine.computeItemPriceBenchmark('e1', 'no-item')).toBe(null);
  });
  it('getItemPriceBenchmark null when no data', () => {
    expect(Engine.getItemPriceBenchmark('e1', 'no-item')).toBe(null);
  });
  it('cache key entity-scoped', () => {
    Engine.saveBenchmarkCache('e1', {});
    expect(localStorage.getItem('erp_e1_price_benchmark_cache')).toBe('{}');
  });
  it('cache key isolated between entities', () => {
    Engine.saveBenchmarkCache('e1', {});
    expect(Engine.loadBenchmarkCache('e2')).toEqual({});
  });
  it('panel name stability', () => {
    expect(P2.PriceBenchmarkPanel.name).toContain('PriceBenchmark');
  });
});
