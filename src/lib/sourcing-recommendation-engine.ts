/**
 * @file        sourcing-recommendation-engine.ts
 * @purpose     Recommend sourcing strategy (single / split_2 / split_3+ / force_alternate)
 *              per item, based on vendor scoring + price spread + concentration risk.
 *              Pure compute · safe to call from panels.
 *              Renamed from `multi-sourcing-strategy-engine.ts` to avoid collision with the
 *              existing D-299 engine (which uses the same path with a different API).
 * @who         Procurement strategy / Lovable
 * @when        2026-05-08
 * @sprint      T-Phase-1.A.3.c-Procure360-OOB-Polish-PEQ-FU
 * @iso         25010 · Functional Suitability + Reliability (deterministic · pure)
 * @whom        Procurement department (FR-40 · pain bucket #3)
 * @decisions   D-NEW-AN (Multi-Sourcing Strategy on top of existing scoring + alternate-suggest)
 * @disciplines FR-19 (consume engines · zero rewrite) · FR-22 (consume canonical types) · FR-30 · FR-50
 * @reuses      vendor-scoring-engine (getVendorsForItemByScore · getTopVendorsByScore) ·
 *              procurement-enquiry-engine (listEnquiries) ·
 *              po-management-engine (listPurchaseOrders) ·
 *              decimal-helpers
 * @[JWT]       n/a · pure compute (reads localStorage via consumed engines · no writes)
 */

import {
  getVendorsForItemByScore,
  type VendorScore,
} from './vendor-scoring-engine';
import { listEnquiries } from './procurement-enquiry-engine';
import { listPurchaseOrders } from './po-management-engine';
import { round2, dPct } from './decimal-helpers';

export type MultiSourceStrategy =
  | 'single'           // No alternate needed · top vendor dominates
  | 'split_2'          // 2-vendor split recommended
  | 'split_3+'         // 3+ vendor split (high-volume items)
  | 'force_alternate'; // Top vendor concentration too risky

export interface SourcingRecommendation {
  context_id: string;       // enquiry_id (or 'historical' if no live enquiry)
  context_kind: 'enquiry' | 'historical';
  item_id: string;
  item_name: string;
  recommended_strategy: MultiSourceStrategy;
  rationale: string[];      // human-readable bullets
  primary_vendor_id: string;
  primary_vendor_name: string;
  primary_share_pct: number;
  alternate_vendor_ids: string[];
  alternate_vendor_names: string[];
  alternate_shares_pct: number[];
  computed_at: string;
}

// Heuristic constants · easy to tune
const CONCENTRATION_THRESHOLD_PCT = 70;
const FORCE_ALTERNATE_THRESHOLD_PCT = 90;
const MIN_SPLIT_VOLUME_PCT = 20;
const PRICE_SPREAD_THRESHOLD_PCT = 5;
const VENDORS_PER_ITEM = 5;

function historicalShare(vendorId: string, entityCode: string): number {
  const pos = listPurchaseOrders(entityCode);
  if (pos.length === 0) return 0;
  const total = pos.reduce((s, p) => s + (p.total_after_tax ?? 0), 0);
  if (total === 0) return 0;
  const vendorTotal = pos
    .filter((p) => p.vendor_id === vendorId)
    .reduce((s, p) => s + (p.total_after_tax ?? 0), 0);
  return round2(dPct(vendorTotal, total) * 100);
}

function decideStrategy(
  ranked: VendorScore[],
  topShare: number,
): {
  strategy: MultiSourceStrategy;
  rationale: string[];
  primaryShare: number;
  alternateShares: number[];
} {
  const rationale: string[] = [];

  if (ranked.length === 0) {
    return { strategy: 'single', rationale: ['No ranked vendors yet'], primaryShare: 100, alternateShares: [] };
  }

  if (ranked.length === 1) {
    rationale.push('Only 1 vendor available · single-source');
    return { strategy: 'single', rationale, primaryShare: 100, alternateShares: [] };
  }

  if (topShare >= FORCE_ALTERNATE_THRESHOLD_PCT && ranked.length >= 3) {
    rationale.push(`Top vendor historical share ${topShare}% · severe concentration risk`);
    rationale.push('Force alternate · split across 3 vendors');
    return { strategy: 'split_3+', rationale, primaryShare: 50, alternateShares: [30, 20] };
  }

  if (topShare >= FORCE_ALTERNATE_THRESHOLD_PCT) {
    rationale.push(`Top vendor historical share ${topShare}% · concentration risk · only 2 vendors available`);
    return { strategy: 'force_alternate', rationale, primaryShare: 60, alternateShares: [40] };
  }

  if (topShare >= CONCENTRATION_THRESHOLD_PCT) {
    rationale.push(`Top vendor historical share ${topShare}% · split recommended`);
    return { strategy: 'split_2', rationale, primaryShare: 70, alternateShares: [Math.max(MIN_SPLIT_VOLUME_PCT, 30)] };
  }

  if (ranked.length >= 2) {
    const topScore = ranked[0].total_score ?? 0;
    const secondScore = ranked[1].total_score ?? 0;
    const spread = topScore > 0 ? Math.abs(((topScore - secondScore) / topScore) * 100) : 0;
    if (spread <= PRICE_SPREAD_THRESHOLD_PCT) {
      rationale.push(`Top 2 vendors within ${spread.toFixed(1)}% score spread · split for resilience`);
      return { strategy: 'split_2', rationale, primaryShare: 60, alternateShares: [40] };
    }
  }

  rationale.push(`Top vendor share ${topShare}% · within healthy range · single-source acceptable`);
  return { strategy: 'single', rationale, primaryShare: 100, alternateShares: [] };
}

/**
 * Compute sourcing recommendations across all open enquiries.
 */
export function computeSourcingRecommendations(entityCode: string): SourcingRecommendation[] {
  const recs: SourcingRecommendation[] = [];
  const enquiries = listEnquiries(entityCode).filter((e) =>
    e.status === 'quotations_received' ||
    e.status === 'award_pending' ||
    e.status === 'rfqs_dispatched',
  );

  const seenItems = new Set<string>();
  const computedAt = new Date().toISOString();

  for (const enq of enquiries) {
    for (const line of enq.lines) {
      const key = `${enq.id}::${line.item_id}`;
      if (seenItems.has(key)) continue;
      seenItems.add(key);

      const ranked = getVendorsForItemByScore(line.item_id, entityCode, VENDORS_PER_ITEM);
      if (ranked.length === 0) continue;

      const topVendor = ranked[0];
      const topShare = historicalShare(topVendor.vendor_id, entityCode);
      const { strategy, rationale, primaryShare, alternateShares } = decideStrategy(ranked, topShare);

      const altIds: string[] = [];
      const altNames: string[] = [];
      for (let i = 0; i < alternateShares.length && i + 1 < ranked.length; i++) {
        altIds.push(ranked[i + 1].vendor_id);
        altNames.push(ranked[i + 1].vendor_name);
      }

      recs.push({
        context_id: enq.id,
        context_kind: 'enquiry',
        item_id: line.item_id,
        item_name: line.item_name ?? line.item_id,
        recommended_strategy: strategy,
        rationale,
        primary_vendor_id: topVendor.vendor_id,
        primary_vendor_name: topVendor.vendor_name,
        primary_share_pct: primaryShare,
        alternate_vendor_ids: altIds,
        alternate_vendor_names: altNames,
        alternate_shares_pct: alternateShares,
        computed_at: computedAt,
      });
    }
  }

  recs.sort((a, b) => {
    const order: Record<MultiSourceStrategy, number> = {
      force_alternate: 0,
      'split_3+': 1,
      split_2: 2,
      single: 3,
    };
    return order[a.recommended_strategy] - order[b.recommended_strategy];
  });

  return recs;
}

export function getSourcingRecommendationForItem(
  itemId: string,
  contextId: string,
  entityCode: string,
): SourcingRecommendation | null {
  return computeSourcingRecommendations(entityCode).find(
    (r) => r.item_id === itemId && r.context_id === contextId,
  ) ?? null;
}
