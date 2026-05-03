/**
 * @file        IndentPending.tsx
 * @sprint      T-Phase-1.2.6f-pre-2 · Block B
 */
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useMaterialIndents } from '@/hooks/useMaterialIndents';
import { useServiceRequests } from '@/hooks/useServiceRequests';
import { useCapitalIndents } from '@/hooks/useCapitalIndents';
import { STATUS_LABEL } from '@/types/requisition-common';
import { indentAgeDays, inrFmt } from '@/lib/requestx-report-engine';

const SLA_BY_STATUS: Record<string, number> = {
  pending_hod: 1,
  pending_purchase: 3,
  pending_finance: 5,
};

export function IndentPendingPanel(): JSX.Element {
  const mi = useMaterialIndents();
  const sr = useServiceRequests();
  const ci = useCapitalIndents();

  const rows = useMemo(() => {
    const all = [
      ...mi.map(x => ({ ...x, kind: 'material' as const })),
      ...sr.map(x => ({ ...x, kind: 'service' as const })),
      ...ci.map(x => ({ ...x, kind: 'capital' as const })),
    ];
    return all
      .filter(r => r.status === 'pending_hod' || r.status === 'pending_purchase' || r.status === 'pending_finance')
      .map(r => {
        const age = indentAgeDays(r.date);
        const sla = SLA_BY_STATUS[r.status] ?? 3;
        return { ...r, age, sla, breached: age > sla };
      })
      .sort((a, b) => b.age - a.age);
  }, [mi, sr, ci]);

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Pending Indents</h1>
        <p className="text-sm text-muted-foreground">Awaiting HOD · Purchase · or Finance approval</p>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Open queue ({rows.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Voucher</TableHead>
                <TableHead>Kind</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead className="text-right">Age (d)</TableHead>
                <TableHead>SLA</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-xs text-muted-foreground">
                  No pending indents · queue is clear.
                </TableCell></TableRow>
              )}
              {rows.map(r => (
                <TableRow key={`${r.kind}-${r.id}`}>
                  <TableCell className="font-mono text-xs">{r.voucher_no}</TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{r.kind}</Badge></TableCell>
                  <TableCell className="text-xs">{r.originating_department_name}</TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{STATUS_LABEL[r.status]}</Badge></TableCell>
                  <TableCell className="font-mono text-xs text-right">{inrFmt(r.total_estimated_value)}</TableCell>
                  <TableCell className={`font-mono text-xs text-right ${r.breached ? 'text-destructive' : ''}`}>{r.age}</TableCell>
                  <TableCell>
                    {r.breached
                      ? <Badge variant="destructive" className="text-[10px]">Breached &gt; {r.sla}d</Badge>
                      : <Badge variant="outline" className="text-[10px]">Within SLA</Badge>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
