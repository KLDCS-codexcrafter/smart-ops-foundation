/**
 * @file     ProductionOrderRegister.tsx
 * @sprint   T-Phase-1.3-3a-pre-3 · Block G · Q19=b PO closure UI
 */
import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Lock } from 'lucide-react';
import { toast } from 'sonner';
import { useProductionOrders } from '@/hooks/useProductionOrders';
import { useProductionConfig } from '@/hooks/useProductionConfig';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { closeProductionOrder } from '@/lib/production-engine';
import {
  PRODUCTION_ORDER_STATUS_LABELS,
  PRODUCTION_ORDER_STATUS_COLORS,
  type ProductionOrder,
  type ProductionOrderStatus,
} from '@/types/production-order';

export function ProductionOrderRegisterPanel(): JSX.Element {
  const { orders, reload } = useProductionOrders();
  const config = useProductionConfig();
  const user = useCurrentUser();
  const [tab, setTab] = useState<'all' | ProductionOrderStatus>('all');
  const [closeTarget, setCloseTarget] = useState<ProductionOrder | null>(null);
  const [closureRemarks, setClosureRemarks] = useState('');
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(
    () => (tab === 'all' ? orders : orders.filter(o => o.status === tab)),
    [orders, tab],
  );

  const handleClose = (): void => {
    if (!closeTarget || !user) return;
    if (closureRemarks.trim().length < 5) {
      toast.error('Closure remarks required (min 5 chars)');
      return;
    }
    setBusy(true);
    try {
      closeProductionOrder({
        po: closeTarget,
        closureRemarks: closureRemarks.trim(),
        closer: { id: user.id, name: user.name },
        thresholdPct: config.varianceThresholdPct ?? 10,
      });
      toast.success(`PO ${closeTarget.doc_no} closed`);
      setCloseTarget(null);
      setClosureRemarks('');
      reload();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

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
          <TabsTrigger value="closed">Closed</TabsTrigger>
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
                    <th className="p-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No production orders</td></tr>
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
                      <td className="p-2 text-right">
                        {po.status === 'completed' && (
                          <Button size="sm" variant="outline" onClick={() => setCloseTarget(po)}>
                            <Lock className="h-3 w-3 mr-1" /> Close
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!closeTarget} onOpenChange={o => { if (!o) { setCloseTarget(null); setClosureRemarks(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close Production Order · {closeTarget?.doc_no}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Closing freezes the cost structure and variance snapshot. Maker-checker (Q19=b): the PO creator and latest PC creator cannot close.
            </p>
            <div>
              <Label>Closure Remarks (required)</Label>
              <Textarea
                value={closureRemarks}
                onChange={e => setClosureRemarks(e.target.value)}
                placeholder="Reason for closure, variance commentary, …"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setCloseTarget(null); setClosureRemarks(''); }}>Cancel</Button>
            <Button onClick={handleClose} disabled={busy}>{busy ? 'Closing…' : 'Confirm Close'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ProductionOrderRegisterPanel;
