/**
 * @file        src/pages/erp/taskflow/TaskFlowLandingPage.tsx
 * @purpose     TaskFlow MVP landing · stats + Due-Soon strip + on-load reminder toast
 * @sprint      Sprint 137 · T-TaskFlow-A641.1 · Phase 8 OPENER · Block 3 (scaffold for Block 5)
 * @decisions   Block-5 ruling Option A: sonner toast() + computed Due-Soon strip · NO store
 */
import { useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, ListChecks, CheckSquare, AlertCircle, PlayCircle } from 'lucide-react';
import { listDueWithin24h, getStats } from '@/lib/taskflow-engine';
import { useEntityCode } from '@/hooks/useEntityCode';

export default function TaskFlowLandingPage(): JSX.Element {
  const { entityCode } = useEntityCode();
  const stats = useMemo(() => getStats(entityCode), [entityCode]);
  const dueSoon = useMemo(() => listDueWithin24h(entityCode), [entityCode]);

  // DESIGN-DECISION-FLAG #3 · on-load reminder toast for Due-Soon (sonner, no store)
  useEffect(() => {
    if (dueSoon.length > 0) {
      toast.warning(`${dueSoon.length} task${dueSoon.length === 1 ? '' : 's'} due within 24h`, {
        description: 'Open Due Soon module for details',
      });
    }
  }, [dueSoon.length]);

  return (
    <div className="space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">TaskFlow</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Generic cross-department task delegation · MVP Phase 8 opener
        </p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard label="Total" value={stats.total} icon={<ListChecks className="h-4 w-4" />} />
        <StatCard label="Open" value={stats.open} icon={<AlertCircle className="h-4 w-4 text-warning" />} />
        <StatCard label="In Progress" value={stats.in_progress} icon={<PlayCircle className="h-4 w-4 text-primary" />} />
        <StatCard label="Blocked" value={stats.blocked} icon={<AlertCircle className="h-4 w-4 text-destructive" />} />
        <StatCard label="Done" value={stats.done} icon={<CheckSquare className="h-4 w-4 text-success" />} />
      </div>

      <Card className="rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Due Soon · next 24h
          </CardTitle>
          <Badge variant="outline" className="font-mono">{dueSoon.length}</Badge>
        </CardHeader>
        <CardContent>
          {dueSoon.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nothing due within 24 hours.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {dueSoon.map((t) => (
                <li key={t.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{t.title}</p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {t.code} · {t.assignee_name || 'Unassigned'}
                    </p>
                  </div>
                  <Badge variant="secondary" className="font-mono">
                    {t.priority.toUpperCase()}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        TaskFlow notifications ride sonner + computed Due-Soon strip pending B.4
        Notifications Consolidation. Full CRUD UI lands in Block 4 (Pass 2).
      </p>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <Card className="rounded-2xl">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{label}</span>
          {icon}
        </div>
        <p className="text-2xl font-mono font-semibold mt-2">{value}</p>
      </CardContent>
    </Card>
  );
}
