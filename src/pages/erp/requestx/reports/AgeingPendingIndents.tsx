/**
 * @file        AgeingPendingIndents.tsx
 * @sprint      T-Phase-1.2.6f-pre-2 · Block B
 */
import { useMemo } from 'react';
import { SkeletonRows } from '@/components/ui/SkeletonRows';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useMaterialIndents } from '@/hooks/useMaterialIndents';
import { useServiceRequests } from '@/hooks/useServiceRequests';
import { useCapitalIndents } from '@/hooks/useCapitalIndents';
import { STATUS_LABEL } from '@/types/requisition-common';
import { ageingBuckets, indentAgeDays, inrFmt } from '@/lib/requestx-report-engine';

const PENDING_STATUSES = new Set(['pending_hod', 'pending_purchase', 'pending_finance', 'submitted', 'hold']);

const bucketLabel = (days: number): string => {
  if (days <= 7) return '0-7';
  if (days <= 15) return '8-15';
  if (days <= 30) return '16-30';
  return '30+';
};

const bucketColor = (b: string): string => {
  if (b === '0-7') return 'text-success';
  if (b === '8-15') return 'text-primary';
  if (b === '16-30') return 'text-warning';
  return 'text-destructive';
};

export function AgeingPendingIndentsPanel(): JSX.Element {
  const mi = useMaterialIndents();
  const sr = useServiceRequests();
  const ci = useCapitalIndents();

  const { rows, buckets } = useMemo(() => {
    const all = [
      ...mi.map(x => ({ ...x, kind: 'material' as const })),
      ...sr.map(x => ({ ...x, kind: 'service' as const })),
      ...ci.map(x => ({ ...x, kind: 'capital' as const })),
    ].filter(r => PENDING_STATUSES.has(r.status));
    return {
      rows: all.map(r => ({ ...r, age: indentAgeDays(r.date) })).sort((a, b) => b.age - a.age),
      buckets: ageingBuckets(all),
    };
  }, [mi, sr, ci]);

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Ageing of Pending Indents</h1>
        <p className="text-sm text-muted-foreground">4 aging buckets · color-coded · drill-in</p>
      </div>
      <div className="grid grid-cols-4 gap-3">
        {(['0-7', '8-15', '16-30', '30+'] as const).map(b => (
          <Card key={b}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{b} days</p>
              <p className={`text-2xl font-bold font-mono ${bucketColor(b)}`}>{buckets[b]}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Pending indents ({rows.length})</CardTitle></CardHeader>
        <CardContent>
          <SkeletonRows><Table>
            <TableHeader>
              <TableRow>
                <TableHead>Voucher</TableHead>
                <TableHead>Kind</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Age</TableHead>
                <TableHead>Bucket</TableHead>
                <TableHead className="text-right">Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-xs text-muted-foreground">No pending indents.</TableCell></TableRow>
              )}
              {rows.map(r => {
                const b = bucketLabel(r.age);
                return (
                  <TableRow key={`${r.kind}-${r.id}`}>
                    <TableCell className="font-mono text-xs">{r.voucher_no}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{r.kind}</Badge></TableCell>
                    <TableCell className="text-xs">{r.originating_department_name}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{STATUS_LABEL[r.status]}</Badge></TableCell>
                    <TableCell className="font-mono text-xs text-right">{r.age}d</TableCell>
                    <TableCell><span className={`font-mono text-xs ${bucketColor(b)}`}>{b}</span></TableCell>
                    <TableCell className="font-mono text-xs text-right">{inrFmt(r.total_estimated_value)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table></SkeletonRows>
        </CardContent>
      </Card>
    </div>
  );
}
