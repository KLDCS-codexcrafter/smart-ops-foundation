/**
 * @file        src/types/price-benchmark.ts
 * @purpose     OOB-52 · Price Benchmark SIBLING type · 16th SIBLING application
 * @sprint      T-Phase-2.A-Procure360-Phase2-Polish-Part-A · Block C · D-NEW-FV
 * @discipline  FR-22 canonical · FR-26 entity-scoped persistence cache
 */

export type BenchmarkWindow = '90_days' | '180_days' | '365_days';

export interface PriceBenchmarkPoint {
  item_id: string;
  item_name: string;
  vendor_id: string;
  vendor_name: string;
  rate: number;
  uom: string;
  po_id: string;
  po_date: string;
}

export interface ItemPriceBenchmark {
  item_id: string;
  item_name: string;
  computed_at: string;
  avg_90_days: number | null;
  avg_180_days: number | null;
  avg_365_days: number | null;
  last_5_po_prices: PriceBenchmarkPoint[];
  variance_indicator: 'green' | 'amber' | 'red' | 'unknown';
  /** PHASE 3 · external LME/MCX/industry API hookup */
  external_benchmark_phase3_stub: null;
}

export const priceBenchmarkCacheKey = (entityCode: string): string =>
  `erp_${entityCode}_price_benchmark_cache`;
