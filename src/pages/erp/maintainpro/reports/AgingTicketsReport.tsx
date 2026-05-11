/**
 * @file        src/pages/erp/maintainpro/reports/AgingTicketsReport.tsx
 * @purpose     Overdue tickets sorted by hours-over-SLA · escalation_level badge
 * @sprint      T-Phase-1.A.16c · Block D.3 · NEW
 */
import { useMemo } from 'react';
import { listInternalTickets } from '@/lib/maintainpro-engine';
import { MaintainProReportShell } from '@/components/maintainpro/MaintainProReportShell';

const E = 'DEMO';

export function AgingTicketsReport(): JSX.Element {
  const rows = useMemo(() => {
    return listInternalTickets(E)
      .filter((t) => t.is_resolution_breached)
      .map((t) => {
        const hoursAge = (Date.now() - new Date(t.created_at).getTime()) / 3600000;
        const hoursOver = hoursAge - t.sla_resolution_hours;
        return { ...t, hoursOver };
      })
      .sort((a, b) => b.hoursOver - a.hoursOver);
  }, []);

  return (
    <MaintainProReportShell title="Aging Tickets Report" ssotBadge="SLA breach tracker">
      <table className="w-full text-sm">
        <thead className="text-left text-muted-foreground">
          <tr><th className="p-2">Ticket</th><th className="p-2">Category</th><th className="p-2">Severity</th><th className="p-2">SLA (h)</th><th className="p-2">Hours over</th><th className="p-2">Escalation</th></tr>
        </thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">No breached tickets</td></tr>}
          {rows.map((r) => (
            <tr key={r.id} className="border-t">
              <td className="p-2 font-mono text-xs">{r.ticket_no}</td>
              <td className="p-2">{r.category}</td>
              <td className="p-2">{r.severity}</td>
              <td className="p-2 font-mono">{r.sla_resolution_hours}</td>
              <td className="p-2 font-mono text-destructive">+{r.hoursOver.toFixed(1)}</td>
              <td className="p-2"><span className="text-xs px-2 py-0.5 rounded bg-muted border">L{r.escalation_level}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </MaintainProReportShell>
  );
}

export default AgingTicketsReport;
