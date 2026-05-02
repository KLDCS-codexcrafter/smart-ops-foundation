/**
 * SRMDetailPanel.tsx — Drill detail for a Supply Request Memo
 * Sprint T-Phase-1.2.6c · D-226 UTS · Q2-c hybrid stock dialog
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AuditHistoryButton } from '@/components/uth/AuditHistoryButton';
import { Badge } from '@/components/ui/badge';
import { Printer, Activity } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SRM_STATUS_LABELS, type SupplyRequestMemo } from '@/types/supply-request-memo';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import { StockMovementDialog } from './StockMovementDialog';

const fmtINR = (n: number): string =>
  `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n)}`;

interface Props { srm: SupplyRequestMemo; onPrint: () => void }

export function SRMDetailPanel({ srm, onPrint }: Props) {
  const { entityCode } = useCardEntitlement();
  const [stockItem, setStockItem] = useState<{ id: string; name: string } | null>(null);

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="font-mono">{srm.memo_no}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {srm.customer_name ?? '—'} · SO {srm.sales_order_no ?? '—'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{SRM_STATUS_LABELS[srm.status]}</Badge>
            <Button size="sm" variant="outline" onClick={onPrint} className="gap-2">
              <Printer className="h-4 w-4" /> Print
            </Button>
            <AuditHistoryButton
              recordId={srm.id}
              entityType="supply_request_memo"
              entityCode={entityCode || ''}
              currentRecord={srm as unknown as Record<string, unknown>}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div><div className="text-xs text-muted-foreground">Memo Date</div><div className="font-mono">{srm.memo_date}</div></div>
          <div><div className="text-xs text-muted-foreground">Effective</div><div className="font-mono">{srm.effective_date ?? srm.memo_date}</div></div>
          <div><div className="text-xs text-muted-foreground">Expected Dispatch</div><div className="font-mono">{srm.expected_dispatch_date ?? '—'}</div></div>
          <div><div className="text-xs text-muted-foreground">Raised By</div><div>{srm.raised_by_person_name ?? '—'}</div></div>
          <div><div className="text-xs text-muted-foreground">DM No</div><div className="font-mono">{srm.delivery_memo_no ?? '—'}</div></div>
          <div><div className="text-xs text-muted-foreground">Total</div><div className="font-mono font-semibold">{fmtINR(srm.total_amount)}</div></div>
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
              {srm.items.map(l => (
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
        {srm.special_instructions && (
          <div>
            <div className="text-xs text-muted-foreground">Special Instructions</div>
            <div className="text-sm">{srm.special_instructions}</div>
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
