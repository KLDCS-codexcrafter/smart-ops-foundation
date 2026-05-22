/**
 * @file        src/lib/vendor-auto-rank-engine.ts
 * @purpose     OOB-50 · Vendor Scoring Auto-Rank · FR-19 SIBLING consumer
 * @sprint      T-Phase-2.A-Procure360-Phase2-Polish-Part-A · Block A · D-NEW-FT
 * @decisions   Q-LOCK-3(a) · vendor-scoring + vendor-reliability stay 0-DIFF · pure compute layer
 * @disciplines FR-19 · FR-22 · FR-30 · FR-54 CC SSOT
 * @reuses      vendor-scoring-engine.ts (getTopVendorsByScore · VendorScore)
 *              vendor-reliability-engine.ts (loadVendorScores · VendorReliabilityScore)
 */
import type { VendorScore } from '@/lib/vendor-scoring-engine';
import { getTopVendorsByScore } from '@/lib/vendor-scoring-engine';
import type { VendorReliabilityScore } from '@/types/vendor-reliability-score';
import { loadVendorScores as loadReliabilityScores } from '@/lib/vendor-reliability-engine';

export type RankBasis = 'composite_score' | 'reliability_score' | 'blended';

export interface VendorAutoRankEntry {
  vendor_id: string;
  vendor_name: string;
  composite_score: number;
  reliability_score: number;
  rank: number;
  rank_basis: RankBasis;
  is_suggested: boolean;
  suggestion_reason: string;
  factor_highlights: { factor: string; rank: number }[];
}

export interface ItemCategoryRanking {
  item_category: string;
  total_vendors_scored: number;
  top_3: VendorAutoRankEntry[];
  ranking_computed_at: string;
}

const BLEND_WEIGHTS = { composite: 0.6, reliability: 0.4 } as const;
const MAX_SCAN = 50;

function blendedScore(c: number, r: number): number {
  return c * BLEND_WEIGHTS.composite + r * BLEND_WEIGHTS.reliability;
}

function selectScore(entry: { composite_score: number; reliability_score: number }, basis: RankBasis): number {
  if (basis === 'composite_score') return entry.composite_score;
  if (basis === 'reliability_score') return entry.reliability_score;
  return blendedScore(entry.composite_score, entry.reliability_score);
}

/**
 * Auto-rank all vendors per item-category · top 3 highlighted.
 */
export function autoRankVendorsForCategory(
  entityCode: string,
  itemCategory: string,
  basis: RankBasis = 'blended',
): ItemCategoryRanking {
  const compositeScores: VendorScore[] = getTopVendorsByScore(entityCode, MAX_SCAN);
  const reliabilityScores: VendorReliabilityScore[] = loadReliabilityScores(entityCode);

  const vendorMap = new Map<string, { composite: VendorScore | null; reliability: VendorReliabilityScore | null }>();
  for (const cs of compositeScores) {
    vendorMap.set(cs.vendor_id, { composite: cs, reliability: null });
  }
  for (const rs of reliabilityScores) {
    const id = rs.related_foreign_vendor_id;
    const existing = vendorMap.get(id) ?? { composite: null, reliability: null };
    existing.reliability = rs;
    vendorMap.set(id, existing);
  }

  const entries: VendorAutoRankEntry[] = [];
  for (const [vendorId, scores] of vendorMap.entries()) {
    const composite_score = scores.composite?.total_score ?? 0;
    const reliability_score = scores.reliability?.components.composite_score ?? 0;

    const factor_highlights: { factor: string; rank: number }[] = [];
    if (scores.composite) {
      for (const f of scores.composite.factor_breakdown) {
        factor_highlights.push({ factor: f.name, rank: f.weighted_score });
      }
    }

    entries.push({
      vendor_id: vendorId,
      vendor_name: scores.composite?.vendor_name ?? scores.reliability?.vendor_name ?? vendorId,
      composite_score,
      reliability_score,
      rank: 0,
      rank_basis: basis,
      is_suggested: false,
      suggestion_reason: '',
      factor_highlights,
    });
  }

  entries.sort((a, b) => selectScore(b, basis) - selectScore(a, basis));
  entries.forEach((e, i) => {
    e.rank = i + 1;
    if (i === 0) {
      e.is_suggested = true;
      e.suggestion_reason = `Top-ranked · Composite ${e.composite_score} · Reliability ${e.reliability_score}`;
    }
  });

  return {
    item_category: itemCategory,
    total_vendors_scored: entries.length,
    top_3: entries.slice(0, 3),
    ranking_computed_at: new Date().toISOString(),
  };
}

export function getSuggestedVendor(
  entityCode: string,
  itemCategory: string,
): VendorAutoRankEntry | null {
  return autoRankVendorsForCategory(entityCode, itemCategory).top_3[0] ?? null;
}

export function getTopNRankedVendors(
  entityCode: string,
  itemCategory: string,
  n: number = 3,
): VendorAutoRankEntry[] {
  return autoRankVendorsForCategory(entityCode, itemCategory).top_3.slice(0, n);
}
