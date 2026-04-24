/**
 * @file     useEMIAlerts.ts
 * @purpose  React hook subscribing to alert feed across all active Borrowing
 *           ledgers. Returns sorted alerts + 6-stat summary. Reactively
 *           updates when ledger storage changes (via useLedgerStore).
 * @sprint   T-H1.5-D-D3
 * @finding  CC-064
 */
import { useMemo } from 'react';
import { useLedgerStore } from '@/features/ledger-master/hooks/useLedgerStore';
import { computeAlerts, type EMIAlert } from '../lib/alert-engine';
import type { EMIScheduleLiveRow } from '../lib/emi-lifecycle-engine';

interface BorrowingLike {
  id: string;
  ledgerType: 'borrowing';
  name: string;
  status?: string;
  emiScheduleLive?: EMIScheduleLiveRow[];
}

export interface EMIAlertSummary {
  total: number;
  overdue: number;
  today: number;
  dueIn1d: number;
  dueIn3d: number;
  dueIn7d: number;
  totalOverdueAmount: number;
  totalDueThisWeekAmount: number;
}

export function useEMIAlerts() {
  const { ledgers } = useLedgerStore<BorrowingLike>('borrowing');
  const today = new Date().toISOString().slice(0, 10);
  const alerts = useMemo(() => computeAlerts(ledgers, today), [ledgers, today]);

  const summary = useMemo<EMIAlertSummary>(() => {
    const count = (b: EMIAlert['bucket']) => alerts.filter(a => a.bucket === b).length;
    const sum = (pred: (a: EMIAlert) => boolean) =>
      Math.round(alerts.filter(pred).reduce((s, a) => s + a.amount, 0) * 100) / 100;
    return {
      total: alerts.length,
      overdue: count('overdue'),
      today: count('today'),
      dueIn1d: count('1d'),
      dueIn3d: count('3d'),
      dueIn7d: count('7d'),
      totalOverdueAmount: sum(a => a.bucket === 'overdue'),
      totalDueThisWeekAmount: sum(a => ['today', '1d', '3d', '7d'].includes(a.bucket)),
    };
  }, [alerts]);

  return { alerts, summary };
}
