/**
 * StockReceiptAckDetailPanel.tsx — UPRA-3 Phase A Step 2 · Tier-1 NEW Register #3
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Printer } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { StockReceiptAck } from '@/types/stock-receipt-ack';

interface Props { ack: StockReceiptAck; onPrint: () => void }

export function StockReceiptAckDetailPanel({ ack, onPrint }: Props) {
  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="font-mono">{ack.ack_no}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {ack.inward_receipt_no} · {ack.vendor_name}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="capitalize text-[10px]">{ack.status}</Badge>
            <Button size="sm" variant="outline" onClick={onPrint}>
              <Printer className="h-4 w-4 mr-1" /> Print
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div><div className="text-xs text-muted-foreground">Ack Date</div><div className="font-mono">{ack.ack_date.slice(0, 10)}</div></div>
          <div><div className="text-xs text-muted-foreground">Acknowledged By</div><div className="font-mono">{ack.acknowledged_by_name}</div></div>
          <div><div className="text-xs text-muted-foreground">Lines</div><div className="font-mono">{ack.lines.length}</div></div>
          <div><div className="text-xs text-muted-foreground">Total Variance</div><div className="font-mono">{ack.total_variance}</div></div>
          <div><div className="text-xs text-muted-foreground">Voucher</div><div className="font-mono">{ack.voucher_no ?? '—'}</div></div>
          <div><div className="text-xs text-muted-foreground">Posted At</div><div className="font-mono">{ack.posted_at?.slice(0, 16).replace('T', ' ') ?? '—'}</div></div>
          <div><div className="text-xs text-muted-foreground">FY</div><div className="font-mono">{ack.fiscal_year_id ?? '—'}</div></div>
          <div><div className="text-xs text-muted-foreground">Reference</div><div className="font-mono">{ack.reference_no ?? '—'}</div></div>
        </div>
        {ack.lines.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Lines</div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Inward Qty</TableHead>
                  <TableHead className="text-right">Ack Qty</TableHead>
                  <TableHead className="text-right">Variance</TableHead>
                  <TableHead>Source → Dest</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ack.lines.map(l => (
                  <TableRow key={l.id}>
                    <TableCell className="text-xs">{l.item_code} · {l.item_name}</TableCell>
                    <TableCell className="text-xs text-right font-mono">{l.qty_inward} {l.uom}</TableCell>
                    <TableCell className="text-xs text-right font-mono">{l.qty_acknowledged} {l.uom}</TableCell>
                    <TableCell className={`text-xs text-right font-mono ${l.variance !== 0 ? 'text-warning' : ''}`}>{l.variance}</TableCell>
                    <TableCell className="text-xs">{l.source_godown_name} → {l.dest_godown_name}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        {ack.narration && (
          <div className="border-t pt-3">
            <div className="text-xs text-muted-foreground">Narration</div>
            <div className="text-sm">{ack.narration}</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
