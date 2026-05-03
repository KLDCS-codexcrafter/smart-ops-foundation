/**
 * @file        IndentRegister.tsx
 * @sprint      T-Phase-1.2.6f-pre-2 · Block B
 * @purpose     Unified register (Material/Service/Capital) · health column · drill-in.
 */
import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useMaterialIndents } from '@/hooks/useMaterialIndents';
import { useServiceRequests } from '@/hooks/useServiceRequests';
import { useCapitalIndents } from '@/hooks/useCapitalIndents';
import { STATUS_LABEL } from '@/types/requisition-common';
import { computeIndentHealthScore } from '@/lib/requestx-report-engine';
import { bandFromScore } from '@/lib/indent-health-score-engine';
import { inrFmt } from '@/lib/requestx-report-engine';

type Kind = 'all' | 'material' | 'service' | 'capital';

const bandColor = (b: ReturnType<typeof bandFromScore>): string => {
  if (b === 'excellent') return 'text-success';
  if (b === 'good') return 'text-primary';
  if (b === 'warning') return 'text-warning';
  return 'text-destructive';
};

export function IndentRegisterPanel(): JSX.Element {
  const mi = useMaterialIndents();
  const sr = useServiceRequests();
  const ci = useCapitalIndents();
  const [tab, setTab] = useState<Kind>('all');
  const [q, setQ] = useState('');

  const rows = useMemo(() => {
    const all = [
      ...mi.map(x => ({ ...x, kind: 'material' as const, health: computeIndentHealthScore(x) })),
      ...sr.map(x => ({ ...x, kind: 'service' as const, health: 100 })),
      ...ci.map(x => ({ ...x, kind: 'capital' as const, health: 100 })),
    ];
    const filtered = tab === 'all' ? all : all.filter(r => r.kind === tab);
    if (!q.trim()) return filtered;
    const needle = q.toLowerCase();
    return filtered.filter(r =>
      r.voucher_no.toLowerCase().includes(needle) ||
      r.requested_by_name.toLowerCase().includes(needle) ||
      r.originating_department_name.toLowerCase().includes(needle),
    );
  }, [mi, sr, ci, tab, q]);

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Indent Register</h1>
        <p className="text-sm text-muted-foreground">All indents · Material · Service · Capital · with health score</p>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3">
          <CardTitle className="text-base">Indents ({rows.length})</CardTitle>
          <Input
            placeholder="Search voucher / requester / department"
            value={q}
            onChange={e => setQ(e.target.value)}
            className="max-w-xs"
          />
        </CardHeader>
        <CardContent>
          <Tabs value={tab} onValueChange={v => setTab(v as Kind)}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="material">Material</TabsTrigger>
              <TabsTrigger value="service">Service</TabsTrigger>
              <TabsTrigger value="capital">Capital</TabsTrigger>
            </TabsList>
            <TabsContent value={tab}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Voucher</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Kind</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Requester</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Health</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 && (
                    <TableRow><TableCell colSpan={8} className="text-center text-xs text-muted-foreground">
                      No indents found.
                    </TableCell></TableRow>
                  )}
                  {rows.map(r => {
                    const band = bandFromScore(r.health);
                    return (
                      <TableRow key={`${r.kind}-${r.id}`}>
                        <TableCell className="font-mono text-xs">{r.voucher_no}</TableCell>
                        <TableCell className="font-mono text-xs">{r.date}</TableCell>
                        <TableCell><Badge variant="outline" className="text-[10px]">{r.kind}</Badge></TableCell>
                        <TableCell className="text-xs">{r.originating_department_name}</TableCell>
                        <TableCell className="text-xs">{r.requested_by_name}</TableCell>
                        <TableCell className="font-mono text-xs text-right">{inrFmt(r.total_estimated_value)}</TableCell>
                        <TableCell><Badge variant="outline" className="text-[10px]">{STATUS_LABEL[r.status]}</Badge></TableCell>
                        <TableCell className={`font-mono text-xs text-right ${bandColor(band)}`}>
                          {r.kind === 'material' ? r.health : '—'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
