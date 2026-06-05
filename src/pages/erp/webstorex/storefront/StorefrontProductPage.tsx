/**
 * @file        src/pages/erp/webstorex/storefront/StorefrontProductPage.tsx
 * @sprint      Sprint 151 · T-WebStoreX-A11.3 · DP-WS-19.2 · DP-WS-22 product detail
 */
import { useMemo, useState } from 'react';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { getStoreItem, listVariants } from '@/lib/webstorex-engine';
import { getEffectivePrice } from '@/lib/webstorex-commerce-engine';
import { askAboutProduct } from '@/lib/webstorex-order-engine';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, MessageSquare, ShoppingCart, Minus, Plus, GitCompare } from 'lucide-react';
import { toast } from 'sonner';
import {
  PreviewRibbon, useStorefrontCart, getSelectedStoreItemId, setSelectedStoreItemId, fmtINR,
  useCompareSet, COMPARE_MAX, pickRelationIds, type RailKind,
} from './storefront-shared';
import type { WebStoreXModule } from '../WebStoreXSidebar.types';
import type { WebStoreItem } from '@/types/webstorex';

interface Props { onNavigate: (m: WebStoreXModule) => void; }

export function StorefrontProductPage({ onNavigate }: Props): JSX.Element {
  const { entityCode } = useEntityCode();
  const user = useCurrentUser();
  const selectedId = entityCode ? getSelectedStoreItemId(entityCode) : null;
  const item = useMemo(() => (entityCode && selectedId) ? getStoreItem(entityCode, selectedId) : null, [entityCode, selectedId]);
  const variants = useMemo(() => (entityCode && item) ? listVariants(entityCode, item.id) : [], [entityCode, item]);
  const [variantId, setVariantId] = useState<string>('');
  const [qty, setQty] = useState<number>(item?.moq ?? 1);
  const cart = useStorefrontCart(entityCode);
  const compare = useCompareSet(entityCode);

  if (!entityCode) return <div className="p-6 text-sm text-muted-foreground">Select a company to continue.</div>;
  if (!item) {
    return (
      <div className="p-6 text-center space-y-3">
        <PreviewRibbon />
        <div className="text-sm text-muted-foreground">No product selected.</div>
        <Button onClick={() => onNavigate('storefront-home')}>Browse storefront</Button>
      </div>
    );
  }

  const eff = getEffectivePrice(entityCode, item.id);

  const onAdd = (): void => {
    if (item.visibility !== 'published') { toast.error('Item not published'); return; }
    if (item.moq && qty < item.moq) { toast.error(`MOQ ${item.moq}`); return; }
    if (variants.length > 0 && !variantId) { toast.error('Pick a variant'); return; }
    cart.addLine(item.id, qty, variantId || null);
    toast.success(`Added · qty ${qty}`);
  };

  const onAsk = (): void => {
    try {
      askAboutProduct(entityCode, item.id, user?.id ?? 'guest');
      toast.success('Enquiry sent to OperixChat');
    } catch (e) { toast.error((e as Error).message); }
  };

  const back = (): void => { setSelectedStoreItemId(entityCode, null); onNavigate('storefront-home'); };

  return (
    <div className="animate-fade-in pb-32 md:pb-6">
      <PreviewRibbon />
      <div className="sticky top-0 z-10 backdrop-blur-xl bg-background/80 border-b border-border px-4 py-2">
        <Button size="sm" variant="ghost" onClick={back}><ArrowLeft className="h-4 w-4 mr-1" />Back</Button>
      </div>

      <div className="p-4 grid md:grid-cols-2 gap-4">
        <Card className="glass-card overflow-hidden">
          <div className="aspect-square bg-muted">
            {item.images[0]?.dataUrl
              ? <img src={item.images[0].dataUrl} alt={item.storeTitle} className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center text-muted-foreground">No image</div>}
          </div>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4 space-y-3">
            <h1 className="text-xl font-semibold">{item.storeTitle}</h1>
            <div className="flex items-baseline gap-3">
              <span className="font-mono text-2xl font-bold">{fmtINR(eff.effective)}</span>
              {eff.source !== 'list' && item.listPrice > eff.effective && (
                <span className="font-mono text-sm text-muted-foreground line-through">{fmtINR(item.listPrice)}</span>
              )}
              {eff.source !== 'list' && <Badge variant="secondary">{eff.source === 'campaign' ? 'Campaign' : 'B2B Rate'}</Badge>}
            </div>
            {item.shortDescription && <p className="text-sm text-muted-foreground">{item.shortDescription}</p>}
            {item.highlights.length > 0 && (
              <ul className="text-xs space-y-1 list-disc list-inside">
                {item.highlights.map((h, i) => <li key={`hl-${i}`}>{h}</li>)}
              </ul>
            )}
            {item.moq && <div className="text-xs text-muted-foreground">MOQ: <span className="font-mono">{item.moq}</span></div>}

            {variants.length > 0 && (
              <div className="space-y-1">
                <Label className="text-xs">Variant</Label>
                <Select value={variantId} onValueChange={setVariantId}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Pick variant" /></SelectTrigger>
                  <SelectContent>
                    {variants.filter(v => v.isActive).map(v => (
                      <SelectItem key={v.id} value={v.id}>{v.sku} · {v.axes.map(a => `${a.name}:${a.value}`).join(', ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1">
              <Label className="text-xs">Quantity</Label>
              <div className="flex items-center gap-2">
                <Button size="icon" variant="outline" onClick={() => setQty(Math.max(item.moq ?? 1, qty - 1))}><Minus className="h-4 w-4" /></Button>
                <Input className="h-9 w-20 text-center font-mono" type="number" value={qty} onChange={e => setQty(Math.max(1, parseInt(e.target.value, 10) || 1))} />
                <Button size="icon" variant="outline" onClick={() => setQty(qty + 1)}><Plus className="h-4 w-4" /></Button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <Button className="flex-1" onClick={onAdd}><ShoppingCart className="h-4 w-4 mr-1" />Add to cart</Button>
              <Button className="flex-1" variant="outline" onClick={onAsk}><MessageSquare className="h-4 w-4 mr-1" />Ask about this</Button>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" className="flex-1" onClick={() => onNavigate('storefront-quote')}>Request a quote</Button>
              <Button
                variant={compare.has(item.id) ? 'default' : 'outline'} size="sm" className="flex-1"
                onClick={() => {
                  const r = compare.toggle(item.id);
                  if (r.full) toast.error(`Compare limit ${COMPARE_MAX}`);
                  else if (r.added) toast.success('Added to compare');
                }}
              >
                <GitCompare className="h-4 w-4 mr-1" />
                {compare.has(item.id) ? 'In compare' : 'Add to compare'}
              </Button>
              {compare.ids.length > 0 && (
                <Button size="sm" variant="ghost" onClick={() => onNavigate('storefront-compare')} className="font-mono">
                  View ({compare.ids.length})
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <AccessoryRails
        item={item}
        entityCode={entityCode}
        onAdd={(id, q) => cart.addLine(id, q, null)}
        onOpen={(id) => { setSelectedStoreItemId(entityCode, id); onNavigate('storefront-product'); setQty(1); }}
      />


      {/* mobile sticky add bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-xl border-t border-border p-3 flex gap-2">
        <Button className="flex-1" onClick={onAdd}>Add · {fmtINR(eff.effective * qty)}</Button>
        <Button variant="outline" onClick={() => onNavigate('storefront-cart')}>
          <ShoppingCart className="h-4 w-4" />{cart.totalQty > 0 && <span className="ml-1 font-mono">{cart.totalQty}</span>}
        </Button>
      </div>
    </div>
  );
}
