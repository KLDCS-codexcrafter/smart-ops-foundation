/**
 * @file        src/types/auto-posted-voucher.ts
 * @purpose     5 auto-posted voucher type taxonomy · consumes FinCore voucher engines READ-ONLY
 * @sprint      T-Phase-1.EX-6-BillOfEntry-CustomsDuty-Demurrage-AutoPostedVouchers
 * @decisions   EX-6-Q5=a 5 voucher types · EX-6-Q7=a ledger mapping
 * @disciplines FR-30 · FR-50 · FR-80 exhaustive switch
 */

export type AutoPostedVoucherKind =
  | 'customs_duty'
  | 'igst_import'
  | 'comp_cess'
  | 'landing_handling'
  | 'demurrage';

export const VOUCHER_LEDGER_MAP: Record<AutoPostedVoucherKind, string> = {
  customs_duty: 'customs_duty_ledger',
  igst_import: 'igst_import_ledger',
  comp_cess: 'comp_cess_ledger',
  landing_handling: 'landing_charges_ledger',
  demurrage: 'demurrage_ledger',
};

export interface AutoPostedVoucher {
  id: string;
  boe_id: string;
  kind: AutoPostedVoucherKind;
  ledger_name: string;
  amount_inr: number;
  posted_at: string;
  voucher_hash: string;
  voucher_org_tag: string;
  voucher_version_id: string;
}

export const autoPostedVouchersKey = (entityCode: string): string =>
  `erp_${entityCode}_auto_posted_vouchers`;
