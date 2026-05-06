/**
 * @file     WIPReport.tsx
 * @sprint   T-Phase-1.3-3a-pre-1
 */
import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useProductionOrders } from '@/hooks/useProductionOrders';
import { useProductionConfig } from '@/hooks/useProductionConfig';

export function WIPReportPanel(): JSX.Element {
  const { orders } = useProductionOrders();
  const config = useProductionConfig();

  const wip = useMemo(() => orders.filter(o => o.status === 'in_progress' || o.status === 'released'), [orders]);

  const ageDays = (po: typeof wip[number]): number => {
    const released = po.status_history.find(s => s.to_status === 'released');
    if (!released) return 0;
    return Math.floor((Date.now() - new Date(released.changed_at).getTime()) / 86400000);
  };

  const tone = (days: number): string => {
    if (days >= config.leakAgingThresholdDays * 2) return 'text-destructive';
    if (days >= config.leakAgingThresholdDays) return 'text-warning';
    return 'text-muted-foreground';
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">WIP Report</h1>
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr className="text-left">
                <th className="p-2">Doc No</th>
                <th className="p-2">Output Item</th>
                <th className="p-2 text-right">Planned</th>
                <th className="p-2">Status</th>
                <th className="p-2 text-right">Age (days)</th>
              </tr>
            </thead>
            <tbody>
              {wip.length === 0 ? (
                <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No WIP orders</td></tr>
              ) : wip.map(po => {
                const days = ageDays(po);
                return (
                  <tr key={po.id} className="border-t">
                    <td className="p-2 font-mono">{po.doc_no}</td>
                    <td className="p-2">{po.output_item_name}</td>
                    <td className="p-2 text-right font-mono">{po.planned_qty} {po.uom}</td>
                    <td className="p-2 text-xs">{po.status}</td>
                    <td className={`p-2 text-right font-mono ${tone(days)}`}>{days}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

export default WIPReportPanel;
