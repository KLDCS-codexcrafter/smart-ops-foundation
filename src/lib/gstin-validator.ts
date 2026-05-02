/**
 * gstin-validator.ts — GSTIN validation + URP sentinel + state matching
 * Sprint T-Phase-2.7-a · Q4-c · Q7-c
 *
 * Format: 15-char · 2-digit state code + 10-char PAN + 1 entity-no + 'Z' + 1 checksum.
 * URP (Unregistered Person) sentinel: 'URP' or empty/null.
 * [JWT] No backend call · pure validator.
 */

/** GSTIN regex: 2-digit state + 10-char PAN (5L+4D+1L) + 1 alnum entity + Z + 1 alnum checksum. */
export const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[0-9A-Z]{1}Z[0-9A-Z]{1}$/;

/** Valid Indian state codes (01–37 + 97 OIDAR + 99 Centre). */
export const VALID_STATE_CODES: readonly string[] = [
  '01','02','03','04','05','06','07','08','09','10',
  '11','12','13','14','15','16','17','18','19','20',
  '21','22','23','24','25','26','27','28','29','30',
  '31','32','33','34','35','36','37','97','99',
];

/** Sentinel for unregistered/B2C. */
export const URP_SENTINEL = 'URP';

export interface GSTINValidationResult {
  valid: boolean;
  reason?: string;
  state_code?: string;
}

/** Validate a GSTIN string. URP/empty returns valid=false with isURP-friendly reason. */
export function validateGSTIN(gstin: string | null | undefined): GSTINValidationResult {
  const v = (gstin ?? '').trim().toUpperCase();
  if (!v || v === URP_SENTINEL) return { valid: false, reason: 'unregistered' };
  if (v.length !== 15) return { valid: false, reason: 'length_must_be_15' };
  if (!GSTIN_REGEX.test(v)) return { valid: false, reason: 'format_invalid' };
  const sc = v.slice(0, 2);
  if (!VALID_STATE_CODES.includes(sc)) return { valid: false, reason: 'state_code_invalid' };
  return { valid: true, state_code: sc };
}

/** True if party is unregistered (URP, empty, or invalid). */
export function isUnregisteredParty(gstin: string | null | undefined): boolean {
  const v = (gstin ?? '').trim().toUpperCase();
  if (!v || v === URP_SENTINEL) return true;
  return !validateGSTIN(v).valid;
}

/** True if GSTIN's embedded state code matches the given state_code. */
export function gstinStateMatches(
  gstin: string | null | undefined,
  state_code: string | null | undefined,
): boolean {
  const r = validateGSTIN(gstin);
  if (!r.valid || !r.state_code) return false;
  const sc = (state_code ?? '').trim();
  if (!sc) return false;
  return r.state_code === sc.padStart(2, '0');
}

/** Extract embedded state code from GSTIN, or null if invalid. */
export function gstinStateCode(gstin: string | null | undefined): string | null {
  const r = validateGSTIN(gstin);
  return r.valid && r.state_code ? r.state_code : null;
}
