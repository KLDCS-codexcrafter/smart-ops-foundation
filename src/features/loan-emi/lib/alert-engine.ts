/**
 * @file     alert-engine.ts
 * @purpose  Computes alert buckets from emiScheduleLive across all active
 *           Borrowing ledgers. Pure function — no side effects. Consumed by
 *           useEMIAlerts hook + EMIDashboardWidget + EMICalendar.
 * @sprint   T-H1.5-D-D3
 * @finding  CC-064
 */

import type { EMIScheduleLiveRow } from './emi-lifecycle-engine';

export type AlertSeverity = 'info' | 'warning' | 'danger';

export interface EMIAlert {
  ledgerId: string;
  ledgerName: string;
  emiNumber: number;
  dueDate: string;
  amount: number;
  severity: AlertSeverity;
  daysUntilDue: number;     // negative = overdue by N days
  bucket: '7d' | '3d' | '1d' | 'today' | 'overdue';
  message: string;
}

interface BorrowingLike {
  id: string;
  ledgerType: 'borrowing';
  name: string;
  status?: string;
  emiScheduleLive?: EMIScheduleLiveRow[];
}

function daysUntil(dueDateIso: string, todayIso: string): number {
  const due = new Date(dueDateIso).getTime();
  const today = new Date(todayIso).getTime();
  return Math.round((due - today) / 86_400_000);
}

export function computeAlerts(
  borrowings: BorrowingLike[],
  todayIso: string,
): EMIAlert[] {
  const alerts: EMIAlert[] = [];
  for (const b of borrowings) {
    if (b.status !== 'active') continue;
    const schedule = b.emiScheduleLive ?? [];
    for (const row of schedule) {
      if (row.status === 'paid') continue;
      const d = daysUntil(row.dueDate, todayIso);
      let bucket: EMIAlert['bucket'];
      let severity: AlertSeverity;
      let message: string;
      if (d < 0) {
        bucket = 'overdue'; severity = 'danger';
        message = `${b.name} EMI #${row.emiNumber} is ${Math.abs(d)} days overdue`;
      } else if (d === 0) {
        bucket = 'today'; severity = 'danger';
        message = `${b.name} EMI #${row.emiNumber} is due TODAY`;
      } else if (d === 1) {
        bucket = '1d'; severity = 'danger';
        message = `${b.name} EMI #${row.emiNumber} due tomorrow`;
      } else if (d <= 3) {
        bucket = '3d'; severity = 'warning';
        message = `${b.name} EMI #${row.emiNumber} due in ${d} days`;
      } else if (d <= 7) {
        bucket = '7d'; severity = 'info';
        message = `${b.name} EMI #${row.emiNumber} due in ${d} days`;
      } else {
        continue;
      }
      alerts.push({
        ledgerId: b.id, ledgerName: b.name,
        emiNumber: row.emiNumber, dueDate: row.dueDate,
        amount: row.totalEMI, severity, daysUntilDue: d, bucket, message,
      });
    }
  }
  // Most urgent first (smallest daysUntilDue, including negatives)
  return alerts.sort((a, b) => a.daysUntilDue - b.daysUntilDue);
}
