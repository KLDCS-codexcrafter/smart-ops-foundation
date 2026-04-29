/**
 * MilestoneStatusReport.tsx — Cross-project milestone status board
 * Sprint T-Phase-1.1.2-b
 */
import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart3, Download } from 'lucide-react';
import { useProjectMilestones } from '@/hooks/useProjectMilestones';
import { useProjects } from '@/hooks/useProjects';
import {
  MILESTONE_STATUS_LABELS, MILESTONE_STATUS_COLORS,
} from '@/types/projx/project-milestone';
import type { MilestoneStatus } from '@/types/projx/project-milestone';
import { DEFAULT_ENTITY_SHORTCODE } from '@/lib/default-entity';

const fmtINR = (n: number) =>
  `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n)}`;

export function MilestoneStatusReportPanel() {
  const entityCode = DEFAULT_ENTITY_SHORTCODE;
  const { milestones } = useProjectMilestones(entityCode);
  const { projects } = useProjects(entityCode);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const todayISO = new Date().toISOString().slice(0, 10);

  const enriched = useMemo(() => {
    return milestones.map(m => {
      const project = projects.find(p => p.id === m.project_id);
      const overdue = !m.is_billed && m.status !== 'completed' && m.status !== 'cancelled' && m.target_date < todayISO;
      return { milestone: m, project, overdue };
    }).filter(r => {
      if (statusFilter !== 'all' && r.milestone.status !== statusFilter) return false;
      if (search.trim()) {
        const s = search.toLowerCase();
        return r.milestone.milestone_name.toLowerCase().includes(s) ||
          (r.project?.project_no ?? '').toLowerCase().includes(s) ||
          (r.project?.project_name ?? '').toLowerCase().includes(s);
      }
      return true;
    }).sort((a, b) => a.milestone.target_date.localeCompare(b.milestone.target_date));
  }, [milestones, projects, search, statusFilter, todayISO]);

  const stats = useMemo(() => {
    const counts: Record<MilestoneStatus, number> = {
      pending: 0, in_progress: 0, completed: 0, cancelled: 0, blocked: 0,
    };
    let overdue = 0;
    for (const r of enriched) {
      counts[r.milestone.status]++;
      if (r.overdue) overdue++;
    }
    return { ...counts, overdue, total: enriched.length };
  }, [enriched]);

  const exportCsv = () => {
    const header = 'Project,Milestone,Status,Target Date,Actual Date,Invoice %,Amount,Billed,Overdue\n';
    const body = enriched.map(r => [
      r.project?.project_no ?? '', r.milestone.milestone_name, r.milestone.status,
      r.milestone.target_date, r.milestone.actual_completion_date ?? '',
      r.milestone.invoice_pct, r.milestone.invoice_amount, r.milestone.is_billed ? 'Yes' : 'No',
      r.overdue ? 'Yes' : 'No',
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([header + body], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `milestone-status-${todayISO}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-indigo-500" /> Milestone Status
          </h1>
          <p className="text-sm text-muted-foreground">{stats.total} milestones · {stats.overdue} overdue</p>
        </div>
        <Button size="sm" variant="outline" onClick={exportCsv} className="gap-1.5">
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <Card><CardHeader className="pb-2"><CardDescription>Pending</CardDescription><CardTitle className="text-xl font-mono">{stats.pending}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>In Progress</CardDescription><CardTitle className="text-xl font-mono text-blue-600">{stats.in_progress}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Completed</CardDescription><CardTitle className="text-xl font-mono text-emerald-600">{stats.completed}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Blocked</CardDescription><CardTitle className="text-xl font-mono text-amber-600">{stats.blocked}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Cancelled</CardDescription><CardTitle className="text-xl font-mono text-muted-foreground">{stats.cancelled}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Overdue</CardDescription><CardTitle className="text-xl font-mono text-destructive">{stats.overdue}</CardTitle></CardHeader></Card>
      </div>

      <div className="flex items-center gap-2">
        <Input placeholder="Search project / milestone..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm" />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.entries(MILESTONE_STATUS_LABELS).map(([k, l]) => (
              <SelectItem key={k} value={k}>{l}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card><CardContent className="p-0">
        {enriched.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">No milestones match.</p>
        ) : (
          <table className="w-full text-xs">
            <thead className="text-[10px] text-muted-foreground border-b bg-muted/30">
              <tr>
                <th className="text-left p-2">Project</th>
                <th className="text-left p-2">Milestone</th>
                <th className="text-left p-2">Status</th>
                <th className="text-left p-2">Target</th>
                <th className="text-left p-2">Actual</th>
                <th className="text-right p-2">Invoice %</th>
                <th className="text-right p-2">Amount</th>
                <th className="text-left p-2">Billed</th>
              </tr>
            </thead>
            <tbody>
              {enriched.map(r => (
                <tr key={r.milestone.id} className={`border-b hover:bg-muted/20 ${r.overdue ? 'bg-red-500/5' : ''}`}>
                  <td className="p-2">
                    <code className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded">{r.project?.project_no ?? '—'}</code>
                    <div className="mt-0.5 truncate max-w-[160px]">{r.project?.project_name ?? '—'}</div>
                  </td>
                  <td className="p-2">
                    <code className="text-[10px] font-mono">{r.milestone.milestone_no}</code> {r.milestone.milestone_name}
                  </td>
                  <td className="p-2">
                    <Badge variant="outline" className={`text-[10px] ${MILESTONE_STATUS_COLORS[r.milestone.status]}`}>
                      {MILESTONE_STATUS_LABELS[r.milestone.status]}
                    </Badge>
                    {r.overdue && <Badge variant="outline" className="ml-1 text-[9px] bg-red-500/10 text-red-700 border-red-500/30">Overdue</Badge>}
                  </td>
                  <td className="p-2 font-mono text-[10px]">{r.milestone.target_date}</td>
                  <td className="p-2 font-mono text-[10px]">{r.milestone.actual_completion_date ?? '—'}</td>
                  <td className="p-2 text-right font-mono">{r.milestone.invoice_pct}%</td>
                  <td className="p-2 text-right font-mono">{fmtINR(r.milestone.invoice_amount)}</td>
                  <td className="p-2">{r.milestone.is_billed ? <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-700 border-emerald-500/30">Yes</Badge> : <span className="text-muted-foreground">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent></Card>
    </div>
  );
}
