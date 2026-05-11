/**
 * @file        src/pages/erp/maintainpro/reports/AMCOutToVendorStatus.tsx
 * @purpose     AMC RMA tracking · sent / in-progress / overdue color-coded · vendor scorecard
 * @sprint      T-Phase-1.A.16c · Block C.4 · NEW
 */
import { useMemo } from 'react';
import { listAMCOutToVendor, getAMCRemindersDue } from '@/lib/maintainpro-engine';
import { MaintainProReportShell } from '@/components/maintainpro/MaintainProReportShell';

const E = 'DEMO';

export function AMCOutToVendorStatus(): JSX.Element {
  const data = useMemo(() => {
    const all = listAMCOutToVendor(E);
    const reminders = getAMCRemindersDue(E);
    const scorecard = new Map<string, { count: number; totalDays: number; returned: number }>();
    all.forEach((a) => {
      const s = scorecard.get(a.vendor_id) ?? { count: 0, totalDays: 0, returned: 0 };
      s.count += 1;
      if (a.actual_return_date) {
        s.returned += 1;
        s.totalDays += Math.floor((new Date(a.actual_return_date).getTime() - new Date(a.sent_date).getTime()) / 86400000);
      }
      scorecard.set(a.vendor_id, s);
    });
    return { all, reminders, scorecard: Array.from(scorecard.entries()) };
  }, []);

  return (
    <MaintainProReportShell
      title="AMC Out-to-Vendor Status"
      ssotBadge="Operational"
      kpis={
        <>
          <div className="rounded border p-3"><div className="text-xs text-muted-foreground">Open RMAs</div><div className="text-2xl font-mono">{data.all.filter((a) => a.status !== 'returned' && a.status !== 'cancelled').length}</div></div>
          <div className="rounded border p-3"><div className="text-xs text-muted-foreground">Overdue</div><div className="text-2xl font-mono text-destructive">{data.reminders.overdue.length}</div></div>
          <div className="rounded border p-3"><div className="text-xs text-muted-foreground">Due 75%</div><div className="text-2xl font-mono text-warning">{data.reminders.seventy_five_pct.length}</div></div>
          <div className="rounded border p-3"><div className="text-xs text-muted-foreground">Vendors</div><div className="text-2xl font-mono">{data.scorecard.length}</div></div>
        </>
      }
    >
      <table className="w-full text-sm">
        <thead className="text-left text-muted-foreground">
          <tr><th className="p-2">RMA No</th><th className="p-2">Equipment</th><th className="p-2">Vendor</th><th className="p-2">Sent</th><th className="p-2">Expected</th><th className="p-2">Status</th></tr>
        </thead>
        <tbody>
          {data.all.length === 0 && <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">No RMAs</td></tr>}
          {data.all.map((a) => (
            <tr key={a.id} className="border-t">
              <td className="p-2 font-mono text-xs">{a.rma_no}</td>
              <td className="p-2 font-mono text-xs">{a.equipment_id}</td>
              <td className="p-2 font-mono text-xs">{a.vendor_id}</td>
              <td className="p-2 font-mono text-xs">{a.sent_date}</td>
              <td className="p-2 font-mono text-xs">{a.expected_return_date}</td>
              <td className="p-2">{a.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {data.scorecard.length > 0 && (
        <div className="mt-4">
          <div className="text-xs text-muted-foreground mb-2">Vendor scorecard (avg days to return)</div>
          <div className="flex flex-wrap gap-2">
            {data.scorecard.map(([v, s]) => (
              <span key={v} className="text-xs px-2 py-1 rounded bg-muted border font-mono">
                {v}: {s.returned > 0 ? (s.totalDays / s.returned).toFixed(1) : '—'}d
              </span>
            ))}
          </div>
        </div>
      )}
    </MaintainProReportShell>
  );
}

export default AMCOutToVendorStatus;
