/**
 * SOMDetailPanel.tsx — Drill detail for a Sample Outward Memo
 * Sprint T-Phase-1.2.6c · D-226 UTS · Q2-c hybrid stock dialog
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Printer, Activity } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  SOM_PURPOSE_LABELS, SOM_STATUS_LABELS, type SampleOutwardMemo,
} from '@/types/sample-outward-memo';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import { StockMovementDialog } from './StockMovementDialog';

const fmtINR = (n: number): string =>
  `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n)}`;

interface Props { som: SampleOutwardMemo; onPrint: () => void }

export function SOMDetailPanel({ som, onPrint }: Props) {
  const { entityCode } = useCardEntitlement();
  const [stockItem, setStockItem] = useState<{ id: string; name: string } | null>(null);

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="font-mono">{som.memo_no}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {som.recipient_name} · {SOM_PURPOSE_LABELS[som.purpose]}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{SOM_STATUS_LABELS[som.status]}</Badge>
            <Badge variant="outline" className={
              som.is_refundable
                ? 'bg-primary/10 text-primary border-primary/30'
                : 'bg-warning/10 text-warning border-warning/30'
            }>
              {som.is_refundable ? 'Refundable' : 'Non-refundable'}
            </Badge>
            <Button size="sm" variant="outline" onClick={onPrint} className="gap-2">
              <Printer className="h-4 w-4" /> Print
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div><div className="text-xs text-muted-foreground">Memo Date</div><div className="font-mono">{som.memo_date}</div></div>
          <div><div className="text-xs text-muted-foreground">Effective</div><div className="font-mono">{som.effective_date ?? som.memo_date}</div></div>
          <div><div className="text-xs text-muted-foreground">Salesman</div><div>{som.salesman_name ?? '—'}</div></div>
          <div><div className="text-xs text-muted-foreground">Customer</div><div>{som.customer_name ?? '—'}</div></div>
          <div><div className="text-xs text-muted-foreground">Outward Godown</div><div>{som.outward_godown_name ?? '—'}</div></div>
          <div><div className="text-xs text-muted-foreground">Return Due</div><div className="font-mono">{som.return_due_date ?? '—'}</div></div>
          <div><div className="text-xs text-muted-foreground">Total Value</div><div className="font-mono font-semibold">{fmtINR(som.total_value)}</div></div>
          <div><div className="text-xs text-muted-foreground">Issued by Dispatch</div><div>{som.issued_by_dispatch ? 'Yes' : 'No'}</div></div>
        </div>
        <div>
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Line Items</div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>UOM</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Unit Value ₹</TableHead>
                <TableHead className="text-right">Amount ₹</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {som.items.map(l => (
                <TableRow key={l.id}>
                  <TableCell className="text-xs">{l.item_name}</TableCell>
                  <TableCell className="text-xs">{l.uom ?? '—'}</TableCell>
                  <TableCell className="text-right text-xs font-mono">{l.qty}</TableCell>
                  <TableCell className="text-right text-xs font-mono">{fmtINR(l.unit_value)}</TableCell>
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
