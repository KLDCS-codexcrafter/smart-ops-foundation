/**
 * @file        src/pages/erp/maintainpro/reports/ProductionCapacityLiveDashboard.tsx
 * @purpose     Real-time live dashboard · Andon-style capacity gauge · auto-refresh 30s · D-NEW-DD POSSIBLE 27th canonical · widget A.16b preserved
 * @sprint      T-Phase-1.A.16c · Block E.1 · Q-LOCK-6 · NEW
 * @decisions   D-NEW-DD Production Capacity Live Dashboard POSSIBLE 27th canonical
 */
import { useEffect, useMemo, useState } from 'react';
import { listEquipment, listBreakdownReports } from '@/lib/maintainpro-engine';
import { MaintainProReportShell } from '@/components/maintainpro/MaintainProReportShell';
import { Activity, AlertTriangle } from 'lucide-react';

const E = 'DEMO';
const REFRESH_MS = 30_000;

function capacityImpactOf(severity: string): number {
  if (severity === 'critical') return 25;
  if (severity === 'high') return 15;
  if (severity === 'medium') return 7;
  return 3;
}

type GroupBy = 'site' | 'department' | 'class';

export function ProductionCapacityLiveDashboard(): JSX.Element {
  const [tick, setTick] = useState(0);
  const [groupBy, setGroupBy] = useState<GroupBy>('class');

  useEffect(() => {
    const i = setInterval(() => setTick((t) => t + 1), REFRESH_MS);
    return () => clearInterval(i);
    // [JWT] Phase 2: WebSocket streaming instead of polling
  }, []);

  const view = useMemo(() => {
    const equipment = listEquipment(E);
    const recent = listBreakdownReports(E).filter((b) => {
      const ageMs = Date.now() - new Date(b.occurred_at).getTime();
      return ageMs <= 24 * 3600 * 1000 && b.status !== 'closed' && b.status !== 'resolved';
    });
    const downIds = new Set(recent.map((b) => b.equipment_id));
    const downImpact = recent.reduce((acc, b) => acc + capacityImpactOf(b.severity), 0);
    const availablePct = Math.max(0, 100 - downImpact);
    const status: 'green' | 'amber' | 'red' = availablePct >= 90 ? 'green' : availablePct >= 70 ? 'amber' : 'red';

    const groups = new Map<string, { count: number; impact: number }>();
    recent.forEach((b) => {
      const eq = equipment.find((e) => e.id === b.equipment_id);
      let key = 'Unknown';
      if (eq) {
        if (groupBy === 'site') key = eq.linked_site_id ?? 'Unassigned';
        else if (groupBy === 'department') key = eq.location || 'Unassigned';
        else key = eq.equipment_class;
      }
      const g = groups.get(key) ?? { count: 0, impact: 0 };
      g.count += 1;
      g.impact += capacityImpactOf(b.severity);
      groups.set(key, g);
    });

    return {
      total: equipment.length,
      downCount: downIds.size,
      availablePct,
      status,
      recent: [...recent].sort((a, b) => capacityImpactOf(b.severity) - capacityImpactOf(a.severity)),
      groups: Array.from(groups.entries()).sort((a, b) => b[1].impact - a[1].impact),
      equipment,
    };
    // tick included to trigger recompute on interval
    // eslint-disable-next-line react-hooks/exhaustive-deps — tick intentionally in deps to drive auto-refresh recomputation (Q-LOCK-6)
  }, [tick, groupBy]);

  const bandClass = view.status === 'green' ? 'bg-success/20 text-success border-success/40'
    : view.status === 'amber' ? 'bg-warning/20 text-warning border-warning/40'
    : 'bg-destructive/20 text-destructive border-destructive/40';

  return (
    <MaintainProReportShell
      title="Production Capacity · Live Dashboard"
      ssotBadge={`Auto-refresh ${REFRESH_MS / 1000}s · live`}
      filters={
        <div className="flex gap-2 items-center text-sm">
          <span className="text-muted-foreground text-xs">Group by:</span>
          {(['class', 'site', 'department'] as GroupBy[]).map((g) => (
            <button
              key={g}
              onClick={() => setGroupBy(g)}
              className={`px-2 py-1 rounded border text-xs ${groupBy === g ? 'bg-primary text-primary-foreground' : 'bg-background'}`}
            >
              {g}
            </button>
          ))}
        </div>
      }
      kpis={
        <>
          <div className={`rounded border p-3 ${bandClass}`}>
            <div className="text-xs flex items-center gap-1"><Activity className="h-3 w-3" />Available capacity</div>
            <div className="text-3xl font-mono">{view.availablePct}%</div>
          </div>
          <div className="rounded border p-3">
            <div className="text-xs text-muted-foreground">Equipment down (24h)</div>
            <div className="text-3xl font-mono">{view.downCount}<span className="text-base text-muted-foreground"> / {view.total}</span></div>
          </div>
          <div className="rounded border p-3">
            <div className="text-xs text-muted-foreground">Andon</div>
            <div className="text-3xl">
              <span className={`inline-block h-6 w-6 rounded-full animate-pulse ${view.status === 'green' ? 'bg-success' : view.status === 'amber' ? 'bg-warning' : 'bg-destructive'}`} />
            </div>
          </div>
          <div className="rounded border p-3">
            <div className="text-xs text-muted-foreground">Refresh tick</div>
            <div className="text-3xl font-mono">{tick}</div>
          </div>
        </>
      }
    >
      <div className="mb-4">
        <div className="text-sm font-semibold mb-2">Grouped impact ({groupBy})</div>
        <div className="flex flex-wrap gap-2">
          {view.groups.length === 0 && <span className="text-sm text-muted-foreground">No active downtime</span>}
          {view.groups.map(([k, g]) => (
            <span key={k} className="text-xs px-2 py-1 rounded bg-muted border font-mono">
              {k}: {g.count} · impact {g.impact}%
            </span>
          ))}
        </div>
      </div>

      <div className="text-sm font-semibold mb-2">Active down equipment (last 24h · sorted by severity)</div>
      <table className="w-full text-sm">
        <thead className="text-left text-muted-foreground">
          <tr><th className="p-2">Equipment</th><th className="p-2">Severity</th><th className="p-2">Occurred</th><th className="p-2">Impact</th><th className="p-2">Complaint</th></tr>
        </thead>
        <tbody>
          {view.recent.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">All clear</td></tr>}
          {view.recent.map((b) => (
            <tr key={b.id} className="border-t">
              <td className="p-2 font-mono text-xs">{b.equipment_id}</td>
              <td className="p-2"><span className={b.severity === 'critical' ? 'text-destructive' : b.severity === 'high' ? 'text-warning' : ''}>{b.severity}</span></td>
              <td className="p-2 font-mono text-xs">{b.occurred_at.slice(0, 16).replace('T', ' ')}</td>
              <td className="p-2 font-mono">{capacityImpactOf(b.severity)}%</td>
              <td className="p-2">{b.nature_of_complaint}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 text-xs text-muted-foreground flex items-center gap-2">
        <AlertTriangle className="h-3 w-3" />
        Phase 1 stub · [JWT] Phase 2: minute-by-minute streaming + 7-day pulse graph
      </div>
    </MaintainProReportShell>
  );
}

export default ProductionCapacityLiveDashboard;
