/**
 * GRNDetailPanel.tsx — Drill detail for a single GRN
 * Sprint T-Phase-1.2.6b · D-226 UTS dim #4 · header + lines + Print action
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Printer } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { GRN_STATUS_COLORS, GRN_STATUS_LABELS, type GRN } from '@/types/grn';

const fmtINR = (n: number): string =>
  `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n)}`;

interface Props { grn: GRN; onPrint: () => void; }

export function GRNDetailPanel({ grn, onPrint }: Props) {
  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="font-mono">{grn.grn_no}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{grn.vendor_name} · {grn.godown_name}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={GRN_STATUS_COLORS[grn.status]}>{GRN_STATUS_LABELS[grn.status]}</Badge>
            <Button size="sm" variant="outline" onClick={onPrint} className="gap-2">
              <Printer className="h-4 w-4" /> Print
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div><div className="text-xs text-muted-foreground">Receipt Date</div><div className="font-mono">{grn.receipt_date}</div></div>
          <div><div className="text-xs text-muted-foreground">Effective Date</div><div className="font-mono">{grn.effective_date ?? grn.receipt_date}</div></div>
          <div><div className="text-xs text-muted-foreground">PO Ref</div><div className="font-mono">{grn.po_no ?? '—'}</div></div>
          <div><div className="text-xs text-muted-foreground">Vehicle</div><div className="font-mono">{grn.vehicle_no ?? '—'}</div></div>
          <div><div className="text-xs text-muted-foreground">LR No</div><div className="font-mono">{grn.lr_no ?? '—'}</div></div>
          <div><div className="text-xs text-muted-foreground">Vendor Invoice</div><div className="font-mono">{grn.vendor_invoice_no ?? '—'}</div></div>
          <div><div className="text-xs text-muted-foreground">Total Qty</div><div className="font-mono">{grn.total_qty}</div></div>
          <div><div className="text-xs text-muted-foreground">Total Value</div><div className="font-mono">{fmtINR(grn.total_value)}</div></div>
        </div>
        <div>
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Line Items</div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead><TableHead>UOM</TableHead>
                <TableHead className="text-right">Received</TableHead>
                <TableHead className="text-right">Accepted</TableHead>
                <TableHead className="text-right">Rate ₹</TableHead>
                <TableHead className="text-right">Total ₹</TableHead>
                <TableHead>Batch</TableHead><TableHead>Heat</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {grn.lines.map(l => (
                <TableRow key={l.id}>
                  <TableCell className="text-xs">{l.item_code} · {l.item_name}</TableCell>
                  <TableCell className="text-xs">{l.uom}</TableCell>
                  <TableCell className="text-right text-xs font-mono">{l.received_qty}</TableCell>
                  <TableCell className="text-right text-xs font-mono">{l.accepted_qty}</TableCell>
                  <TableCell className="text-right text-xs font-mono">{l.unit_rate}</TableCell>
                  <TableCell className="text-right text-xs font-mono">{fmtINR(l.line_total)}</TableCell>
                  <TableCell className="text-xs">{l.batch_no ?? '—'}</TableCell>
                  <TableCell className="text-xs">{l.heat_no ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {grn.narration && (
          <div>
            <div className="text-xs text-muted-foreground">Narration</div>
            <div className="text-sm">{grn.narration}</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
