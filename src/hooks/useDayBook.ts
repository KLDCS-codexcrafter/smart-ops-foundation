/** useDayBook.ts — Unified department activity log hook
 * [JWT] Replace with GET /api/activity/daybook?entity={e}&domain={d}
 *
 * RPT-3a · DayBookFamily widened to open DayBookDomain (back-compat alias kept).
 * When a source is registered in daybook-source-registry, the hook delegates to it.
 * Existing 'finance' / 'people' callers keep working unchanged.
 */
import { useMemo } from 'react';
import { useVouchers } from './useVouchers';
import { payrollRunsKey } from '@/types/payroll-run';
import type { PayrollRun } from '@/types/payroll-run';
import { getDayBookSource } from '@/lib/report-framework/daybook-source-registry';

/** Open-ended domain — was a 2-value union. Back-compat alias kept. */
export type DayBookDomain = string;
/** @deprecated since RPT-3a · use DayBookDomain. Alias preserved for back-compat. */
export type DayBookFamily = DayBookDomain;

export interface DayBookEntry {
  id: string;
  date: string;
  time: string;
  type: string;
  reference: string;
  party: string;
  amount: number;
  status: string;
  module: string;
}

function safeRead<T>(key: string): T[] {
  try {
    // [JWT] GET /api/entity/storage/:key
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

const TYPE_TO_MODULE: Record<string, string> = {
  Sales: 'fc-txn-sales-invoice',
  Purchase: 'fc-txn-purchase-invoice',
  Receipt: 'fc-txn-receipt',
  Payment: 'fc-txn-payment',
  Journal: 'fc-txn-journal',
  Contra: 'fc-txn-contra',
  'Credit Note': 'fc-txn-credit-note',
  'Debit Note': 'fc-txn-debit-note',
  'Delivery Note': 'fc-txn-delivery-note',
  'Receipt Note': 'fc-txn-receipt-note',
  'Stock Journal': 'fc-inv-stock-journal',
};

export function useDayBook(entityCode: string, domain: DayBookDomain): DayBookEntry[] {
  const { vouchers } = useVouchers(entityCode);
  return useMemo<DayBookEntry[]>(() => {
    // RPT-3a · Registry path · if a card registered a source for this domain,
    // delegate. Back-compat preserved: finance/people fall through to legacy below
    // unless explicitly overridden.
    if (domain !== 'finance' && domain !== 'people') {
      // For new domains, prefer any registered source matching the domain.
      const registered = getDayBookSource(domain, domain) ?? getDayBookSource('', domain);
      if (registered) return registered.read(entityCode);
    }

    if (domain === 'finance') {
      return [...vouchers]
        .filter(v => !v.is_cancelled)
        .sort((a, b) => (b.updated_at > a.updated_at ? 1 : -1))
        .map(v => ({
          id: v.id,
          date: v.date,
          time: v.updated_at?.slice(11, 16) ?? '',
          type: v.base_voucher_type,
          reference: v.voucher_no,
          party: v.party_name ?? '',
          amount: v.net_amount,
          status: v.status,
          module: TYPE_TO_MODULE[v.base_voucher_type] ?? 'fc-hub',
        }));
    }
    if (domain === 'people') {
      // [JWT] GET /api/pay-hub/payroll/runs?entityCode={entityCode}
      const runs = safeRead<PayrollRun>(payrollRunsKey(entityCode));
      return [...runs]
        .sort((a, b) => (b.updated_at > a.updated_at ? 1 : -1))
        .map(r => ({
          id: r.id,
          date: r.updated_at?.slice(0, 10) ?? r.payPeriod + '-28',
          time: r.updated_at?.slice(11, 16) ?? '',
          type: 'Payroll Run',
          reference: r.periodLabel,
          party: r.totalEmployees + ' employees',
          amount: r.totalNet,
          status: r.status,
          module: 'ph-payroll-processing',
        }));
    }
    return [];
  }, [vouchers, domain, entityCode]);
}
