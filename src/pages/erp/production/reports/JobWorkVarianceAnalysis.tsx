/**
 * @file        JobWorkVarianceAnalysis.tsx
 * @sprint      T-Phase-1.A.2.c-Job-Work-Tally-Parity
 * @decisions   D-NEW-X
 */
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Scale } from 'lucide-react';
import { useJobWorkOutOrders } from '@/hooks/useJobWorkOutOrders';
import { useEntityCode } from '@/hooks/useEntityCode';
import { round2 } from '@/lib/decimal-helpers';

export function JobWorkVarianceAnalysisPanel(): JSX.Element {
  const { entityCode } = useEntityCode();
  const { jwos } = useJobWorkOutOrders(entityCode);

  const rows = useMemo(() => {
    const list: Array<{
      key: string; jwo: string; vendor: string; item: string;
      sent: number; expected: number; received: number;
      variance_qty: number; variance_pct: number; variance_value: number;
    }> = [];
    for (const j of jwos) {
      for (const l of j.lines) {
        const variance_qty = round2(l.expected_output_qty - l.received_qty);
        const variance_pct = l.expected_output_qty > 0
          ? round2((variance_qty / l.expected_output_qty) * 100) : 0;
        list.push({
          key: `${j.id}-${l.id}`,
          jwo: j.doc_no, vendor: j.vendor_name, item: l.item_name,
          sent: l.sent_qty, expected: l.expected_output_qty, received: l.received_qty,
          variance_qty, variance_pct,
          variance_value: round2(variance_qty * l.job_work_rate),
        });
      }
    }
    return list;
  }, [jwos]);

  const varianceBadge = (pct: number) => {
    const v = Math.abs(pct);
    const variant: 'default' | 'secondary' | 'destructive' = v < 2 ? 'default' : v <= 5 ? 'secondary' : 'destructive';
    return <Badge variant={variant}>{pct.toFixed(2)}%</Badge>;
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-2"><Scale className="h-5 w-5 text-primary" /><h1 className="text-2xl font-bold">Job Work Variance Analysis</h1></div>
      <Card>
        <CardHeader><CardTitle className="text-sm">Line-level Variance</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>JWO</TableHead><TableHead>Vendor</TableHead><TableHead>Item</TableHead>
              <TableHead className="text-right">Sent</TableHead><TableHead className="text-right">Expected</TableHead>
              <TableHead className="text-right">Received</TableHead><TableHead className="text-right">Var Qty</TableHead>
              <TableHead>Var %</TableHead><TableHead className="text-right">Var Value (₹)</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">No data</TableCell></TableRow>
              ) : rows.map(r => (
                <TableRow key={r.key}>
                  <TableCell className="font-mono text-xs">{r.jwo}</TableCell>
                  <TableCell>{r.vendor}</TableCell>
                  <TableCell>{r.item}</TableCell>
                  <TableCell className="text-right font-mono">{r.sent}</TableCell>
                  <TableCell className="text-right font-mono">{r.expected}</TableCell>
                  <TableCell className="text-right font-mono">{r.received}</TableCell>
                  <TableCell className="text-right font-mono">{r.variance_qty}</TableCell>
                  <TableCell>{varianceBadge(r.variance_pct)}</TableCell>
                  <TableCell className="text-right font-mono">₹{r.variance_value.toLocaleString('en-IN')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export default JobWorkVarianceAnalysisPanel;
