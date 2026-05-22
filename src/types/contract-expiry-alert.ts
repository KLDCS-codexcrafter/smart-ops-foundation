/**
 * @file        src/types/contract-expiry-alert.ts
 * @purpose     OOB-54 · Contract Expiry Alert SIBLING type · 17th SIBLING application
 * @sprint      T-Phase-2.A-Procure360-Phase2-Polish-Part-A · Block E · D-NEW-FX
 * @decisions   Q-LOCK-7(a) · deep-link to existing Enquiry · NO new voucher type
 * @discipline  FR-22 · FR-26 entity-scoped persistence · D-127/128a 139 invariant preserved
 */

export type ExpiryTier = 'informational' | 'reminder' | 'urgent';

export type ContractExpiryAction =
  | 'renewal_enquiry_generated'
  | 'extension_request'
  | 'no_action';

export interface ContractExpiryAlert {
  id: string;
  agreement_id: string;
  agreement_number: string;
  vendor_id: string;
  vendor_name: string;
  agreement_end_date: string;
  days_to_expiry: number;
  tier: ExpiryTier;
  computed_at: string;

  acknowledged: boolean;
  acknowledged_by?: string | null;
  acknowledged_at?: string | null;
  acknowledgment_note?: string | null;
  action_taken?: ContractExpiryAction | null;
  renewal_enquiry_id?: string | null;
}

export const contractExpiryAcknowledgmentsKey = (entityCode: string): string =>
  `erp_${entityCode}_contract_expiry_acknowledgments`;
