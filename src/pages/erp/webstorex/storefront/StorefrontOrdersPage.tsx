/**
 * @file        src/pages/erp/webstorex/storefront/StorefrontOrdersPage.tsx
 * @sprint      Sprint 151 · T-WebStoreX-A11.3 · status mirror + payment-link attach + reorder
 */
import { useMemo, useState } from 'react';
import { useEntityCode } from '@/hooks/useEntityCode';
import { listStoreOrders, getOrderStatusMirror, attachPaymentLink, buildReorderLines } from '@/lib/webstorex-order-engine';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Receipt, Link2, RefreshCcw } from 'lucide-react';
import { PreviewRibbon, useStorefrontCart, fmtINR } from './storefront-shared';
import type { WebStoreXModule } from '../WebStoreXSidebar.types';
import type { WsStoreOrder } from '@/types/webstorex';

interface Props { onNavigate: (m: WebStoreXModule) => void; }

export function StorefrontOrdersPage({ onNavigate }: Props): JSX.Element {
  const { entityCode } = useEntityCode();
  const [tick, setTick] = useState(0);
  const [linkOpen, setLinkOpen] = useState<WsStoreOrder | null>(null);
  const [linkRef, setLinkRef] = useState('');
  const cart = useStorefrontCart(entityCode);

  const orders = useMemo(
    () => entityCode ? listStoreOrders(entityCode).sort((a, b) => b.createdAt.localeCompare(a.createdAt)) : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entityCode, tick],
  );

  if (!entityCode) return <div className="p-6 text-sm text-muted-foreground">Select a company to continue.</div>;

  const onReorder = (partyId: string): void => {
    const lines = buildReorderLines(entityCode, partyId);
    if (!lines.length) { toast.error('No prior order'); return; }
    cart.replaceAll(lines);
    toast.success('Reorder loaded');
    onNavigate('storefront-cart');
  };

  const onAttach = (): void => {
    if (!linkOpen || !linkRef.trim()) return;
    try {
      attachPaymentLink(entityCode, linkOpen.id, linkRef.trim());
      toast.success('Payment link attached');
      setLinkOpen(null); setLinkRef(''); setTick(t => t + 1);
    } catch (e) { toast.error((e as Error).message); }
  };

  return (
    <div className="animate-fade-in">
      <PreviewRibbon />
      <div className="p-4 max-w-3xl mx-auto space-y-3">
        <h1 className="text-xl font-semibold flex items-center gap-2"><Receipt className="h-5 w-5" />My orders</h1>

        {orders.length === 0 ? (
          <Card className="glass-card"><CardContent className="p-8 text-center text-sm text-muted-foreground">No orders yet.</CardContent></Card>
        ) : (
          orders.map(o => {
            const mirror = getOrderStatusMirror(entityCode, o.id);
            return (
              <Card key={o.id} className="glass-card"><CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-mono font-semibold">{o.soVoucherNo}</div>
                    <div className="text-xs text-muted-foreground">{o.partyName} · via {o.placedVia}</div>
                  </div>
                  <Badge variant={mirror.voucherStatus === 'open' ? 'secondary' : 'outline'}>{mirror.voucherStatus ?? 'unknown'}</Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  {o.evaluation.lines.length} line{o.evaluation.lines.length === 1 ? '' : 's'} ·
                  payable <span className="font-mono">{fmtINR(o.evaluation.payable)}</span>
                  {o.paymentLinkRef && <span> · pmt: <span className="font-mono">{o.paymentLinkRef}</span></span>}
                </div>
                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="outline" onClick={() => onReorder(o.partyId)}><RefreshCcw className="h-3.5 w-3.5 mr-1" />Reorder</Button>
                  <Button size="sm" variant="outline" onClick={() => { setLinkOpen(o); setLinkRef(o.paymentLinkRef ?? ''); }}>
                    <Link2 className="h-3.5 w-3.5 mr-1" />Attach payment link
                  </Button>
                </div>
              </CardContent></Card>
            );
          })
        )}
      </div>

      <Dialog open={!!linkOpen} onOpenChange={(v) => !v && setLinkOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Attach payment link</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label className="text-xs">ReceivX payment link reference</Label>
            <Input value={linkRef} onChange={e => setLinkRef(e.target.value)} placeholder="PLNK-2026-…" className="font-mono" />
            <p className="text-[10px] text-muted-foreground">[JWT] Real payment capture lands P2BB. This stores the reference only.</p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setLinkOpen(null)}>Cancel</Button>
            <Button onClick={onAttach}>Attach</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
