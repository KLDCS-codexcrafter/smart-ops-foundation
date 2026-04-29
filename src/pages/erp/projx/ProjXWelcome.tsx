/**
 * ProjXWelcome.tsx — ProjX hub overview / welcome panel
 * Sprint T-Phase-1.1.2-a · Tier 1 Card #1
 * Live KPIs from useProjects + computeProjectPnLStub (D-216 — never persisted).
 */
import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Briefcase, FolderKanban, TrendingUp, IndianRupee, Plus } from 'lucide-react';
import { useProjects } from '@/hooks/useProjects';
import { useProjectCentres } from '@/hooks/useProjectCentres';
import { computeProjectPnLStub } from '@/lib/projx-engine';
import { PROJECT_STATUS_COLORS, PROJECT_STATUS_LABELS } from '@/types/projx/project';
import type { ProjXModule } from './ProjXSidebar.types';
import { dSum, round2 } from '@/lib/decimal-helpers';

const fmtINR = (n: number): string =>
  `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n)}`;

interface ProjXWelcomeProps {
  onNavigate: (m: ProjXModule) => void;
}

export function ProjXWelcomePanel({ onNavigate }: ProjXWelcomeProps) {
  const { projects } = useProjects();
  const { centres } = useProjectCentres();

  const stats = useMemo(() => {
    const liveProjects = projects.filter(p => p.is_active);
    const active = liveProjects.filter(p => p.status === 'active').length;
    const planning = liveProjects.filter(p => p.status === 'planning').length;
    const onHold = liveProjects.filter(p => p.status === 'on_hold').length;
    const completed = liveProjects.filter(p => p.status === 'completed').length;
    const totalContract = dSum(liveProjects, p => p.contract_value);
    const totalBilled = dSum(liveProjects, p => p.billed_to_date);
    const totalCost = dSum(liveProjects, p => p.cost_to_date);
    const margin = round2(totalBilled - totalCost);
    const marginPct = totalBilled > 0 ? round2((margin / totalBilled) * 100) : 0;
    return { total: liveProjects.length, active, planning, onHold, completed,
      totalContract, totalBilled, totalCost, margin, marginPct };
  }, [projects]);

  const recent = useMemo(() =>
    [...projects].filter(p => p.is_active)
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
      .slice(0, 5),
  [projects]);

  return (
    <div className="max-w-6xl mx-auto space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-indigo-500" />
            ProjX — Project Management
          </h1>
          <p className="text-sm text-muted-foreground">
            Live project P&amp;L · {centres.length} project centres · {stats.total} active projects
          </p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => onNavigate('t-project-entry')}>
          <Plus className="h-4 w-4" /> New Project
        </Button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Projects</CardDescription>
            <CardTitle className="text-2xl font-mono text-emerald-600">{stats.active}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {stats.planning} planning · {stats.onHold} on hold
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Contract Value</CardDescription>
            <CardTitle className="text-2xl font-mono">{fmtINR(stats.totalContract)}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">Across {stats.total} projects</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Billed To Date</CardDescription>
            <CardTitle className="text-2xl font-mono text-blue-600">{fmtINR(stats.totalBilled)}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Pending: {fmtINR(stats.totalContract - stats.totalBilled)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Live Margin (D-216)</CardDescription>
            <CardTitle className="text-2xl font-mono text-violet-600">{stats.marginPct}%</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {fmtINR(stats.margin)} on billed
          </CardContent>
        </Card>
      </div>

      {/* Recent projects */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-indigo-500" />
              Recent Projects
            </CardTitle>
            <CardDescription>Live P&amp;L computed on read · never persisted</CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={() => onNavigate('t-project-entry')}>View all →</Button>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FolderKanban className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm font-semibold text-foreground mb-1">No projects yet</p>
              <p className="text-xs mb-4">Create one to see live KPIs.</p>
              <Button size="sm" onClick={() => onNavigate('t-project-entry')}>
                <Plus className="h-4 w-4 mr-1" /> New Project
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {recent.map(p => {
                const pnl = computeProjectPnLStub(p);
                return (
                  <div key={p.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">{p.project_no}</code>
                        <Badge variant="outline" className={`text-[10px] ${PROJECT_STATUS_COLORS[p.status]}`}>
                          {PROJECT_STATUS_LABELS[p.status]}
                        </Badge>
                      </div>
                      <p className="text-sm font-medium truncate">{p.project_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{p.customer_name ?? '—'}</p>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <p className="text-sm font-mono font-semibold flex items-center gap-1 justify-end">
                        <IndianRupee className="h-3 w-3" />{fmtINR(pnl.revenue_billed).slice(1)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Margin: <span className={pnl.margin_pct >= 0 ? 'text-emerald-600' : 'text-destructive'}>
                          {pnl.margin_pct}%
                        </span>
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
