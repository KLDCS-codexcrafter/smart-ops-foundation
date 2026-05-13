/**
 * @file        src/types/customer-voucher.ts
 * @purpose     CustomerInVoucher + CustomerOutVoucher canonical · OOB-16+19 · Circle 1-10 · Q-LOCK-5
 * @who         ServiceDesk module
 * @when        2026-05-14
 * @sprint      T-Phase-1.C.1c · Block A.4
 * @iso        Functional Suitability + Maintainability
 * @disciplines FR-30
 * @reuses      AuditEntry from @/types/servicedesk
 * @[JWT]       Phase 2 wires real backend
 */
import type { AuditEntry } from '@/types/servicedesk';

export type WarrantyStatus =
  | 'in_warranty'
  | 'expired'
  | 'oem_warranty_only'
  | 'amc_covered'
  | 'out_of_warranty';

export interface CustomerInVoucher {
  id: string;
  voucher_no: string;
  entity_id: string;
  branch_id: string;
  ticket_id: string;
  serial: string;
  internal_no: string;
  warranty_status_at_intake: WarrantyStatus;
  condition_notes: string;
  photos: { url: string; caption: string }[];
  received_by: string;
  received_at: string;
  created_at: string;
  updated_at: string;
  audit_trail: AuditEntry[];
}

export type PaymentMethod =
  | 'cash'
  | 'upi'
  | 'card'
  | 'bank_transfer'
  | 'cheque'
  | 'on_amc'
  | 'on_account';

export interface CustomerOutVoucher {
  id: string;
  voucher_no: string;
  entity_id: string;
  branch_id: string;
  ticket_id: string;
  resolution_summary: string;
  old_serial: string;
  new_serial: string;
  circle_readings: number[];           // Circle 1-10 (Smart Power pattern)
  spares_consumed_summary: string;
  charges_paise: number;
  paid: boolean;
  payment_method: PaymentMethod | null;
  delivered_to: string;
  delivered_at: string;
  acknowledgement_signed: boolean;
  acknowledgement_signature_url: string | null;
  created_at: string;
  updated_at: string;
  created_by: string;
  audit_trail: AuditEntry[];
}

export const customerInVoucherKey = (e: string): string => `servicedesk_v1_customer_in_${e}`;
export const customerOutVoucherKey = (e: string): string => `servicedesk_v1_customer_out_${e}`;
