/**
 * SecondarySalesDetailPanel.tsx — Drill detail for a Secondary Sales record
 * Sprint T-Phase-1.2.6c · D-226 UTS
 *
 * NOTE: No "View Stock" dialog here — distributor's own stock movements
 * are not tracked in our system (Q2-c lock).
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Printer } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { END_CUSTOMER_LABELS, type SecondarySales } from '@/types/secondary-sales';

const fmtINR = (n: number): string =>
  `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n)}`;

interface Props { sec: SecondarySales; onPrint: () => void }

export function SecondarySalesDetailPanel({ sec, onPrint }: Props) {
  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="font-mono">{sec.secondary_code}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{sec.distributor_name}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{END_CUSTOMER_LABELS[sec.end_customer_type]}</Badge>
            <Button size="sm" variant="outline" onClick={onPrint} className="gap-2">
              <Printer className="h-4 w-4" /> Print
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div><div className="text-xs text-muted-foreground">Sale Date</div><div className="font-mono">{sec.sale_date}</div></div>
          <div><div className="text-xs text-muted-foreground">Effective</div><div className="font-mono">{sec.effective_date ?? sec.sale_date}</div></div>
          <div><div className="text-xs text-muted-foreground">End Customer</div><div>{sec.end_customer_name ?? '—'}</div></div>
          <div><div className="text-xs text-muted-foreground">Capture Mode</div><div>{sec.capture_mode}</div></div>
          <div><div className="text-xs text-muted-foreground">Lines</div><div className="font-mono">{sec.lines.length}</div></div>
          <div><div className="text-xs text-muted-foreground">Total</div><div className="font-mono font-semibold">{fmtINR(sec.total_amount)}</div></div>
        </div>
        <div>
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Line Items</div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item Code</TableHead>
                <TableHead>Item Name</TableHead>
                <TableHead>UOM</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Rate ₹</TableHead>
                <TableHead className="text-right">Amount ₹</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sec.lines.map(l => (
                <TableRow key={l.id}>
                  <TableCell className="text-xs font-mono">{l.item_code}</TableCell>
                  <TableCell className="text-xs">{l.item_name}</TableCell>
                  <TableCell className="text-xs">{l.uom}</TableCell>
                  <TableCell className="text-right text-xs font-mono">{l.qty}</TableCell>
                  <TableCell className="text-right text-xs font-mono">{fmtINR(l.rate)}</TableCell>
                  <TableCell className="text-right text-xs font-mono">{fmtINR(l.amount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {sec.notes && (
          <div>
            <div className="text-xs text-muted-foreground">Notes</div>
            <div className="text-sm">{sec.notes}</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
