/**
 * @file        src/lib/comply360-ecrs-engine.ts
 * @purpose     ECRS (Electronic Cash & Credit Register Stub) · Phase-1 localStorage-backed ledger
 * @sprint      Sprint 71 · T-Phase-5.A.1.3 · Block 4 · DP-S71-3
 * @decisions   DP-S71-3 (ECRS greenfield stub · pattern-matches IMS engine · readStorageOr)
 * @iso         Reliability · Auditability
 * @disciplines FR-19 SIBLING · FR-43 unit tests · FR-91 honest disclosure · Lesson 23
 */
import { z } from 'zod';
import { readStorageOr } from './typed-storage';

// ── Public Types ─────────────────────────────────────────────────────

export interface ECRSBalance {
  igst: number;
  cgst: number;
  sgst: number;
  cess: number;
}

export interface ECRSLedger {
  cash: ECRSBalance;
  credit: ECRSBalance;
}

const BalanceSchema = z.object({
  igst: z.number(),
  cgst: z.number(),
  sgst: z.number(),
  cess: z.number(),
});

const LedgerSchema = z.object({
  cash: BalanceSchema,
  credit: BalanceSchema,
});

const ZERO_BALANCE: ECRSBalance = { igst: 0, cgst: 0, sgst: 0, cess: 0 };
const ZERO_LEDGER: ECRSLedger = { cash: { ...ZERO_BALANCE }, credit: { ...ZERO_BALANCE } };

export const ecrsStorageKey = (entity_id: string, return_period: string): string =>
  `comply360.ecrs.${entity_id}.${return_period}`;

// [JWT] GET /api/comply360/ecrs?entity_id=<id>&return_period=<period> · Phase 2 migration
export function loadECRS(entity_id: string, return_period: string): ECRSLedger {
  return readStorageOr(ecrsStorageKey(entity_id, return_period), LedgerSchema, {
    cash: { ...ZERO_BALANCE },
    credit: { ...ZERO_BALANCE },
  });
}

// [JWT] POST /api/comply360/ecrs · Phase 2 migration
export function saveECRS(
  entity_id: string,
  return_period: string,
  ledger: ECRSLedger,
): ECRSLedger {
  try {
    localStorage.setItem(
      ecrsStorageKey(entity_id, return_period),
      JSON.stringify(ledger),
    );
  } catch { /* quota — diagnostics handled by useStorageQuota */ }
  return ledger;
}

/**
 * Compute net payable after offsetting available credit (ITC) then cash balance.
 * Returns positive amounts owed; zero means nothing payable.
 */
export function computeNetPayable(
  liability: ECRSBalance,
  ledger: ECRSLedger,
): ECRSBalance {
  const offset = (l: number, credit: number, cash: number): number => {
    const afterCredit = Math.max(0, l - credit);
    return Math.max(0, afterCredit - cash);
  };
  return {
    igst: offset(liability.igst, ledger.credit.igst, ledger.cash.igst),
    cgst: offset(liability.cgst, ledger.credit.cgst, ledger.cash.cgst),
    sgst: offset(liability.sgst, ledger.credit.sgst, ledger.cash.sgst),
    cess: offset(liability.cess, ledger.credit.cess, ledger.cash.cess),
  };
}

export function totalBalance(balance: ECRSBalance): number {
  return balance.igst + balance.cgst + balance.sgst + balance.cess;
}

export const ECRS_ZERO_LEDGER: ECRSLedger = ZERO_LEDGER;
