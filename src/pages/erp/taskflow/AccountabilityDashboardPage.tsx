/**
 * @file        src/pages/erp/taskflow/AccountabilityDashboardPage.tsx
 * @purpose     S141 · Manager + self scope accountability dashboard.
 *              NO leaderboards · NO ranking · the don't-build canon.
 * @sprint      Sprint 141 · T-TaskFlow-A641.5 · Block 4
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import {
  computeAccountabilityMetrics, exportMyTrail,
} from '@/lib/taskflow-accountability-engine';
import type { AccountabilityMetricsBundle, MyTrailBundle } from '@/lib/taskflow-accountability-engine';

export default function AccountabilityDashboardPage(): JSX.Element {
  const { entityCode } = useEntityCode();
  const user = useCurrentUser();
  const userId = user?.id ?? 'demo-user';
  const [bundle, setBundle] = useState<AccountabilityMetricsBundle>({ people: [], rollups: [] });
  const [trail, setTrail] = useState<MyTrailBundle | null>(null);

  const refresh = useCallback(() => {
    setBundle(computeAccountabilityMetrics(entityCode));
    setTrail(exportMyTrail(entityCode, userId));
  }, [entityCode, userId]);

  useEffect(() => { refresh(); }, [refresh]);

  const totals = useMemo(() => {
    let open = 0, overdue = 0, unack = 0, rework = 0, blocked = 0, sla = 0;
    for (const p of bundle.people) {
      open += p.openTasks; overdue += p.overdueTasks; unack += p.unacknowledgedCount;
      rework += p.reworkBounces; blocked += p.blockedHoursOpen; sla += p.slaBreaches;
    }
    return { open, overdue, unack, rework, blocked, sla };
  }, [bundle]);

  const exportJson = (): void => {
    if (!trail) return;
    const blob = new Blob([JSON.stringify(trail, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `my-trail-${userId}-${new Date().toISOString().slice(0,10)}.json`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold">Accountability</h1>
        <p className="text-sm text-muted-foreground">
          Manager scope and self scope · no leaderboards, no ranking.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <KpiCard label="Open" value={totals.open} />
        <KpiCard label="Overdue" value={totals.overdue} tone="destructive" />
        <KpiCard label="Unacknowledged" value={totals.unack} tone="warning" />
        <KpiCard label="Rework bounces" value={totals.rework} tone="warning" />
        <KpiCard label="Blocked (h)" value={totals.blocked} />
        <KpiCard label="SLA breaches" value={totals.sla} tone="destructive" />
      </div>

      <Tabs defaultValue="manager">
        <TabsList>
          <TabsTrigger value="manager">Manager scope</TabsTrigger>
          <TabsTrigger value="self">Self scope</TabsTrigger>
        </TabsList>

        <TabsContent value="manager" className="space-y-4 mt-4">
          <Card className="rounded-2xl">
            <CardHeader><CardTitle className="text-base">Department rollups</CardTitle></CardHeader>
            <CardContent>
              {bundle.rollups.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No data yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Department</TableHead>
                      <TableHead className="text-right">Users</TableHead>
                      <TableHead className="text-right">Open</TableHead>
                      <TableHead className="text-right">Overdue</TableHead>
                      <TableHead className="text-right">Unack</TableHead>
                      <TableHead className="text-right">Rework</TableHead>
                      <TableHead className="text-right">Blocked (h)</TableHead>
                      <TableHead className="text-right">SLA</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bundle.rollups.map((r) => (
                      <TableRow key={r.departmentId ?? '__none__'}>
                        <TableCell className="font-mono text-xs">{r.departmentId ?? '—'}</TableCell>
                        <TableCell className="text-right font-mono">{r.userCount}</TableCell>
                        <TableCell className="text-right font-mono">{r.openTasks}</TableCell>
                        <TableCell className="text-right font-mono">{r.overdueTasks}</TableCell>
                        <TableCell className="text-right font-mono">{r.unacknowledgedCount}</TableCell>
                        <TableCell className="text-right font-mono">{r.reworkBounces}</TableCell>
                        <TableCell className="text-right font-mono">{r.blockedHoursOpen}</TableCell>
                        <TableCell className="text-right font-mono">{r.slaBreaches}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader><CardTitle className="text-base">People</CardTitle></CardHeader>
            <CardContent>
              {bundle.people.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No data yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead className="text-right">Open</TableHead>
                      <TableHead className="text-right">Overdue</TableHead>
                      <TableHead className="text-right">Ack avg (h)</TableHead>
                      <TableHead className="text-right">Rework</TableHead>
                      <TableHead className="text-right">Reass-away</TableHead>
                      <TableHead className="text-right">Blocked (h)</TableHead>
                      <TableHead className="text-right">SLA</TableHead>
                      <TableHead className="text-right">Est/Act (h)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bundle.people.map((p) => (
                      <TableRow key={p.userId}>
                        <TableCell className="font-mono text-xs">{p.userName}</TableCell>
                        <TableCell className="text-right font-mono">{p.openTasks}</TableCell>
                        <TableCell className="text-right font-mono">{p.overdueTasks}</TableCell>
                        <TableCell className="text-right font-mono">{p.avgTimeToAcknowledgeHours ?? '—'}</TableCell>
                        <TableCell className="text-right font-mono">{p.reworkBounces}</TableCell>
                        <TableCell className="text-right font-mono">{p.reassignmentsAway}</TableCell>
                        <TableCell className="text-right font-mono">{p.blockedHoursOpen}</TableCell>
                        <TableCell className="text-right font-mono">{p.slaBreaches}</TableCell>
                        <TableCell className="text-right font-mono">{p.estimatedHoursTotal}/{p.actualHoursTotal}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="self" className="space-y-4 mt-4">
          <Card className="rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">My trail (symmetric visibility · TF-29f)</CardTitle>
              <button onClick={exportJson} className="text-xs underline text-primary">Export JSON</button>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {trail ? (
                <>
                  <p>Tasks involving me: <span className="font-mono">{trail.tasks.length}</span></p>
                  <p>Acknowledgments: <span className="font-mono">{trail.acknowledgments.length}</span></p>
                  <p>Reassignments touching me: <span className="font-mono">{trail.reassignments.length}</span></p>
                  <p>Due-date changes touching me: <span className="font-mono">{trail.dueDateChanges.length}</span></p>
                  <p>Open blocked records: <span className="font-mono">{trail.blockedRecords.length}</span></p>
                  <p>Audit entries: <span className="font-mono">{trail.auditEntries.length}</span></p>
                  <p className="text-xs text-muted-foreground">
                    Diary span: {trail.diarySpan.from} → {trail.diarySpan.to}
                  </p>
                </>
              ) : <p>Loading…</p>}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function KpiCard({ label, value, tone }: { label: string; value: number; tone?: 'destructive' | 'warning' }): JSX.Element {
  return (
    <Card className="rounded-2xl">
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-2xl font-mono mt-1">
          {value}
          {tone === 'destructive' && value > 0 && <Badge variant="destructive" className="ml-2 text-[10px]">!</Badge>}
          {tone === 'warning' && value > 0 && <Badge variant="outline" className="ml-2 text-[10px]">·</Badge>}
        </p>
      </CardContent>
    </Card>
  );
}
