/**
 * @file        src/types/foreign-customer.ts
 * @purpose     Foreign Customer (Buyer) entity · 15 fields · full UI in EX-7a
 * @sprint      T-Phase-1.EX-1-EximX-Foundation · seed only (Q4=b)
 * @decisions   EX-1-Q4=b seed only · v10 FINAL · Moat #18 Buyer Reliability later
 */

export type ForeignCustomerType = 'distributor' | 'end-customer' | 'manufacturer' | 'trader';
export type IncotermType = 'EXW' | 'FCA' | 'FAS' | 'FOB' | 'CFR' | 'CIF' | 'CPT' | 'CIP' | 'DAP' | 'DPU' | 'DDP';

export interface ForeignCustomer {
  id: string;
  entity_id: string;
  customer_name: string;
  country_code: string;
  country_name: string;
  customer_type: ForeignCustomerType;
  primary_contact: string;
  email: string;
  phone: string;
  billing_address: string;
  shipping_address: string;
  currency_code: string;
  payment_terms: string;
  preferred_incoterm: IncotermType;
  credit_limit?: number;
  buyer_reliability_score?: number;
  country_risk_overlay?: 'low' | 'medium' | 'high';
  created_at: string;
  updated_at: string;
}

export const FOREIGN_CUSTOMER_LOCALSTORAGE_KEY = (entityId: string): string =>
  `erp_${entityId}_foreign_customers`;
