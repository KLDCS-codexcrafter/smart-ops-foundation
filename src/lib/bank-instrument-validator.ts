/**
 * @file     bank-instrument-validator.ts — Q4-c bank instrument format checks
 * @sprint   T-Phase-2.7-c · Card #2.7 sub-sprint 3 of 5
 * @purpose  Pure validation helpers · zero side effects · zero new deps.
 *           Powers BankInstrumentPicker live feedback + downstream checks.
 *
 *  Patterns:
 *    NEFT/RTGS UTR  — 22 chars · 4-letter IFSC prefix + 18 alphanumeric
 *    IMPS           — 12-digit numeric (RBI mandate)
 *    UPI            — 12-char alphanumeric OR upi:// URI
 *    NACH           — 12-char alphanumeric mandate ID
 *    Cheque         — 6-digit MICR scheme
 *    Card           — last-4 + bank-ref (4 digits + 4-12 alphanumeric)
 *    Cash / DD / Other — pass-through
 */

import type { InstrumentType } from '@/components/uth/BankInstrumentPicker.helpers';

export interface InstrumentValidationResult {
  valid: boolean;
  format_ok: boolean;
  message: string;
  pattern_used: string | null;
}

const PATTERNS: Partial<Record<InstrumentType, { re: RegExp; help: string }>> = {
  NEFT:   { re: /^[A-Z]{4}[A-Z0-9]{18}$/i, help: 'UTR must be 22 chars: 4-letter IFSC prefix + 18 alphanumeric' },
  RTGS:   { re: /^[A-Z]{4}[A-Z0-9]{18}$/i, help: 'UTR must be 22 chars: 4-letter IFSC prefix + 18 alphanumeric' },
  IMPS:   { re: /^[0-9]{12}$/,             help: 'IMPS reference must be 12 digits (RBI mandate)' },
  UPI:    { re: /^[A-Za-z0-9]{12}$|^upi:\/\/[\w%@.&=?-]+$/, help: 'UPI ref: 12-char alphanumeric or upi:// URI' },
  NACH:   { re: /^[A-Za-z0-9]{12}$/,       help: 'NACH mandate ID must be 12-char alphanumeric' },
  Cheque: { re: /^[0-9]{6}$/,              help: 'Cheque number must be 6 digits (MICR scheme)' },
  Card:   { re: /^[0-9]{4}[-\s]?[A-Z0-9]{4,12}$/i, help: 'Card ref: last-4 + bank reference (4-12 alphanumeric)' },
};

/**
 * Validate an instrument's reference number against its expected format.
 * Cash / DD / Other are pass-through and always valid.
 */
export function validateInstrument(
  type: InstrumentType,
  refNo: string | null | undefined,
): InstrumentValidationResult {
  if (type === 'Cash' || type === 'DD' || type === 'Other') {
    return { valid: true, format_ok: true, message: '', pattern_used: null };
  }
  const trimmed = (refNo ?? '').trim();
  if (trimmed.length === 0) {
    return {
      valid: false,
      format_ok: false,
      message: `Reference number required for ${type}`,
      pattern_used: PATTERNS[type]?.re.source ?? null,
    };
  }
  const spec = PATTERNS[type];
  if (!spec) {
    return { valid: true, format_ok: true, message: '', pattern_used: null };
  }
  if (spec.re.test(trimmed)) {
    return { valid: true, format_ok: true, message: '', pattern_used: spec.re.source };
  }
  return {
    valid: false,
    format_ok: false,
    message: spec.help,
    pattern_used: spec.re.source,
  };
}

/**
 * True for instruments that don't leave a banking trail.
 * Section 269ST + KYC Rule 9 escalate scrutiny on these for high-value receipts.
 */
export function isCashEquivalent(type: InstrumentType | null | undefined): boolean {
  return type === 'Cash' || type === 'Other' || type === null || type === undefined;
}

/** True for fully electronic rails (RBI/NPCI). */
export function isElectronicInstrument(type: InstrumentType | null | undefined): boolean {
  return type === 'UPI' || type === 'IMPS' || type === 'NEFT' || type === 'RTGS' || type === 'NACH';
}
