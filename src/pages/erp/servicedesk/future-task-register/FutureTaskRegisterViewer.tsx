/**
 * @file        src/pages/erp/servicedesk/future-task-register/FutureTaskRegisterViewer.tsx
 * @purpose     Future Task Register viewer · MOAT #24 criterion 14 · RPT-8a chart-enabled
 * @sprint      T-Phase-1.C.1f · Block I.2 · RPT-8a (additive)
 */
import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShieldCheck } from 'lucide-react';
import { seedFutureTaskRegister, listFutureTasks } from '@/lib/servicedesk-engine';
import type { FTStatus } from '@/types/future-task-register';
import { ReportChart } from '@/components/operix-core/report-framework';
import { signReport, getKpi, defaultChartConfig } from '@/lib/report-framework';

const ENTITY = 'OPRX';

export function FutureTaskRegisterViewer(): JSX.Element {
  const [tab, setTab] = useState<'all' | FTStatus>('all');
  useEffect(() => {
    seedFutureTaskRegister(ENTITY);
  }, []);

  const all = listFutureTasks({ entity_id: ENTITY });
  const filtered = tab === 'all' ? all : all.filter((t) => t.status === tab);

  const chartRows = (() => {
    const byStatus = new Map<string, number>();
    for (const t of all) byStatus.set(t.status, (byStatus.get(t.status) ?? 0) + 1);
    return Array.from(byStatus.entries()).map(([status, count]) => ({ status, count }));
  })();
  const cfg = getKpi('sd-future-tasks')?.defaultChart ?? defaultChartConfig({
    chartType: 'column', xKey: 'status',
    series: [{ key: 'count', label: 'Tasks' }],
    title: 'Future tasks by status',
  });
  const hash = signReport(chartRows);
  const short = hash.replace('fnv1a:', '').slice(0, 10);

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Future Task Register</h1>
        <p className="text-sm text-muted-foreground">
          MOAT #24 criterion 14 · ServiceDesk Phase 2 roadmap · {all.length} task(s)
        </p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as 'all' | FTStatus)}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="planned">Planned</TabsTrigger>
          <TabsTrigger value="in_progress">In Progress</TabsTrigger>
          <TabsTrigger value="blocked">Blocked</TabsTrigger>
          <TabsTrigger value="done">Done</TabsTrigger>
          <TabsTrigger value="deferred">Deferred</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card className="p-0 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">No tasks in {tab}.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr className="text-left">
                <th className="p-3 font-medium">FT Code</th>
                <th className="p-3 font-medium">Title</th>
                <th className="p-3 font-medium">Priority</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium">Phase</th>
                <th className="p-3 font-medium">Est LOC</th>
                <th className="p-3 font-medium">Depends</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id} className="border-t">
                  <td className="p-3 font-mono text-xs">{t.ft_code}</td>
                  <td className="p-3">
                    <div className="font-medium">{t.title}</div>
                    <div className="text-xs text-muted-foreground">{t.description}</div>
                  </td>
                  <td className="p-3"><Badge variant="outline">{t.priority}</Badge></td>
                  <td className="p-3"><Badge>{t.status}</Badge></td>
                  <td className="p-3"><Badge variant="secondary">{t.target_phase}</Badge></td>
                  <td className="p-3 font-mono">{t.estimated_loc}</td>
                  <td className="p-3 text-xs">{t.unblock_dependencies.join(', ') || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      <Card className="p-3 space-y-2" data-testid="sd-future-tasks-dashboard-host">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-[10px] font-mono" data-testid="sd-future-tasks-integrity-badge" title={hash}>
            <ShieldCheck className="h-3 w-3 mr-1" />{short}
          </Badge>
        </div>
        <div className="w-full h-56" data-testid="sd-future-tasks-chart-host">
          <ReportChart data={chartRows} config={cfg} />
        </div>
      </Card>
    </div>
  );
}
