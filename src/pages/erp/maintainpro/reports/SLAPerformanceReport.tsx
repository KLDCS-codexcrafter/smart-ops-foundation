/**
 * @file        src/pages/erp/maintainpro/reports/SLAPerformanceReport.tsx
 * @purpose     SLA % met by category × severity · 28-cell heatmap matching SLA_MATRIX shape
 * @sprint      T-Phase-1.A.16c · Block D.2 · NEW
 */
import { useMemo } from 'react';
import { listInternalTickets } from '@/lib/maintainpro-engine';
import { SLA_MATRIX, type TicketCategory, type TicketSeverity } from '@/types/maintainpro';
import { MaintainProReportShell } from '@/components/maintainpro/MaintainProReportShell';

const E = 'DEMO';
const CATS: TicketCategory[] = ['electrical', 'mechanical', 'pneumatic', 'hydraulic', 'safety', 'calibration', 'housekeeping'];
const SEVS: TicketSeverity[] = ['critical', 'high', 'medium', 'low'];

function cellBg(pct: number): string {
  if (pct >= 90) return 'bg-success/20 text-success';
  if (pct >= 70) return 'bg-warning/20 text-warning';
  return 'bg-destructive/20 text-destructive';
}

export function SLAPerformanceReport(): JSX.Element {
  const cells = useMemo(() => {
    const closed = listInternalTickets(E).filter((t) => t.status === 'closed' && t.resolved_at);
    const map: Record<string, { total: number; met: number }> = {};
    closed.forEach((t) => {
      const k = `${t.category}|${t.severity}`;
      const cell = map[k] ?? { total: 0, met: 0 };
      cell.total += 1;
      const hours = (new Date(t.resolved_at as string).getTime() - new Date(t.created_at).getTime()) / 3600000;
      if (hours <= t.sla_resolution_hours) cell.met += 1;
      map[k] = cell;
    });
    return map;
  }, []);

  return (
    <MaintainProReportShell title="SLA Performance Report" ssotBadge="28-cell heatmap">
      <table className="w-full text-sm">
        <thead className="text-left text-muted-foreground">
          <tr><th className="p-2">Category</th>{SEVS.map((s) => <th key={s} className="p-2">{s}</th>)}</tr>
        </thead>
        <tbody>
          {CATS.map((c) => (
            <tr key={c} className="border-t">
              <td className="p-2">{c}</td>
              {SEVS.map((s) => {
                const cell = cells[`${c}|${s}`];
                if (!cell || cell.total === 0) {
                  const sla = SLA_MATRIX[c][s];
                  return <td key={s} className="p-2 font-mono text-xs text-muted-foreground">— ({sla.resolution_hours}h)</td>;
                }
                const pct = (cell.met / cell.total) * 100;
                return <td key={s} className={`p-2 font-mono text-xs ${cellBg(pct)}`}>{pct.toFixed(0)}% ({cell.met}/{cell.total})</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </MaintainProReportShell>
  );
}

export default SLAPerformanceReport;
