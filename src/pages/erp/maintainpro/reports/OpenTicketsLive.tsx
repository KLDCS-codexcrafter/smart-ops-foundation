/**
 * @file        src/pages/erp/maintainpro/reports/OpenTicketsLive.tsx
 * @purpose     Live ticket count grouped by 7 categories × 4 severities · color-coded
 * @sprint      T-Phase-1.A.16c · Block D.1 · NEW
 */
import { useMemo } from 'react';
import { listInternalTickets } from '@/lib/maintainpro-engine';
import type { TicketCategory, TicketSeverity } from '@/types/maintainpro';
import { MaintainProReportShell } from '@/components/maintainpro/MaintainProReportShell';
// RPT-6c imports
import { ReportChart } from '@/components/operix-core/report-framework';
import { signReport, getKpi, defaultChartConfig } from '@/lib/report-framework';
import { ShieldCheck as RPT6cShield } from 'lucide-react';
import { useEntityCode } from '@/hooks/useEntityCode';

const CATS: TicketCategory[] = ['electrical', 'mechanical', 'pneumatic', 'hydraulic', 'safety', 'calibration', 'housekeeping'];
const SEVS: TicketSeverity[] = ['critical', 'high', 'medium', 'low'];

function sevColor(s: TicketSeverity): string {
  if (s === 'critical') return 'text-destructive';
  if (s === 'high') return 'text-warning';
  if (s === 'medium') return 'text-primary';
  return 'text-muted-foreground';
}

export function OpenTicketsLive(): JSX.Element {
  const { entityCode } = useEntityCode();
  const grid = useMemo(() => {
    const open = listInternalTickets(entityCode).filter((t) => t.status !== 'closed');
    const counts: Record<string, number> = {};
    open.forEach((t) => {
      const k = `${t.category}|${t.severity}`;
      counts[k] = (counts[k] ?? 0) + 1;
    });
    return { open, counts };
  }, [entityCode]);

  return (
    <MaintainProReportShell title="Open Tickets · Live" ssotBadge="SLA · A.16b deferred">
      <table className="w-full text-sm">
        <thead className="text-left text-muted-foreground">
          <tr><th className="p-2">Category</th>{SEVS.map((s) => <th key={s} className={`p-2 ${sevColor(s)}`}>{s}</th>)}<th className="p-2">Total</th></tr>
        </thead>
        <tbody>
          {CATS.map((c) => {
            const total = SEVS.reduce((acc, s) => acc + (grid.counts[`${c}|${s}`] ?? 0), 0);
            return (
              <tr key={c} className="border-t">
                <td className="p-2">{c}</td>
                {SEVS.map((s) => <td key={s} className={`p-2 font-mono ${sevColor(s)}`}>{grid.counts[`${c}|${s}`] ?? 0}</td>)}
                <td className="p-2 font-mono">{total}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="mt-2 text-xs text-muted-foreground">Open: {grid.open.length} tickets</div>
      {(() => {
        const chartRows = SEVS.map(s => ({ priority: s, count: CATS.reduce((acc, c) => acc + (grid.counts[`${c}|${s}`] ?? 0), 0) }));
        const cfg = getKpi('mnt-open-tickets')?.defaultChart ?? defaultChartConfig({ chartType: 'doughnut', xKey: 'priority', series: [{ key: 'count', label: 'Tickets' }], title: 'Open tickets by priority' });
        const hash = signReport(chartRows);
        const short = hash.replace('fnv1a:', '').slice(0, 10);
        return (
          <div className="border rounded-lg p-3 space-y-2 mt-3" data-testid="mnt-open-tickets-dashboard-host">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center text-[10px] font-mono border rounded px-1.5 py-0.5" data-testid="mnt-open-tickets-integrity-badge" title={hash}>
                <RPT6cShield className="h-3 w-3 mr-1" />{short}
              </span>
            </div>
            <div className="w-full h-64" data-testid="mnt-open-tickets-chart-host"><ReportChart data={chartRows} config={cfg} /></div>
          </div>
        );
      })()}
    </MaintainProReportShell>
  );
}

export default OpenTicketsLive;
