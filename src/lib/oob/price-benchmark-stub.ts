/**
 * price-benchmark-stub.ts — OOB-52 · per FR-26 stub now · Phase 1.4 ML
 * Sprint T-Phase-1.2.6f-a
 */
import { computeBestPriceAnalysis } from '../procure360-report-engine';

export interface BenchmarkHint {
  item_id: string;
  your_rate: number;
  industry_avg: number;
  delta_percent: number;
  signal: 'fair' | 'high' | 'very_high' | 'low';
}

export function getBenchmarkHint(
  itemId: string,
  yourRate: number,
  entityCode: string,
): BenchmarkHint | null {
  const trends = computeBestPriceAnalysis(itemId, entityCode);
  if (trends.length === 0) return null;
  const avg = trends.reduce((s, t) => s + t.rate, 0) / trends.length;
  const delta = ((yourRate - avg) / avg) * 100;
  let signal: BenchmarkHint['signal'] = 'fair';
  if (delta > 20) signal = 'very_high';
  else if (delta > 10) signal = 'high';
  else if (delta < -10) signal = 'low';
  return {
    item_id: itemId,
    your_rate: yourRate,
    industry_avg: Math.round(avg * 100) / 100,
    delta_percent: Math.round(delta * 100) / 100,
    signal,
  };
}
