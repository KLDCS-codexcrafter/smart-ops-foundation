/**
 * PurchaseOrderDetailPanel.tsx — UPRA-4 Phase B · NEW
 */
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Printer } from 'lucide-react';
import type { Order } from '@/types/order';

const dash = (v: string | undefined | null): string => v && v.length > 0 ? v : '—';
const inr = (n: number): string =>
  `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const STATUS_LABELS: Record<Order['status'], string> = {
  open: 'Open', partial: 'Partial', closed: 'Closed', preclosed: 'Pre-Closed', cancelled: 'Cancelled',
};
const STATUS_COLORS: Record<Order['status'], string> = {
  open: 'bg-primary/10 text-primary',
  partial: 'bg-warning/10 text-warning',
  closed: 'bg-success/10 text-success',
  preclosed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-destructive/10 text-destructive',
};
const LINE_STATUS_LABELS: Record<NonNullable<Order['lines'][number]['status']>, string> = {
  open: 'Open', partial: 'Partial', closed: 'Closed', preclosed: 'Pre-Closed',
};

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-sm">{value}</div>
    </div>
  );
}

export interface PurchaseOrderDetailPanelProps {
  order: Order;
  onPrint: () => void;
}

export function PurchaseOrderDetailPanel({ order, onPrint }: PurchaseOrderDetailPanelProps): JSX.Element {
  const sumQty = order.lines.reduce((a, l) => a + l.qty, 0);
  const sumTaxable = order.lines.reduce((a, l) => a + l.taxable_value, 0);
  const sumPending = order.lines.reduce((a, l) => a + l.pending_qty, 0);
  const sumFulfilled = order.lines.reduce((a, l) => a + l.fulfilled_qty, 0);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-lg font-mono">{order.order_no}</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                {order.party_name} · {order.party_gstin ?? 'Unregistered'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={STATUS_COLORS[order.status]}>{STATUS_LABELS[order.status]}</Badge>
              <Button size="sm" variant="outline" onClick={onPrint}>
                <Printer className="h-3.5 w-3.5 mr-1" /> Print
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Basic</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Field label="Date" value={order.date} />
          <Field label="Valid Till" value={dash(order.valid_till)} />
          <Field label="Indent/RFQ Ref" value={`${dash(order.ref_no)}${order.ref_date ? ` (${order.ref_date})` : ''}`} />
          {order.quotation_no && <Field label="Quotation Ref" value={order.quotation_no} />}
          {order.project_no && <Field label="Project" value={order.project_no} />}
          <Field label="Place of Supply" value={dash(order.place_of_supply)} />
          <Field label="Inter-state" value={<Badge variant="outline">{order.is_inter_state ? 'Yes' : 'No'}</Badge>} />
          <Field label="FY" value={dash(order.fiscal_year_id)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Amounts</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-3 gap-3">
          <Field label="Gross" value={<span className="font-mono">{inr(order.gross_amount)}</span>} />
          <Field label="Tax" value={<span className="font-mono">{inr(order.total_tax)}</span>} />
          <Field label="Net" value={<span className="font-mono font-bold">{inr(order.net_amount)}</span>} />
        </CardContent>
      </Card>

      {order.preclose_reason && (
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Pre-Close Reason</CardTitle></CardHeader>
          <CardContent className="text-sm whitespace-pre-wrap">{order.preclose_reason}</CardContent></Card>
      )}
      {order.cancel_reason && (
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-destructive">Cancellation Reason</CardTitle></CardHeader>
          <CardContent className="text-sm whitespace-pre-wrap">{order.cancel_reason}</CardContent></Card>
      )}

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Lines</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="text-xs">
                <TableHead>Item</TableHead>
                <TableHead>HSN/SAC</TableHead>
                <TableHead>UoM</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead className="text-right">Disc%</TableHead>
                <TableHead className="text-right">Taxable</TableHead>
                <TableHead className="text-right">GST%</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Pending</TableHead>
                <TableHead className="text-right">Fulfilled</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.lines.map(l => (
                <TableRow key={l.id} className="text-xs">
                  <TableCell>{l.item_code} · {l.item_name}</TableCell>
                  <TableCell className="font-mono">{l.hsn_sac_code}</TableCell>
                  <TableCell>{l.uom}</TableCell>
                  <TableCell className="text-right font-mono">{l.qty}</TableCell>
                  <TableCell className="text-right font-mono">{inr(l.rate)}</TableCell>
                  <TableCell className="text-right font-mono">{l.discount_percent}%</TableCell>
                  <TableCell className="text-right font-mono">{inr(l.taxable_value)}</TableCell>
                  <TableCell className="text-right font-mono">{l.gst_rate}%</TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{LINE_STATUS_LABELS[l.status]}</Badge></TableCell>
                  <TableCell className="text-right font-mono">{l.pending_qty}</TableCell>
                  <TableCell className="text-right font-mono">{l.fulfilled_qty}</TableCell>
                </TableRow>
              ))}
              <TableRow className="text-xs font-bold border-t-2">
                <TableCell colSpan={3}>Totals</TableCell>
                <TableCell className="text-right font-mono">{sumQty}</TableCell>
                <TableCell colSpan={2} />
                <TableCell className="text-right font-mono">{inr(sumTaxable)}</TableCell>
                <TableCell colSpan={2} />
                <TableCell className="text-right font-mono">{sumPending}</TableCell>
                <TableCell className="text-right font-mono">{sumFulfilled}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {order.narration && (
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Narration</CardTitle></CardHeader>
          <CardContent className="text-sm whitespace-pre-wrap">{order.narration}</CardContent></Card>
      )}
      {order.terms_conditions && (
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Terms &amp; Conditions</CardTitle></CardHeader>
          <CardContent className="text-sm whitespace-pre-wrap">{order.terms_conditions}</CardContent></Card>
      )}
    </div>
  );
}
