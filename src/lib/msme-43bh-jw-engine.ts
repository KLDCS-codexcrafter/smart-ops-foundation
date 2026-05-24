/**
 * @file        src/lib/msme-43bh-jw-engine.ts
 * @sprint      T-Phase-3.PROD-2 · ST7 · PROD-LEAK-9 closure · Q-LOCK-7
 * @purpose     43B(h) extension for Job-Work vendors · MSME JW bill breach detection.
 *              Sub-helper engine · NOT a new SIBLING · reuses MSME deadline rule from
 *              msme-43bh-engine and FR-26 entity-scoping.
 * @disciplines FR-26 entity-scoped · FR-93 engine-side ls-helper · 15/45-day statute
 * @[JWT]       GET /api/production/msme-jw-breaches/:entityCode
 *
 * v1 limitation note:
 * JW invoices are tracked via JobWorkReceipt completion-date as the bill anchor.
 * Once JW-specific Purchase vouchers carry jwo_id linkage, swap to voucher-based pay tracking.
 * Acceptable trade-off for LEAK-9 v1 closure.
 */

import { addDays, parseISO, differenceInDays } from 'date-fns';
import type { JobWorkReceipt } from '@/types/job-work-receipt';
import { jobWorkReceiptsKey } from '@/types/job-work-receipt';

interface VendorRow {
  id: string;
  name: string;
  msmeRegistered: boolean;
  msmeCategory: 'micro' | 'small' | 'medium' | null;
  creditDays: number;
}

export interface JWMSMEBreach {
  vendor_id: string;
  vendor_name: string;
  msme_category: 'micro' | 'small';
  jw_receipt_id: string;
  jw_receipt_no: string;
  receipt_date: string;
  receipt_value: number;
  deadline_date: string;
  days_allowed: 15 | 45;
  days_overdue: number;
  status: 'breaching_soon' | 'breached' | 'within_deadline';
}

export interface JWMSMESummary {
  total_jw_msme_vendors: number;
  open_jw_bills_count: number;
  open_jw_bills_value: number;
  breaching_soon_count: number;
  breached_count: number;
  breached_value: number;
}

function lsReadVendors(): VendorRow[] {
  try {
    // [JWT] GET /api/masters/vendors
    const raw = localStorage.getItem('erp_group_vendor_master');
    if (!raw) return [];
    return (JSON.parse(raw) as VendorRow[]).filter(
      v => v?.msmeRegistered && (v.msmeCategory === 'micro' || v.msmeCategory === 'small'),
    );
  } catch {
    return [];
  }
}

function lsReadReceipts(entityCode: string): JobWorkReceipt[] {
  try {
    // [JWT] GET /api/production/job-work-receipts/:entityCode
    const raw = localStorage.getItem(jobWorkReceiptsKey(entityCode));
    return raw ? (JSON.parse(raw) as JobWorkReceipt[]) : [];
  } catch {
    return [];
  }
}

/** Per-unit valuation fallback · matches jw-shortage-engine stub. */
function jwReceiptValue(r: JobWorkReceipt): number {
  // [JWT] GET /api/items/:id/standard-rate · stub ₹1 per unit
  return r.lines.reduce((s, l) => s + l.received_qty, 0);
}

export function detectJWMSMEBreaches(
  entityCode: string,
  asOf: string = new Date().toISOString().slice(0, 10),
): JWMSMEBreach[] {
  const vendors = lsReadVendors();
  const vendorMap = new Map(vendors.map(v => [v.id, v]));
  const receipts = lsReadReceipts(entityCode).filter(r => r.status === 'received');
  const out: JWMSMEBreach[] = [];

  for (const r of receipts) {
    const v = vendorMap.get(r.vendor_id);
    if (!v || (v.msmeCategory !== 'micro' && v.msmeCategory !== 'small')) continue;

    const daysAllowed: 15 | 45 = v.creditDays > 15 ? 45 : 15;
    const deadline = addDays(parseISO(r.receipt_date), daysAllowed).toISOString().slice(0, 10);
    const daysOverdue = differenceInDays(parseISO(asOf), parseISO(deadline));
    let status: JWMSMEBreach['status'];
    if (daysOverdue > 0) status = 'breached';
    else if (daysOverdue >= -5) status = 'breaching_soon';
    else status = 'within_deadline';

    out.push({
      vendor_id: v.id,
      vendor_name: v.name,
      msme_category: v.msmeCategory,
      jw_receipt_id: r.id,
      jw_receipt_no: r.doc_no,
      receipt_date: r.receipt_date,
      receipt_value: jwReceiptValue(r),
      deadline_date: deadline,
      days_allowed: daysAllowed,
      days_overdue: daysOverdue,
      status,
    });
  }
  return out.sort((a, b) => b.days_overdue - a.days_overdue);
}

export function computeJWMSMESummary(entityCode: string): JWMSMESummary {
  const breaches = detectJWMSMEBreaches(entityCode);
  const breached = breaches.filter(b => b.status === 'breached');
  const uniqueVendors = new Set(breaches.map(b => b.vendor_id));
  return {
    total_jw_msme_vendors: uniqueVendors.size,
    open_jw_bills_count: breaches.length,
    open_jw_bills_value: breaches.reduce((s, b) => s + b.receipt_value, 0),
    breaching_soon_count: breaches.filter(b => b.status === 'breaching_soon').length,
    breached_count: breached.length,
    breached_value: breached.reduce((s, b) => s + b.receipt_value, 0),
  };
}

export function listOpenJWMSMEBreaches(entityCode: string): JWMSMEBreach[] {
  return detectJWMSMEBreaches(entityCode).filter(
    b => b.status === 'breached' || b.status === 'breaching_soon',
  );
}
