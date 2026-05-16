/**
 * CustomerOrderDetailPanel.tsx — UPRA-1 Phase A · T1-1
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Printer } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { CustomerOrder } from '@/types/customer-order';

const fmtINR = (paise: number): string =>
  `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(paise / 100)}`;

interface Props { order: CustomerOrder; onPrint: () => void }

export function CustomerOrderDetailPanel({ order, onPrint }: Props) {
  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="font-mono">{order.order_no}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {order.customer_name} · placed {order.placed_at ?? '—'}
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
          <div><div className="text-xs text-muted-foreground">Order Date</div><div className="font-mono">{order.placed_at ?? '—'}</div></div>
          <div><div className="text-xs text-muted-foreground">Delivered</div><div className="font-mono">{order.delivered_at ?? '—'}</div></div>
          <div><div className="text-xs text-muted-foreground">FY</div><div className="font-mono">{order.fiscal_year_id ?? '—'}</div></div>
          <div><div className="text-xs text-muted-foreground">Net Payable</div><div className="font-mono font-semibold">{fmtINR(order.net_payable_paise)}</div></div>
        </div>
        <div>
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Line Items</div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>UOM</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Unit ₹</TableHead>
                <TableHead className="text-right">Total ₹</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.lines.map(l => (
                <TableRow key={l.id}>
                  <TableCell className="text-xs">{l.item_code} · {l.item_name}</TableCell>
                  <TableCell className="text-xs">{l.uom}</TableCell>
                  <TableCell className="text-right text-xs font-mono">{l.qty}</TableCell>
                  <TableCell className="text-right text-xs font-mono">{fmtINR(l.unit_price_paise)}</TableCell>
                  <TableCell className="text-right text-xs font-mono">{fmtINR(l.line_total_paise)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm border-t pt-3">
          <div><div className="text-xs text-muted-foreground">Subtotal</div><div className="font-mono">{fmtINR(order.subtotal_paise)}</div></div>
          <div><div className="text-xs text-muted-foreground">Scheme Discount</div><div className="font-mono">{fmtINR(order.scheme_discount_paise)}</div></div>
          <div><div className="text-xs text-muted-foreground">Loyalty Redeemed</div><div className="font-mono">{order.loyalty_points_redeemed} pts</div></div>
          <div><div className="text-xs text-muted-foreground">Loyalty Earned</div><div className="font-mono">{order.loyalty_points_earned} pts</div></div>
        </div>
      </CardContent>
    </Card>
  );
}
