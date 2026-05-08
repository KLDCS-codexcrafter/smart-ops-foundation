/**
 * @file        JobWorkInRegister.tsx
 * @sprint      T-Phase-1.A.2.c-Job-Work-Tally-Parity
 * @decisions   D-NEW-X
 */
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowDownToLine } from 'lucide-react';
import { useProductionOrders } from '@/hooks/useProductionOrders';

export function JobWorkInRegisterPanel(): JSX.Element {
  const { orders } = useProductionOrders();
  const jwIn = useMemo(() => orders.filter(o => o.is_job_work_in === true), [orders]);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-2"><ArrowDownToLine className="h-5 w-5 text-primary" /><h1 className="text-2xl font-bold">Job Work IN Register</h1></div>
      <Card>
        <CardHeader><CardTitle className="text-sm">Production Orders processed for principals ({jwIn.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Doc No</TableHead><TableHead>Date</TableHead><TableHead>Principal Customer</TableHead>
              <TableHead>Output Item</TableHead><TableHead className="text-right">Planned Qty</TableHead>
              <TableHead className="text-right">Produced Qty</TableHead><TableHead>Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {jwIn.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No Job Work IN orders</TableCell></TableRow>
              ) : jwIn.map(o => (
                <TableRow key={o.id}>
                  <TableCell className="font-mono">{o.doc_no}</TableCell>
                  <TableCell className="font-mono">{o.start_date}</TableCell>
                  <TableCell>{o.customer_name ?? '—'}</TableCell>
                  <TableCell>{o.output_item_name}</TableCell>
                  <TableCell className="text-right font-mono">{o.planned_qty}</TableCell>
                  <TableCell className="text-right font-mono">{o.actual_qty ?? 0}</TableCell>
                  <TableCell><Badge variant="secondary">{o.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export default JobWorkInRegisterPanel;
