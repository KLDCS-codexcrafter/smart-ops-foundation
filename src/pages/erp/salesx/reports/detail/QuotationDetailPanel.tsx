/**
 * QuotationDetailPanel.tsx — Drill detail with Q2-c hybrid stock dialog
 * Sprint T-Phase-1.2.6c · D-226 UTS
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AuditHistoryButton } from '@/components/uth/AuditHistoryButton';
import { Badge } from '@/components/ui/badge';
import { Printer, Activity } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { QUOTATION_STAGE_LABELS, QUOTATION_STAGE_COLOURS, type Quotation } from '@/types/quotation';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import { StockMovementDialog } from './StockMovementDialog';

const fmtINR = (n: number): string =>
  `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n)}`;

interface Props { quotation: Quotation; onPrint: () => void }

export function QuotationDetailPanel({ quotation: q, onPrint }: Props) {
  const { entityCode } = useCardEntitlement();
  const [stockItem, setStockItem] = useState<{ id: string; name: string } | null>(null);

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="font-mono">{q.quotation_no}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{q.customer_name ?? '—'}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={QUOTATION_STAGE_COLOURS[q.quotation_stage]}>
              {QUOTATION_STAGE_LABELS[q.quotation_stage]}
            </Badge>
            <Button size="sm" variant="outline" onClick={onPrint} className="gap-2">
              <Printer className="h-4 w-4" /> Print
            </Button>
            <AuditHistoryButton
              recordId={q.id}
              entityType="voucher"
              entityCode={entityCode || ''}
              currentRecord={q as unknown as Record<string, unknown>}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div><div className="text-xs text-muted-foreground">Quotation Date</div><div className="font-mono">{q.quotation_date}</div></div>
          <div><div className="text-xs text-muted-foreground">Effective</div><div className="font-mono">{q.effective_date ?? q.quotation_date}</div></div>
          <div><div className="text-xs text-muted-foreground">Valid Until</div><div className="font-mono">{q.valid_until_date ?? '—'}</div></div>
          <div><div className="text-xs text-muted-foreground">Revision</div><div className="font-mono">{q.revision_number}</div></div>
          <div><div className="text-xs text-muted-foreground">Sub-total</div><div className="font-mono">{fmtINR(q.sub_total)}</div></div>
          <div><div className="text-xs text-muted-foreground">Tax</div><div className="font-mono">{fmtINR(q.tax_amount)}</div></div>
          <div><div className="text-xs text-muted-foreground">Total</div><div className="font-mono font-semibold">{fmtINR(q.total_amount)}</div></div>
          <div><div className="text-xs text-muted-foreground">SO No</div><div className="font-mono">{q.so_no ?? '—'}</div></div>
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
                <TableHead className="text-right">Amount ₹</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {q.items.map(l => (
                <TableRow key={l.id}>
                  <TableCell className="text-xs">{l.item_name}</TableCell>
                  <TableCell className="text-xs">{l.uom ?? '—'}</TableCell>
                  <TableCell className="text-right text-xs font-mono">{l.qty}</TableCell>
                  <TableCell className="text-right text-xs font-mono">{fmtINR(l.rate)}</TableCell>
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
        {q.notes && (
          <div>
            <div className="text-xs text-muted-foreground">Notes</div>
            <div className="text-sm">{q.notes}</div>
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
