/**
 * @file     WIPReport.tsx
 * @sprint   T-Phase-1.3-3a-pre-1 · ST7b T-Phase-3.PROD-FIX-A factory filter
 */
import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useProductionOrders } from '@/hooks/useProductionOrders';
import { useProductionConfig } from '@/hooks/useProductionConfig';
import { useFactories } from '@/hooks/useFactories';

export function WIPReportPanel(): JSX.Element {
  const { orders } = useProductionOrders();
  const config = useProductionConfig();
  const { factories } = useFactories();
  const [factoryFilter, setFactoryFilter] = useState<string>('__all__');

  const wip = useMemo(() => orders.filter(o => {
    if (o.status !== 'in_progress' && o.status !== 'released') return false;
    if (factoryFilter !== '__all__' && o.production_site_id !== factoryFilter) return false;
    return true;
  }), [orders, factoryFilter]);

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

      {/* Sprint T-Phase-3.PROD-FIX-A · ST7b · factory filter */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Factory</Label>
              <Select value={factoryFilter} onValueChange={setFactoryFilter}>
                <SelectTrigger><SelectValue placeholder="All factories" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All factories</SelectItem>
                  {factories.map(f => (
                    <SelectItem key={f.id} value={f.id}>{f.code} · {f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

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
