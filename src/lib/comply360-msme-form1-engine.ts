/**
 * @file        src/lib/comply360-msme-form1-engine.ts
 * @purpose     Comply360 MSME Form 1 engine · half-yearly delayed-payment return
 *              under MSMED Act §15 (payments to MSME vendors outstanding >45 days).
 *              §16 interest at 3× RBI bank rate (compounded monthly) computed for disclosure.
 * @sprint      Sprint 73a · T-Phase-5.A.1.5-PASS-A · Block 5 · DP-S73-4
 * @iso         Reliability · Maintainability · Auditability
 * @disciplines FR-19 SIBLING · FR-43 unit tests · FR-79 audit stamping · FR-91 honest disclosure
 * @reads-from  src/lib/oob/vendor-compliance-rules.ts (msme_validity rule · 0-DIFF) ·
 *              localStorage `erp_group_vouchers_<entityCode>` (purchase / payment stream)
 */
import { COMPLIANCE_RULES } from './oob/vendor-compliance-rules';

// ── Public Types ─────────────────────────────────────────────────────

export type MSMEHalf = 'H1' | 'H2'; // H1 = Apr-Sep · H2 = Oct-Mar

export interface MSMEDelayedPayment {
  vendor_id: string;
  vendor_name: string;
  vendor_pan?: string;
  vendor_udyam?: string;
  invoice_no: string;
  invoice_date: string;            // ISO yyyy-mm-dd
  due_date: string;                // ISO — 45 days from acceptance under §15
  invoice_value: number;
  amount_outstanding: number;
  days_outstanding: number;
  reason_for_delay?: string;
}

export interface MSMEForm1Filter {
  entity_code: string;
  fy: string;                      // 'FY25-26'
  half: MSMEHalf;
  as_on_date?: string;             // defaults to half-end
}

export interface MSMEInterestComputation {
  invoice_no: string;
  principal_outstanding: number;
  days_delayed: number;
  rbi_bank_rate_pct: number;
  applicable_rate_pct: number;     // 3× RBI bank rate
  interest_amount: number;
}

export interface MSMEForm1Return {
  entity_code: string;
  fy: string;
  half: MSMEHalf;
  period_from: string;
  period_to: string;
  total_vendors: number;
  total_invoices: number;
  total_outstanding: number;
  total_interest_liability: number;
  payments: MSMEDelayedPayment[];
  interest: MSMEInterestComputation[];
  filed: boolean;
}

// ── READS_FROM contract (Lesson 23) ──────────────────────────────────

export const READS_FROM = {
  vendorComplianceRules: 'src/lib/oob/vendor-compliance-rules.ts',
  voucherStream: 'localStorage:erp_group_vouchers_<entityCode>',
} as const;

// ── Constants ────────────────────────────────────────────────────────

/** §15 MSMED Act statutory ceiling — 45 calendar days. */
export const MSME_DELAY_THRESHOLD_DAYS = 45;

/** Indicative RBI bank rate (June 2026) — overridable per [JWT] for real filings. */
export const DEFAULT_RBI_BANK_RATE_PCT = 6.75;

// ── Internal helpers ─────────────────────────────────────────────────

interface RawPurchaseVoucher {
  id?: string;
  voucher_no?: string;
  date?: string;
  invoice_date?: string;
  due_date?: string;
  party_id?: string;
  party_name?: string;
  vendor_pan?: string;
  vendor_udyam?: string;
  vendor_msme_status?: 'micro' | 'small' | 'medium' | 'not-msme' | null;
  net_amount?: number;
  amount_outstanding?: number;
  status?: string;
  source_card?: string;
}

function loadVouchers(entityCode: string): RawPurchaseVoucher[] {
  // [JWT] GET /api/accounting/vouchers?entity=<entityCode>&purchase=1
  try {
    const raw = localStorage.getItem(`erp_group_vouchers_${entityCode}`);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as RawPurchaseVoucher[]) : [];
  } catch {
    return [];
  }
}

function halfRange(fy: string, half: MSMEHalf): { from: string; to: string } {
  const m = /^FY(\d{2})-(\d{2})$/.exec(fy);
  const startYear = m ? 2000 + Number(m[1]) : 2025;
  if (half === 'H1') {
    return { from: `${startYear}-04-01`, to: `${startYear}-09-30` };
  }
  return { from: `${startYear}-10-01`, to: `${startYear + 1}-03-31` };
}

function daysBetween(fromIso: string, toIso: string): number {
  const a = new Date(fromIso).getTime();
  const b = new Date(toIso).getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.max(0, Math.floor((b - a) / (1000 * 60 * 60 * 24)));
}

function isMSMEVendor(v: RawPurchaseVoucher): boolean {
  if (!v.vendor_msme_status) return false;
  return v.vendor_msme_status === 'micro' || v.vendor_msme_status === 'small' || v.vendor_msme_status === 'medium';
}

function deriveDueDate(invoiceDate: string, explicitDue?: string): string {
  if (explicitDue) return explicitDue;
  const d = new Date(invoiceDate);
  if (Number.isNaN(d.getTime())) return invoiceDate;
  d.setUTCDate(d.getUTCDate() + MSME_DELAY_THRESHOLD_DAYS);
  return d.toISOString().slice(0, 10);
}

// ── Public API ───────────────────────────────────────────────────────

/**
 * Detect MSME delayed payments (>45 days outstanding) for the given half.
 * Joins `vendor_msme_status` from voucher meta with the `msme_validity` compliance rule;
 * vouchers without a declared MSME status are excluded (rule fails → not in scope of §15).
 */
export function detectDelayedPayments(filter: MSMEForm1Filter): MSMEDelayedPayment[] {
  const { from, to } = halfRange(filter.fy, filter.half);
  const asOn = filter.as_on_date ?? to;
  const vouchers = loadVouchers(filter.entity_code);
  const out: MSMEDelayedPayment[] = [];

  // Use the COMPLIANCE_RULES MSME validity rule to confirm vendor declaration discipline.
  const msmeRule = COMPLIANCE_RULES.find((r) => r.id === 'msme_validity');

  for (const v of vouchers) {
    if (v.status && v.status !== 'posted') continue;
    if (!isMSMEVendor(v)) continue;
    if (msmeRule) {
      const stub = {
        vendor_gstin: '',
        vendor_msme_status: v.vendor_msme_status,
      } as unknown as Parameters<typeof msmeRule.validate>[0];
      if (!msmeRule.validate(stub).ok) continue;
    }
    const invDate = v.invoice_date ?? v.date ?? '';
    if (!invDate) continue;
    if (invDate < from || invDate > to) continue;
    const dueDate = deriveDueDate(invDate, v.due_date);
    const outstanding = v.amount_outstanding ?? 0;
    if (outstanding <= 0) continue;
    const daysOut = daysBetween(dueDate, asOn);
    if (daysOut <= 0) continue;

    out.push({
      vendor_id: v.party_id ?? '',
      vendor_name: v.party_name ?? '',
      vendor_pan: v.vendor_pan,
      vendor_udyam: v.vendor_udyam,
      invoice_no: v.voucher_no ?? v.id ?? '',
      invoice_date: invDate,
      due_date: dueDate,
      invoice_value: v.net_amount ?? outstanding,
      amount_outstanding: outstanding,
      days_outstanding: daysOut,
    });
  }
  return out.sort((a, b) => b.days_outstanding - a.days_outstanding);
}

/**
 * §16 interest: 3× RBI bank rate, compounded monthly, on principal outstanding for `days_delayed`.
 * Returns a per-invoice breakdown for disclosure.
 */
export function computeInterestLiability(
  payment: MSMEDelayedPayment,
  rbiBankRatePct: number = DEFAULT_RBI_BANK_RATE_PCT,
): MSMEInterestComputation {
  const applicableRate = 3 * rbiBankRatePct;
  const monthlyRate = applicableRate / 12 / 100;
  const months = payment.days_outstanding / 30;
  const compounded = payment.amount_outstanding * (Math.pow(1 + monthlyRate, months) - 1);
  const interest = Math.round(compounded * 100) / 100;
  return {
    invoice_no: payment.invoice_no,
    principal_outstanding: payment.amount_outstanding,
    days_delayed: payment.days_outstanding,
    rbi_bank_rate_pct: rbiBankRatePct,
    applicable_rate_pct: applicableRate,
    interest_amount: interest,
  };
}

/** Build the half-yearly MSME Form 1 return for filing. */
export function buildMSMEForm1(
  filter: MSMEForm1Filter,
  rbiBankRatePct: number = DEFAULT_RBI_BANK_RATE_PCT,
): MSMEForm1Return {
  const payments = detectDelayedPayments(filter);
  const interest = payments.map((p) => computeInterestLiability(p, rbiBankRatePct));
  const { from, to } = halfRange(filter.fy, filter.half);
  const totalOutstanding = payments.reduce((acc, p) => acc + p.amount_outstanding, 0);
  const totalInterest = interest.reduce((acc, i) => acc + i.interest_amount, 0);
  const uniqueVendors = new Set(payments.map((p) => p.vendor_id)).size;
  return {
    entity_code: filter.entity_code,
    fy: filter.fy,
    half: filter.half,
    period_from: from,
    period_to: to,
    total_vendors: uniqueVendors,
    total_invoices: payments.length,
    total_outstanding: Math.round(totalOutstanding * 100) / 100,
    total_interest_liability: Math.round(totalInterest * 100) / 100,
    payments,
    interest,
    filed: false,
  };
}
