/**
 * @file     payment-engine.ts
 * @purpose  Vendor Payment Voucher orchestrator · validates · constructs voucher ·
 *           delegates to existing finecore-engine.postVoucher · returns voucher result.
 * @who      Operix Engineering
 * @when     Apr-2026 · T-T8.2-Foundation (Group B Sprint B.2)
 * @sprint   T-T8.2-Foundation
 * @phase    Phase 1 · localStorage · Phase 2 swap to backend with same contract.
 * @whom     VendorPaymentEntry.tsx · payout-N smoke checks
 * @depends  finecore-engine (postVoucher · validateVoucher · generateVoucherNo) ·
 *           tds-engine (computeTDS) · voucher-org-tag-engine (auto-fires via finecore-engine).
 *
 * IMPORTANT: This is an orchestrator · NOT a duplicate of finecore-engine.
 * - Validation: delegates to existing validateVoucher
 * - Save: delegates to existing postVoucher (which auto-fires B.0 tagVoucher)
 * - TDS: uses existing computeTDS from tds-engine
 * - Voucher No: uses existing generateVoucherNo
 *
 * Per Q-CC (a) leverage existing FinCore · per D-146 no parallel infrastructure.
 *
 * [DEFERRED · Support & Back Office] approval routing · permission checks ·
 *   email/SMS/WhatsApp notifications · maker-checker workflow.
 *   See: /Future_Task_Register_Support_BackOffice.md · Capability 1
 */

import type { Voucher, BillReference } from '@/types/voucher';
import { postVoucher, validateVoucher, generateVoucherNo } from '@/lib/finecore-engine';
import { computeTDS } from '@/lib/tds-engine';
import { getCurrentUserId } from '@/lib/auth-helpers';

export interface VendorPaymentInput {
  entityCode: string;
  vendorId: string;
  vendorName: string;
  vendorPan?: string;
  bankCashLedgerId: string;
  bankCashLedgerName: string;
  amount: number;
  date: string;
  effectiveDate?: string;
  refNo?: string;
  refDate?: string;
  paymentMode: 'cash' | 'bank';
  instrumentType: 'NEFT' | 'RTGS' | 'IMPS' | 'UPI' | 'Cheque' | 'Cash' | 'DD' | 'Other';
  instrumentRef: string;
  chequeDate?: string;
  bankName?: string;
  narration: string;
  billReferences: BillReference[];
  applyTDS: boolean;
  tdsSection?: string;
  deducteeType: 'individual' | 'company' | 'huf' | 'no_pan';
  divisionId?: string;
  departmentId?: string;
  // [DEFERRED · Support & Back Office] approver_id · approval_chain · notification_channels.
  // See: /Future_Task_Register_Support_BackOffice.md · Capability 1
}

export interface VendorPaymentResult {
  ok: boolean;
  voucherId?: string;
  voucherNo?: string;
  errors?: string[];
}

/** Build the Voucher object · validate · post · return result.
 *  Thin orchestrator — delegates all heavy lifting to existing engines.
 *  After postVoucher succeeds · B.0 voucher-org-tag-engine auto-tags via finecore-engine hook. */
export function processVendorPayment(input: VendorPaymentInput): VendorPaymentResult {
  const now = new Date().toISOString();
  const voucherNo = generateVoucherNo('PV', input.entityCode);

  // Compute TDS using existing engine (no duplicate logic)
  let tdsAmount = 0;
  let tdsRate = 0;
  if (input.applyTDS && input.tdsSection) {
    const result = computeTDS(
      input.amount,
      input.tdsSection,
      input.deducteeType === 'huf' ? 'individual' : input.deducteeType,
      input.vendorId,
      input.entityCode,
    );
    tdsAmount = result.tdsAmount;
    tdsRate = result.rate;
  }

  const netPayment = input.amount - tdsAmount;
  const isCheque = input.instrumentType === 'Cheque';

  const voucher: Voucher = {
    id: `v-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    voucher_no: voucherNo,
    voucher_type_id: '',
    voucher_type_name: 'Payment',
    base_voucher_type: 'Payment',
    entity_id: input.entityCode,
    date: input.date,
    party_id: input.vendorId,
    party_name: input.vendorName,
    ref_voucher_no: '',
    vendor_bill_no: '',
    net_amount: netPayment,
    narration: input.narration,
    terms_conditions: '',
    payment_enforcement: '',
    payment_instrument: `${input.paymentMode === 'bank' ? 'Bank' : 'Cash'}: ${input.instrumentRef}`,
    from_ledger_name: input.bankCashLedgerName,
    to_ledger_name: input.vendorName,
    from_godown_name: '',
    to_godown_name: '',
    ledger_lines: [],
    gross_amount: input.amount,
    total_discount: 0,
    total_taxable: 0,
    total_cgst: 0,
    total_sgst: 0,
    total_igst: 0,
    total_cess: 0,
    total_tax: 0,
    round_off: 0,
    tds_applicable: input.applyTDS && tdsAmount > 0,
    tds_section: input.tdsSection ?? '',
    tds_rate: tdsRate,
    tds_amount: tdsAmount,
    deductee_pan: input.vendorPan ?? '',
    deductee_type: input.deducteeType,
    bill_references: input.billReferences,
    department_id: input.departmentId,
    status: 'draft',
    created_by: getCurrentUserId(),
    created_at: now,
    updated_at: now,
    ref_no: input.refNo || undefined,
    ref_date: input.refDate || undefined,
    instrument_type: input.instrumentType,
    instrument_ref_no: input.instrumentRef || undefined,
    cheque_date: isCheque ? (input.chequeDate || undefined) : undefined,
    bank_name: isCheque ? (input.bankName || undefined) : undefined,
  };

  // Validate via existing engine
  const validation = validateVoucher(voucher);
  if (!validation.valid) {
    return { ok: false, errors: validation.errors };
  }

  // Post via existing engine (period-lock check + ledger update + B.0 tagVoucher auto-fire)
  try {
    postVoucher(voucher, input.entityCode);
    return { ok: true, voucherId: voucher.id, voucherNo: voucher.voucher_no };
  } catch (err) {
    console.error('[payment-engine] Vendor payment post failed:', err);
    return { ok: false, errors: [err instanceof Error ? err.message : 'Unknown error'] };
  }
}
