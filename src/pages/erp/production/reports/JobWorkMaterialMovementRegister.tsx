/**
 * @file        JobWorkMaterialMovementRegister.tsx
 * @sprint      T-Phase-1.A.2.c-Job-Work-Tally-Parity
 * @decisions   D-NEW-X · D-NEW-AB
 */
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { FileText } from 'lucide-react';
import { useJobWorkOutOrders } from '@/hooks/useJobWorkOutOrders';
import { useJobWorkReceipts } from '@/hooks/useJobWorkReceipts';
import { useEntityCode } from '@/hooks/useEntityCode';

export function JobWorkMaterialMovementRegisterPanel(): JSX.Element {
  const { entityCode } = useEntityCode();
  const { jwos } = useJobWorkOutOrders(entityCode);
  const { receipts } = useJobWorkReceipts(entityCode);

  const rows = useMemo(() => {
    const list: Array<Record<string, string | number>> = [];
    for (const j of jwos) {
      for (const l of j.lines) {
        const matchingReceipts = receipts.filter(r => r.job_work_out_order_id === j.id);
        const recvLine = matchingReceipts
          .flatMap(r => r.lines.map(rl => ({ rl, r })))
          .find(({ rl }) => rl.job_work_out_order_line_id === l.id);
        const receivedQty = recvLine?.rl.received_qty ?? 0;
        const rejectedQty = recvLine?.rl.rejected_qty ?? 0;
        const shortages = Math.max(0, l.sent_qty - receivedQty);
        list.push({
          key: `${j.id}-${l.id}`,
          orderNo: j.doc_no,
          dcNo: j.bill_of_lading_no || j.doc_no,
          dispatchDate: j.jwo_date,
          dispatchedDesc: l.item_name,
          dispatchQty: l.sent_qty,
          jobWorker: j.vendor_name,
          processing: j.nature_of_processing ?? '—',
          receivedDesc: l.expected_output_item_name,
          receivedQty,
          jwDcNo: '—',
          grnNo: recvLine?.r.doc_no ?? '—',
          shortages,
          wastage: rejectedQty,
          remarks: l.remarks || j.notes || '—',
        });
      }
    }
    return list;
  }, [jwos, receipts]);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-2"><FileText className="h-5 w-5 text-primary" /><h1 className="text-2xl font-bold">Material Movement Register</h1></div>
      <Card>
        <CardHeader><CardTitle className="text-sm">14-column GST audit-trail register</CardTitle></CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead className="sticky left-0 bg-background">Order No</TableHead>
              <TableHead>DC No</TableHead><TableHead>Dispatch Date</TableHead>
              <TableHead>Goods Dispatched</TableHead><TableHead className="text-right">Qty</TableHead>
              <TableHead>Job Worker</TableHead><TableHead>Processing</TableHead>
              <TableHead>Goods Received</TableHead><TableHead className="text-right">Recv Qty</TableHead>
              <TableHead>JW DC</TableHead><TableHead>GRN No</TableHead>
              <TableHead className="text-right">Shortages</TableHead><TableHead className="text-right">Wastage</TableHead>
              <TableHead>Remarks</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow><TableCell colSpan={14} className="text-center text-muted-foreground py-8">No movements</TableCell></TableRow>
              ) : rows.map(r => (
                <TableRow key={String(r.key)}>
                  <TableCell className="sticky left-0 bg-background font-mono">{r.orderNo}</TableCell>
                  <TableCell className="font-mono">{r.dcNo}</TableCell>
                  <TableCell className="font-mono">{r.dispatchDate}</TableCell>
                  <TableCell>{r.dispatchedDesc}</TableCell>
                  <TableCell className="text-right font-mono">{r.dispatchQty}</TableCell>
                  <TableCell>{r.jobWorker}</TableCell>
                  <TableCell className="text-xs">{r.processing}</TableCell>
                  <TableCell>{r.receivedDesc}</TableCell>
                  <TableCell className="text-right font-mono">{r.receivedQty}</TableCell>
                  <TableCell className="font-mono">{r.jwDcNo}</TableCell>
                  <TableCell className="font-mono">{r.grnNo}</TableCell>
                  <TableCell className="text-right font-mono">{r.shortages}</TableCell>
                  <TableCell className="text-right font-mono">{r.wastage}</TableCell>
                  <TableCell className="text-xs">{r.remarks}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export default JobWorkMaterialMovementRegisterPanel;
