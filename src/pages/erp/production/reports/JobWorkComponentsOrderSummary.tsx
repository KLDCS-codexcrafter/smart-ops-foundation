/**
 * @file        JobWorkComponentsOrderSummary.tsx
 * @sprint      T-Phase-1.A.2.c-Job-Work-Tally-Parity
 * @decisions   D-NEW-X
 */
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Layers } from 'lucide-react';
import { useJobWorkOutOrders } from '@/hooks/useJobWorkOutOrders';
import { useEntityCode } from '@/hooks/useEntityCode';
import { round2 } from '@/lib/decimal-helpers';

export function JobWorkComponentsOrderSummaryPanel(): JSX.Element {
  const { entityCode } = useEntityCode();
  const { jwos } = useJobWorkOutOrders(entityCode);

  const rows = useMemo(() => {
    const map = new Map<string, {
      key: string; vendor: string; component: string;
      required: number; sent: number; received: number;
    }>();
    for (const j of jwos) {
      for (const l of j.lines) {
        if (!l.track_components || !l.component_allocations) continue;
        for (const c of l.component_allocations) {
          const key = `${j.vendor_id}|${c.component_item_id}`;
          const r = map.get(key) ?? {
            key, vendor: j.vendor_name, component: c.component_item_name,
            required: 0, sent: 0, received: 0,
          };
          r.required += c.component_qty_required;
          r.sent += c.component_qty_sent;
          r.received += c.component_qty_received;
          map.set(key, r);
        }
      }
    }
    return Array.from(map.values());
  }, [jwos]);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-2"><Layers className="h-5 w-5 text-primary" /><h1 className="text-2xl font-bold">Components Order Summary</h1></div>
      <Card>
        <CardHeader><CardTitle className="text-sm">Per-Component Tracking</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Vendor</TableHead><TableHead>Component</TableHead>
              <TableHead className="text-right">Required</TableHead><TableHead className="text-right">Sent</TableHead>
              <TableHead className="text-right">Received</TableHead><TableHead className="text-right">Pending</TableHead>
              <TableHead className="text-right">% Complete</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No JWO lines have track_components enabled
                </TableCell></TableRow>
              ) : rows.map(r => {
                const pending = r.required - r.received;
                const pct = r.required > 0 ? round2((r.received / r.required) * 100) : 0;
                return (
                  <TableRow key={r.key}>
                    <TableCell>{r.vendor}</TableCell>
                    <TableCell>{r.component}</TableCell>
                    <TableCell className="text-right font-mono">{r.required}</TableCell>
                    <TableCell className="text-right font-mono">{r.sent}</TableCell>
                    <TableCell className="text-right font-mono">{r.received}</TableCell>
                    <TableCell className="text-right font-mono text-amber-600">{pending}</TableCell>
                    <TableCell className="text-right font-mono">{pct}%</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export default JobWorkComponentsOrderSummaryPanel;
