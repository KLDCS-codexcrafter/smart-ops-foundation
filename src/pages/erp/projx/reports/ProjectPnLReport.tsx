/**
 * ProjectPnLReport.tsx — Live Project P&L · Sprint T-Phase-1.1.2-b
 * D-216 LOCKED · all numbers computed live, never persisted.
 */
import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PieChart as PieIcon, Download } from 'lucide-react';
import { useProjects } from '@/hooks/useProjects';
import { useProjectMilestones } from '@/hooks/useProjectMilestones';
import { useTimeEntries } from '@/hooks/useTimeEntries';
import { useProjectResources } from '@/hooks/useProjectResources';
import { computeProjectPnL } from '@/lib/projx-engine';
import { PROJECT_STATUS_LABELS, PROJECT_STATUS_COLORS } from '@/types/projx/project';
import { DEFAULT_ENTITY_SHORTCODE } from '@/lib/default-entity';

const fmtINR = (n: number) =>
  `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n)}`;

export function ProjectPnLReportPanel() {
  const entityCode = DEFAULT_ENTITY_SHORTCODE;
  const { projects } = useProjects(entityCode);
  const { milestones } = useProjectMilestones(entityCode);
  const { entries } = useTimeEntries(entityCode);
  const { resources } = useProjectResources(entityCode);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const rows = useMemo(() => {
    return projects.filter(p => p.is_active).map(p => {
      const pnl = computeProjectPnL(p, milestones, entries, [], resources);
      return { project: p, pnl };
    }).filter(r => {
      if (statusFilter !== 'all' && r.project.status !== statusFilter) return false;
      if (search.trim()) {
        const s = search.toLowerCase();
        return r.project.project_no.toLowerCase().includes(s) ||
          r.project.project_name.toLowerCase().includes(s) ||
          (r.project.customer_name ?? '').toLowerCase().includes(s);
      }
      return true;
    });
  }, [projects, milestones, entries, resources, search, statusFilter]);

  const totals = useMemo(() => rows.reduce((acc, r) => ({
    contract: acc.contract + r.project.contract_value,
    billed: acc.billed + r.pnl.revenue_billed,
    pending: acc.pending + r.pnl.revenue_pending,
    cost: acc.cost + r.pnl.cost_incurred,
    committed: acc.committed + r.pnl.cost_committed,
    margin: acc.margin + r.pnl.margin_amount,
  }), { contract: 0, billed: 0, pending: 0, cost: 0, committed: 0, margin: 0 }), [rows]);

  const exportCsv = () => {
    const header = 'Project No,Project,Customer,Status,Contract,Billed,Pending,Cost Incurred,Cost Committed,Margin,Margin %\n';
    const body = rows.map(r =>
      [r.project.project_no, r.project.project_name, r.project.customer_name ?? '', r.project.status,
        r.project.contract_value, r.pnl.revenue_billed, r.pnl.revenue_pending,
        r.pnl.cost_incurred, r.pnl.cost_committed, r.pnl.margin_amount, r.pnl.margin_pct,
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','),
    ).join('\n');
    const blob = new Blob([header + body], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `project-pnl-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <PieIcon className="h-6 w-6 text-indigo-500" /> Project P&amp;L
          </h1>
          <p className="text-sm text-muted-foreground">Live computation · D-216 lock · {rows.length} project(s)</p>
        </div>
        <Button size="sm" variant="outline" onClick={exportCsv} className="gap-1.5">
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardDescription>Total Contract</CardDescription>
          <CardTitle className="text-xl font-mono">{fmtINR(totals.contract)}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Billed</CardDescription>
          <CardTitle className="text-xl font-mono text-blue-600">{fmtINR(totals.billed)}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Cost Incurred</CardDescription>
          <CardTitle className="text-xl font-mono text-amber-600">{fmtINR(totals.cost)}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Margin</CardDescription>
          <CardTitle className={`text-xl font-mono ${totals.margin >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>{fmtINR(totals.margin)}</CardTitle></CardHeader></Card>
      </div>

      <div className="flex items-center gap-2">
        <Input placeholder="Search project / customer..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm" />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.entries(PROJECT_STATUS_LABELS).map(([k, l]) => (
              <SelectItem key={k} value={k}>{l}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card><CardContent className="p-0">
        {rows.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">No projects match the filters.</p>
        ) : (
          <table className="w-full text-xs">
            <thead className="text-[10px] text-muted-foreground border-b bg-muted/30">
              <tr>
                <th className="text-left p-2">Project</th>
                <th className="text-left p-2">Customer</th>
                <th className="text-left p-2">Status</th>
                <th className="text-right p-2">Contract</th>
                <th className="text-right p-2">Billed</th>
                <th className="text-right p-2">Pending</th>
                <th className="text-right p-2">Cost</th>
                <th className="text-right p-2">Committed</th>
                <th className="text-right p-2">Margin</th>
                <th className="text-right p-2">Margin %</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.project.id} className="border-b hover:bg-muted/20">
                  <td className="p-2">
                    <code className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded">{r.project.project_no}</code>
                    <div className="mt-0.5 truncate max-w-[200px]">{r.project.project_name}</div>
                  </td>
                  <td className="p-2 truncate max-w-[140px]">{r.project.customer_name ?? '—'}</td>
                  <td className="p-2"><Badge variant="outline" className={`text-[10px] ${PROJECT_STATUS_COLORS[r.project.status]}`}>{PROJECT_STATUS_LABELS[r.project.status]}</Badge></td>
                  <td className="p-2 text-right font-mono">{fmtINR(r.project.contract_value)}</td>
                  <td className="p-2 text-right font-mono text-blue-600">{fmtINR(r.pnl.revenue_billed)}</td>
                  <td className="p-2 text-right font-mono">{fmtINR(r.pnl.revenue_pending)}</td>
                  <td className="p-2 text-right font-mono text-amber-600">{fmtINR(r.pnl.cost_incurred)}</td>
                  <td className="p-2 text-right font-mono text-muted-foreground">{fmtINR(r.pnl.cost_committed)}</td>
                  <td className={`p-2 text-right font-mono ${r.pnl.margin_amount >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>{fmtINR(r.pnl.margin_amount)}</td>
                  <td className={`p-2 text-right font-mono ${r.pnl.margin_pct >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>{r.pnl.margin_pct}%</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t bg-muted/30 font-semibold">
              <tr>
                <td className="p-2" colSpan={3}>Totals · {rows.length} project(s)</td>
                <td className="p-2 text-right font-mono">{fmtINR(totals.contract)}</td>
                <td className="p-2 text-right font-mono">{fmtINR(totals.billed)}</td>
                <td className="p-2 text-right font-mono">{fmtINR(totals.pending)}</td>
                <td className="p-2 text-right font-mono">{fmtINR(totals.cost)}</td>
                <td className="p-2 text-right font-mono">{fmtINR(totals.committed)}</td>
                <td className={`p-2 text-right font-mono ${totals.margin >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>{fmtINR(totals.margin)}</td>
                <td className="p-2 text-right font-mono">{totals.billed > 0 ? Math.round((totals.margin / totals.billed) * 100) : 0}%</td>
              </tr>
            </tfoot>
          </table>
        )}
      </CardContent></Card>
    </div>
  );
}
