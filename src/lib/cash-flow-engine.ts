/**
 * @file     cash-flow-engine.ts
 * @purpose  PURE QUERY · Cash-Flow Optimizer · 90-day daily projection ·
 *           weekly forecast · payment-timing suggestions respecting MSME 43B(h)
 *           breach priority and projected balance.
 * @who      Operix Engineering
 * @when     Apr-2026 · T-T8.7-SmartAP (Group B Sprint B.7)
 * @sprint   T-T8.7-SmartAP
 * @phase    Phase 1 client-side · Phase 2 swap to backend with same query contract.
 * @whom     SmartAPHub · CashFlowDashboard
 * @depends  msme-43bh-engine (B.5 · getMSMEBreaches reused for breach priority · DO NOT MODIFY) ·
 *           payment-requisition (B.4 · READ approved reqs · DO NOT MODIFY) ·
 *           voucher (READ Sales/Purchase invoices for receivables) ·
 *           erp_group_ledger_definitions (READ bank ledger balances).
 *
 * Per Q-FF (a) Universal · per Q-CC (a) leverage existing FinCore + B.5 + B.4.
 *
 * IMPORTANT: PURE QUERY engine · NO localStorage writes · NO state mutations.
 *
 * [DEFERRED · Support & Back Office] receivables forecast accuracy enhancement
 *   (Phase 2: integrate with SalesX customer-collection forecast for higher
 *   fidelity). Cash-flow optimizer is PURE QUERY · NO state mutation · NO writes.
 */

import { addDays, parseISO, startOfWeek, endOfWeek, format } from 'date-fns';
import type {
  BankBalanceRow, CashFlowProjection, PaymentForecastWeek, PaymentTimingSuggestion,
} from '@/types/smart-ap';
import type { Voucher } from '@/types/voucher';
import { vouchersKey } from '@/lib/finecore-engine';
import type { PaymentRequisition } from '@/types/payment-requisition';
import { paymentRequisitionsKey } from '@/types/payment-requisition';
import { getMSMEBreaches } from '@/lib/msme-43bh-engine';

// ── Read shapes (subset) ───────────────────────────────────────────────

interface BankLedgerRow {
  id: string;
  ledgerType?: string;
  ledger_name?: string;
  name?: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  openingBalance?: number;
  currentBalance?: number;
}

// ── Read helpers (read-only) ───────────────────────────────────────────

function loadVouchers(entityCode: string): Voucher[] {
  // [JWT] GET /api/accounting/vouchers/:entity · READ only
  try {
    const raw = localStorage.getItem(vouchersKey(entityCode));
    return raw ? (JSON.parse(raw) as Voucher[]) : [];
  } catch { return []; }
}

function loadReqs(entityCode: string): PaymentRequisition[] {
  // [JWT] GET /api/payment-requisitions?entity={entityCode} · READ only
  try {
    const raw = localStorage.getItem(paymentRequisitionsKey(entityCode));
    return raw ? (JSON.parse(raw) as PaymentRequisition[]) : [];
  } catch { return []; }
}

function loadBankLedgers(entityCode: string): BankLedgerRow[] {
  // [JWT] GET /api/masters/ledgers?entity={entityCode}&type=bank · READ only
  try {
    const raw = localStorage.getItem(`erp_group_ledger_definitions_${entityCode}`);
    if (!raw) return [];
    const arr = JSON.parse(raw) as BankLedgerRow[];
    return arr.filter(l => l.ledgerType === 'bank');
  } catch { return []; }
}

function ymd(d: Date): string { return format(d, 'yyyy-MM-dd'); }

// ── Public API ─────────────────────────────────────────────────────────

/** Current bank balances · sums opening + posted Receipt minus Payment per ledger. */
export function getCurrentBankBalances(entityCode: string): BankBalanceRow[] {
  const ledgers = loadBankLedgers(entityCode);
  const vouchers = loadVouchers(entityCode);
  return ledgers.map(l => {
    const opening = l.currentBalance ?? l.openingBalance ?? 0;
    let movement = 0;
    for (const v of vouchers) {
      if (v.status !== 'posted') continue;
      if (v.from_ledger_name === (l.bankName ?? l.ledger_name ?? l.name)) {
        if (v.base_voucher_type === 'Payment') movement -= v.net_amount ?? 0;
        if (v.base_voucher_type === 'Receipt') movement += v.net_amount ?? 0;
      }
    }
    return {
      ledger_id: l.id,
      ledger_name: l.bankName ?? l.ledger_name ?? l.name ?? l.id,
      balance: opening + movement,
      ifsc: l.ifscCode,
      account_no: l.accountNumber,
    };
  });
}

/** Sum of bank balances · single number used as opening for projection day 1. */
function totalBankBalance(entityCode: string): number {
  return getCurrentBankBalances(entityCode).reduce((s, b) => s + b.balance, 0);
}

/** Receivables forecast · sums posted Sales Invoices not yet fully receipted, by date.
 *  Uses voucher.date as the expected inflow date (Phase 2 will swap to due_date). */
function receivablesByDate(entityCode: string): Map<string, number> {
  const vouchers = loadVouchers(entityCode);
  const buckets = new Map<string, number>();
  const today = ymd(new Date());
  // Sum receipts posted against each sales invoice
  const receiptByInvoice = new Map<string, number>();
  for (const v of vouchers) {
    if (v.base_voucher_type !== 'Receipt' || v.status !== 'posted') continue;
    for (const ref of v.bill_references ?? []) {
      if (ref.type !== 'against_ref') continue;
      receiptByInvoice.set(ref.voucher_id,
        (receiptByInvoice.get(ref.voucher_id) ?? 0) + ref.amount);
    }
  }
  for (const v of vouchers) {
    if (v.base_voucher_type !== 'Sales' || v.status !== 'posted') continue;
    const received = receiptByInvoice.get(v.id) ?? 0;
    const outstanding = Math.max(0, (v.net_amount ?? 0) - received);
    if (outstanding <= 0) continue;
    // Expected inflow date = invoice date + 30 days (default credit) · clip to today min
    const expected = addDays(parseISO(v.date), 30);
    const key = ymd(expected) < today ? today : ymd(expected);
    buckets.set(key, (buckets.get(key) ?? 0) + outstanding);
  }
  return buckets;
}

/** Committed outflows by date · approved PaymentRequisitions (estimated as today + 1d). */
function committedByDate(entityCode: string): Map<string, number> {
  const reqs = loadReqs(entityCode).filter(r => r.status === 'approved');
  const buckets = new Map<string, number>();
  const tomorrow = ymd(addDays(new Date(), 1));
  for (const r of reqs) {
    buckets.set(tomorrow, (buckets.get(tomorrow) ?? 0) + r.amount);
  }
  return buckets;
}

/** Compute daily cash-flow projection for `daysAhead` days from today. */
export function computeCashFlowProjection(
  entityCode: string,
  daysAhead: number = 90,
): CashFlowProjection[] {
  const recv = receivablesByDate(entityCode);
  const comm = committedByDate(entityCode);
  const breaches = getMSMEBreaches(entityCode);
  const breachDates = new Set(breaches.filter(b => b.status === 'breached'
      || b.status === 'breaching_soon').map(b => b.deadline.deadline_date));

  let opening = totalBankBalance(entityCode);
  const out: CashFlowProjection[] = [];
  for (let i = 0; i < daysAhead; i++) {
    const d = ymd(addDays(new Date(), i));
    const receivables = recv.get(d) ?? 0;
    const committed = comm.get(d) ?? 0;
    const closing = opening + receivables - committed;
    out.push({
      date: d,
      opening_balance: opening,
      receivables,
      committed_payments: committed,
      suggested_payments: 0,
      closing_balance: closing,
      is_negative_warning: closing < 0,
      is_msme_breach_week: breachDates.has(d),
    });
    opening = closing;
  }
  return out;
}

/** Suggest a payment date for a requisition · prefers earliest day with positive
 *  projected balance · MSME breach vendors get top priority (today). */
export function suggestPaymentTiming(
  entityCode: string,
  requisitionId: string,
): PaymentTimingSuggestion | null {
  const reqs = loadReqs(entityCode);
  const req = reqs.find(r => r.id === requisitionId);
  if (!req) return null;
  const breaches = getMSMEBreaches(entityCode);
  const isBreach = breaches.some(b =>
    b.vendor_id === req.vendor_id && (b.status === 'breached' || b.status === 'breaching_soon'));

  if (isBreach) {
    return {
      requisition_id: req.id,
      vendor_name: req.vendor_name ?? req.requested_by_name,
      amount: req.amount,
      suggested_date: ymd(new Date()),
      reason: 'MSME 43B(h) breach priority · pay immediately to avoid expense disallowance',
      msme_priority: true,
    };
  }

  const projection = computeCashFlowProjection(entityCode, 30);
  const firstSafe = projection.find(p => p.closing_balance >= req.amount);
  return {
    requisition_id: req.id,
    vendor_name: req.vendor_name ?? req.requested_by_name,
    amount: req.amount,
    suggested_date: firstSafe?.date ?? ymd(addDays(new Date(), 30)),
    reason: firstSafe
      ? `First date with projected balance >= ₹${req.amount.toLocaleString('en-IN')}`
      : 'No safe date in 30-day window · review cash-flow',
    msme_priority: false,
  };
}

/** 13-week forecast · aggregates daily projection into weekly buckets. */
export function forecastByWeek(
  entityCode: string,
  weeksAhead: number = 13,
): PaymentForecastWeek[] {
  const daily = computeCashFlowProjection(entityCode, weeksAhead * 7);
  const buckets = new Map<string, PaymentForecastWeek>();
  for (const d of daily) {
    const dt = parseISO(d.date);
    const ws = ymd(startOfWeek(dt, { weekStartsOn: 1 }));
    const we = ymd(endOfWeek(dt, { weekStartsOn: 1 }));
    const cur = buckets.get(ws) ?? {
      week_start: ws, week_end: we,
      committed: 0, auto_pay_predicted: 0, receivables: 0, net: 0,
      is_negative: false,
    };
    cur.committed += d.committed_payments;
    cur.receivables += d.receivables;
    cur.net = cur.receivables - cur.committed - cur.auto_pay_predicted;
    cur.is_negative = cur.net < 0;
    buckets.set(ws, cur);
  }
  return [...buckets.values()].sort((a, b) => a.week_start.localeCompare(b.week_start));
}
