/**
 * @file        vendor-portal-scope.ts
 * @sprint      T-Phase-1.2.6f-b-1 · Block A.3
 * @purpose     Pure filter helpers · prevent vendor data leakage at query layer.
 *              Mirrors distributor-auth-engine.scopeQueryToDistributor pattern (D-265).
 * @decisions   D-265 · FR-25 leak prevention
 * @[JWT]       N/A (pure function · runs in vendor portal client)
 */

import type { VendorPortalSession } from '@/types/vendor-portal';

/**
 * scopeQueryToVendor — pure filter: returns only rows owned by the vendor in session.
 * Use in VendorInbox · QuotationForm load · CommLog · etc., to prevent leaks.
 */
export function scopeQueryToVendor<
  T extends { vendor_id?: string | null; party_id?: string | null }
>(rows: T[], session: VendorPortalSession): T[] {
  return rows.filter(r =>
    r.vendor_id === session.vendor_id ||
    r.party_id === session.vendor_id,
  );
}

/** RFQs visible to a vendor: those addressed to them. */
export function scopeRfqsForVendor<T extends { vendor_id: string }>(
  rfqs: T[],
  session: VendorPortalSession,
): T[] {
  return rfqs.filter(r => r.vendor_id === session.vendor_id);
}

/** Quotations submitted by this vendor only. */
export function scopeQuotationsForVendor<T extends { vendor_id: string }>(
  quotations: T[],
  session: VendorPortalSession,
): T[] {
  return quotations.filter(q => q.vendor_id === session.vendor_id);
}
