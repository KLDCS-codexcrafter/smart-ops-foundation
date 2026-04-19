/**
 * card-pulse-engine.ts — Per-card live metrics + status derivation
 * Reads localStorage synchronously. Returns structured pulse data for tiles.
 */

import type { CardId } from '@/types/card-entitlement';

export type CardStatus = 'green' | 'amber' | 'red' | 'grey';

export interface CardPulse {
  metrics: { label: string; value: string }[];  // 2-3 metrics per card
  status: CardStatus;
  status_note: string;
}

function readList<T = Record<string, unknown>>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch { return []; }
}

export function computeCardPulse(cardId: CardId, entityCode: string = 'SMRT'): CardPulse {
  switch (cardId) {
    case 'distributor-hub': {
      const distributors = readList<{ status?: string }>(`erp_distributors_${entityCode}`);
      const credit = readList<{ status?: string }>(`erp_credit_increase_requests_${entityCode}`);
      const disputes = readList<{ status?: string }>(`erp_invoice_disputes_${entityCode}`);
      const active = distributors.filter(d => d.status === 'active').length;
      const pendingCredit = credit.filter(c => c.status === 'submitted').length;
      const openDisputes = disputes.filter(d => d.status === 'open').length;
      const status: CardStatus = openDisputes > 5 ? 'red' : pendingCredit > 3 ? 'amber' : 'green';
      return {
        metrics: [
          { label: 'Active distributors', value: String(active) },
          { label: 'Pending credit', value: String(pendingCredit) },
          { label: 'Open disputes', value: String(openDisputes) },
        ],
        status,
        status_note: status === 'green' ? 'all caught up' : `${pendingCredit + openDisputes} awaiting action`,
      };
    }
    case 'salesx': {
      const enquiries = readList(`erp_enquiries_${entityCode}`);
      const quotations = readList(`erp_quotations_${entityCode}`);
      return {
        metrics: [
          { label: 'Enquiries', value: String(enquiries.length) },
          { label: 'Quotations', value: String(quotations.length) },
        ],
        status: 'green',
        status_note: 'pipeline flowing',
      };
    }
    case 'receivx': {
      const vouchers = readList<{ voucher_type?: string; net_amount?: number }>(`erp_group_vouchers_${entityCode}`);
      const outstanding = vouchers.filter(v => v.voucher_type === 'sales_invoice').length;
      return {
        metrics: [
          { label: 'Open invoices', value: String(outstanding) },
        ],
        status: outstanding > 50 ? 'amber' : 'green',
        status_note: `${outstanding} open`,
      };
    }
    case 'finecore': {
      const vouchers = readList(`erp_group_vouchers_${entityCode}`);
      return {
        metrics: [
          { label: 'Vouchers posted', value: String(vouchers.length) },
        ],
        status: 'green',
        status_note: 'ledger current',
      };
    }
    case 'peoplepay': {
      const employees = readList(`erp_employees_${entityCode}`);
      return {
        metrics: [
          { label: 'Employees', value: String(employees.length) },
        ],
        status: 'green',
        status_note: 'payroll ready',
      };
    }
    case 'command-center': {
      return {
        metrics: [
          { label: 'Master sections', value: '10' },
          { label: 'Registered masters', value: '17' },
        ],
        status: 'green',
        status_note: 'source of truth',
      };
    }
    default:
      return { metrics: [], status: 'grey', status_note: '' };
  }
}

export const STATUS_COLOURS: Record<CardStatus, string> = {
  green: 'bg-emerald-500',
  amber: 'bg-amber-500',
  red:   'bg-red-500',
  grey:  'bg-slate-400',
};
