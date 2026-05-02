/**
 * DOMDetailPanel.tsx — Drill detail for a Demo Outward Memo
 * Sprint T-Phase-1.2.6c · D-226 UTS · Q2-c hybrid stock dialog
 *
 * Includes prominent "Mark Returned" action when status === 'dispatched'
 * (or 'demo_active'). Persists status flip via localStorage update.
 * [JWT] PATCH /api/salesx/demo-outward-memos/:id { status: 'returned', returned_at }
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Printer, Activity, CheckCircle2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DOM_STATUS_LABELS, demoOutwardMemosKey, type DemoOutwardMemo,
} from '@/types/demo-outward-memo';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import { StockMovementDialog } from './StockMovementDialog';
import { toast } from 'sonner';

const fmtINR = (n: number): string =>
  `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n)}`;

interface Props { dom: DemoOutwardMemo; onPrint: () => void }

export function DOMDetailPanel({ dom, onPrint }: Props) {
  const { entityCode } = useCardEntitlement();
  const safeEntity = entityCode || 'SMRT';
  const [stockItem, setStockItem] = useState<{ id: string; name: string } | null>(null);
  const [localStatus, setLocalStatus] = useState(dom.status);
  const total = dom.items.reduce((s, l) => s + l.amount, 0);

  const canMarkReturned = localStatus === 'dispatched' || localStatus === 'demo_active';
  const isOverdue = !!(dom.demo_end_date && dom.demo_end_date < new Date().toISOString().slice(0, 10)
    && (localStatus === 'dispatched' || localStatus === 'demo_active'));

  const markReturned = () => {
    try {
      // [JWT] PATCH /api/salesx/demo-outward-memos/:id
      const key = demoOutwardMemosKey(safeEntity);
      const list = JSON.parse(localStorage.getItem(key) || '[]') as DemoOutwardMemo[];
      const next = list.map(d => d.id === dom.id
        ? { ...d, status: 'returned' as const, returned_at: new Date().toISOString(),
            return_condition: d.return_condition ?? 'good', updated_at: new Date().toISOString() }
        : d);
      localStorage.setItem(key, JSON.stringify(next));
      setLocalStatus('returned');
      toast.success(`${dom.memo_no} marked returned`);
    } catch {
      toast.error('Failed to update memo');
    }
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="font-mono">{dom.memo_no}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {dom.recipient_name} · {dom.demo_period_days} days
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className={isOverdue ? 'bg-destructive/15 text-destructive border-destructive/30' : ''}>
              {isOverdue ? 'Overdue' : DOM_STATUS_LABELS[localStatus]}
            </Badge>
            {canMarkReturned && (
              <Button size="sm" onClick={markReturned} className="gap-2 bg-success hover:bg-success/90">
                <CheckCircle2 className="h-4 w-4" /> Mark Returned
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={onPrint} className="gap-2">
              <Printer className="h-4 w-4" /> Print
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div><div className="text-xs text-muted-foreground">Memo Date</div><div className="font-mono">{dom.memo_date}</div></div>
          <div><div className="text-xs text-muted-foreground">Effective</div><div className="font-mono">{dom.effective_date ?? dom.memo_date}</div></div>
          <div><div className="text-xs text-muted-foreground">Demo Start</div><div className="font-mono">{dom.demo_start_date ?? '—'}</div></div>
          <div>
            <div className="text-xs text-muted-foreground">Demo End / Return Due</div>
            <div className={`font-mono ${isOverdue ? 'text-destructive font-semibold' : ''}`}>
              {dom.demo_end_date ?? '—'}
            </div>
          </div>
          <div><div className="text-xs text-muted-foreground">Salesman</div><div>{dom.salesman_name ?? '—'}</div></div>
          <div><div className="text-xs text-muted-foreground">Engineer</div><div>{dom.engineer_name ?? '—'}</div></div>
          <div><div className="text-xs text-muted-foreground">Outward Godown</div><div>{dom.outward_godown_name ?? '—'}</div></div>
          <div><div className="text-xs text-muted-foreground">Total Value</div><div className="font-mono font-semibold">{fmtINR(total)}</div></div>
        </div>
        <div>
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Line Items</div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Serial</TableHead>
                <TableHead>UOM</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Unit Value ₹</TableHead>
                <TableHead className="text-right">Amount ₹</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {dom.items.map(l => (
                <TableRow key={l.id}>
                  <TableCell className="text-xs">{l.item_name}</TableCell>
                  <TableCell className="text-xs font-mono">{l.serial_no ?? '—'}</TableCell>
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
