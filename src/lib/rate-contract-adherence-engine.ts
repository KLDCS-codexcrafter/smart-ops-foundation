/**
 * @file        src/lib/rate-contract-adherence-engine.ts
 * @purpose     D-NEW-GD · Rate Contract Adherence scoring engine · 20th SIBLING application ⭐ QUARTER-CENTURY territory
 * @sprint      T-Phase-2.B-Procure360-Phase2-Polish-Part-B-ii · Block D
 * @decisions   Q-LOCK-6(a) FR-19 SIBLING · vendor-reliability-engine 0-DIFF · rate-contract-engine + po-management-engine consumed via PUBLIC API
 * @disciplines FR-19 (SIBLING discipline · 20th application) · FR-22 canonical · FR-26 entity-scoped · FR-54 CC SSOT preserved
 * @reuses      rate-contract-engine.listActiveRateContracts + validateContractCompliance (0-DIFF) ·
 *              po-management-engine.listPurchaseOrders (0-DIFF · public API consumer)
 */
import {
  listActiveRateContracts,
  validateContractCompliance,
} from '@/lib/rate-contract-engine';
import { listPurchaseOrders } from '@/lib/po-management-engine';
import type { PurchaseOrderRecord } from '@/types/po';

export interface VendorRcAdherenceBreakdown {
  vendor_id: string;
  vendor_name: string;
  total_pos_against_rc: number;
  pos_within_ceiling: number;
  pos_above_ceiling: number;
  pos_at_agreed_rate: number;
  violation_count: number;
  adherence_score: number; // 0-100
  has_active_rc: boolean;
  computed_at: string;
}

/**
 * Compute RC adherence score for a single vendor.
 *
 * Score formula:
 *   ceiling_compliance_pct × 0.4
 *   agreed_rate_pct        × 0.4
 *   violation_penalty      × 0.2  (max(0, 100 - violation_count × 5))
 *
 * If vendor has no active RC: returns 0 with has_active_rc=false.
 */
export function computeVendorRcAdherence(
  entityCode: string,
  vendorId: string,
): VendorRcAdherenceBreakdown {
  const activeRcs = listActiveRateContracts(entityCode).filter((rc) => rc.vendor_id === vendorId);
  const allPos: PurchaseOrderRecord[] = listPurchaseOrders(entityCode).filter(
    (po) => po.vendor_id === vendorId,
  );

  const hasActiveRc = activeRcs.length > 0;
  const vendorName = activeRcs[0]?.vendor_name ?? allPos[0]?.vendor_name ?? 'Unknown';

  const emptyBreakdown = (score: number): VendorRcAdherenceBreakdown => ({
    vendor_id: vendorId,
    vendor_name: vendorName,
    total_pos_against_rc: 0,
    pos_within_ceiling: 0,
    pos_above_ceiling: 0,
    pos_at_agreed_rate: 0,
    violation_count: 0,
    adherence_score: score,
    has_active_rc: hasActiveRc,
    computed_at: new Date().toISOString(),
  });

  if (!hasActiveRc || allPos.length === 0) return emptyBreakdown(0);

  let totalPosAgainstRc = 0;
  let withinCeiling = 0;
  let aboveCeiling = 0;
  let atAgreedRate = 0;
  let violations = 0;

  for (const po of allPos) {
    for (const line of po.lines ?? []) {
      const result = validateContractCompliance(
        {
          item_id: line.item_id,
          invoice_qty: line.qty,
          invoice_rate: line.rate ?? 0,
        },
        vendorId,
        entityCode,
        po.po_date,
      );

      if (!result.has_contract || result.compliance_status === 'contract_expired') continue;

      totalPosAgainstRc++;

      if (result.compliance_status === 'rate_exceeds_ceiling') {
        aboveCeiling++;
        violations++;
      } else if (result.compliance_status === 'qty_outside_range') {
        violations++;
      } else if (result.compliance_status === 'within_contract') {
        withinCeiling++;
        if (result.variance_pct === 0) atAgreedRate++;
      }
    }
  }

  if (totalPosAgainstRc === 0) {
    return {
      ...emptyBreakdown(0),
      has_active_rc: true,
    };
  }

  const ceilingCompliancePct = (withinCeiling / totalPosAgainstRc) * 100;
  const agreedRatePct = (atAgreedRate / totalPosAgainstRc) * 100;
  const violationPenalty = Math.max(0, 100 - violations * 5);

  const adherenceScore = Math.round(
    ceilingCompliancePct * 0.4 + agreedRatePct * 0.4 + violationPenalty * 0.2,
  );

  return {
    vendor_id: vendorId,
    vendor_name: vendorName,
    total_pos_against_rc: totalPosAgainstRc,
    pos_within_ceiling: withinCeiling,
    pos_above_ceiling: aboveCeiling,
    pos_at_agreed_rate: atAgreedRate,
    violation_count: violations,
    adherence_score: adherenceScore,
    has_active_rc: true,
    computed_at: new Date().toISOString(),
  };
}

/**
 * Compute RC adherence for all vendors with active RCs · returns sorted descending by score.
 */
export function computeAllVendorRcAdherence(entityCode: string): VendorRcAdherenceBreakdown[] {
  const activeRcs = listActiveRateContracts(entityCode);
  const vendorIds = Array.from(new Set(activeRcs.map((rc) => rc.vendor_id)));

  return vendorIds
    .map((vid) => computeVendorRcAdherence(entityCode, vid))
    .sort((a, b) => b.adherence_score - a.adherence_score);
}
