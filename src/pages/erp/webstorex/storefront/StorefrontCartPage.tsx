/**
 * @file        src/pages/erp/webstorex/storefront/StorefrontCartPage.tsx
 * @sprint      Sprint 151 · T-WebStoreX-A11.3 · DP-WS-22
 */
import { useMemo } from 'react';
import { useEntityCode } from '@/hooks/useEntityCode';
import { getStoreItem, listVariants } from '@/lib/webstorex-engine';
import { getEffectivePrice } from '@/lib/webstorex-commerce-engine';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, ShoppingBag } from 'lucide-react';
import { PreviewRibbon, useStorefrontCart, fmtINR } from './storefront-shared';
import type { WebStoreXModule } from '../WebStoreXSidebar.types';

interface Props { onNavigate: (m: WebStoreXModule) => void; }

export function StorefrontCartPage({ onNavigate }: Props): JSX.Element {
  const { entityCode } = useEntityCode();
  const cart = useStorefrontCart(entityCode);

  const enriched = useMemo(() => {
    if (!entityCode) return [];
    return cart.lines.map((l, idx) => {
      const item = getStoreItem(entityCode, l.storeItemId);
      const eff = item ? getEffectivePrice(entityCode, item.id) : null;
      let variantLabel = '';
      if (l.variantId && item) {
        const v = listVariants(entityCode, item.id).find(x => x.id === l.variantId);
        if (v) variantLabel = ` · ${v.axes.map(a => `${a.name}:${a.value}`).join(', ')}`;
      }
      return { idx, line: l, item, eff, variantLabel };
    });
  }, [entityCode, cart.lines]);

  const subtotal = useMemo(
    () => enriched.reduce((s, r) => s + (r.eff?.effective ?? 0) * r.line.qty, 0),
    [enriched],
  );

  if (!entityCode) return <div className="p-6 text-sm text-muted-foreground">Select a company to continue.</div>;

  return (
    <div className="animate-fade-in pb-32 md:pb-6">
      <PreviewRibbon />
      <div className="p-4 max-w-3xl mx-auto space-y-3">
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <ShoppingBag className="h-5 w-5" />Your cart
          <span className="text-sm text-muted-foreground font-normal">· {cart.totalQty} item{cart.totalQty === 1 ? '' : 's'}</span>
        </h1>

        {enriched.length === 0 ? (
          <Card className="glass-card"><CardContent className="p-8 text-center space-y-3">
            <div className="text-sm text-muted-foreground">Cart is empty.</div>
            <Button onClick={() => onNavigate('storefront-home')}>Browse storefront</Button>
          </CardContent></Card>
        ) : (
          <>
            <Card className="glass-card divide-y divide-border">
              {enriched.map(r => (
                <div key={`${r.line.storeItemId}-${r.line.variantId ?? 'base'}-${r.idx}`} className="p-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{r.item?.storeTitle ?? '— unknown —'}{r.variantLabel}</div>
                    <div className="text-xs text-muted-foreground font-mono">{r.eff ? fmtINR(r.eff.effective) : '—'} each</div>
                  </div>
                  <Input
                    type="number" className="h-8 w-20 font-mono"
                    value={r.line.qty}
                    onChange={(e) => cart.setQty(r.idx, Math.max(1, parseInt(e.target.value, 10) || 1))}
                  />
                  <div className="font-mono text-sm w-24 text-right">{fmtINR((r.eff?.effective ?? 0) * r.line.qty)}</div>
                  <Button size="icon" variant="ghost" onClick={() => cart.removeLine(r.idx)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
            </Card>

            <Card className="glass-card">
              <CardContent className="p-4 space-y-2">
                <div className="flex justify-between text-sm"><span>Subtotal</span><span className="font-mono">{fmtINR(subtotal)}</span></div>
                <div className="text-xs text-muted-foreground">Discounts, coupons, points and credit are applied at Checkout.</div>
                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                  <Button className="flex-1" onClick={() => onNavigate('storefront-checkout')}>Checkout</Button>
                  <Button className="flex-1" variant="outline" onClick={() => onNavigate('storefront-quote')}>Request quote</Button>
                  <Button variant="ghost" onClick={() => cart.clear()}>Clear</Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
