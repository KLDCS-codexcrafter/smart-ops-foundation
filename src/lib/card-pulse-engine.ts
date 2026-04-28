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

export function computeCardPulse(cardId: CardId, entityCode: string): CardPulse {
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
      // Sprint T-Phase-1.1.1a — pulse reflects pipeline health.
      const enquiries = readList<{
        status?: string;
        enquiry_date?: string;
        follow_ups?: Array<{ follow_up_date?: string | null }>;
      }>(`erp_enquiries_${entityCode}`);
      const quotations = readList<{
        quotation_stage?: string;
        valid_until_date?: string | null;
      }>(`erp_quotations_${entityCode}`);

      const todayMs = Date.now();
      const dayMs = 1000 * 60 * 60 * 24;

      // Stuck enquiries: pending state with no follow-up activity in 7+ days.
      const stuck = enquiries.filter(e => {
        const isPending = ['new', 'assigned', 'pending', 'in_process'].includes(
          e.status ?? '',
        );
        if (!isPending) return false;
        const lastDate =
          e.follow_ups?.[e.follow_ups.length - 1]?.follow_up_date ??
          e.enquiry_date;
        if (!lastDate) return false;
        const daysSince = (todayMs - new Date(lastDate).getTime()) / dayMs;
        return daysSince > 7;
      }).length;

      // Expired quotations: open stage past valid_until_date.
      const expired = quotations.filter(q => {
        const isOpen = ['draft', 'negotiation', 'on_hold'].includes(
          q.quotation_stage ?? '',
        );
        if (!isOpen || !q.valid_until_date) return false;
        return new Date(q.valid_until_date).getTime() < todayMs;
      }).length;

      const status: CardStatus =
        stuck === 0 && expired === 0 ? 'green'
          : stuck + expired < 5 ? 'amber'
            : 'red';

      const status_note = status === 'green'
        ? 'pipeline flowing'
        : `${stuck} stuck · ${expired} expired`;

      return {
        metrics: [
          { label: 'Enquiries', value: String(enquiries.length) },
          { label: 'Quotations', value: String(quotations.length) },
          ...(stuck > 0 ? [{ label: 'Stuck', value: String(stuck) }] : []),
          ...(expired > 0 ? [{ label: 'Expired', value: String(expired) }] : []),
        ],
        status,
        status_note,
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
    case 'dispatch-ops': {
      // [JWT] GET /api/dispatch/ops-pulse?entityCode=:entityCode
      const soms = readList<{ issued_by_dispatch?: boolean; status?: string }>(
        `erp_sample_outward_memos_${entityCode}`)
        .filter(m => !m.issued_by_dispatch && m.status === 'draft');
      const doms = readList<{ issued_by_dispatch?: boolean; status?: string }>(
        `erp_demo_outward_memos_${entityCode}`)
        .filter(m => !m.issued_by_dispatch && m.status === 'draft');
      const overdue = readList<{ status?: string }>(
        `erp_demo_outward_memos_${entityCode}`)
        .filter(m => m.status === 'overdue');
      return {
        metrics: [
          { label: 'SOMs pending',  value: String(soms.length) },
          { label: 'DOMs pending',  value: String(doms.length) },
          { label: 'Overdue demos', value: String(overdue.length) },
        ],
        status: overdue.length > 0 ? 'red' : (soms.length + doms.length) > 0 ? 'amber' : 'green',
        status_note: overdue.length > 0 ? 'overdue demos' : 'ops clear',
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
