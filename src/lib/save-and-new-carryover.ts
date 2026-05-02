/**
 * save-and-new-carryover.ts — Sprint 2.7-d-1 · Q4-d
 *
 * Field carry-over rules for Save-and-New flow.
 * When operator saves voucher A and "Save & New" opens voucher B,
 * carry: date + party + voucher_type. Items + amounts blank.
 */

export interface CarryOverFields {
  voucher_date?: string | null;
  voucher_type_id?: string | null;
  voucher_type_name?: string | null;
  // Party (form-specific field name · all optional)
  customer_id?: string | null;
  customer_name?: string | null;
  vendor_id?: string | null;
  vendor_name?: string | null;
  distributor_id?: string | null;
  distributor_name?: string | null;
  recipient_name?: string | null;
}

const CARRY_KEYS: ReadonlyArray<keyof CarryOverFields> = [
  'voucher_date',
  'voucher_type_id',
  'voucher_type_name',
  'customer_id',
  'customer_name',
  'vendor_id',
  'vendor_name',
  'distributor_id',
  'distributor_name',
  'recipient_name',
] as const;

function pickString(record: Record<string, unknown>, key: string): string | null | undefined {
  if (!(key in record)) return undefined;
  const v = record[key];
  if (v === null) return null;
  return typeof v === 'string' ? v : undefined;
}

/** Extracts carry-over fields from a saved voucher record. Missing fields are omitted. */
export function extractCarryOverFields(savedRecord: Record<string, unknown>): CarryOverFields {
  const out: CarryOverFields = {};
  for (const key of CARRY_KEYS) {
    const v = pickString(savedRecord, key);
    if (v !== undefined) {
      // assign with the same string key
      (out as Record<string, string | null>)[key] = v;
    }
  }
  // Common alternate field names: 'date' or 'invoice_date' / 'grn_date' etc — try fallbacks for date.
  if (out.voucher_date === undefined) {
    const fallback =
      pickString(savedRecord, 'date') ??
      pickString(savedRecord, 'invoice_date') ??
      pickString(savedRecord, 'grn_date') ??
      pickString(savedRecord, 'memo_date');
    if (fallback !== undefined) out.voucher_date = fallback;
  }
  return out;
}

/** Apply carry-over fields to a fresh blank form state · returns merged state.
 *  Field names that don't exist on the blank form are silently included as new keys
 *  but only if blankForm already has the key (we shallow-pick to avoid leaking unrelated fields).
 */
export function applyCarryOverToForm<T extends Record<string, unknown>>(
  blankForm: T,
  carryOver: CarryOverFields,
): T {
  const merged: Record<string, unknown> = { ...blankForm };
  for (const key of CARRY_KEYS) {
    const v = carryOver[key];
    if (v === undefined) continue;
    if (key in blankForm) {
      merged[key] = v;
    }
  }
  return merged as T;
}
