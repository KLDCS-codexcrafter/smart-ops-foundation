/**
 * @file        src/pages/erp/maintainpro/reports/OpenWOStatusReport.tsx
 * @purpose     Open work orders · status × age buckets (today / 1-3 / 3-7 / 7+) · technician load
 * @sprint      T-Phase-1.A.16c · Block C.3 · NEW
 */
import { useMemo } from 'react';
import { listWorkOrders } from '@/lib/maintainpro-engine';
import { MaintainProReportShell } from '@/components/maintainpro/MaintainProReportShell';

const E = 'DEMO';

function bucketOf(createdAt: string): string {
  const days = Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000);
  if (days < 1) return 'Today';
  if (days <= 3) return '1–3 days';
  if (days <= 7) return '3–7 days';
  return '7+ days';
}

export function OpenWOStatusReport(): JSX.Element {
  const data = useMemo(() => {
    const open = listWorkOrders(E).filter((w) => ['draft', 'assigned', 'in_progress', 'on_hold'].includes(w.status));
    const byTech = new Map<string, number>();
    open.forEach((w) => {
      const k = w.assigned_to_user_id ?? 'Unassigned';
      byTech.set(k, (byTech.get(k) ?? 0) + 1);
    });
    return { open, byTech: Array.from(byTech.entries()).sort((a, b) => b[1] - a[1]) };
  }, []);

  return (
    <MaintainProReportShell title="Open WO Status Report" ssotBadge="Operational">
      <div className="mb-4">
        <div className="text-xs text-muted-foreground mb-2">Technician load</div>
        <div className="flex flex-wrap gap-2">
          {data.byTech.length === 0 && <span className="text-sm text-muted-foreground">No open WOs</span>}
          {data.byTech.map(([tech, count]) => (
            <span key={tech} className="text-xs px-2 py-1 rounded bg-muted border font-mono">{tech}: {count}</span>
          ))}
        </div>
      </div>
      <table className="w-full text-sm">
        <thead className="text-left text-muted-foreground">
          <tr><th className="p-2">WO No</th><th className="p-2">Type</th><th className="p-2">Equipment</th><th className="p-2">Assigned</th><th className="p-2">Status</th><th className="p-2">Age</th></tr>
        </thead>
        <tbody>
          {data.open.map((w) => (
            <tr key={w.id} className="border-t">
              <td className="p-2 font-mono text-xs">{w.wo_no}</td>
              <td className="p-2">{w.wo_type}</td>
              <td className="p-2 font-mono text-xs">{w.equipment_id}</td>
              <td className="p-2 font-mono text-xs">{w.assigned_to_user_id ?? '—'}</td>
              <td className="p-2">{w.status}</td>
              <td className="p-2">{bucketOf(w.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </MaintainProReportShell>
  );
}

export default OpenWOStatusReport;
