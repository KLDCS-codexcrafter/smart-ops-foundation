/**
 * @file     useCreditScoring.ts
 * @purpose  Compute simple credit score (0-100) and band (A/B/C/D) from payment history.
 *           S4 scope: basic heuristic. Deeper model deferred to S4.5 Intelligence Layer.
 * @sprint   T-H1.5-C-S4
 * @finding  CC-028
 */
import { useMemo } from 'react';

export type CreditBand = 'A' | 'B' | 'C' | 'D' | 'NEW';

export interface CreditScoreInput {
  partyId: string;
  entityCode: string;
}

export interface CreditScoreResult {
  score: number;
  band: CreditBand;
  sampleSize: number;
  onTimePaymentRatio: number;
  avgDaysLate: number;
  details: string;
}

interface InvoiceRecord {
  voucher_type?: string;
  party_id?: string;
  voucher_date?: string;
  amount?: number;
  payment_status?: 'paid' | 'partial' | 'unpaid' | 'overdue';
  days_late?: number;
}

export function useCreditScoring({ partyId, entityCode }: CreditScoreInput): CreditScoreResult {
  return useMemo<CreditScoreResult>(() => {
    if (!entityCode || !partyId) {
      return { score: 50, band: 'NEW', sampleSize: 0, onTimePaymentRatio: 0, avgDaysLate: 0, details: 'No payment history yet.' };
    }

    // [JWT] GET /api/credit-score?party=:partyId&entity=:entityCode — real endpoint later
    let vouchers: InvoiceRecord[] = [];
    try {
      const raw = localStorage.getItem(`erp_group_vouchers_${entityCode}`);
      vouchers = raw ? JSON.parse(raw) : [];
    } catch { /* ignore */ }

    const partyInvoices = vouchers.filter(v =>
      (v.voucher_type === 'sales_invoice' || v.voucher_type === 'purchase_invoice') &&
      v.party_id === partyId);

    if (partyInvoices.length === 0) {
      return { score: 50, band: 'NEW', sampleSize: 0, onTimePaymentRatio: 0, avgDaysLate: 0, details: 'No invoices yet — neutral starting band.' };
    }

    const paid = partyInvoices.filter(v => v.payment_status === 'paid' || v.payment_status === 'partial');
    const onTime = paid.filter(v => (v.days_late ?? 0) <= 0);
    const overdue = partyInvoices.filter(v => v.payment_status === 'overdue').length;
    const onTimePaymentRatio = paid.length === 0 ? 0 : onTime.length / paid.length;
    const avgDaysLate = paid.length === 0
      ? 0
      : paid.reduce((s, v) => s + Math.max(0, v.days_late ?? 0), 0) / paid.length;

    const baseScore = onTimePaymentRatio * 100;
    const overduePenalty = Math.min(overdue * 5, 30);
    const latePenalty = Math.min(avgDaysLate * 0.5, 20);
    const score = Math.max(0, Math.min(100, Math.round(baseScore - overduePenalty - latePenalty)));

    let band: CreditBand;
    if (score >= 85) band = 'A';
    else if (score >= 70) band = 'B';
    else if (score >= 50) band = 'C';
    else band = 'D';

    return {
      score,
      band,
      sampleSize: partyInvoices.length,
      onTimePaymentRatio,
      avgDaysLate,
      details: `${partyInvoices.length} invoices · ${Math.round(onTimePaymentRatio * 100)}% on-time · avg ${Math.round(avgDaysLate)}d late · ${overdue} overdue`,
    };
  }, [partyId, entityCode]);
}
