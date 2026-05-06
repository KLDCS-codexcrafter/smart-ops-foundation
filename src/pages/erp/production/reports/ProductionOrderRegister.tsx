/**
 * @file     ProductionOrderRegister.tsx
 * @sprint   T-Phase-1.3-3a-pre-1
 */
import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useProductionOrders } from '@/hooks/useProductionOrders';
import {
  PRODUCTION_ORDER_STATUS_LABELS,
  PRODUCTION_ORDER_STATUS_COLORS,
  type ProductionOrderStatus,
} from '@/types/production-order';

export function ProductionOrderRegisterPanel(): JSX.Element {
  const { orders } = useProductionOrders();
  const [tab, setTab] = useState<'all' | ProductionOrderStatus>('all');

  const filtered = useMemo(
    () => (tab === 'all' ? orders : orders.filter(o => o.status === tab)),
    [orders, tab],
  );

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Production Order Register</h1>
      <Tabs value={tab} onValueChange={v => setTab(v as 'all' | ProductionOrderStatus)}>
        <TabsList>
          <TabsTrigger value="all">All ({orders.length})</TabsTrigger>
          <TabsTrigger value="draft">Draft</TabsTrigger>
          <TabsTrigger value="released">Released</TabsTrigger>
          <TabsTrigger value="in_progress">In Progress</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
        </TabsList>
        <TabsContent value={tab}>
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr className="text-left">
                    <th className="p-2">Doc No</th>
                    <th className="p-2">Output Item</th>
                    <th className="p-2 text-right">Planned Qty</th>
                    <th className="p-2">Status</th>
                    <th className="p-2">Customer/Project</th>
                    <th className="p-2 text-right">Master Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No production orders</td></tr>
                  ) : filtered.map(po => (
                    <tr key={po.id} className="border-t">
                      <td className="p-2 font-mono">{po.doc_no}</td>
                      <td className="p-2">{po.output_item_name}</td>
                      <td className="p-2 text-right font-mono">{po.planned_qty} {po.uom}</td>
                      <td className="p-2">
                        <Badge variant="outline" className={PRODUCTION_ORDER_STATUS_COLORS[po.status]}>
                          {PRODUCTION_ORDER_STATUS_LABELS[po.status]}
                        </Badge>
                      </td>
                      <td className="p-2 text-xs">{po.customer_name || po.project_id || '—'}</td>
                      <td className="p-2 text-right font-mono">₹{po.cost_structure.master.total.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default ProductionOrderRegisterPanel;
