/**
 * @file        src/pages/erp/maintainpro/reports/PMComplianceReport.tsx
 * @purpose     % PM completed on-time vs scheduled · regulatory audit fuel · uses listPMTickoffs + Equipment.next_pm_due_date
 * @sprint      T-Phase-1.A.16c · Block C.2 · NEW
 */
import { useMemo } from 'react';
import { listEquipment, listPMTickoffs } from '@/lib/maintainpro-engine';
import { MaintainProReportShell } from '@/components/maintainpro/MaintainProReportShell';

const E = 'DEMO';

export function PMComplianceReport(): JSX.Element {
  const summary = useMemo(() => {
    const eq = listEquipment(E);
    const ticks = listPMTickoffs(E);
    const total = ticks.length;
    const onTime = ticks.filter((t) => t.status === 'completed' && t.actual_completion_date <= t.scheduled_date).length;
    const pct = total === 0 ? 0 : Math.round((onTime / total) * 100);
    return { eq, ticks, total, onTime, pct };
  }, []);

  return (
    <MaintainProReportShell
      title="PM Compliance Report"
      ssotBadge="Regulatory audit fuel"
      kpis={
        <>
          <div className="rounded border p-3"><div className="text-xs text-muted-foreground">Total PMs</div><div className="text-2xl font-mono">{summary.total}</div></div>
          <div className="rounded border p-3"><div className="text-xs text-muted-foreground">On-time</div><div className="text-2xl font-mono text-success">{summary.onTime}</div></div>
          <div className="rounded border p-3"><div className="text-xs text-muted-foreground">Compliance %</div><div className="text-2xl font-mono">{summary.pct}%</div></div>
          <div className="rounded border p-3"><div className="text-xs text-muted-foreground">Equipment</div><div className="text-2xl font-mono">{summary.eq.length}</div></div>
        </>
      }
    >
      <table className="w-full text-sm">
        <thead className="text-left text-muted-foreground">
          <tr><th className="p-2">PM No</th><th className="p-2">Equipment</th><th className="p-2">Scheduled</th><th className="p-2">Completed</th><th className="p-2">Status</th><th className="p-2">On-time</th></tr>
        </thead>
        <tbody>
          {summary.ticks.length === 0 && <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">No tick-offs</td></tr>}
          {summary.ticks.map((t) => {
            const ot = t.status === 'completed' && t.actual_completion_date <= t.scheduled_date;
            return (
              <tr key={t.id} className="border-t">
                <td className="p-2 font-mono text-xs">{t.pm_no}</td>
                <td className="p-2 font-mono text-xs">{t.equipment_id}</td>
                <td className="p-2 font-mono text-xs">{t.scheduled_date}</td>
                <td className="p-2 font-mono text-xs">{t.actual_completion_date}</td>
                <td className="p-2">{t.status}</td>
                <td className="p-2">{ot ? <span className="text-success">Yes</span> : <span className="text-warning">No</span>}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </MaintainProReportShell>
  );
}

export default PMComplianceReport;
