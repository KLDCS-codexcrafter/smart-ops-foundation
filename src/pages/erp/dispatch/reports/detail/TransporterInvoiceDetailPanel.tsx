/**
 * TransporterInvoiceDetailPanel.tsx — UPRA-3 Phase A Step 2 · Tier-1 NEW Register #2
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Printer } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { TransporterInvoice } from '@/types/transporter-invoice';

const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

interface Props { invoice: TransporterInvoice; onPrint: () => void }

export function TransporterInvoiceDetailPanel({ invoice, onPrint }: Props) {
  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="font-mono">{invoice.invoice_no}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {invoice.logistic_name} · {invoice.invoice_date}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="capitalize text-[10px]">{invoice.status.replace('_', ' ')}</Badge>
            <Button size="sm" variant="outline" onClick={onPrint}>
              <Printer className="h-4 w-4 mr-1" /> Print
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div><div className="text-xs text-muted-foreground">Period From</div><div className="font-mono">{invoice.period_from}</div></div>
          <div><div className="text-xs text-muted-foreground">Period To</div><div className="font-mono">{invoice.period_to}</div></div>
          <div><div className="text-xs text-muted-foreground">Workflow</div><div className="font-mono">{invoice.workflow_mode}</div></div>
          <div><div className="text-xs text-muted-foreground">Source</div><div className="font-mono">{invoice.upload_source}</div></div>
          <div><div className="text-xs text-muted-foreground">Declared</div><div className="font-mono">{fmt(invoice.total_declared)}</div></div>
          <div><div className="text-xs text-muted-foreground">GST</div><div className="font-mono">{fmt(invoice.total_gst)}</div></div>
          <div><div className="text-xs text-muted-foreground">Grand Total</div><div className="font-mono">{fmt(invoice.grand_total)}</div></div>
          <div><div className="text-xs text-muted-foreground">FY</div><div className="font-mono">{invoice.fiscal_year_id ?? '—'}</div></div>
        </div>
        {invoice.lines.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">LR Lines</div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>LR No</TableHead>
                  <TableHead>LR Date</TableHead>
                  <TableHead className="text-right">Weight (kg)</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.lines.map(l => (
                  <TableRow key={l.id}>
                    <TableCell className="text-xs">{l.line_no}</TableCell>
                    <TableCell className="text-xs font-mono">{l.lr_no}</TableCell>
                    <TableCell className="text-xs">{l.lr_date ?? '—'}</TableCell>
                    <TableCell className="text-xs text-right font-mono">{l.transporter_declared_weight_kg}</TableCell>
                    <TableCell className="text-xs text-right font-mono">{fmt(l.transporter_declared_amount)}</TableCell>
                    <TableCell className="text-xs text-right font-mono">{fmt(l.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        {invoice.notes && (
          <div className="border-t pt-3">
            <div className="text-xs text-muted-foreground">Notes</div>
            <div className="text-sm">{invoice.notes}</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
