/**
 * DistributorOrderDetailPanel.tsx — UPRA-3 Phase A Step 2 · Tier-1 NEW Register #1
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Printer } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { DistributorOrder } from '@/types/distributor-order';
import { formatINR } from '@/lib/india-validations';

interface Props { order: DistributorOrder; onPrint: () => void }

export function DistributorOrderDetailPanel({ order, onPrint }: Props) {
  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="font-mono">{order.order_no}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {order.partner_code} · {order.partner_name}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="capitalize text-[10px]">{order.status}</Badge>
            <Button size="sm" variant="outline" onClick={onPrint}>
              <Printer className="h-4 w-4 mr-1" /> Print
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div><div className="text-xs text-muted-foreground">Submitted</div><div className="font-mono">{order.submitted_at.slice(0, 10)}</div></div>
          <div><div className="text-xs text-muted-foreground">Expected Delivery</div><div className="font-mono">{order.expected_delivery_date ?? '—'}</div></div>
          <div><div className="text-xs text-muted-foreground">FY</div><div className="font-mono">{order.fiscal_year_id ?? '—'}</div></div>
          <div><div className="text-xs text-muted-foreground">Entity</div><div className="font-mono">{order.entity_code}</div></div>
          <div><div className="text-xs text-muted-foreground">Taxable</div><div className="font-mono">{formatINR(order.total_taxable_paise)}</div></div>
          <div><div className="text-xs text-muted-foreground">Tax</div><div className="font-mono">{formatINR(order.total_tax_paise)}</div></div>
          <div><div className="text-xs text-muted-foreground">Grand Total</div><div className="font-mono">{formatINR(order.grand_total_paise)}</div></div>
          <div><div className="text-xs text-muted-foreground">Invoice</div><div className="font-mono">{order.linked_invoice_id ?? '—'}</div></div>
        </div>
        {order.lines.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Lines</div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.lines.map(l => (
                  <TableRow key={l.id}>
                    <TableCell className="text-xs">{l.item_code} · {l.item_name}</TableCell>
                    <TableCell className="text-xs text-right font-mono">{l.qty} {l.uom}</TableCell>
                    <TableCell className="text-xs text-right font-mono">{formatINR(l.rate_paise)}</TableCell>
                    <TableCell className="text-xs text-right font-mono">{formatINR(l.total_paise)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        {order.rejection_reason && (
          <div className="border-t pt-3">
            <div className="text-xs text-muted-foreground">Rejection Reason</div>
            <div className="text-sm">{order.rejection_reason}</div>
          </div>
        )}
        {order.notes && (
          <div className="border-t pt-3">
            <div className="text-xs text-muted-foreground">Notes</div>
            <div className="text-sm">{order.notes}</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
