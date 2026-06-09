/**
 * MobileShopHomePage.tsx — AM.4 Pass 1
 * Consumer commerce PWA · Shop home (featured + categories).
 * CONSUMES `erp_inventory_items` (webstorex/customer-hub catalog · 0-DIFF).
 * NO fabricated products/prices · payment = Wave-2 (honest banner).
 */
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Search as SearchIcon, ShoppingCart, Heart, Package, ListOrdered, Info } from 'lucide-react';
import type { MobileSession } from '../MobileRouter';
import type { InventoryItem } from '@/types/inventory-item';

const CATALOG_KEY = 'erp_inventory_items';

export const COMMERCE_PAYMENT_HONESTY =
  'Secure payment & instant checkout arrive with Wave-2. Today you can browse, cart, and place an order — our team will reach out to confirm payment & dispatch.';

function readSession(): MobileSession | null {
  try { const raw = sessionStorage.getItem('opx_mobile_session'); return raw ? (JSON.parse(raw) as MobileSession) : null; } catch { return null; }
}
function loadList<T>(key: string): T[] { try { const raw = localStorage.getItem(key); return raw ? (JSON.parse(raw) as T[]) : []; } catch { return []; } }

const fmtINR = (paise: number) => `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function MobileShopHomePage() {
  const navigate = useNavigate();
  const session = useMemo(() => readSession(), []);

  // CONSUME existing catalog · 0-DIFF on storage key
  const items = useMemo<InventoryItem[]>(() => loadList<InventoryItem>(CATALOG_KEY), []);

  const featured = useMemo(() => items.slice(0, 6), [items]);

  const categories = useMemo(() => {
    const map = new Map<string, number>();
    for (const it of items) {
      const key = (it.stock_group_name ?? it.category_type ?? 'Other').trim();
      if (!key) continue;
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12);
  }, [items]);

  if (!session) return null;

  return (
    <div className="p-4 max-w-md mx-auto space-y-4 pb-24 animate-fade-in">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/operix-go')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-base font-semibold flex-1">Shop · नमस्ते {session.display_name}</h1>
        <Button variant="ghost" size="icon" onClick={() => navigate('/mobile/customer/wishlist')} aria-label="Wishlist">
          <Heart className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => navigate('/mobile/customer/cart')} aria-label="Cart">
          <ShoppingCart className="h-5 w-5" />
        </Button>
      </div>

      <Card className="p-3 border-amber-500/40 bg-amber-500/5 flex items-start gap-2">
        <Info className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
        <p className="text-[11px] text-amber-700 dark:text-amber-300">{COMMERCE_PAYMENT_HONESTY}</p>
      </Card>

      <Button variant="outline" className="w-full justify-start text-muted-foreground" onClick={() => navigate('/mobile/customer/search')}>
        <SearchIcon className="h-4 w-4 mr-2" /> Search products, brands…
      </Button>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Browse by category</h2>
          <Badge variant="outline" className="text-[10px]">{categories.length}</Badge>
        </div>
        {categories.length === 0 ? (
          <Card className="p-6 text-center">
            <Package className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No categories yet</p>
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {categories.map(c => (
              <Card key={c.name} className="p-3 cursor-pointer hover:bg-accent/50" onClick={() => navigate(`/mobile/customer/category/${encodeURIComponent(c.name)}`)}>
                <p className="text-xs font-medium truncate">{c.name}</p>
                <p className="text-[10px] text-muted-foreground font-mono">{c.count} item{c.count === 1 ? '' : 's'}</p>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Featured</h2>
        {featured.length === 0 ? (
          <Card className="p-6 text-center">
            <p className="text-sm text-muted-foreground">No products in catalog yet</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {featured.map(it => (
              <Card key={it.id} className="p-3 cursor-pointer" onClick={() => navigate(`/mobile/customer/product/${encodeURIComponent(it.id)}`)}>
                <p className="text-sm font-medium truncate">{it.name}</p>
                <p className="text-[10px] text-muted-foreground font-mono">{it.code} · {it.primary_uom_symbol ?? 'NOS'}</p>
                <p className="text-sm font-mono font-semibold mt-1">{fmtINR(Math.round((it.std_selling_rate ?? 0) * 100))}</p>
              </Card>
            ))}
          </div>
        )}
      </section>

      <div className="grid grid-cols-2 gap-2 pt-2">
        <Button variant="outline" size="sm" onClick={() => navigate('/mobile/customer/orders')}>
          <ListOrdered className="h-4 w-4 mr-2" /> My Orders
        </Button>
        <Button variant="outline" size="sm" onClick={() => navigate('/mobile/customer/wishlist')}>
          <Heart className="h-4 w-4 mr-2" /> Wishlist
        </Button>
      </div>
    </div>
  );
}
