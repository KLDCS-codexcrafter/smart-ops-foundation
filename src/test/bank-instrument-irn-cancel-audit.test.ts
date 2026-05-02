/**
 * @file     bank-instrument-irn-cancel-audit.test.ts
 * @sprint   T-Phase-2.7-c · Card #2.7 sub-sprint 3 of 5
 * @purpose  IC1–IC9 · regex correctness · IRN lock states · audit severity ·
 *           field-rule min_amount gate (Q1-c).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  validateInstrument,
  isCashEquivalent,
  isElectronicInstrument,
} from '@/lib/bank-instrument-validator';
import {
  computeIRNLockState,
  rejectSaveDueToIRNLock,
} from '@/lib/irn-lock-engine';
import {
  inferCancellationSeverity,
  writeCancellationAuditEntry,
  cancellationAuditLogKey,
  type CancellationAuditEntry,
} from '@/types/cancellation-audit-log';
import { validateFieldRules } from '@/lib/field-rule-engine';
import type { FieldRule } from '@/lib/non-finecore-voucher-type-registry';

describe('Sprint 2.7-c · bank-instrument + IRN + cancel-audit', () => {
  // ---------- IC1 · NEFT/RTGS UTR regex ----------
  it('IC1 · accepts a valid 22-char UTR for NEFT and RTGS', () => {
    const utr = 'HDFC0000123456789012AB';
    expect(validateInstrument('NEFT', utr).valid).toBe(true);
    expect(validateInstrument('RTGS', utr).valid).toBe(true);
    expect(validateInstrument('NEFT', '12345').valid).toBe(false);
  });

  // ---------- IC2 · IMPS / UPI / NACH ----------
  it('IC2 · enforces IMPS=12d, UPI alphanumeric or URI, NACH 12-char', () => {
    expect(validateInstrument('IMPS', '123456789012').valid).toBe(true);
    expect(validateInstrument('IMPS', '12345').valid).toBe(false);
    expect(validateInstrument('UPI', 'abc123XYZ789').valid).toBe(true);
    expect(validateInstrument('UPI', 'upi://pay?pa=foo@bank').valid).toBe(true);
    expect(validateInstrument('UPI', 'short').valid).toBe(false);
    expect(validateInstrument('NACH', 'NACH00012345').valid).toBe(true);
  });

  // ---------- IC3 · Cheque / Card / pass-through ----------
  it('IC3 · cheque 6-digit, card last4+ref, Cash/DD/Other pass-through', () => {
    expect(validateInstrument('Cheque', '123456').valid).toBe(true);
    expect(validateInstrument('Cheque', '12').valid).toBe(false);
    expect(validateInstrument('Card', '4242AB12CD').valid).toBe(true);
    expect(validateInstrument('Cash', null).valid).toBe(true);
    expect(validateInstrument('DD', null).valid).toBe(true);
    expect(validateInstrument('Other', null).valid).toBe(true);
    expect(isCashEquivalent('Cash')).toBe(true);
    expect(isElectronicInstrument('UPI')).toBe(true);
  });

  // ---------- IC4 · IRN not generated → unlocked ----------
  it('IC4 · no IRN means lock disabled', () => {
    const lock = computeIRNLockState({ irn: null, irn_status: 'pending' });
    expect(lock.is_locked).toBe(false);
    expect(lock.can_cancel).toBe(true);
  });

  // ---------- IC5 · IRN generated within 24h → can cancel ----------
  it('IC5 · IRN within 24h allows cancel transition, blocks edit', () => {
    const recentISO = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const before = {
      irn: '123456789ABCDEF',
      irn_status: 'generated' as const,
      irn_ack_date: recentISO,
      status: 'posted',
    };
    const lock = computeIRNLockState(before);
    expect(lock.is_locked).toBe(true);
    expect(lock.can_cancel).toBe(true);
    expect(lock.cancel_window_remaining_hours).toBeGreaterThan(0);

    expect(rejectSaveDueToIRNLock(before, { status: 'cancelled' }).reject).toBe(false);
    expect(rejectSaveDueToIRNLock(before, { status: 'posted' }).reject).toBe(true);
  });

  // ---------- IC6 · IRN past 24h → cancellation blocked ----------
  it('IC6 · IRN past 24h blocks both edit and cancel', () => {
    const oldISO = new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString();
    const before = {
      irn: 'ZZZ000111222333',
      irn_status: 'generated' as const,
      irn_ack_date: oldISO,
      status: 'posted',
    };
    const lock = computeIRNLockState(before);
    expect(lock.can_cancel).toBe(false);
    expect(lock.cancel_window_remaining_hours).toBe(0);

    const r = rejectSaveDueToIRNLock(before, { status: 'cancelled' });
    expect(r.reject).toBe(true);
    expect(r.message).toMatch(/Credit Note/i);
  });

  // ---------- IC7 · audit severity ladder ----------
  it('IC7 · severity = high(IRN) > med(posted) > low(draft)', () => {
    expect(inferCancellationSeverity({
      was_posted_before_cancel: true, had_irn: true, had_rcm: false,
    })).toBe('high');
    expect(inferCancellationSeverity({
      was_posted_before_cancel: true, had_irn: false, had_rcm: true,
    })).toBe('med');
    expect(inferCancellationSeverity({
      was_posted_before_cancel: false, had_irn: false, had_rcm: false,
    })).toBe('low');
  });

  // ---------- IC8 · audit-log writer is silent + persists entry ----------
  it('IC8 · writeCancellationAuditEntry persists to localStorage', () => {
    const entityCode = 'TEST_27C';
    localStorage.removeItem(cancellationAuditLogKey(entityCode));
    writeCancellationAuditEntry({
      entityCode,
      voucherId: 'v-1',
      voucherNo: 'INV-001',
      voucherDate: '2026-04-15',
      voucherTypeId: 'vt-1',
      voucherTypeName: 'Sales Invoice',
      baseVoucherType: 'IM',
      partyId: 'p-1',
      partyName: 'Acme Pvt Ltd',
      cancelledBy: 'u-1',
      cancelledByName: 'Test User',
      cancelReason: 'Customer requested cancellation due to wrong SKU shipped',
      wasPostedBeforeCancel: true,
      hadRcm: false,
      hadIrn: true,
      linkedRcmJvId: null,
      linkedRcmJvNo: null,
      totalAmount: 75000,
      totalTaxAmount: 13500,
    });
    const raw = localStorage.getItem(cancellationAuditLogKey(entityCode));
    expect(raw).toBeTruthy();
    const parsed: CancellationAuditEntry[] = JSON.parse(raw ?? '[]');
    expect(parsed).toHaveLength(1);
    expect(parsed[0].severity).toBe('high');
    expect(parsed[0].voucher_no).toBe('INV-001');
  });

  // ---------- IC9 · field-rule min_amount gates instrument-mandatory rule ----------
  describe('IC9 · field_rules min_amount gate (Q1-c)', () => {
    const rules: FieldRule[] = [{
      voucher_type_id: 'sales_invoice_memo',
      rule_no: 1,
      field_path: 'instrument_type',
      field_label: 'Bank Instrument',
      rule: 'mandatory',
      enforce_on: 'always',
      min_amount: 50000,
      amount_field: 'total_amount',
      pattern: null,
      min_length: null,
      custom_message: 'Bank instrument required for invoices ≥ ₹50,000',
    } as unknown as FieldRule];

    beforeEach(() => { /* no-op */ });

    it('skips the rule when total_amount < 50,000', () => {
      const result = validateFieldRules(
        { total_amount: 25000, instrument_type: null },
        rules,
        'posted',
      );
      expect(result.ok).toBe(true);
      expect(result.errors.instrument_type).toBeUndefined();
    });

    it('enforces the rule when total_amount ≥ 50,000', () => {
      const result = validateFieldRules(
        { total_amount: 75000, instrument_type: null },
        rules,
        'posted',
      );
      expect(result.ok).toBe(false);
      expect(result.errors.instrument_type).toMatch(/instrument required/i);
    });

    it('passes when total_amount ≥ threshold and instrument_type is set', () => {
      const result = validateFieldRules(
        { total_amount: 75000, instrument_type: 'NEFT' },
        rules,
        'posted',
      );
      expect(result.ok).toBe(true);
    });
  });
});
