/**
 * StockMovementDialog.tsx — Q2-c hybrid inline drill (Sprint T-Phase-1.2.6c)
 *
 * Renders a modal showing recent ItemMovementEvent rows for a given item.
 * Used by Quotation / SRM / IM / SOM / DOM detail panels — line items expose
 * a "View Stock" action that opens this dialog. NO cross-card routing in
 * Phase 1 (Q2-c lock); the dialog stays inside the SalesX panel.
 */

import { useMemo } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { getItemMovementHistory, type ItemMovementEvent } from '@/lib/item-movement-engine';

const fmtINR = (n: number): string =>
  `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n)}`;

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  entityCode: string;
  itemId: string | null;
  itemName: string | null;
}

const TONE: Record<ItemMovementEvent['event_type'], string> = {
  grn_inward:             'bg-success/15 text-success border-success/30',
  min_outward:            'bg-warning/15 text-warning border-warning/30',
  consumption:            'bg-destructive/15 text-destructive border-destructive/30',
  cycle_count_adjustment: 'bg-muted text-muted-foreground border-border',
  stock_transfer:         'bg-primary/15 text-primary border-primary/30',
  rtv:                    'bg-warning/15 text-warning border-warning/30',
  sample_outward:         'bg-primary/10 text-primary border-primary/20',
  demo_outward:           'bg-primary/10 text-primary border-primary/20',
};

export function StockMovementDialog({ open, onOpenChange, entityCode, itemId, itemName }: Props) {
  const history = useMemo(() => {
    if (!itemId || !entityCode) return null;
    // Wide window: last ~3 years to today.
    const today = new Date();
    const from = new Date(today);
    from.setFullYear(today.getFullYear() - 3);
    const fromIso = from.toISOString().slice(0, 10);
    const toIso = today.toISOString().slice(0, 10);
    try {
      return getItemMovementHistory(itemId, entityCode, fromIso, toIso);
    } catch {
      return null;
    }
  }, [itemId, entityCode]);

  const events = (history?.events ?? []).slice().reverse().slice(0, 25);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Recent Stock Movement{itemName ? ` · ${itemName}` : ''}
          </DialogTitle>
        </DialogHeader>
        {events.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            No stock movement events found for this item.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Voucher</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Value ₹</TableHead>
                <TableHead>Party</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map(e => (
                <TableRow key={e.event_id}>
                  <TableCell className="text-xs font-mono">{e.event_date.slice(0, 10)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-[10px] ${TONE[e.event_type]}`}>
                      {e.event_type.replace(/_/g, ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs font-mono">{e.source_voucher_no}</TableCell>
                  <TableCell className="text-right text-xs font-mono">{e.qty_change}</TableCell>
                  <TableCell className="text-right text-xs font-mono">{fmtINR(e.value_change)}</TableCell>
                  <TableCell className="text-xs">{e.party_name ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
}
