/**
 * DispatchReceiptDetailPanel.tsx — UPRA-1 Phase A · T1-3
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Printer } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DISPATCH_RECEIPT_STATUS_LABELS, DISPATCH_RECEIPT_STATUS_COLORS,
  type DispatchReceipt,
} from '@/types/dispatch-receipt';

interface Props { receipt: DispatchReceipt; onPrint: () => void }

export function DispatchReceiptDetailPanel({ receipt, onPrint }: Props) {
  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="font-mono">{receipt.receipt_no}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {receipt.customer_name} · {receipt.delivery_date} {receipt.delivery_time}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={`text-[10px] ${DISPATCH_RECEIPT_STATUS_COLORS[receipt.status]}`}>
              {DISPATCH_RECEIPT_STATUS_LABELS[receipt.status]}
            </Badge>
            <Button size="sm" variant="outline" onClick={onPrint}>
              <Printer className="h-4 w-4 mr-1" /> Print
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div><div className="text-xs text-muted-foreground">DM No</div><div className="font-mono">{receipt.dispatch_memo_no ?? '—'}</div></div>
          <div><div className="text-xs text-muted-foreground">Invoice No</div><div className="font-mono">{receipt.invoice_no ?? '—'}</div></div>
          <div><div className="text-xs text-muted-foreground">Destination</div><div>{receipt.destination}</div></div>
          <div><div className="text-xs text-muted-foreground">Vehicle</div><div className="font-mono">{receipt.vehicle_no ?? '—'}</div></div>
          <div><div className="text-xs text-muted-foreground">LR No</div><div className="font-mono">{receipt.lr_no ?? '—'}</div></div>
          <div><div className="text-xs text-muted-foreground">Transporter</div><div>{receipt.transporter_name ?? '—'}</div></div>
          <div><div className="text-xs text-muted-foreground">Receiver</div><div>{receipt.receiver_name || '—'}</div></div>
          <div><div className="text-xs text-muted-foreground">Receiver Mobile</div><div className="font-mono">{receipt.receiver_mobile || '—'}</div></div>
          <div><div className="text-xs text-muted-foreground">POD</div><div>{receipt.pod_received ? 'Received' : 'Pending'}</div></div>
          <div><div className="text-xs text-muted-foreground">FY</div><div>{receipt.fiscal_year_id ?? '—'}</div></div>
        </div>
        <div>
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Lines</div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>UOM</TableHead>
                <TableHead className="text-right">Dispatched</TableHead>
                <TableHead className="text-right">Delivered</TableHead>
                <TableHead className="text-right">Returned</TableHead>
                <TableHead className="text-right">Damage</TableHead>
                <TableHead>Remarks</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {receipt.lines.map(l => (
                <TableRow key={l.id}>
                  <TableCell className="text-xs">{l.item_code} · {l.item_name}</TableCell>
                  <TableCell className="text-xs">{l.uom}</TableCell>
                  <TableCell className="text-right text-xs font-mono">{l.dispatched_qty}</TableCell>
                  <TableCell className="text-right text-xs font-mono">{l.delivered_qty}</TableCell>
                  <TableCell className="text-right text-xs font-mono">{l.returned_qty}</TableCell>
                  <TableCell className="text-right text-xs font-mono">{l.damage_qty}</TableCell>
                  <TableCell className="text-xs">{l.remarks || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {receipt.narration && (
          <div className="bg-muted/30 rounded p-2 text-sm">
            <span className="font-semibold">Narration:</span> {receipt.narration}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
