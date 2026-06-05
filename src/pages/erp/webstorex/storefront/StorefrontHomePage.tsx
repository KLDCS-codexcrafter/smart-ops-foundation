/**
 * @file        src/pages/erp/webstorex/storefront/StorefrontHomePage.tsx
 * @sprint      Sprint 151 · T-WebStoreX-A11.3 · DP-WS-22 mobile-first browse
 */
import { useMemo, useState, type MouseEvent } from 'react';
import { useEntityCode } from '@/hooks/useEntityCode';
import { getCatalog } from '@/lib/webstorex-engine';
import { getEffectivePrice } from '@/lib/webstorex-commerce-engine';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, ShoppingCart, Eye, GitCompare } from 'lucide-react';
import { toast } from 'sonner';
import { PreviewRibbon, useStorefrontCart, setSelectedStoreItemId, fmtINR, useCompareSet, COMPARE_MAX } from './storefront-shared';
import type { WebStoreXModule } from '../WebStoreXSidebar.types';

interface Props { onNavigate: (m: WebStoreXModule) => void; }

export function StorefrontHomePage({ onNavigate }: Props): JSX.Element {
  const { entityCode } = useEntityCode();
  const [q, setQ] = useState('');
  const cart = useStorefrontCart(entityCode);
  const compare = useCompareSet(entityCode);

  const items = useMemo(
    () => entityCode ? getCatalog(entityCode, { visibility: 'published', search: q }) : [],
    [entityCode, q],
  );

  if (!entityCode) return <div className="p-6 text-sm text-muted-foreground">Select a company to continue.</div>;

  const openItem = (id: string): void => {
    setSelectedStoreItemId(entityCode, id);
    onNavigate('storefront-product');
  };

  return (
    <div className="animate-fade-in">
      <PreviewRibbon />
      <div className="sticky top-0 z-10 backdrop-blur-xl bg-background/80 border-b border-border px-4 py-3 flex items-center gap-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products" className="h-9" />
        <Button size="sm" variant="outline" onClick={() => onNavigate('storefront-compare')} className="relative" aria-label="Open compare">
          <GitCompare className="h-4 w-4" />
          {compare.ids.length > 0 && (
            <Badge className="absolute -top-2 -right-2 h-5 min-w-[20px] px-1 font-mono">{compare.ids.length}</Badge>
          )}
        </Button>
        <Button size="sm" variant="outline" onClick={() => onNavigate('storefront-cart')} className="relative">
          <ShoppingCart className="h-4 w-4" />
          {cart.totalQty > 0 && (
            <Badge className="absolute -top-2 -right-2 h-5 min-w-[20px] px-1 font-mono">{cart.totalQty}</Badge>
          )}
        </Button>
      </div>

      <div className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {items.length === 0 ? (
          <div className="col-span-full text-center py-12 text-sm text-muted-foreground">
            {q ? 'No matches.' : 'No published products yet.'}
          </div>
        ) : items.map((it) => {
          const eff = getEffectivePrice(entityCode, it.id);
          const isOffer = eff.source !== 'list';
          const inCompare = compare.has(it.id);
          const onCompare = (e: React.MouseEvent): void => {
            e.stopPropagation();
            const r = compare.toggle(it.id);
            if (r.full) toast.error(`Compare limit ${COMPARE_MAX}`);
          };
          return (
            <Card key={it.id} className="glass-card overflow-hidden hover:shadow-elevated transition-shadow relative">
              <button
                type="button"
                onClick={() => openItem(it.id)}
                className="block w-full text-left"
                aria-label={`View ${it.storeTitle}`}
              >
                <div className="aspect-square bg-muted flex items-center justify-center overflow-hidden">
                  {it.images[0]?.dataUrl ? (
                    <img src={it.images[0].dataUrl} alt={it.storeTitle} className="w-full h-full object-cover" />
                  ) : (
                    <Eye className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                <div className="p-3 space-y-1">
                  <div className="text-sm font-medium line-clamp-2 min-h-[2.5rem]">{it.storeTitle}</div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold">{fmtINR(eff.effective)}</span>
                    {isOffer && it.listPrice > eff.effective && (
                      <span className="font-mono text-xs text-muted-foreground line-through">{fmtINR(it.listPrice)}</span>
                    )}
                  </div>
                  {isOffer && <Badge variant="secondary" className="text-[10px]">{eff.source === 'campaign' ? 'Offer' : 'B2B'}</Badge>}
                </div>
              </button>
              <Button
                size="icon" variant={inCompare ? 'default' : 'outline'}
                className="absolute top-2 right-2 h-7 w-7"
                onClick={onCompare}
                aria-label={inCompare ? 'Remove from compare' : 'Add to compare'}
              >
                <GitCompare className="h-3 w-3" />
              </Button>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
