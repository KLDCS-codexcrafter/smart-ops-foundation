/**
 * @file        src/lib/procure360-ewb-helpers.ts
 * @purpose     D-NEW-GM-V2 · EWB consumer helpers for Procure360 inward flow
 *              Computes inward value via PO join and determines EWB requirement (CARO/GST rule).
 * @sprint      T-Phase-2.HK-5-2 · Block C V2
 * @reuses      ewb-engine (PUBLIC API · 0-DIFF) · entity-gst-engine (24th SIBLING)
 */
import type { InwardReceipt } from '@/types/inward-receipt';
import type { PurchaseOrderRecord } from '@/types/po';
import type { Party } from '@/types/party';
import { isEWBRequired } from '@/lib/ewb-engine';
import { getEntityStateCode, getEWBThreshold } from '@/lib/entity-gst-engine';

/**
 * Compute inward receipt value via PO line rate × received_qty join.
 * Falls back to 0 when PO unavailable or no line matches.
 */
export function computeInwardValue(
  inward: InwardReceipt,
  po: PurchaseOrderRecord | null,
): number {
  if (!po) return 0;

  const poLineByItem = new Map(po.lines.map((l) => [l.item_id, l]));
  let total = 0;
  for (const line of inward.lines) {
    const poLine = poLineByItem.get(line.item_id);
    if (poLine) total += poLine.rate * line.received_qty;
  }
  return total;
}

/**
 * Returns true when EWB is required for an inward receipt.
 * Interstate + value > threshold · or conservative fallback (over-warn) when state codes missing.
 */
export function isEWBRequiredForInward(
  _inward: InwardReceipt,
  vendor: Party | null,
  entityCode: string,
  inwardValue: number,
): boolean {
  const threshold = getEWBThreshold(entityCode);
  const vendorState = vendor?.state_code ?? '';
  const entityState = getEntityStateCode(entityCode);

  if (vendorState && entityState) {
    return isEWBRequired(inwardValue, vendorState, entityState, threshold);
  }
  return inwardValue > threshold;
}
