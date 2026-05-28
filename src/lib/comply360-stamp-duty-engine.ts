/**
 * @file        src/lib/comply360-stamp-duty-engine.ts
 * @purpose     Comply360 Stamp Duty engine · state-wise stamp-duty calculation by
 *              instrument type + consideration value. Maintains an instrument register
 *              (per entity, localStorage) for audit + Pass B surface consumption.
 * @sprint      Sprint 76a · T-Phase-5.A.1.8-PASS-A · Block 6 · DP-S76-4
 * @decisions   D-S69-1 (100% native) · DP-S76-4 (stamp-duty greenfield)
 * @iso         Reliability · Maintainability · Auditability
 * @disciplines FR-19 SIBLING · FR-43 unit tests · FR-91 honest disclosure
 * @reads-from  localStorage `comply360.stampduty.<entityCode>` (own scoped store)
 * @notes       Rate table is scaffolded with 7 representative states + 7 instrument types.
 *              Real-world filings should defer to state Sub-Registrar tables at time of execution.
 */
import { round2 } from './decimal-helpers';

// ── Public Types ─────────────────────────────────────────────────────

export type InstrumentType =
  | 'sale_deed'
  | 'lease_agreement'
  | 'mortgage_deed'
  | 'gift_deed'
  | 'partnership_deed'
  | 'shareholders_agreement'
  | 'loan_agreement';

export type IndianStateCode =
  | 'MH' | 'KA' | 'TN' | 'DL' | 'GJ' | 'UP' | 'WB' | 'TG' | 'AP' | 'RJ';

export interface StampDutyInstrument {
  id: string;
  entity_code: string;
  instrument_type: InstrumentType;
  state_code: IndianStateCode;
  consideration_value: number;        // ₹ (paise stored elsewhere · ₹ here per D-NEW-FM)
  execution_date: string;             // ISO yyyy-mm-dd
  parties: string[];
  reference_no?: string;
}

export interface StampDutyComputation {
  instrument_type: InstrumentType;
  state_code: IndianStateCode;
  consideration_value: number;
  rate_percent: number;
  stamp_duty: number;
  registration_fee: number;
  total_payable: number;
}

export interface StampDutyRegisterRow extends StampDutyInstrument {
  computation: StampDutyComputation;
  recorded_at: string;
}

// ── State × instrument rate table (representative · scaffolded) ──────

interface RateRow { duty_pct: number; reg_pct: number }

const STATE_RATES: Record<IndianStateCode, Record<InstrumentType, RateRow>> = {
  MH: {
    sale_deed: { duty_pct: 5.0, reg_pct: 1.0 },
    lease_agreement: { duty_pct: 0.25, reg_pct: 1.0 },
    mortgage_deed: { duty_pct: 0.5, reg_pct: 1.0 },
    gift_deed: { duty_pct: 3.0, reg_pct: 1.0 },
    partnership_deed: { duty_pct: 0.0, reg_pct: 0.0 },
    shareholders_agreement: { duty_pct: 0.005, reg_pct: 0.0 },
    loan_agreement: { duty_pct: 0.1, reg_pct: 0.0 },
  },
  KA: {
    sale_deed: { duty_pct: 5.6, reg_pct: 1.0 },
    lease_agreement: { duty_pct: 0.5, reg_pct: 1.0 },
    mortgage_deed: { duty_pct: 0.5, reg_pct: 1.0 },
    gift_deed: { duty_pct: 5.0, reg_pct: 1.0 },
    partnership_deed: { duty_pct: 0.0, reg_pct: 0.0 },
    shareholders_agreement: { duty_pct: 0.005, reg_pct: 0.0 },
    loan_agreement: { duty_pct: 0.1, reg_pct: 0.0 },
  },
  TN: {
    sale_deed: { duty_pct: 7.0, reg_pct: 4.0 },
    lease_agreement: { duty_pct: 1.0, reg_pct: 1.0 },
    mortgage_deed: { duty_pct: 1.0, reg_pct: 1.0 },
    gift_deed: { duty_pct: 7.0, reg_pct: 4.0 },
    partnership_deed: { duty_pct: 0.0, reg_pct: 0.0 },
    shareholders_agreement: { duty_pct: 0.005, reg_pct: 0.0 },
    loan_agreement: { duty_pct: 0.1, reg_pct: 0.0 },
  },
  DL: {
    sale_deed: { duty_pct: 6.0, reg_pct: 1.0 },
    lease_agreement: { duty_pct: 0.5, reg_pct: 1.0 },
    mortgage_deed: { duty_pct: 0.5, reg_pct: 1.0 },
    gift_deed: { duty_pct: 4.0, reg_pct: 1.0 },
    partnership_deed: { duty_pct: 0.0, reg_pct: 0.0 },
    shareholders_agreement: { duty_pct: 0.005, reg_pct: 0.0 },
    loan_agreement: { duty_pct: 0.1, reg_pct: 0.0 },
  },
  GJ: {
    sale_deed: { duty_pct: 4.9, reg_pct: 1.0 },
    lease_agreement: { duty_pct: 1.0, reg_pct: 1.0 },
    mortgage_deed: { duty_pct: 0.5, reg_pct: 1.0 },
    gift_deed: { duty_pct: 4.9, reg_pct: 1.0 },
    partnership_deed: { duty_pct: 0.0, reg_pct: 0.0 },
    shareholders_agreement: { duty_pct: 0.005, reg_pct: 0.0 },
    loan_agreement: { duty_pct: 0.1, reg_pct: 0.0 },
  },
  UP: {
    sale_deed: { duty_pct: 7.0, reg_pct: 1.0 },
    lease_agreement: { duty_pct: 1.0, reg_pct: 1.0 },
    mortgage_deed: { duty_pct: 1.0, reg_pct: 1.0 },
    gift_deed: { duty_pct: 7.0, reg_pct: 1.0 },
    partnership_deed: { duty_pct: 0.0, reg_pct: 0.0 },
    shareholders_agreement: { duty_pct: 0.005, reg_pct: 0.0 },
    loan_agreement: { duty_pct: 0.1, reg_pct: 0.0 },
  },
  WB: {
    sale_deed: { duty_pct: 6.0, reg_pct: 1.0 },
    lease_agreement: { duty_pct: 0.5, reg_pct: 1.0 },
    mortgage_deed: { duty_pct: 0.5, reg_pct: 1.0 },
    gift_deed: { duty_pct: 6.0, reg_pct: 1.0 },
    partnership_deed: { duty_pct: 0.0, reg_pct: 0.0 },
    shareholders_agreement: { duty_pct: 0.005, reg_pct: 0.0 },
    loan_agreement: { duty_pct: 0.1, reg_pct: 0.0 },
  },
  TG: {
    sale_deed: { duty_pct: 4.0, reg_pct: 0.5 },
    lease_agreement: { duty_pct: 0.5, reg_pct: 0.5 },
    mortgage_deed: { duty_pct: 0.5, reg_pct: 0.5 },
    gift_deed: { duty_pct: 4.0, reg_pct: 0.5 },
    partnership_deed: { duty_pct: 0.0, reg_pct: 0.0 },
    shareholders_agreement: { duty_pct: 0.005, reg_pct: 0.0 },
    loan_agreement: { duty_pct: 0.1, reg_pct: 0.0 },
  },
  AP: {
    sale_deed: { duty_pct: 5.0, reg_pct: 1.0 },
    lease_agreement: { duty_pct: 0.5, reg_pct: 1.0 },
    mortgage_deed: { duty_pct: 0.5, reg_pct: 1.0 },
    gift_deed: { duty_pct: 5.0, reg_pct: 1.0 },
    partnership_deed: { duty_pct: 0.0, reg_pct: 0.0 },
    shareholders_agreement: { duty_pct: 0.005, reg_pct: 0.0 },
    loan_agreement: { duty_pct: 0.1, reg_pct: 0.0 },
  },
  RJ: {
    sale_deed: { duty_pct: 6.0, reg_pct: 1.0 },
    lease_agreement: { duty_pct: 0.5, reg_pct: 1.0 },
    mortgage_deed: { duty_pct: 0.25, reg_pct: 1.0 },
    gift_deed: { duty_pct: 5.0, reg_pct: 1.0 },
    partnership_deed: { duty_pct: 0.0, reg_pct: 0.0 },
    shareholders_agreement: { duty_pct: 0.005, reg_pct: 0.0 },
    loan_agreement: { duty_pct: 0.1, reg_pct: 0.0 },
  },
};

export { STATE_RATES };

// ── Storage ──────────────────────────────────────────────────────────

const STORAGE_KEY_PREFIX = 'comply360.stampduty.';

function storageKey(entityCode: string): string {
  return `${STORAGE_KEY_PREFIX}${entityCode}`;
}

function generateInstrumentId(): string {
  return `STAMP/2026/${String(Math.floor(Math.random() * 90000) + 10000)}`;
}

// ── Public API ───────────────────────────────────────────────────────

/** Compute stamp duty + registration fee for an instrument in a given state. */
export function computeStampDuty(
  instrument: Pick<StampDutyInstrument, 'instrument_type' | 'consideration_value'>,
  state: IndianStateCode,
): StampDutyComputation {
  const row = STATE_RATES[state]?.[instrument.instrument_type];
  if (!row) {
    return {
      instrument_type: instrument.instrument_type,
      state_code: state,
      consideration_value: instrument.consideration_value,
      rate_percent: 0,
      stamp_duty: 0,
      registration_fee: 0,
      total_payable: 0,
    };
  }
  const stamp_duty = round2((instrument.consideration_value * row.duty_pct) / 100);
  const registration_fee = round2((instrument.consideration_value * row.reg_pct) / 100);
  return {
    instrument_type: instrument.instrument_type,
    state_code: state,
    consideration_value: instrument.consideration_value,
    rate_percent: row.duty_pct,
    stamp_duty,
    registration_fee,
    total_payable: round2(stamp_duty + registration_fee),
  };
}

/** Load the instrument register for an entity. */
export function loadStampRegister(entityCode: string): StampDutyRegisterRow[] {
  // [JWT] GET /api/comply360/stamp-duty?entity=<entityCode>
  try {
    const raw = localStorage.getItem(storageKey(entityCode));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as StampDutyRegisterRow[]) : [];
  } catch {
    return [];
  }
}

function saveStampRegister(entityCode: string, list: StampDutyRegisterRow[]): void {
  // [JWT] PUT /api/comply360/stamp-duty batch
  try {
    localStorage.setItem(storageKey(entityCode), JSON.stringify(list));
  } catch {
    /* quota — diagnostics via useStorageQuota */
  }
}

/**
 * Record an instrument in the register · computes duty + persists.
 * Returns the persisted row including computation snapshot.
 */
export function recordInstrument(
  instrument: Omit<StampDutyInstrument, 'id'> & { id?: string },
): StampDutyRegisterRow {
  const id = instrument.id ?? generateInstrumentId();
  const full: StampDutyInstrument = { ...instrument, id };
  const computation = computeStampDuty(full, full.state_code);
  const row: StampDutyRegisterRow = {
    ...full,
    computation,
    recorded_at: new Date().toISOString(),
  };
  const list = loadStampRegister(full.entity_code);
  list.push(row);
  saveStampRegister(full.entity_code, list);
  return row;
}

export const STAMP_STORAGE_KEY_PREFIX = STORAGE_KEY_PREFIX;
