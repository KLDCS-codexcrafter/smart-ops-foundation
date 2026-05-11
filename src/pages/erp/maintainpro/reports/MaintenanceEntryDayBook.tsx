/**
 * @file        src/pages/erp/maintainpro/reports/MaintenanceEntryDayBook.tsx
 * @purpose     TDL Maintenance Entry Day Book · day-wise breakdown + WO entry log · FR-42 institutional gold
 * @sprint      T-Phase-1.A.16c · Block B.1 · NEW
 */
import { useMemo } from 'react';
import { listBreakdownReports, listWorkOrders } from '@/lib/maintainpro-engine';
import { MaintainProReportShell } from '@/components/maintainpro/MaintainProReportShell';

const E = 'DEMO';

interface DayBookRow {
  key: string;
  occurred_at: string;
  kind: 'Breakdown' | 'Work Order';
  equipment_id: string;
  downtime_minutes: number;
  attended_by: string;
  corrective_action: string;
}

export function MaintenanceEntryDayBook(): JSX.Element {
  const rows = useMemo<DayBookRow[]>(() => {
    const breakdowns: DayBookRow[] = listBreakdownReports(E).map((b) => ({
      key: `b-${b.id}`,
      occurred_at: b.occurred_at,
      kind: 'Breakdown',
      equipment_id: b.equipment_id,
      downtime_minutes: b.downtime_minutes,
      attended_by: b.attended_by_user_id ?? '—',
      corrective_action: b.corrective_action,
    }));
    const wos: DayBookRow[] = listWorkOrders(E).map((w) => ({
      key: `w-${w.id}`,
      occurred_at: w.created_at,
      kind: 'Work Order',
      equipment_id: w.equipment_id,
      downtime_minutes: w.actual_minutes ?? w.estimated_minutes,
      attended_by: w.assigned_to_user_id ?? '—',
      corrective_action: w.completion_notes,
    }));
    return [...breakdowns, ...wos].sort((a, b) => (a.occurred_at < b.occurred_at ? 1 : -1));
  }, []);

  return (
    <MaintainProReportShell title="Maintenance Entry Day Book" ssotBadge="TDL · FR-42">
      <table className="w-full text-sm">
        <thead className="text-left text-muted-foreground">
          <tr><th className="p-2">Date</th><th className="p-2">Type</th><th className="p-2">Equipment</th><th className="p-2">Downtime</th><th className="p-2">Attended By</th><th className="p-2">Corrective Action</th></tr>
        </thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">No entries</td></tr>}
          {rows.map((r) => (
            <tr key={r.key} className="border-t">
              <td className="p-2 font-mono text-xs">{r.occurred_at.slice(0, 10)}</td>
              <td className="p-2">{r.kind}</td>
              <td className="p-2 font-mono text-xs">{r.equipment_id}</td>
              <td className="p-2 font-mono">{r.downtime_minutes}m</td>
              <td className="p-2 font-mono text-xs">{r.attended_by}</td>
              <td className="p-2">{r.corrective_action}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </MaintainProReportShell>
  );
}

export default MaintenanceEntryDayBook;
