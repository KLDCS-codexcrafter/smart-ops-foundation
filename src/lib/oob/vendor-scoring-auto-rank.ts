/**
 * vendor-scoring-auto-rank.ts — OOB-50 · auto-rank top 5 vendors
 * Sprint T-Phase-1.2.6f-a
 */
import { getTopVendorsByScore, type VendorScore } from '../vendor-scoring-engine';

export function autoRankTopVendors(entityCode: string, n: number = 5): VendorScore[] {
  return getTopVendorsByScore(entityCode, n);
}
