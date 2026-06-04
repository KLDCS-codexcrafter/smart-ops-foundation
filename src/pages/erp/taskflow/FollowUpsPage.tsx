/**
 * @file        src/pages/erp/taskflow/FollowUpsPage.tsx
 * @purpose     S142 · TF-25 · Chat→Task FollowUps bridge.
 * @sprint      Sprint 142 · T-TaskFlow-A641.6 · Block 4
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import {
  listFollowUps, resolveFollowUp, convertFollowUpToTask,
} from '@/lib/operix-chat-engine';
import { createTask } from '@/lib/taskflow-engine';
import type { FollowUp } from '@/types/operix-chat';
import { CheckCircle2, ArrowRightCircle } from 'lucide-react';

type Filter = 'open' | 'done' | 'converted' | 'all';

export default function FollowUpsPage(): JSX.Element {
  const { entityCode } = useEntityCode();
  const user = useCurrentUser();
  const userId = user?.id ?? 'demo-user';
  const [filter, setFilter] = useState<Filter>('open');
  const [list, setList] = useState<FollowUp[]>([]);

  const refresh = useCallback(() => {
    setList(listFollowUps(entityCode));
  }, [entityCode]);

  useEffect(() => { refresh(); }, [refresh]);

  const filtered = useMemo(
    () => (filter === 'all' ? list : list.filter((f) => f.status === filter)),
    [list, filter],
  );

  const counts = useMemo(() => ({
    open: list.filter((f) => f.status === 'open').length,
    done: list.filter((f) => f.status === 'done').length,
    converted: list.filter((f) => f.status === 'converted').length,
  }), [list]);

  const onResolve = (id: string): void => {
    try { resolveFollowUp(entityCode, id); toast.success('Follow-up resolved'); refresh(); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Failed'); }
  };

  const onConvert = (id: string): void => {
    try {
      const { taskId } = convertFollowUpToTask(entityCode, id, userId, {
        createTaskFn: (ec, t) => createTask(ec, t),
      });
      toast.success(`Converted to task ${taskId}`);
      refresh();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed'); }
  };

  const statusTone = (s: FollowUp['status']): 'default' | 'secondary' | 'outline' => {
    if (s === 'open') return 'default';
    if (s === 'converted') return 'secondary';
    return 'outline';
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold">Follow-Ups</h1>
        <p className="text-sm text-muted-foreground">
          Chat messages flagged for action · resolve in place or convert to a task.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <KpiCard label="Open" value={counts.open} />
        <KpiCard label="Resolved" value={counts.done} />
        <KpiCard label="Converted" value={counts.converted} />
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
        <TabsList>
          <TabsTrigger value="open">Open</TabsTrigger>
          <TabsTrigger value="done">Resolved</TabsTrigger>
          <TabsTrigger value="converted">Converted</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card className="glass-card rounded-2xl">
        <CardHeader><CardTitle className="text-base">Follow-ups</CardTitle></CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No follow-ups in this view.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Note</TableHead>
                  <TableHead>Assignee</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell className="max-w-[320px] truncate">{f.note}</TableCell>
                    <TableCell className="font-mono text-xs">{f.assigneeId}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {f.dueDate ? new Date(f.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusTone(f.status)} className="uppercase text-[10px]">{f.status}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{new Date(f.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</TableCell>
                    <TableCell className="text-right space-x-2">
                      {f.status === 'open' && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => onResolve(f.id)}>
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />Resolve
                          </Button>
                          <Button size="sm" onClick={() => onConvert(f.id)}>
                            <ArrowRightCircle className="h-3.5 w-3.5 mr-1" />Convert to task
                          </Button>
                        </>
                      )}
                      {f.status === 'converted' && f.linkedTaskId && (
                        <span className="text-xs text-muted-foreground font-mono">→ {f.linkedTaskId}</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: string | number }): JSX.Element {
  return (
    <Card className="glass-card rounded-2xl">
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold font-mono mt-1">{value}</p>
      </CardContent>
    </Card>
  );
}
