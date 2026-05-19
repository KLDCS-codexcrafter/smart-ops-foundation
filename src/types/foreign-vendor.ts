/**
 * @file        src/types/foreign-vendor.ts
 * @purpose     Foreign Vendor (Supplier) entity · 12 fields · full UI in EX-3
 * @sprint      T-Phase-1.EX-1-EximX-Foundation · seed only (Q4=b)
 */
import type { IncotermType } from './foreign-customer';
export type { IncotermType };

export type ForeignVendorType = 'manufacturer' | 'distributor' | 'trader' | 'agent';

export interface ForeignVendor {
  id: string;
  entity_id: string;
  vendor_name: string;
  country_code: string;
  country_name: string;
  vendor_type: ForeignVendorType;
  primary_contact: string;
  email: string;
  phone: string;
  address: string;
  currency_code: string;
  payment_terms: string;
  preferred_incoterm: IncotermType;
  coo_self_certification_required?: boolean;
  created_at: string;
  updated_at: string;
}

export const FOREIGN_VENDOR_LOCALSTORAGE_KEY = (entityId: string): string =>
  `erp_${entityId}_foreign_vendors`;
