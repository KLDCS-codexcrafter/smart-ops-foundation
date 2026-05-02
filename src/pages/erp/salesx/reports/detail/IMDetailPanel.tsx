/**
 * IMDetailPanel.tsx — Drill detail for an Invoice Memo
 * Sprint T-Phase-1.2.6c · D-226 UTS · Q2-c hybrid stock dialog
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AuditHistoryButton } from '@/components/uth/AuditHistoryButton';
import { Badge } from '@/components/ui/badge';
import { Printer, Activity } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { IM_STATUS_LABELS, type InvoiceMemo } from '@/types/invoice-memo';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import { StockMovementDialog } from './StockMovementDialog';

const fmtINR = (n: number): string =>
  `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n)}`;

interface Props { im: InvoiceMemo; onPrint: () => void }

export function IMDetailPanel({ im, onPrint }: Props) {
  const { entityCode } = useCardEntitlement();
  const [stockItem, setStockItem] = useState<{ id: string; name: string } | null>(null);

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="font-mono">{im.memo_no}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{im.customer_name ?? '—'}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{IM_STATUS_LABELS[im.status]}</Badge>
            <Button size="sm" variant="outline" onClick={onPrint} className="gap-2">
              <Printer className="h-4 w-4" /> Print
            </Button>
            <AuditHistoryButton
              recordId={im.id}
              entityType="invoice_memo"
              entityCode={entityCode || ''}
              currentRecord={im as unknown as Record<string, unknown>}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div><div className="text-xs text-muted-foreground">Memo Date</div><div className="font-mono">{im.memo_date}</div></div>
          <div><div className="text-xs text-muted-foreground">Effective</div><div className="font-mono">{im.effective_date ?? im.memo_date}</div></div>
          <div><div className="text-xs text-muted-foreground">SO No</div><div className="font-mono">{im.sales_order_no ?? '—'}</div></div>
          <div><div className="text-xs text-muted-foreground">DM No</div><div className="font-mono">{im.delivery_memo_no ?? '—'}</div></div>
          <div><div className="text-xs text-muted-foreground">SRM No</div><div className="font-mono">{im.supply_request_memo_no ?? '—'}</div></div>
          <div><div className="text-xs text-muted-foreground">Place of Supply</div><div>{im.place_of_supply ?? '—'}</div></div>
          <div><div className="text-xs text-muted-foreground">Sub-total</div><div className="font-mono">{fmtINR(im.sub_total)}</div></div>
          <div><div className="text-xs text-muted-foreground">Total</div><div className="font-mono font-semibold">{fmtINR(im.total_amount)}</div></div>
          <div><div className="text-xs text-muted-foreground">Invoice No</div><div className="font-mono">{im.invoice_voucher_no ?? '—'}</div></div>
        </div>
        <div>
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Line Items</div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>UOM</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Rate ₹</TableHead>
                <TableHead className="text-right">Tax %</TableHead>
                <TableHead className="text-right">Amount ₹</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {im.items.map(l => (
                <TableRow key={l.id}>
                  <TableCell className="text-xs">{l.item_name}</TableCell>
                  <TableCell className="text-xs">{l.uom ?? '—'}</TableCell>
                  <TableCell className="text-right text-xs font-mono">{l.qty}</TableCell>
                  <TableCell className="text-right text-xs font-mono">{fmtINR(l.rate)}</TableCell>
                  <TableCell className="text-right text-xs font-mono">{l.tax_pct}</TableCell>
                  <TableCell className="text-right text-xs font-mono">{fmtINR(l.amount)}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs"
                      onClick={() => setStockItem({ id: l.id, name: l.item_name })}>
                      <Activity className="h-3 w-3" /> View Stock
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {im.narration && (
          <div>
            <div className="text-xs text-muted-foreground">Narration</div>
            <div className="text-sm">{im.narration}</div>
          </div>
        )}
      </CardContent>
      <StockMovementDialog
        open={!!stockItem}
        onOpenChange={o => { if (!o) setStockItem(null); }}
        entityCode={entityCode || ''}
        itemId={stockItem?.id ?? null}
        itemName={stockItem?.name ?? null}
      />
    </Card>
  );
}
