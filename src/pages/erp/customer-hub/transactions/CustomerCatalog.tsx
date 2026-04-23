/**
 * CustomerCatalog.tsx — Browse · search · filter · social proof overlays
 * Sprint 13b · Module ch-t-catalog · Teal-500 accent
 * Reads inventory + active schemes + recent orders to compute social proof.
 */

import { useEffect, useMemo, useState } from 'react';
import { ShoppingBag, Search, Sparkles, Star, Users, TrendingUp, Plus, Minus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { formatINR } from '@/lib/india-validations';
import { signalsForItem, type SocialProofSignal } from '@/lib/social-proof-engine';
import { recommendForCart } from '@/lib/customer-recommendation-engine';
import { schemesKey, type Scheme } from '@/types/scheme';
import { DEFAULT_ENTITY_SHORTCODE } from '@/lib/default-entity';
import {
  customerCartKey, customerCartActivityKey, customerOrdersKey,
  type CustomerCart, type CustomerCartLine, type CustomerOrder,
} from '@/types/customer-order';

interface CatalogItem {
  id: string;
  code: string;
  name: string;
  category: string;
  price_paise: number;
  in_stock: boolean;
  uom: string;
}

const ENTITY = DEFAULT_ENTITY_SHORTCODE;
const CATALOG_KEY = 'erp_inventory_items';

// ---------- Demo seed: 12 FMCG items ----------
const DEMO_ITEMS: CatalogItem[] = [
  { id: 'itm-001', code: 'RIC-BAS-5', name: 'Basmati Rice 5kg',         category: 'Rice',   price_paise: 65000, in_stock: true,  uom: 'PKT' },
  { id: 'itm-002', code: 'RIC-SON-5', name: 'Sona Masoori Rice 5kg',    category: 'Rice',   price_paise: 42000, in_stock: true,  uom: 'PKT' },
  { id: 'itm-003', code: 'ATT-GEH-5', name: 'Whole Wheat Atta 5kg',     category: 'Atta',   price_paise: 25000, in_stock: true,  uom: 'PKT' },
  { id: 'itm-004', code: 'ATT-MUL-5', name: 'Multigrain Atta 5kg',      category: 'Atta',   price_paise: 32000, in_stock: true,  uom: 'PKT' },
  { id: 'itm-005', code: 'OIL-SUN-1', name: 'Sunflower Oil 1L',         category: 'Oil',    price_paise: 14500, in_stock: true,  uom: 'BTL' },
  { id: 'itm-006', code: 'OIL-MUS-1', name: 'Mustard Oil 1L',           category: 'Oil',    price_paise: 16800, in_stock: false, uom: 'BTL' },
  { id: 'itm-007', code: 'OIL-COC-1', name: 'Coconut Oil 1L',           category: 'Oil',    price_paise: 31000, in_stock: true,  uom: 'BTL' },
  { id: 'itm-008', code: 'PUL-TUR-1', name: 'Toor Dal 1kg',             category: 'Pulses', price_paise: 16500, in_stock: true,  uom: 'PKT' },
  { id: 'itm-009', code: 'PUL-MOO-1', name: 'Moong Dal 1kg',            category: 'Pulses', price_paise: 15800, in_stock: true,  uom: 'PKT' },
  { id: 'itm-010', code: 'PUL-CHA-1', name: 'Chana Dal 1kg',            category: 'Pulses', price_paise: 11200, in_stock: true,  uom: 'PKT' },
  { id: 'itm-011', code: 'SUG-WHI-1', name: 'White Sugar 1kg',          category: 'Pantry', price_paise: 5200,  in_stock: true,  uom: 'PKT' },
  { id: 'itm-012', code: 'TEA-ASS-5', name: 'Assam Tea 500g',           category: 'Pantry', price_paise: 28500, in_stock: true,  uom: 'PKT' },
];

function ls<T>(k: string): T[] {
  try { const r = localStorage.getItem(k); return r ? (JSON.parse(r) as T[]) : []; } catch { return []; }
}

function loadCatalog(): CatalogItem[] {
  const raw = ls<{ id: string; code: string; name: string; stock_group_name?: string | null; std_selling_rate?: number | null; primary_uom_symbol?: string | null }>(CATALOG_KEY);
  if (raw.length > 0) {
    return raw.map(r => ({
      id: r.id, code: r.code, name: r.name,
      category: (r.stock_group_name ?? 'General').toString(),
      price_paise: Math.round(((r.std_selling_rate ?? 0) || 0) * 100),
      in_stock: true,
      uom: r.primary_uom_symbol ?? 'NOS',
    })).filter(i => i.price_paise > 0);
  }
  return DEMO_ITEMS;
}

function getCustomerId(): string {
  try {
    const raw = localStorage.getItem('4ds_login_credential');
    if (!raw) return 'cust-demo';
    const p = JSON.parse(raw);
    return `cust-${p.value ?? 'demo'}`;
  } catch { return 'cust-demo'; }
}

function loadCart(custId: string): CustomerCart {
  const all = ls<CustomerCart>(customerCartKey(ENTITY));
  return all.find(c => c.customer_id === custId) ?? {
    id: custId, customer_id: custId, entity_code: ENTITY,
    lines: [], subtotal_paise: 0,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  };
}

function saveCart(cart: CustomerCart): void {
  const all = ls<CustomerCart>(customerCartKey(ENTITY));
  const idx = all.findIndex(c => c.customer_id === cart.customer_id);
  if (idx >= 0) all[idx] = cart; else all.push(cart);
  try {
    // [JWT] PUT /api/customer/cart
    localStorage.setItem(customerCartKey(ENTITY), JSON.stringify(all));
    // Track activity for abandonment watcher
    const act = ls<{ customer_id: string; updated_at: string }>(customerCartActivityKey(ENTITY));
    const ai = act.findIndex(a => a.customer_id === cart.customer_id);
    const next = { customer_id: cart.customer_id, updated_at: new Date().toISOString() };
    if (ai >= 0) act[ai] = next; else act.push(next);
    localStorage.setItem(customerCartActivityKey(ENTITY), JSON.stringify(act));
  } catch { /* ignore */ }
}

function itemMatchesScheme(item: CatalogItem, s: Scheme): boolean {
  if (s.scope.item_ids && s.scope.item_ids.length > 0) return s.scope.item_ids.includes(item.id);
  if (s.scope.category_ids && s.scope.category_ids.length > 0) return s.scope.category_ids.includes(item.category);
  return false;
}

export function CustomerCatalogPanel() {
  const [items] = useState<CatalogItem[]>(() => loadCatalog());
  const customerId = getCustomerId();
  const [cart, setCart] = useState<CustomerCart>(() => loadCart(customerId));
  const [search, setSearch] = useState('');
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [schemesOnly, setSchemesOnly] = useState(false);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sort, setSort] = useState<'name' | 'price_asc' | 'price_desc'>('name');

  // Seed demo items if empty
  useEffect(() => {
    if (ls<unknown>(CATALOG_KEY).length === 0) {
      try { localStorage.setItem(CATALOG_KEY, JSON.stringify(DEMO_ITEMS)); } catch { /* ignore */ }
    }
  }, []);

  const allSchemes: Scheme[] = useMemo(() => ls<Scheme>(schemesKey(ENTITY)).filter(s => s.status === 'active'), []);
  const customerSchemes = useMemo(
    () => allSchemes.filter(s => s.scope.audience === 'customer' || s.scope.audience === 'both'),
    [allSchemes],
  );

  const allOrders = useMemo(() => ls<CustomerOrder>(customerOrdersKey(ENTITY)), []);
  const proofOrders = useMemo(
    () => allOrders.flatMap(o => o.lines.map(l => ({
      item_id: l.item_id, qty: l.qty, placed_at: o.placed_at ?? o.created_at,
    }))),
    [allOrders],
  );

  const categories = useMemo(() => Array.from(new Set(items.map(i => i.category))).sort(), [items]);

  // G2: "You may also like" recommendations from cart co-occurrence
  const cartItemIds = cart.lines.map(l => l.item_id);
  const cartItemIdsKey = cartItemIds.join(',');
  const recommendations = useMemo(() => {
    if (cartItemIds.length === 0) return [];
    const itemNameLookup = new Map(items.map(i => [i.id, i.name]));
    const orderHistory = allOrders.flatMap(o =>
      o.lines.map(l => ({ customer_id: o.customer_id, item_id: l.item_id })));
    return recommendForCart(cartItemIds, orderHistory, 4, itemNameLookup);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartItemIdsKey, allOrders, items]);

  const filtered = useMemo(() => {
    let list = items;
    if (search.trim().length >= 2) {
      const q = search.toLowerCase();
      list = list.filter(i => i.name.toLowerCase().includes(q) || i.code.toLowerCase().includes(q));
    }
    if (selectedCats.length > 0) list = list.filter(i => selectedCats.includes(i.category));
    if (inStockOnly) list = list.filter(i => i.in_stock);
    if (schemesOnly) list = list.filter(i => customerSchemes.some(s => itemMatchesScheme(i, s)));
    if (sort === 'price_asc') list = [...list].sort((a, b) => a.price_paise - b.price_paise);
    else if (sort === 'price_desc') list = [...list].sort((a, b) => b.price_paise - a.price_paise);
    else list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [items, search, selectedCats, schemesOnly, inStockOnly, sort, customerSchemes]);

  const cartQty = (itemId: string) => cart.lines.find(l => l.item_id === itemId)?.qty ?? 0;

  const updateQty = (item: CatalogItem, nextQty: number) => {
    const safe = Math.max(0, nextQty);
    const without = cart.lines.filter(l => l.item_id !== item.id);
    const lines: CustomerCartLine[] = safe === 0 ? without : [
      ...without,
      {
        id: `cl-${item.id}`,
        item_id: item.id, item_code: item.code, item_name: item.name,
        uom: item.uom, qty: safe,
        unit_price_paise: item.price_paise,
        line_total_paise: item.price_paise * safe,
      },
    ];
    const subtotal_paise = lines.reduce((s, l) => s + l.line_total_paise, 0);
    const next: CustomerCart = { ...cart, lines, subtotal_paise, updated_at: new Date().toISOString() };
    setCart(next);
    saveCart(next);
  };

  const cartCount = cart.lines.reduce((s, l) => s + l.qty, 0);

  return (
    <div className="space-y-4 animate-fade-in">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-teal-500" />
            Catalog
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">{filtered.length} of {items.length} items</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search items..."
              className="pl-8 h-9 w-64 text-sm"
            />
          </div>
          <select
            value={sort}
            onChange={e => setSort(e.target.value as typeof sort)}
            className="h-9 rounded-md border border-input bg-background px-2 text-xs"
          >
            <option value="name">Name A-Z</option>
            <option value="price_asc">Price Low → High</option>
            <option value="price_desc">Price High → Low</option>
          </select>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr_300px] gap-4">
        {/* LEFT — filters */}
        <Card className="p-3 h-fit">
          <p className="text-xs font-semibold mb-2">Filters</p>
          <div className="space-y-3">
            <div>
              <Label className="text-[11px] text-muted-foreground">Category</Label>
              <div className="space-y-1.5 mt-1.5">
                {categories.map(cat => {
                  const id = `cat-${cat}`;
                  return (
                    <div key={id} className="flex items-center gap-2">
                      <Checkbox
                        id={id}
                        checked={selectedCats.includes(cat)}
                        onCheckedChange={c => setSelectedCats(prev =>
                          c ? [...prev, cat] : prev.filter(x => x !== cat))}
                      />
                      <Label htmlFor={id} className="text-xs cursor-pointer">{cat}</Label>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1 border-t">
              <Checkbox id="schemes-only" checked={schemesOnly} onCheckedChange={c => setSchemesOnly(!!c)} />
              <Label htmlFor="schemes-only" className="text-xs cursor-pointer">On schemes only</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="stock-only" checked={inStockOnly} onCheckedChange={c => setInStockOnly(!!c)} />
              <Label htmlFor="stock-only" className="text-xs cursor-pointer">In stock only</Label>
            </div>
            {(selectedCats.length > 0 || schemesOnly || inStockOnly) && (
              <Button
                variant="ghost" size="sm"
                onClick={() => { setSelectedCats([]); setSchemesOnly(false); setInStockOnly(false); }}
                className="w-full h-7 text-[11px] gap-1"
              >
                <X className="h-3 w-3" /> Clear all
              </Button>
            )}
          </div>
        </Card>

        {/* CENTER — grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.length === 0 && (
            <Card className="p-8 text-center text-sm text-muted-foreground col-span-full">
              No items match these filters.
            </Card>
          )}
          {filtered.map(item => {
            const signals: SocialProofSignal[] = signalsForItem(item.id, proofOrders, [], 'Kolkata');
            const matchedScheme = customerSchemes.find(s => itemMatchesScheme(item, s));
            const qty = cartQty(item.id);
            return (
              <Card key={item.id} className="p-3 flex flex-col gap-2 hover:border-teal-500/40 transition-colors">
                <div className="aspect-square rounded-md bg-teal-500/10 flex items-center justify-center text-teal-700 dark:text-teal-300 font-bold text-2xl">
                  {item.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()}
                </div>
                <div className="min-h-[2.5rem]">
                  <p className="text-xs font-semibold leading-tight line-clamp-2">{item.name}</p>
                  <p className="text-[10px] text-muted-foreground">{item.code} · {item.uom}</p>
                </div>
                <p className="font-mono text-sm font-bold text-foreground">{formatINR(item.price_paise)}</p>

                <div className="flex flex-wrap gap-1">
                  {signals.slice(0, 2).map((s, i) => (
                    <Badge
                      key={`sig-${item.id}-${i}`}
                      variant="outline"
                      className={`text-[9px] px-1.5 py-0 gap-1 ${
                        s.kind === 'top_rated' ? 'border-emerald-500/30 text-emerald-700 dark:text-emerald-300' :
                        s.kind === 'recent_buyers' ? 'border-teal-500/30 text-teal-700 dark:text-teal-300' :
                        s.kind === 'trending_location' ? 'border-violet-500/30 text-violet-700 dark:text-violet-300' :
                        'border-slate-500/30 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {s.kind === 'top_rated' ? <Star className="h-2.5 w-2.5" /> :
                       s.kind === 'recent_buyers' ? <Users className="h-2.5 w-2.5" /> :
                       <TrendingUp className="h-2.5 w-2.5" />}
                      <span className="truncate max-w-[120px]">{s.text}</span>
                    </Badge>
                  ))}
                  {matchedScheme && (
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 gap-1 border-violet-500/30 text-violet-700 dark:text-violet-300">
                      <Sparkles className="h-2.5 w-2.5" />
                      {matchedScheme.code}
                    </Badge>
                  )}
                  {!item.in_stock && (
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-amber-500/30 text-amber-700 dark:text-amber-300">
                      Out of stock
                    </Badge>
                  )}
                </div>

                {qty === 0 ? (
                  <Button
                    size="sm"
                    disabled={!item.in_stock}
                    onClick={() => updateQty(item, 1)}
                    className="w-full h-8 text-xs bg-teal-500 hover:bg-teal-600 text-white"
                  >
                    Add to cart
                  </Button>
                ) : (
                  <div className="flex items-center justify-between gap-1">
                    <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => updateQty(item, qty - 1)}>
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="font-mono text-sm font-semibold">{qty}</span>
                    <Button size="icon" variant="outline" className="h-8 w-8 border-teal-500/40 text-teal-700 dark:text-teal-300" onClick={() => updateQty(item, qty + 1)}>
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>

        {/* RIGHT — mini-cart */}
        <Card className="p-3 h-fit sticky top-4">
          <p className="text-xs font-semibold mb-2 flex items-center gap-1.5">
            <ShoppingBag className="h-3.5 w-3.5 text-teal-500" />
            Mini cart
          </p>
          {cart.lines.length === 0 ? (
            <p className="text-xs text-muted-foreground">Cart is empty</p>
          ) : (
            <ScrollArea className="max-h-[300px]">
              <div className="space-y-1.5">
                {cart.lines.map(l => (
                  <div key={l.id} className="text-[11px] flex justify-between gap-2">
                    <span className="truncate">{l.item_name}</span>
                    <span className="font-mono shrink-0">{l.qty} × {formatINR(l.unit_price_paise)}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
          <div className="mt-2 pt-2 border-t flex justify-between text-xs font-semibold">
            <span>Subtotal ({cartCount})</span>
            <span className="font-mono text-teal-600">{formatINR(cart.subtotal_paise)}</span>
          </div>
          <Button
            disabled={cart.lines.length === 0}
            onClick={() => {
              window.location.hash = 'ch-t-cart';
              toast.success('Opening cart');
            }}
            className="w-full mt-2 h-9 text-xs bg-teal-500 hover:bg-teal-600 text-white"
          >
            View cart
          </Button>
        </Card>
      </div>

      {/* G2: You may also like — recommendations from cart co-occurrence */}
      {recommendations.length > 0 && (
        <Card className="p-4">
          <p className="text-xs font-semibold mb-3 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-teal-500" />
            You may also like
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {recommendations.map(rec => {
              const item = items.find(i => i.id === rec.item_id);
              if (!item) return null;
              return (
                <button
                  key={`rec-${rec.item_id}`}
                  type="button"
                  onClick={() => updateQty(item, (cartQty(item.id) || 0) + 1)}
                  className="text-left rounded-lg border border-border bg-card hover:border-teal-500/40 hover:bg-teal-500/5 transition-colors p-3"
                >
                  <p className="text-xs font-semibold leading-tight line-clamp-2">{item.name}</p>
                  <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">{rec.reason}</p>
                  <p className="font-mono text-sm font-bold text-teal-600 mt-1.5">
                    {formatINR(item.price_paise)}
                  </p>
                </button>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}

export default CustomerCatalogPanel;
