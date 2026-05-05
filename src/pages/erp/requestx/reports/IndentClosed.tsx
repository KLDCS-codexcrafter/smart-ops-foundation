/**
 * @file        IndentClosed.tsx
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
import { computeFulfillmentScore, inrFmt } from '@/lib/requestx-report-engine';

const CLOSED_STATUSES = new Set(['closed', 'pre_closed', 'cancelled', 'auto_pre_closed']);

export function IndentClosedPanel(): JSX.Element {
  const mi = useMaterialIndents();
  const sr = useServiceRequests();
  const ci = useCapitalIndents();

  const rows = useMemo(() => {
    const all = [
      ...mi.map(x => ({ ...x, kind: 'material' as const })),
      ...sr.map(x => ({ ...x, kind: 'service' as const })),
      ...ci.map(x => ({ ...x, kind: 'capital' as const })),
    ];
    return all.filter(r => CLOSED_STATUSES.has(r.status)).sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  }, [mi, sr, ci]);

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Closed Indents</h1>
        <p className="text-sm text-muted-foreground">Closed · Pre-Closed · Auto-Pre-Closed · Cancelled — with fulfillment score</p>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Closed register ({rows.length})</CardTitle></CardHeader>
        <CardContent>
          <SkeletonRows><Table>
            <TableHeader>
              <TableRow>
                <TableHead>Voucher</TableHead>
                <TableHead>Kind</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead className="text-right">Fulfillment</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-xs text-muted-foreground">
                  No closed indents yet.
                </TableCell></TableRow>
              )}
              {rows.map(r => {
                const fulfill = r.kind === 'material' ? computeFulfillmentScore(r) : null;
                return (
                  <TableRow key={`${r.kind}-${r.id}`}>
                    <TableCell className="font-mono text-xs">{r.voucher_no}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{r.kind}</Badge></TableCell>
                    <TableCell className="text-xs">{r.originating_department_name}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{STATUS_LABEL[r.status]}</Badge></TableCell>
                    <TableCell className="font-mono text-xs text-right">{inrFmt(r.total_estimated_value)}</TableCell>
                    <TableCell className="font-mono text-xs text-right">
                      {fulfill ? `${fulfill.final_pct}%` : '—'}
                    </TableCell>
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
