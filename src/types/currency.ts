/**
 * currency.ts — Currency & Rate of Exchange data model
 * CUR-1 · SSOT: erp_currencies + erp_forex_rates
 * Base currency is set in Parent Company (erp_base_currency) — not here
 */

export interface Currency {
  id: string;
  // Identity
  iso_code: string;              // USD, EUR, GBP, AED, JPY, INR
  name: string;                  // US Dollar
  formal_name: string;           // US Dollar — used in transactions/reports
  symbol: string;                // $
  decimal_places: number;        // 2 (JPY=0, KWD=3)
  symbol_before_amount: boolean; // true=$100, false=100$
  space_between: boolean;        // true=$ 100, false=$100
  show_in_millions: boolean;
  // Status
  is_base_currency: boolean;     // true for the company's home currency only
  is_active: boolean;
  // Metadata
  entity_id: string | null;      // null = group-level (all entities)
  created_at: string;
  updated_at: string;
  // GL linkage — optional until LedgerMaster has party ledgers
  default_receivables_account?: string;  // AR ledger ID for this currency
  default_payables_account?: string;     // AP ledger ID for this currency
  default_gain_loss_account?: string;    // Overrides FXGAIN-SYS / FXLOSS-SYS
}

export interface ForexRate {
  id: string;
  currency_id: string;           // FK → erp_currencies
  applicable_from: string;       // ISO date "2025-04-01"
  /**
   * selling_rate: Rate you GET when RECEIVING foreign currency.
   * Used in: Receipt Voucher (export — customer pays you in foreign currency)
   * e.g. customer pays $1000, you receive ₹84,500 → selling_rate = 84.50
   */
  selling_rate: number | null;
  /**
   * buying_rate: Rate you PAY when SENDING foreign currency.
   * Used in: Payment Voucher (import — you pay supplier in foreign currency)
   * e.g. you pay €1000, costs you ₹90,000 → buying_rate = 90.00
   */
  buying_rate: number | null;
  /**
   * standard_rate: Reference/benchmark rate (RBI rate or internal benchmark).
   * Optional. Used ONLY for variance calculation vs. actual transaction rate.
   * NOT used as the transaction rate itself.
   */
  standard_rate: number | null;
  /**
   * last_voucher_rate: Auto-set by the system when a transaction is posted.
   * Read-only. Priority: if set, overrides standard_rate on that date.
   */
  last_voucher_rate: number | null;
  created_at: string;
}

/**
 * Rate priority on any given transaction date:
 * 1. last_voucher_rate (if set) — system auto-populated
 * 2. selling_rate / buying_rate — from most recent applicable_from ≤ transaction date
 * 3. standard_rate — fallback reference only
 *
 * For transaction conversion:
 * - EXPORT (receiving money): use selling_rate
 * - IMPORT (paying money): use buying_rate
 */
export type RateType = 'selling' | 'buying' | 'standard';
