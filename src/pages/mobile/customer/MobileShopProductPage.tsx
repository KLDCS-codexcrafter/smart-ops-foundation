/**
 * MobileShopProductPage.tsx — AM.4 Pass 1
 * Rich product page · CONSUMES existing catalog row + writes to existing
 * customerCartKey (0-DIFF on cart storage shape).
 */
import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Heart, Minus, Plus, Package, ShoppingCart, Info } from 'lucide-react';
import { toast } from 'sonner';
import type { MobileSession } from '../MobileRouter';
import type { InventoryItem } from '@/types/inventory-item';
import { type CustomerCart, type CustomerCartLine, customerCartKey } from '@/types/customer-order';

const CATALOG_KEY = 'erp_inventory_items';
const WISHLIST_KEY = (entity: string, customer: string) => `erp_customer_wishlist_${entity}_${customer}`;

function readSession(): MobileSession | null {
  try { const raw = sessionStorage.getItem('opx_mobile_session'); return raw ? (JSON.parse(raw) as MobileSession) : null; } catch { return null; }
}
function loadList<T>(key: string): T[] { try { const raw = localStorage.getItem(key); return raw ? (JSON.parse(raw) as T[]) : []; } catch { return []; } }
function loadWishlist(entity: string, customer: string): string[] { return loadList<string>(WISHLIST_KEY(entity, customer)); }
function saveWishlist(entity: string, customer: string, ids: string[]): void {
  try { localStorage.setItem(WISHLIST_KEY(entity, customer), JSON.stringify(ids)); } catch { /* ignore */ }
}

const fmtINR = (paise: number) => `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function MobileShopProductPage() {
  const navigate = useNavigate();
  const params = useParams<{ id: string }>();
  const productId = decodeURIComponent(params.id ?? '');
  const session = useMemo(() => readSession(), []);
  const [qty, setQty] = useState(1);
  const [wishlistBumper, setWishlistBumper] = useState(0);

  const product = useMemo<InventoryItem | null>(() => {
    const items = loadList<InventoryItem>(CATALOG_KEY);
    return items.find(i => i.id === productId) ?? null;
  }, [productId]);

  const customerId = session?.user_id ?? 'anon';
  const wishlist = useMemo(() => session ? loadWishlist(session.entity_code, customerId) : [],
    [session, customerId, wishlistBumper]);
  const inWishlist = product ? wishlist.includes(product.id) : false;

  const toggleWishlist = useCallback(() => {
    if (!session || !product) return;
    const cur = loadWishlist(session.entity_code, customerId);
    const next = cur.includes(product.id) ? cur.filter(x => x !== product.id) : [...cur, product.id];
    saveWishlist(session.entity_code, customerId, next);
    setWishlistBumper(b => b + 1);
    toast.success(cur.includes(product.id) ? 'Removed from wishlist' : 'Added to wishlist');
  }, [session, product, customerId]);

  const addToCart = useCallback(() => {
    if (!session || !product) return;
    const key = customerCartKey(session.entity_code);
    const all = loadList<CustomerCart>(key);
    let cart = all.find(c => c.customer_id === customerId);
    const now = new Date().toISOString();
    const unit = Math.round((product.std_selling_rate ?? 0) * 100);
    if (!cart) {
      cart = {
        id: customerId, customer_id: customerId, entity_code: session.entity_code,
        lines: [], subtotal_paise: 0, created_at: now, updated_at: now,
      };
      all.push(cart);
    }
    const idx = cart.lines.findIndex(l => l.item_id === product.id);
    if (idx >= 0) {
      const newQty = cart.lines[idx].qty + qty;
      cart.lines[idx] = { ...cart.lines[idx], qty: newQty, line_total_paise: newQty * cart.lines[idx].unit_price_paise };
    } else {
      const line: CustomerCartLine = {
        id: `cl-${Date.now()}`,
        item_id: product.id, item_code: product.code, item_name: product.name,
        uom: product.primary_uom_symbol ?? 'NOS',
        qty, unit_price_paise: unit, line_total_paise: qty * unit,
      };
      cart.lines.push(line);
    }
    cart.subtotal_paise = cart.lines.reduce((s, l) => s + l.line_total_paise, 0);
    cart.updated_at = now;
    // [JWT] POST /api/customer/cart
    localStorage.setItem(key, JSON.stringify(all));
    toast.success(`Added ${qty} × ${product.name}`);
  }, [session, product, qty, customerId]);

  if (!product) {
    return (
      <div className="p-4 max-w-md mx-auto space-y-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4" /></Button>
        <Card className="p-6 text-center">
          <Package className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">Product not found</p>
        </Card>
      </div>
    );
  }

  const unit = Math.round((product.std_selling_rate ?? 0) * 100);

  return (
    <div className="p-4 max-w-md mx-auto space-y-3 pb-28 animate-fade-in">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4" /></Button>
        <h1 className="text-sm font-semibold flex-1 truncate">{product.name}</h1>
        <Button variant="ghost" size="icon" onClick={toggleWishlist} aria-label="Wishlist toggle">
          <Heart className={`h-5 w-5 ${inWishlist ? 'fill-red-500 text-red-500' : ''}`} />
        </Button>
      </div>

      <Card className="aspect-square flex items-center justify-center bg-muted/40">
        <Package className="h-16 w-16 text-muted-foreground" />
      </Card>

      <Card className="p-3 space-y-2">
        <h2 className="text-base font-semibold">{product.name}</h2>
        <p className="text-[11px] text-muted-foreground font-mono">{product.code} · {product.primary_uom_symbol ?? 'NOS'}</p>
        <div className="flex items-center gap-2 flex-wrap">
          {product.brand_name && <Badge variant="outline" className="text-[10px]">{product.brand_name}</Badge>}
          {product.stock_group_name && <Badge variant="outline" className="text-[10px]">{product.stock_group_name}</Badge>}
          {product.hsn_sac_code && <Badge variant="outline" className="text-[10px] font-mono">HSN {product.hsn_sac_code}</Badge>}
        </div>
        <p className="text-2xl font-mono font-bold">{fmtINR(unit)}</p>
      </Card>

      <Card className="p-3 flex items-start gap-2 border-amber-500/40 bg-amber-500/5">
        <Info className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
        <p className="text-[11px] text-amber-700 dark:text-amber-300">
          Secure payment & instant checkout arrive with Wave-2. You can cart &amp; place this order today; our team confirms payment &amp; dispatch.
        </p>
      </Card>

      <Card className="p-3 sticky bottom-2 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm">Quantity</span>
          <div className="flex items-center gap-2">
            <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setQty(q => Math.max(1, q - 1))}>
              <Minus className="h-3 w-3" />
            </Button>
            <span className="font-mono text-sm w-8 text-center">{qty}</span>
            <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setQty(q => q + 1)}>
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </div>
        <Button className="w-full" onClick={addToCart}>
          <ShoppingCart className="h-4 w-4 mr-2" /> Add to Cart · {fmtINR(unit * qty)}
        </Button>
      </Card>
    </div>
  );
}
