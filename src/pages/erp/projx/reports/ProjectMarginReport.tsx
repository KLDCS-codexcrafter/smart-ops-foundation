/**
 * ProjectMarginReport.tsx — Margin ranking · Sprint T-Phase-1.1.2-b
 * Highlights healthiest and weakest projects by margin %.
 */
import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { TrendingUp, Download, ArrowUpDown } from 'lucide-react';
import { useProjects } from '@/hooks/useProjects';
import { useProjectMilestones } from '@/hooks/useProjectMilestones';
import { useTimeEntries } from '@/hooks/useTimeEntries';
import { useProjectResources } from '@/hooks/useProjectResources';
import { computeProjectPnL } from '@/lib/projx-engine';
import { PROJECT_STATUS_COLORS, PROJECT_STATUS_LABELS } from '@/types/projx/project';
import { DEFAULT_ENTITY_SHORTCODE } from '@/lib/default-entity';

const fmtINR = (n: number) =>
  `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n)}`;

export function ProjectMarginReportPanel() {
  const entityCode = DEFAULT_ENTITY_SHORTCODE;
  const { projects } = useProjects(entityCode);
  const { milestones } = useProjectMilestones(entityCode);
  const { entries } = useTimeEntries(entityCode);
  const { resources } = useProjectResources(entityCode);

  const [search, setSearch] = useState('');
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');

  const rows = useMemo(() => {
    return projects.filter(p => p.is_active).map(p => {
      const pnl = computeProjectPnL(p, milestones, entries, [], resources);
      return { project: p, pnl };
    }).filter(r => {
      if (!search.trim()) return true;
      const s = search.toLowerCase();
      return r.project.project_no.toLowerCase().includes(s) ||
        r.project.project_name.toLowerCase().includes(s) ||
        (r.project.customer_name ?? '').toLowerCase().includes(s);
    }).sort((a, b) => sortDir === 'desc'
      ? b.pnl.margin_pct - a.pnl.margin_pct
      : a.pnl.margin_pct - b.pnl.margin_pct);
  }, [projects, milestones, entries, resources, search, sortDir]);

  const topGainers = rows.slice(0, 3);
  const bottomThree = [...rows].reverse().slice(0, 3);

  const exportCsv = () => {
    const header = 'Project,Customer,Status,Contract,Billed,Cost,Margin,Margin %,Health\n';
    const body = rows.map(r => {
      const health = r.pnl.margin_pct >= 25 ? 'Healthy' : r.pnl.margin_pct >= 10 ? 'Watch' : 'At-Risk';
      return [r.project.project_no, r.project.customer_name ?? '', r.project.status,
        r.project.contract_value, r.pnl.revenue_billed, r.pnl.cost_incurred,
        r.pnl.margin_amount, r.pnl.margin_pct, health,
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
    }).join('\n');
    const blob = new Blob([header + body], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `project-margin-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-indigo-500" /> Project Margin
          </h1>
          <p className="text-sm text-muted-foreground">{rows.length} project(s) ranked by margin %</p>
        </div>
        <Button size="sm" variant="outline" onClick={exportCsv} className="gap-1.5">
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Top 3 Margins</CardDescription>
            <CardTitle className="text-base text-emerald-600">Healthiest</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {topGainers.length === 0 ? <p className="text-xs text-muted-foreground">—</p> : topGainers.map(r => (
              <div key={r.project.id} className="flex items-center justify-between text-sm">
                <span className="truncate flex-1"><code className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded mr-1">{r.project.project_no}</code>{r.project.project_name}</span>
                <span className="font-mono font-semibold text-emerald-600">{r.pnl.margin_pct}%</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Bottom 3 Margins</CardDescription>
            <CardTitle className="text-base text-destructive">At-Risk</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {bottomThree.length === 0 ? <p className="text-xs text-muted-foreground">—</p> : bottomThree.map(r => (
              <div key={r.project.id} className="flex items-center justify-between text-sm">
                <span className="truncate flex-1"><code className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded mr-1">{r.project.project_no}</code>{r.project.project_name}</span>
                <span className={`font-mono font-semibold ${r.pnl.margin_pct >= 0 ? 'text-amber-600' : 'text-destructive'}`}>{r.pnl.margin_pct}%</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-2">
        <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm" />
        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setSortDir(sortDir === 'desc' ? 'asc' : 'desc')}>
          <ArrowUpDown className="h-4 w-4" /> Sort: {sortDir === 'desc' ? 'High → Low' : 'Low → High'}
        </Button>
      </div>

      <Card><CardContent className="p-0">
        {rows.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">No projects.</p>
        ) : (
          <table className="w-full text-xs">
            <thead className="text-[10px] text-muted-foreground border-b bg-muted/30">
              <tr>
                <th className="text-left p-2">Rank</th>
                <th className="text-left p-2">Project</th>
                <th className="text-left p-2">Customer</th>
                <th className="text-left p-2">Status</th>
                <th className="text-right p-2">Billed</th>
                <th className="text-right p-2">Cost</th>
                <th className="text-right p-2">Margin</th>
                <th className="text-right p-2">Margin %</th>
                <th className="text-left p-2">Health</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => {
                const healthCls = r.pnl.margin_pct >= 25
                  ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30'
                  : r.pnl.margin_pct >= 10
                    ? 'bg-amber-500/10 text-amber-700 border-amber-500/30'
                    : 'bg-red-500/10 text-red-700 border-red-500/30';
                const healthLbl = r.pnl.margin_pct >= 25 ? 'Healthy' : r.pnl.margin_pct >= 10 ? 'Watch' : 'At-Risk';
                return (
                  <tr key={r.project.id} className="border-b hover:bg-muted/20">
                    <td className="p-2 font-mono text-muted-foreground">#{idx + 1}</td>
                    <td className="p-2">
                      <code className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded">{r.project.project_no}</code>
                      <div className="mt-0.5 truncate max-w-[200px]">{r.project.project_name}</div>
                    </td>
                    <td className="p-2 truncate max-w-[140px]">{r.project.customer_name ?? '—'}</td>
                    <td className="p-2"><Badge variant="outline" className={`text-[10px] ${PROJECT_STATUS_COLORS[r.project.status]}`}>{PROJECT_STATUS_LABELS[r.project.status]}</Badge></td>
                    <td className="p-2 text-right font-mono">{fmtINR(r.pnl.revenue_billed)}</td>
                    <td className="p-2 text-right font-mono">{fmtINR(r.pnl.cost_incurred)}</td>
                    <td className={`p-2 text-right font-mono ${r.pnl.margin_amount >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>{fmtINR(r.pnl.margin_amount)}</td>
                    <td className={`p-2 text-right font-mono font-semibold ${r.pnl.margin_pct >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>{r.pnl.margin_pct}%</td>
                    <td className="p-2"><Badge variant="outline" className={`text-[10px] ${healthCls}`}>{healthLbl}</Badge></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </CardContent></Card>
    </div>
  );
}
