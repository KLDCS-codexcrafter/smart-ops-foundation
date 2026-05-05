/**
 * @file        POAgainstIndent.tsx
 * @sprint      T-Phase-1.2.6f-pre-2 · Block B · Phase-1 stub
 */
import { useMemo } from 'react';
import { SkeletonRows } from '@/components/ui/SkeletonRows';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useMaterialIndents } from '@/hooks/useMaterialIndents';
import { useServiceRequests } from '@/hooks/useServiceRequests';
import { useCapitalIndents } from '@/hooks/useCapitalIndents';
import { poAgainstIndentSummary, inrFmt } from '@/lib/requestx-report-engine';

export function POAgainstIndentPanel(): JSX.Element {
  const mi = useMaterialIndents();
  const sr = useServiceRequests();
  const ci = useCapitalIndents();

  const rows = useMemo(() => {
    const all = [...mi, ...sr, ...ci];
    return poAgainstIndentSummary(all);
  }, [mi, sr, ci]);

  const counts = useMemo(() => ({
    no_po: rows.filter(r => r.status === 'no_po').length,
    raised: rows.filter(r => r.status === 'po_raised').length,
    closed: rows.filter(r => r.status === 'po_closed').length,
  }), [rows]);

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">PO against Indent</h1>
        <p className="text-sm text-muted-foreground">
          Cross-link indent → PO · Phase 1 stub · Sprint 3-c hooks Procure360 PO data.
        </p>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">No PO yet</p>
          <p className="text-2xl font-bold font-mono">{counts.no_po}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">PO raised</p>
          <p className="text-2xl font-bold font-mono text-primary">{counts.raised}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">PO closed</p>
          <p className="text-2xl font-bold font-mono text-success">{counts.closed}</p>
        </CardContent></Card>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Indents ({rows.length})</CardTitle></CardHeader>
        <CardContent>
          <SkeletonRows><Table>
            <TableHeader>
              <TableRow>
                <TableHead>Voucher</TableHead>
                <TableHead>Kind</TableHead>
                <TableHead>PO Status</TableHead>
                <TableHead className="text-right">PO Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center text-xs text-muted-foreground">
                  No indents.
                </TableCell></TableRow>
              )}
              {rows.map(r => (
                <TableRow key={r.indent_id}>
                  <TableCell className="font-mono text-xs">{r.voucher_no}</TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{r.kind}</Badge></TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{r.status.replace('_', ' ')}</Badge></TableCell>
                  <TableCell className="font-mono text-xs text-right">{inrFmt(r.po_value)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table></SkeletonRows>
        </CardContent>
      </Card>
    </div>
  );
}
