/**
 * @file        src/pages/erp/maintainpro/reports/MTBFMTTRReport.tsx
 * @purpose     Equipment-wise MTBF (uptime_pct_12m × 365 / breakdown_count_12m) + MTTR (total_breakdown_minutes_12m / breakdown_count_12m)
 * @sprint      T-Phase-1.A.16c · Block C.1 · NEW
 */
import { useMemo } from 'react';
import { listEquipment } from '@/lib/maintainpro-engine';
import { MaintainProReportShell } from '@/components/maintainpro/MaintainProReportShell';

const E = 'DEMO';

export function MTBFMTTRReport(): JSX.Element {
  const rows = useMemo(() => {
    return listEquipment(E).map((eq) => {
      const bcount = eq.breakdown_count_12m || 0;
      const mtbfDays = bcount === 0 ? null : (eq.uptime_pct_12m * 365) / 100 / bcount;
      const mttrMin = bcount === 0 ? null : eq.total_breakdown_minutes_12m / bcount;
      return { ...eq, mtbfDays, mttrMin };
    }).sort((a, b) => (a.mttrMin ?? 0) - (b.mttrMin ?? 0));
  }, []);

  return (
    <MaintainProReportShell title="MTBF / MTTR Report" ssotBadge="12-month rolling">
      <table className="w-full text-sm">
        <thead className="text-left text-muted-foreground">
          <tr><th className="p-2">Equipment</th><th className="p-2">Category</th><th className="p-2">Uptime %</th><th className="p-2">Breakdowns</th><th className="p-2">MTBF (days)</th><th className="p-2">MTTR (min)</th></tr>
        </thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">No equipment</td></tr>}
          {rows.map((r) => (
            <tr key={r.id} className="border-t">
              <td className="p-2 font-mono text-xs">{r.equipment_code} · {r.equipment_name}</td>
              <td className="p-2">{r.category}</td>
              <td className="p-2 font-mono">{r.uptime_pct_12m.toFixed(1)}%</td>
              <td className="p-2 font-mono">{r.breakdown_count_12m}</td>
              <td className="p-2 font-mono">{r.mtbfDays === null ? '—' : r.mtbfDays.toFixed(1)}</td>
              <td className="p-2 font-mono">{r.mttrMin === null ? '—' : r.mttrMin.toFixed(0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </MaintainProReportShell>
  );
}

export default MTBFMTTRReport;
