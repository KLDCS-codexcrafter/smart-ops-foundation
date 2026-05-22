/**
 * @file        vendor-advance.ts
 * @sprint      T-Phase-2.HK-5-2 · Block H · D-NEW-GP
 * @purpose     Vendor Advance Payment type · tracks advances paid + adjusted against invoices
 * @[JWT]       erp_vendor_advances_<entityCode>
 */

export type VendorAdvanceStatus =
  | 'paid'
  | 'partial_adjusted'
  | 'fully_adjusted'
  | 'refunded';

export interface VendorAdvance {
  id: string;
  entity_id: string;
  vendor_id: string;
  vendor_name: string;
  po_id: string | null;
  po_no: string | null;
  advance_amount: number;
  advance_paid_at: string;
  advance_adjusted_amount: number;
  status: VendorAdvanceStatus;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export const vendorAdvancesKey = (entityCode: string): string =>
  `erp_vendor_advances_${entityCode}`;
