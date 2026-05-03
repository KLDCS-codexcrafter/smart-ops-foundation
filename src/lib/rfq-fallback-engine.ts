/**
 * rfq-fallback-engine.ts — Vendor rejection auto-fallback
 * Sprint T-Phase-1.2.6f-a · per D-256
 */
import type { RFQ } from '@/types/rfq';
import { createRfq, listRfqs, updateRfq } from './rfq-engine';
import { getEnquiry } from './procurement-enquiry-engine';

export interface FallbackResult {
  success: boolean;
  newRfq: RFQ | null;
  reason: 'declined' | 'timeout' | 'no_alternate' | 'mode_excluded';
}

export function triggerFallback(
  failedRfq: RFQ,
  reason: 'declined' | 'timeout',
  entityCode: string,
  candidateVendors: { id: string; name: string }[],
): FallbackResult {
  const enquiry = getEnquiry(failedRfq.parent_enquiry_id, entityCode);
  if (!enquiry || enquiry.vendor_mode !== 'scoring' || !failedRfq.auto_fallback_enabled) {
    return { success: false, newRfq: null, reason: 'mode_excluded' };
  }

  const allRfqs = listRfqs(entityCode).filter(
    (r) => r.parent_enquiry_id === failedRfq.parent_enquiry_id,
  );
  const usedVendorIds = new Set(allRfqs.map((r) => r.vendor_id));
  const next = candidateVendors.find((v) => !usedVendorIds.has(v.id));
  if (!next) {
    return { success: false, newRfq: null, reason: 'no_alternate' };
  }

  const newRfq = createRfq(
    {
      parent_enquiry_id: failedRfq.parent_enquiry_id,
      entity_id: failedRfq.entity_id,
      vendor_id: next.id,
      vendor_name: next.name,
      line_item_ids: failedRfq.line_item_ids,
      send_channels: failedRfq.send_channels,
      primary_channel: failedRfq.primary_channel,
      auto_fallback_enabled: true,
      timeout_days: failedRfq.timeout_days,
    },
    entityCode,
  );

  updateRfq(
    failedRfq.id,
    {
      fallback_to_vendor_id: next.id,
      fallback_triggered_at: new Date().toISOString(),
      fallback_reason: reason,
    },
    entityCode,
  );

  return { success: true, newRfq, reason };
}
