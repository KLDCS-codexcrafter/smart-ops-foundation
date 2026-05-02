/**
 * @file     BankInstrumentPicker.helpers.ts
 * @sprint   T-Phase-2.7-c · Card #2.7 sub-sprint 3 of 5 · Q4-c
 * @purpose  Type contract for the picker · split into a non-component module so
 *           the .tsx file exports React components only (react-refresh rule).
 *
 *  Mirrors the 8-instrument union in `src/lib/payment-engine.ts` line 44 plus
 *  NACH and Card (Q4-c · 10 total). 5 fields align byte-identically with
 *  Voucher.ts (T10-pre.1a) — D-128 preserved · zero schema additions.
 */

export type InstrumentType =
  | 'NEFT' | 'RTGS' | 'IMPS' | 'UPI' | 'NACH'
  | 'Cheque' | 'DD' | 'Card' | 'Cash' | 'Other';

export interface InstrumentValue {
  instrument_type: InstrumentType | null;
  instrument_ref_no: string | null;
  cheque_date: string | null;
  bank_name: string | null;
  deposit_date: string | null;
}

export const EMPTY_INSTRUMENT: InstrumentValue = {
  instrument_type: null,
  instrument_ref_no: null,
  cheque_date: null,
  bank_name: null,
  deposit_date: null,
};

/** Q4-c exhaustive — 10 instruments shown in the dropdown. */
export const INSTRUMENT_OPTIONS: ReadonlyArray<{ value: InstrumentType; label: string }> = [
  { value: 'NEFT',   label: 'NEFT' },
  { value: 'RTGS',   label: 'RTGS' },
  { value: 'IMPS',   label: 'IMPS' },
  { value: 'UPI',    label: 'UPI' },
  { value: 'NACH',   label: 'NACH' },
  { value: 'Cheque', label: 'Cheque' },
  { value: 'DD',     label: 'Demand Draft' },
  { value: 'Card',   label: 'Card' },
  { value: 'Cash',   label: 'Cash' },
  { value: 'Other',  label: 'Other' },
] as const;
