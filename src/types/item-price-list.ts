/**
 * item-price-list.ts — Per-item, tier-aware price list lines for the Distributor Portal.
 * Sprint 10. Layered ON TOP of the Sprint 7 PriceList master — these lines model
 * the catalogue rules the portal needs (tier visibility, MRP, MOQ, validity).
 *
 * Tier alphabet (A/B/C/D) is the legacy nomenclature carried from the original
 * Sprint 10 prompt; we map 1:1 onto the runtime DistributorTier (gold/silver/bronze).
 *
 * [JWT] Backed by GET /api/erp/price-lists/{id}/lines
 */
import type { DistributorTier } from '@/types/distributor';

export type PriceListVisibilityTier = 'A' | 'B' | 'C' | 'D';

/** Map runtime distributor tiers onto the spec's A/B/C/D visibility alphabet. */
export const TIER_TO_VISIBILITY: Record<DistributorTier, PriceListVisibilityTier> = {
  gold: 'A',
  silver: 'B',
  bronze: 'C',
};

/** Reverse map (e.g. for admin UI labelling). */
export const VISIBILITY_TO_TIER: Partial<Record<PriceListVisibilityTier, DistributorTier>> = {
  A: 'gold',
  B: 'silver',
  C: 'bronze',
};

/**
 * One item line on a tiered price list.
 * `visible_to_tiers === null` means visible to ALL tiers (default).
 */
export interface PriceListLine {
  item_id: string;
  item_code: string;
  item_name: string;
  rate: number;                                       // selling rate (₹, not paise here for human edit)
  mrp: number;                                        // MRP (₹) — used as base price for breakdown
  min_order_qty: number;
  max_order_qty: number | null;
  is_available: boolean;
  visible_to_tiers: PriceListVisibilityTier[] | null; // null = visible to all
  valid_from: string | null;                          // ISO date
  valid_until: string | null;                         // ISO date
  notes: string;
}

/**
 * resolvePriceListId — pick the price list a distributor should see.
 * Priority: distributor.price_list_id (explicit override) > tier default > entity default.
 * Pure helper — caller passes in the candidate maps.
 */
export function resolvePriceListId(args: {
  distributorPriceListId: string | null;
  tierDefaultId: string | null;
  entityDefaultId: string | null;
}): string | null {
  return args.distributorPriceListId ?? args.tierDefaultId ?? args.entityDefaultId ?? null;
}

/**
 * isLineVisibleToTier — pure tier-visibility predicate.
 * `null` visible_to_tiers means "everyone".
 */
export function isLineVisibleToTier(
  line: Pick<PriceListLine, 'visible_to_tiers' | 'is_available'>,
  tier: DistributorTier | null,
): boolean {
  if (!line.is_available) return false;
  if (!line.visible_to_tiers) return true;
  if (!tier) return false;
  const v = TIER_TO_VISIBILITY[tier];
  return line.visible_to_tiers.includes(v);
}
