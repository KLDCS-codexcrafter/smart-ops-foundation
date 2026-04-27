/**
 * @file     msme-43bh-engine.ts
 * @purpose  Section 43B(h) compliance engine — detects MSME (micro/small)
 *           vendor bill breaches against 15-day / 45-day deadline rule.
 * @who      Operix Engineering
 * @when     Apr-2026 · T-T8.5-MSME-Compliance (Group B Sprint B.5)
 * @sprint   T-T8.5-MSME-Compliance
 * @phase    Phase 1 client-side · Phase 2 swap to backend with same query contract.
 * @whom     MSMEAlerts.tsx · PayOutDashboard.tsx (KPI count) ·
 *           Form26Q + ChallanRegister "Generate from PayOut" handlers (read-only).
 *
 * 43B(h) Rule (Income Tax Act · effective FY 2023-24):
 *   - Indian companies must pay MSME (micro/small) suppliers within:
 *       * 15 days if no written agreement
 *       * 45 days with written agreement (proxy: vendor.creditDays > 15)
 *   - Failure → expense disallowed in computing taxable income
 *   - Hardcoded 15/45 day rule per statute · NOT configurable.
 *
 * Per Q-EE (a): no parallel report · this engine FEEDS existing Form26Q +
 *   ChallanRegister "Generate from PayOut" buttons + new MSME Alerts dashboard.
 *
 * [DEFERRED · Support & Back Office] hard payment-block on VendorPaymentEntry ·
 *   email/SMS/WhatsApp breach notifications · configurable deadline rules ·
 *   approval routing on breach.
 *   See: /Future_Task_Register_Support_BackOffice.md · Capabilities 2, 4.
 *
 * IMPORTANT: PURE QUERY engine · NO state mutations · NO localStorage writes.
 *   Only reads vendor master + voucher storage.
 */

import { addDays, parseISO, differenceInDays } from 'date-fns';
import type { Voucher } from '@/types/voucher';
import { vouchersKey } from '@/lib/finecore-engine';

// ── Schemas ─────────────────────────────────────────────────────

interface VendorRow {
  id: string;
  name: string;
  msmeRegistered: boolean;
  msmeCategory: 'micro' | 'small' | 'medium' | null;
  msmeUdyamNo?: string;
  creditDays: number;
}

export interface MSMEDeadline {
  deadline_date: string;
  days_allowed: 15 | 45;
  rule: 'no_agreement_15_days' | 'with_agreement_45_days';
}

export interface MSMEBreach {
  vendor_id: string;
  vendor_name: string;
  msme_category: 'micro' | 'small';
  invoice_id: string;
  invoice_no: string;
  invoice_date: string;
  invoice_amount: number;
  paid_amount: number;
  unpaid_amount: number;
  deadline: MSMEDeadline;
  days_overdue: number;
  status: 'breaching_soon' | 'breached' | 'within_deadline';
}

export interface MSME43BhSummary {
  total_msme_vendors: number;
  open_msme_bills_count: number;
  open_msme_bills_amount: number;
  breaching_soon_count: number;        // <5 days remaining
  breached_count: number;
  breached_amount: number;
  within_deadline_count: number;
  disallowed_amount: number;           // breached invoices' unpaid amount
}

// ── Helpers (read-only) ────────────────────────────────────────

function loadVendors(): VendorRow[] {
  // [JWT] GET /api/masters/vendors — read-only
  try {
    const raw = localStorage.getItem('erp_group_vendor_master');
    if (!raw) return [];
    const v = JSON.parse(raw) as VendorRow[];
    return v.filter(
      x => x && x.msmeRegistered === true
        && (x.msmeCategory === 'micro' || x.msmeCategory === 'small'),
    );
  } catch { return []; }
}

function loadVouchersForEntity(entityCode: string): Voucher[] {
  // [JWT] GET /api/accounting/vouchers/:entity — read-only
  try {
    const raw = localStorage.getItem(vouchersKey(entityCode));
    return raw ? (JSON.parse(raw) as Voucher[]) : [];
  } catch { return []; }
}

/** Sum of Payment voucher allocations against a Purchase invoice id. */
function computePaidOnInvoice(allVouchers: Voucher[], invoiceId: string): number {
  let paid = 0;
  for (const v of allVouchers) {
    if (v.base_voucher_type !== 'Payment') continue;
    if (!v.bill_references) continue;
    for (const ref of v.bill_references) {
      if (ref.type === 'against_ref' && ref.voucher_id === invoiceId) {
        paid += ref.amount;
      }
    }
  }
  return paid;
}

// ── Public API ─────────────────────────────────────────────────

/** Determine deadline for an MSME invoice per 15/45-day rule. */
export function getMSMEDeadlineForVendor(
  vendor: VendorRow,
  invoiceDate: string,
): MSMEDeadline {
  const daysAllowed: 15 | 45 = vendor.creditDays > 15 ? 45 : 15;
  const rule = daysAllowed === 15 ? 'no_agreement_15_days' : 'with_agreement_45_days';
  const deadline = addDays(parseISO(invoiceDate), daysAllowed).toISOString().slice(0, 10);
  return { deadline_date: deadline, days_allowed: daysAllowed, rule };
}

/** Returns all MSME breaches and pending invoices for an entity, as of a given date. */
export function getMSMEBreaches(
  entityCode: string,
  asOfDate: string = new Date().toISOString().slice(0, 10),
): MSMEBreach[] {
  const vendors = loadVendors();
  const vendorMap = new Map<string, VendorRow>(vendors.map(v => [v.id, v]));
  const vouchers = loadVouchersForEntity(entityCode);

  const purchaseInvoices = vouchers.filter(v =>
    v.base_voucher_type === 'Purchase'
    && v.party_id
    && vendorMap.has(v.party_id)
    && v.status === 'posted',
  );

  const breaches: MSMEBreach[] = [];
  for (const inv of purchaseInvoices) {
    const vendor = vendorMap.get(inv.party_id ?? '');
    if (!vendor) continue;
    if (vendor.msmeCategory !== 'micro' && vendor.msmeCategory !== 'small') continue;

    const deadline = getMSMEDeadlineForVendor(vendor, inv.date);
    const paidAmount = computePaidOnInvoice(vouchers, inv.id);
    const unpaidAmount = Math.max(0, (inv.net_amount ?? 0) - paidAmount);
    if (unpaidAmount <= 0) continue; // Fully paid · no breach

    const daysOverdue = differenceInDays(parseISO(asOfDate), parseISO(deadline.deadline_date));
    let status: MSMEBreach['status'];
    if (daysOverdue > 0) status = 'breached';
    else if (daysOverdue >= -5) status = 'breaching_soon';
    else status = 'within_deadline';

    breaches.push({
      vendor_id: vendor.id,
      vendor_name: vendor.name,
      msme_category: vendor.msmeCategory,
      invoice_id: inv.id,
      invoice_no: inv.voucher_no,
      invoice_date: inv.date,
      invoice_amount: inv.net_amount ?? 0,
      paid_amount: paidAmount,
      unpaid_amount: unpaidAmount,
      deadline,
      days_overdue: daysOverdue,
      status,
    });
  }

  return breaches.sort((a, b) => b.days_overdue - a.days_overdue);
}

/** Upcoming deadlines within next N days (default 7) — proactive alerts. */
export function getMSMEUpcomingDeadlines(
  entityCode: string,
  withinDays: number = 7,
): MSMEBreach[] {
  return getMSMEBreaches(entityCode).filter(
    b => b.status === 'breaching_soon' && b.days_overdue >= -withinDays,
  );
}

/** Aggregate KPI summary for dashboard. */
export function compute43BhSummary(entityCode: string): MSME43BhSummary {
  const breaches = getMSMEBreaches(entityCode);
  const vendors = loadVendors();
  const breached = breaches.filter(b => b.status === 'breached');
  return {
    total_msme_vendors: vendors.length,
    open_msme_bills_count: breaches.length,
    open_msme_bills_amount: breaches.reduce((s, b) => s + b.unpaid_amount, 0),
    breaching_soon_count: breaches.filter(b => b.status === 'breaching_soon').length,
    breached_count: breached.length,
    breached_amount: breached.reduce((s, b) => s + b.unpaid_amount, 0),
    within_deadline_count: breaches.filter(b => b.status === 'within_deadline').length,
    disallowed_amount: breached.reduce((s, b) => s + b.unpaid_amount, 0),
  };
}

/** Sum of breached unpaid invoice amounts within a financial year (e.g., '2025-26'). */
export function disallowedAmountForFY(entityCode: string, fyLabel: string): number {
  const [startYearStr] = fyLabel.split('-');
  const startYear = parseInt(startYearStr, 10);
  if (!Number.isFinite(startYear)) return 0;
  const fyStart = `${startYear}-04-01`;
  const fyEnd = `${startYear + 1}-03-31`;
  return getMSMEBreaches(entityCode)
    .filter(b => b.status === 'breached' && b.invoice_date >= fyStart && b.invoice_date <= fyEnd)
    .reduce((s, b) => s + b.unpaid_amount, 0);
}

/** True if vendor has any breached invoice as of asOfDate.
 *  Used by UI as a query · DOES NOT block payment by itself.
 *  [DEFERRED · Support & Back Office] hard payment-block integration. */
export function isPaymentBlockedFor43Bh(
  entityCode: string,
  vendorId: string,
  asOfDate?: string,
): boolean {
  return getMSMEBreaches(entityCode, asOfDate)
    .some(b => b.vendor_id === vendorId && b.status === 'breached');
}
