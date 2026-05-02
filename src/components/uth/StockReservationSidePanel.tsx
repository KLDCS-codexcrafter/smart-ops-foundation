/**
 * StockReservationSidePanel — Sprint T-Phase-2.7-d-1 · Q1-d
 * Collapsible side panel with full stock breakdown for the current line items.
 * Red items pinned to top. Items not in master shown with gray tag.
 */
import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Package } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useDetailedStockAvailability } from '@/hooks/useStockAvailability';
import { cn } from '@/lib/utils';

interface Props {
  entityCode: string;
  itemRequestQtys: Array<{ item_name: string; qty: number }>;
  className?: string;
}

function fmt(n: number): string {
  return Number.isFinite(n) ? n.toFixed(1) : '0.0';
}

export function StockReservationSidePanel({ entityCode, itemRequestQtys, className }: Props) {
  const [open, setOpen] = useState(false);

  const requestedQtyByItem = useMemo(() => {
    const m = new Map<string, number>();
    for (const it of itemRequestQtys) {
      const name = (it.item_name ?? '').trim();
      if (!name) continue;
      m.set(name, (m.get(name) ?? 0) + (Number(it.qty) || 0));
    }
    return m;
  }, [itemRequestQtys]);

  const itemNames = useMemo(() => Array.from(requestedQtyByItem.keys()), [requestedQtyByItem]);
  const { availabilityMap } = useDetailedStockAvailability(entityCode, itemNames, requestedQtyByItem);

  const rows = useMemo(() => {
    const list = itemNames.map(name => {
      const cell = availabilityMap.get(name) ?? null;
      const requested = requestedQtyByItem.get(name) ?? 0;
      const inMaster = cell !== null && (cell.onHand > 0 || cell.totalReserved > 0 || requested > 0);
      return { name, cell, requested, inMaster };
    });
    // Sort: red first, then amber, then green/unknown
    const rank = (s: 'red' | 'amber' | 'green' | undefined) =>
      s === 'red' ? 0 : s === 'amber' ? 1 : 2;
    return list.sort((a, b) => rank(a.cell?.status) - rank(b.cell?.status));
  }, [itemNames, availabilityMap, requestedQtyByItem]);

  const redCount = rows.filter(r => r.cell?.status === 'red').length;

  if (rows.length === 0) return null;

  return (
    <div className={cn('rounded-lg border bg-card', className)}>
      <Button
        type="button"
        variant="ghost"
        onClick={() => setOpen(o => !o)}
        className="w-full justify-between px-3 py-2 h-auto"
      >
        <span className="flex items-center gap-2 text-sm font-medium">
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <Package className="h-4 w-4" />
          Stock Status ({rows.length} {rows.length === 1 ? 'item' : 'items'})
        </span>
        {redCount > 0 && (
          <Badge variant="destructive" className="font-mono text-xs">
            {redCount} short
          </Badge>
        )}
      </Button>
      {open && (
        <div className="max-h-72 overflow-y-auto border-t">
          <table className="w-full text-xs">
            <thead className="bg-muted/40 sticky top-0">
              <tr className="text-left text-muted-foreground">
                <th className="px-3 py-1.5 font-medium">Item</th>
                <th className="px-2 py-1.5 font-medium text-right font-mono">On hand</th>
                <th className="px-2 py-1.5 font-medium text-right font-mono">Quote</th>
                <th className="px-2 py-1.5 font-medium text-right font-mono">Order</th>
                <th className="px-2 py-1.5 font-medium text-right font-mono">Avail</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ name, cell, inMaster }) => (
                <tr
                  key={name}
                  className={cn(
                    'border-t',
                    cell?.status === 'red' && 'border-l-2 border-l-destructive bg-destructive/5',
                  )}
                >
                  <td className="px-3 py-1.5">
                    <span className="font-medium">{name}</span>
                    {!inMaster && (
                      <Badge variant="secondary" className="ml-2 text-[10px]">
                        Not in master
                      </Badge>
                    )}
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono">{fmt(cell?.onHand ?? 0)}</td>
                  <td className="px-2 py-1.5 text-right font-mono">{fmt(cell?.reservedByQuotes ?? 0)}</td>
                  <td className="px-2 py-1.5 text-right font-mono">{fmt(cell?.reservedByOrders ?? 0)}</td>
                  <td
                    className={cn(
                      'px-2 py-1.5 text-right font-mono font-semibold',
                      cell?.status === 'red' && 'text-destructive',
                      cell?.status === 'amber' && 'text-warning',
                      cell?.status === 'green' && 'text-success',
                    )}
                  >
                    {fmt(cell?.available ?? 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
