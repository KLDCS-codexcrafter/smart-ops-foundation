/**
 * DeliveryMemoDetailPanel.tsx — DM drill detail.
 * Sprint T-Phase-1.2.6d.
 *
 * Reuses the SalesX StockMovementDialog (Q2-c hybrid) — no duplication.
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AuditHistoryButton } from '@/components/uth/AuditHistoryButton';
import { Badge } from '@/components/ui/badge';
import { Printer, Activity } from 'lucide-react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  DM_STATUS_LABELS, type DeliveryMemo,
} from '@/types/delivery-memo';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import { StockMovementDialog } from '@/pages/erp/salesx/reports/detail/StockMovementDialog';

const fmtINR = (n: number): string =>
  `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n)}`;

interface Props { dm: DeliveryMemo; onPrint: () => void }

export function DeliveryMemoDetailPanel({ dm, onPrint }: Props) {
  const { entityCode } = useCardEntitlement();
  const [stockItem, setStockItem] = useState<{ id: string; name: string } | null>(null);

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="font-mono">{dm.memo_no}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {dm.customer_name ?? '—'} · SRM {dm.supply_request_memo_no ?? '—'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{DM_STATUS_LABELS[dm.status]}</Badge>
            <Button size="sm" variant="outline" onClick={onPrint} className="gap-2">
              <Printer className="h-4 w-4" /> Print
            </Button>
            <AuditHistoryButton
              recordId={dm.id}
              entityType="voucher"
              entityCode={entityCode || ''}
              currentRecord={dm as unknown as Record<string, unknown>}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div><div className="text-xs text-muted-foreground">Memo Date</div><div className="font-mono">{dm.memo_date}</div></div>
          <div><div className="text-xs text-muted-foreground">Effective</div><div className="font-mono">{dm.effective_date ?? dm.memo_date}</div></div>
          <div><div className="text-xs text-muted-foreground">Transporter</div><div>{dm.transporter_name ?? '—'}</div></div>
          <div><div className="text-xs text-muted-foreground">Vehicle</div><div className="font-mono">{dm.vehicle_no ?? '—'}</div></div>
          <div><div className="text-xs text-muted-foreground">LR No</div><div className="font-mono">{dm.lr_no ?? '—'}</div></div>
          <div><div className="text-xs text-muted-foreground">LR Date</div><div className="font-mono">{dm.lr_date ?? '—'}</div></div>
          <div><div className="text-xs text-muted-foreground">Expected Delivery</div><div className="font-mono">{dm.expected_delivery_date ?? '—'}</div></div>
          <div><div className="text-xs text-muted-foreground">Total</div><div className="font-mono font-semibold">{fmtINR(dm.total_amount)}</div></div>
        </div>

        <div>
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Line Items</div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>UOM</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Amount ₹</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {dm.items.map(l => (
                <TableRow key={l.id}>
                  <TableCell className="text-xs">{l.item_name}</TableCell>
                  <TableCell className="text-xs">{l.uom ?? '—'}</TableCell>
                  <TableCell className="text-right text-xs font-mono">{l.qty}</TableCell>
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

        {dm.delivery_address && (
          <div>
            <div className="text-xs text-muted-foreground">Delivery Address</div>
            <div className="text-sm">{dm.delivery_address}</div>
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
