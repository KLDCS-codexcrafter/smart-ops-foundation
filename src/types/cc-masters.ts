/**
 * @file        cc-masters.ts
 * @sprint      T-Phase-1.2.6f-c-3 · Block B · per D-289
 * @purpose     CC Masters used by Bill Passing & Procure modules:
 *              - ModeOfPayment (NEFT, RTGS, Cheque, Cash, etc.)
 *              - TermsOfPayment (Net 30, Advance 50%, etc.)
 *              - TermsOfDelivery (FOR Destination, Ex-Works, CIF, etc.)
 */

export type CcMasterStatus = 'active' | 'inactive';

export interface ModeOfPayment {
  id: string;
  code: string;        // e.g. NEFT
  name: string;
  description: string;
  status: CcMasterStatus;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface TermsOfPayment {
  id: string;
  code: string;        // e.g. NET30
  name: string;
  credit_days: number;
  advance_pct: number;
  description: string;
  status: CcMasterStatus;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface TermsOfDelivery {
  id: string;
  code: string;        // e.g. FOR-DEST
  name: string;
  incoterm: string;    // e.g. CIF · FOB · EXW
  description: string;
  status: CcMasterStatus;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export const modeOfPaymentKey = (e: string): string => `erp_mode_of_payment_${e}`;
export const termsOfPaymentKey = (e: string): string => `erp_terms_of_payment_${e}`;
export const termsOfDeliveryKey = (e: string): string => `erp_terms_of_delivery_${e}`;
