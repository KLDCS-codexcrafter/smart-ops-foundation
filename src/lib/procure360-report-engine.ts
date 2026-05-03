/**
 * procure360-report-engine.ts — Report computations
 * Sprint T-Phase-1.2.6f-a
 */
import { listRfqs } from './rfq-engine';
import { listQuotations, compareQuotations } from './vendor-quotation-engine';
import { listEnquiries } from './procurement-enquiry-engine';
import type { RFQ } from '@/types/rfq';

export interface RfqRegisterRow {
  rfq_no: string;
  vendor_name: string;
  status: string;
  sent_at: string | null;
  age_days: number;
}

export function computeRfqRegister(entityCode: string): RfqRegisterRow[] {
  const today = Date.now();
  return listRfqs(entityCode).map((r) => ({
    rfq_no: r.rfq_no,
    vendor_name: r.vendor_name,
    status: r.status,
    sent_at: r.sent_at,
    age_days: r.sent_at
      ? Math.floor((today - new Date(r.sent_at).getTime()) / 86400000)
      : 0,
  }));
}

export function computePendingRfqs(entityCode: string): RFQ[] {
  return listRfqs(entityCode).filter((r) => ['sent', 'received_by_vendor', 'opened'].includes(r.status));
}

export function computeQuotationComparison(enquiryId: string, entityCode: string) {
  return compareQuotations(enquiryId, entityCode);
}

export interface AwardRow {
  quotation_no: string;
  vendor_name: string;
  amount: number;
  awarded_at: string | null;
  remarks: string | null;
}

export function computeAwardHistory(entityCode: string): AwardRow[] {
  return listQuotations(entityCode)
    .filter((q) => q.is_awarded)
    .map((q) => ({
      quotation_no: q.quotation_no,
      vendor_name: q.vendor_name,
      amount: q.total_after_tax,
      awarded_at: q.award_at,
      remarks: q.award_remarks,
    }));
}

export interface VendorPerfRow {
  vendor_id: string;
  vendor_name: string;
  rfq_count: number;
  quoted_count: number;
  awarded_count: number;
  total_spend: number;
  response_rate: number;
}

export function computeVendorPerformance(entityCode: string): VendorPerfRow[] {
  const rfqs = listRfqs(entityCode);
  const quotations = listQuotations(entityCode);
  const ids = new Set<string>();
  rfqs.forEach((r) => ids.add(r.vendor_id));
  quotations.forEach((q) => ids.add(q.vendor_id));
  return Array.from(ids).map((id) => {
    const vRfqs = rfqs.filter((r) => r.vendor_id === id);
    const vQuotes = quotations.filter((q) => q.vendor_id === id);
    const awards = vQuotes.filter((q) => q.is_awarded);
    const responded = vRfqs.filter((r) => r.status === 'quoted' || r.status === 'awarded');
    return {
      vendor_id: id,
      vendor_name: vRfqs[0]?.vendor_name ?? vQuotes[0]?.vendor_name ?? id,
      rfq_count: vRfqs.length,
      quoted_count: vQuotes.length,
      awarded_count: awards.length,
      total_spend: Math.round(awards.reduce((s, q) => s + q.total_after_tax, 0) * 100) / 100,
      response_rate: vRfqs.length > 0 ? Math.round((responded.length / vRfqs.length) * 100) : 0,
    };
  });
}

export interface PriceTrendRow {
  item_id: string;
  vendor_id: string;
  vendor_name: string;
  rate: number;
  quoted_at: string;
}

export function computeBestPriceAnalysis(itemId: string, entityCode: string): PriceTrendRow[] {
  const result: PriceTrendRow[] = [];
  for (const q of listQuotations(entityCode)) {
    for (const l of q.lines) {
      if (l.item_id === itemId) {
        result.push({
          item_id: itemId,
          vendor_id: q.vendor_id,
          vendor_name: q.vendor_name,
          rate: l.rate,
          quoted_at: q.submitted_at,
        });
      }
    }
  }
  return result.sort((a, b) => a.quoted_at.localeCompare(b.quoted_at));
}

export interface SpendByVendorRow {
  vendor_id: string;
  vendor_name: string;
  spend: number;
  award_count: number;
}

export function computeSpendByVendor(entityCode: string): SpendByVendorRow[] {
  const rows = computeVendorPerformance(entityCode);
  return rows.map((r) => ({
    vendor_id: r.vendor_id,
    vendor_name: r.vendor_name,
    spend: r.total_spend,
    award_count: r.awarded_count,
  }));
}

export function computeWelcomeKpis(entityCode: string): {
  pendingEnquiries: number;
  activeRfqs: number;
  awaitingQuotations: number;
  overdueFollowups: number;
} {
  const enq = listEnquiries(entityCode);
  const rfqs = listRfqs(entityCode);
  return {
    pendingEnquiries: enq.filter((e) => ['draft', 'pending_approval', 'submitted'].includes(e.status)).length,
    activeRfqs: rfqs.filter((r) => ['sent', 'opened', 'received_by_vendor'].includes(r.status)).length,
    awaitingQuotations: rfqs.filter((r) => r.status === 'sent').length,
    overdueFollowups: rfqs.filter((r) => r.is_overdue_followup).length,
  };
}

// Sprint 3-b-2 · Block K filter helpers (~50 LOC)
export interface ReportFilter {
  date_from?: string;
  date_to?: string;
  vendor_id?: string;
  status?: string;
  channel?: string;
}

export function applyReportFilter<T extends { sent_at?: string | null; vendor_id?: string; status?: string; primary_channel?: string }>(
  rows: T[],
  filter: ReportFilter,
): T[] {
  return rows.filter(r => {
    if (filter.date_from && r.sent_at && r.sent_at < filter.date_from) return false;
    if (filter.date_to && r.sent_at && r.sent_at > filter.date_to) return false;
    if (filter.vendor_id && r.vendor_id !== filter.vendor_id) return false;
    if (filter.status && r.status !== filter.status) return false;
    if (filter.channel && r.primary_channel !== filter.channel) return false;
    return true;
  });
}

export function aggregateByPeriod<T extends Record<string, unknown>>(
  rows: T[],
  period: 'mom' | 'qoq' | 'yoy',
  dateField: keyof T,
  amountField: keyof T,
): { period: string; total: number; count: number }[] {
  const buckets = new Map<string, { total: number; count: number }>();
  for (const row of rows) {
    const dateVal = row[dateField];
    if (typeof dateVal !== 'string') continue;
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) continue;
    let key: string;
    if (period === 'yoy') key = String(d.getFullYear());
    else if (period === 'qoq') key = `${d.getFullYear()}-Q${Math.floor(d.getMonth() / 3) + 1}`;
    else key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const amt = Number(row[amountField] ?? 0);
    const existing = buckets.get(key) ?? { total: 0, count: 0 };
    buckets.set(key, { total: existing.total + amt, count: existing.count + 1 });
  }
  return Array.from(buckets, ([period, v]) => ({ period, ...v })).sort((a, b) => a.period.localeCompare(b.period));
}

