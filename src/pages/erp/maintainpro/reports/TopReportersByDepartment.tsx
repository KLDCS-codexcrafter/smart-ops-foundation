/**
 * @file        src/pages/erp/maintainpro/reports/TopReportersByDepartment.tsx
 * @purpose     Department-wise ticket count · top 10 · maintenance resource planning fuel
 * @sprint      T-Phase-1.A.16c · Block D.4 · NEW
 */
import { useMemo } from 'react';
import { listInternalTickets } from '@/lib/maintainpro-engine';
import { MaintainProReportShell } from '@/components/maintainpro/MaintainProReportShell';
// RPT-6c imports
import { ReportChart } from '@/components/operix-core/report-framework';
import { signReport, getKpi, defaultChartConfig } from '@/lib/report-framework';
import { ShieldCheck as RPT6cShield } from 'lucide-react';
import { useEntityCode } from '@/hooks/useEntityCode';


export function TopReportersByDepartment(): JSX.Element {
  const { entityCode } = useEntityCode();
  const rows = useMemo(() => {
    const m = new Map<string, number>();
    listInternalTickets(entityCode).forEach((t) => {
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
      {(() => {
        const chartRows = rows.map(([department, tickets]) => ({ department, tickets }));
        const cfg = getKpi('mnt-top-reporters')?.defaultChart ?? defaultChartConfig({ chartType: 'column', xKey: 'department', series: [{ key: 'tickets', label: 'Tickets' }], title: 'Top reporters by department' });
        const hash = signReport(chartRows);
        const short = hash.replace('fnv1a:', '').slice(0, 10);
        return (
          <div className="border rounded-lg p-3 space-y-2 mt-3" data-testid="mnt-top-reporters-dashboard-host">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center text-[10px] font-mono border rounded px-1.5 py-0.5" data-testid="mnt-top-reporters-integrity-badge" title={hash}>
                <RPT6cShield className="h-3 w-3 mr-1" />{short}
              </span>
            </div>
            {chartRows.length === 0 ? (
              <div className="text-sm text-muted-foreground py-6 text-center">No tickets</div>
            ) : (
              <div className="w-full h-64" data-testid="mnt-top-reporters-chart-host"><ReportChart data={chartRows} config={cfg} /></div>
            )}
          </div>
        );
      })()}
    </MaintainProReportShell>
  );
}

export default TopReportersByDepartment;
