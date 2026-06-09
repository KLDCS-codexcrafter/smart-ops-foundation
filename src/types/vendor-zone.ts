/**
 * @file        src/types/vendor-zone.ts
 * @purpose     Vendor Zone classification · Green/Amber/Red · derived from risk + compliance + reliability
 * @sprint      T-VPG-VendorPortal-Gaps · VP-GAPS Wave-1 tail
 * @decisions   D-NEW-DN (Vendor Portal canonical) · D-NEW-DP (ccc reference shape alignment)
 * @disciplines FR-30 · FR-50 (entity-scoped)
 * @reuses      none (pure type seed)
 * @[JWT]       N/A (type file)
 */

export type VendorZoneColor = 'green' | 'amber' | 'red' | 'unrated';

export interface VendorZone {
  id: string;
  party_id: string;
  entity_code: string;
  zone: VendorZoneColor;
  reason: string;                       // honest derivation note · e.g. "risk_grade=D" or "no_source_data"
  source_scores: {
    reliability_composite?: number;     // from vendor-reliability-score (consumed read-only)
    financial_risk_score?: number;      // from vendor-financial-health (consumed)
    overall_risk_score?: number;        // from vendor-risk-score (consumed)
  };
  computed_at: string;                  // ISO datetime
  created_at: string;
  updated_at: string;
}

export const vendorZoneKey = (entityCode: string): string =>
  `erp_vendor_zones_${entityCode}`;
