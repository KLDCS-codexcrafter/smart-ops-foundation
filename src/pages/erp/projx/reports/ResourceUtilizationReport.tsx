/**
 * ResourceUtilizationReport.tsx — Per-person allocation rollup
 * Sprint T-Phase-1.1.2-b
 */
import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Activity, Download, AlertTriangle } from 'lucide-react';
import { useProjectResources } from '@/hooks/useProjectResources';
import { useProjects } from '@/hooks/useProjects';
import { DEFAULT_ENTITY_SHORTCODE } from '@/lib/default-entity';

const today = () => new Date().toISOString().slice(0, 10);
const fmtINR = (n: number) =>
  `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n)}`;

export function ResourceUtilizationReportPanel() {
  const entityCode = DEFAULT_ENTITY_SHORTCODE;
  const { resources } = useProjectResources(entityCode);
  const { projects } = useProjects(entityCode);
  const [search, setSearch] = useState('');

  const todayISO = today();

  const rows = useMemo(() => {
    const active = resources.filter(r => r.is_active &&
      r.allocated_from <= todayISO && (r.allocated_until === null || r.allocated_until >= todayISO));

    const byPerson = new Map<string, { person_id: string; person_code: string; person_name: string; allocations: typeof active; totalPct: number; totalCost: number }>();
    for (const r of active) {
      const existing = byPerson.get(r.person_id) ?? {
        person_id: r.person_id, person_code: r.person_code, person_name: r.person_name,
        allocations: [] as typeof active, totalPct: 0, totalCost: 0,
      };
      existing.allocations.push(r);
      existing.totalPct += r.allocation_pct;
      existing.totalCost += r.daily_cost_rate * (r.allocation_pct / 100);
      byPerson.set(r.person_id, existing);
    }
    let arr = Array.from(byPerson.values());
    if (search.trim()) {
      const s = search.toLowerCase();
      arr = arr.filter(p => p.person_name.toLowerCase().includes(s) || p.person_code.toLowerCase().includes(s));
    }
    return arr.sort((a, b) => b.totalPct - a.totalPct);
  }, [resources, todayISO, search]);

  const projectName = (id: string) => projects.find(p => p.id === id)?.project_no ?? '—';

  const exportCsv = () => {
    const header = 'Person Code,Person,Total %,Daily Cost ₹,Projects\n';
    const body = rows.map(r => [
      r.person_code, r.person_name, r.totalPct, Math.round(r.totalCost),
      r.allocations.map(a => `${projectName(a.project_id)}@${a.allocation_pct}%`).join(' | '),
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([header + body], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `resource-utilization-${todayISO}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const stats = useMemo(() => ({
    totalPeople: rows.length,
    overAllocated: rows.filter(r => r.totalPct > 100).length,
    underUtilized: rows.filter(r => r.totalPct < 50).length,
    totalDailyCost: rows.reduce((s, r) => s + r.totalCost, 0),
  }), [rows]);

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6 text-indigo-500" /> Resource Utilization
          </h1>
          <p className="text-sm text-muted-foreground">Active allocations as of {todayISO}</p>
        </div>
        <Button size="sm" variant="outline" onClick={exportCsv} className="gap-1.5">
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardDescription>People Allocated</CardDescription>
          <CardTitle className="text-xl font-mono">{stats.totalPeople}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Over-allocated (&gt;100%)</CardDescription>
          <CardTitle className="text-xl font-mono text-destructive">{stats.overAllocated}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Under-utilized (&lt;50%)</CardDescription>
          <CardTitle className="text-xl font-mono text-amber-600">{stats.underUtilized}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Daily Cost Burn</CardDescription>
          <CardTitle className="text-xl font-mono">{fmtINR(stats.totalDailyCost)}</CardTitle></CardHeader></Card>
      </div>

      <Input placeholder="Search person..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm" />

      <Card><CardContent className="p-0">
        {rows.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">No active allocations.</p>
        ) : (
          <table className="w-full text-xs">
            <thead className="text-[10px] text-muted-foreground border-b bg-muted/30">
              <tr>
                <th className="text-left p-2">Person</th>
                <th className="text-right p-2">Total %</th>
                <th className="text-right p-2">Daily Cost</th>
                <th className="text-left p-2">Allocations</th>
                <th className="text-left p-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.person_id} className="border-b hover:bg-muted/20">
                  <td className="p-2">
                    <code className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded">{r.person_code}</code>
                    <div className="mt-0.5">{r.person_name}</div>
                  </td>
                  <td className={`p-2 text-right font-mono ${r.totalPct > 100 ? 'text-destructive font-semibold' : ''}`}>{r.totalPct}%</td>
                  <td className="p-2 text-right font-mono">{fmtINR(r.totalCost)}</td>
                  <td className="p-2">
                    <div className="flex flex-wrap gap-1">
                      {r.allocations.map(a => (
                        <Badge key={a.id} variant="outline" className="text-[10px]">
                          {projectName(a.project_id)} · {a.allocation_pct}% · {a.role_on_project}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="p-2">
                    {r.totalPct > 100 ? (
                      <Badge variant="outline" className="text-[10px] bg-red-500/10 text-red-700 border-red-500/30 gap-1">
                        <AlertTriangle className="h-3 w-3" /> Over-allocated
                      </Badge>
                    ) : r.totalPct < 50 ? (
                      <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-700 border-amber-500/30">Under-utilized</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-700 border-emerald-500/30">Healthy</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent></Card>
    </div>
  );
}
