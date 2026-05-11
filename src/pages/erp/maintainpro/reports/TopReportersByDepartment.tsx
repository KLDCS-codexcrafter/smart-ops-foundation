/**
 * @file        src/pages/erp/maintainpro/reports/TopReportersByDepartment.tsx
 * @purpose     Department-wise ticket count · top 10 · maintenance resource planning fuel
 * @sprint      T-Phase-1.A.16c · Block D.4 · NEW
 */
import { useMemo } from 'react';
import { listInternalTickets } from '@/lib/maintainpro-engine';
import { MaintainProReportShell } from '@/components/maintainpro/MaintainProReportShell';

const E = 'DEMO';

export function TopReportersByDepartment(): JSX.Element {
  const rows = useMemo(() => {
    const m = new Map<string, number>();
    listInternalTickets(E).forEach((t) => {
      m.set(t.originating_department_id, (m.get(t.originating_department_id) ?? 0) + 1);
    });
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, []);

  return (
    <MaintainProReportShell title="Top Reporters by Department" ssotBadge="Resource planning">
      <table className="w-full text-sm">
        <thead className="text-left text-muted-foreground">
          <tr><th className="p-2">Rank</th><th className="p-2">Department</th><th className="p-2">Tickets</th></tr>
        </thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={3} className="p-4 text-center text-muted-foreground">No tickets</td></tr>}
          {rows.map(([dept, count], idx) => (
            <tr key={dept} className="border-t">
              <td className="p-2 font-mono">{idx + 1}</td>
              <td className="p-2 font-mono text-xs">{dept}</td>
              <td className="p-2 font-mono">{count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </MaintainProReportShell>
  );
}

export default TopReportersByDepartment;
