/**
 * PartnerCatalog.tsx — Tier-priced item browser with smart reorder.
 * Sprint 10. Reads InventoryItems + PriceListItems; adds to IndexedDB cart.
 * [JWT] GET /api/partner/catalog?tier={tier}
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Package, Plus, Minus, ShoppingCart, Sparkles, Loader2 } from 'lucide-react';
import { PartnerLayout } from '@/components/layout/PartnerLayout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { getPartnerSession, loadPartners } from '@/lib/partner-auth-engine';
import {
  resolveTierPrice, calcLineTotals, suggestReorderQty, pickActivePriceList,
} from '@/lib/partner-order-engine';
import { upsertLine, getCart } from '@/lib/partner-cart-store';
import { formatINR } from '@/lib/india-validations';
import type { InventoryItem } from '@/types/inventory-item';
import type { PriceList, PriceListItem } from '@/types/price-list';
import type { Voucher } from '@/types/voucher';
import type { PartnerOrderLine } from '@/types/partner-order';

const INDIGO = 'hsl(231 48% 58%)';
const INDIGO_BG = 'hsl(231 48% 48% / 0.12)';

function ls<T>(k: string): T[] {
  try { const r = localStorage.getItem(k); return r ? (JSON.parse(r) as T[]) : []; } catch { return []; }
}

export function PartnerCatalogPanel() { return <PartnerCatalog />; }

export default function PartnerCatalog() {
  const navigate = useNavigate();
  const session = getPartnerSession();
  const [search, setSearch] = useState('');
  const [qtyMap, setQtyMap] = useState<Record<string, number>>({});
  const [busyItem, setBusyItem] = useState<string | null>(null);
  const [cartCount, setCartCount] = useState(0);

  const partner = useMemo(() => {
    if (!session) return null;
    return loadPartners(session.entity_code).find(p => p.id === session.partner_id) ?? null;
  }, [session]);

  // Load all catalog data once.
  const items = useMemo<InventoryItem[]>(() => ls<InventoryItem>('erp_inventory_items'), []);
  const priceLists = useMemo<PriceList[]>(() => ls<PriceList>('erp_price_lists'), []);
  const priceItems = useMemo<PriceListItem[]>(() => ls<PriceListItem>('erp_price_list_items'), []);
  const recentVouchers = useMemo<Voucher[]>(() => {
    if (!session) return [];
    return ls<Voucher>(`erp_group_vouchers_${session.entity_code}`);
  }, [session]);

  const activeListId = useMemo(
    () => (partner ? pickActivePriceList(partner, priceLists) : null),
    [partner, priceLists],
  );

  useEffect(() => {
    if (!session) return;
    void getCart(session.partner_id).then(c => setCartCount(c?.lines.length ?? 0));
  }, [session]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items.slice(0, 60);
    return items.filter(it =>
      (it.name?.toLowerCase().includes(q)) ||
      (it.code?.toLowerCase().includes(q)) ||
      (it.hsn_sac_code?.toLowerCase().includes(q)),
    ).slice(0, 60);
  }, [items, search]);

  if (!session || !partner) {
    return (
      <PartnerLayout title="Catalog">
        <div className="rounded-2xl border border-border/50 p-8 text-center text-sm text-muted-foreground">
          Partner profile unavailable.
        </div>
      </PartnerLayout>
    );
  }

  const setQty = (id: string, q: number) =>
    setQtyMap(m => ({ ...m, [id]: Math.max(1, q) }));

  const handleAdd = async (item: InventoryItem) => {
    setBusyItem(item.id);
    try {
      const fallback = Math.round((item.std_selling_rate ?? item.mrp ?? 0) * 100);
      const tier = resolveTierPrice(item.id, activeListId, priceItems, fallback);
      const qty = Math.max(tier.min_qty, qtyMap[item.id] ?? 1);
      // Interstate detection: partner state vs entity state — defaults intra-state.
      const interstate = false;
      const gstRate = (item.cgst_rate ?? 0) + (item.sgst_rate ?? 0) || (item.igst_rate ?? 18);
      const totals = calcLineTotals(qty, tier.rate_paise, tier.discount_percent, gstRate, interstate);
      const line: PartnerOrderLine = {
        id: `pol_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        item_id: item.id,
        item_code: item.code,
        item_name: item.name,
        uom: item.primary_uom_symbol ?? 'NOS',
        qty,
        rate_paise: tier.rate_paise,
        discount_percent: tier.discount_percent,
        ...totals,
        hsn_sac: item.hsn_sac_code ?? null,
      };
      const cart = await upsertLine(session.partner_id, session.entity_code, line);
      setCartCount(cart.lines.length);
      toast.success(`${item.name} added`, { description: `${qty} ${line.uom} • ${formatINR(line.total_paise)}` });
    } catch (e) {
      toast.error('Could not add to cart', { description: e instanceof Error ? e.message : 'Storage error' });
    } finally {
      setBusyItem(null);
    }
  };

  return (
    <PartnerLayout title="Catalog" subtitle={`Tier-priced for ${partner.tier.toUpperCase()} partners`}>
      <div className="space-y-4 animate-fade-in">
        {/* Search bar + cart pill */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, code or HSN…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 rounded-lg"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => navigate('/partner/cart')}
            className="rounded-lg gap-2 shrink-0"
          >
            <ShoppingCart className="h-4 w-4" />
            Cart ({cartCount})
          </Button>
        </div>

        {/* Items grid */}
        {filteredItems.length === 0 ? (
          <div className="rounded-2xl border border-border/50 p-12 text-center">
            <Package className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">
              {items.length === 0 ? 'No catalog items configured for this entity yet.' : 'No items match your search.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.map(item => {
              const fallback = Math.round((item.std_selling_rate ?? item.mrp ?? 0) * 100);
              const tier = resolveTierPrice(item.id, activeListId, priceItems, fallback);
              const reorder = suggestReorderQty(item.id, recentVouchers, partner.customer_id, 0, 30);
              const qty = qtyMap[item.id] ?? Math.max(tier.min_qty, reorder.suggested || 1);
              return (
                <div key={item.id} className="rounded-2xl border border-border/50 bg-card p-4 flex flex-col">
                  <div className="flex items-start justify-between mb-2 gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{item.name}</p>
                      <p className="text-[11px] font-mono text-muted-foreground">{item.code}</p>
                    </div>
                    {tier.on_list && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0"
                        style={{ background: INDIGO_BG, color: INDIGO }}>
                        {partner.tier.toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-2 mb-3">
                    <p className="text-lg font-bold font-mono text-foreground">{formatINR(tier.rate_paise)}</p>
                    <p className="text-[11px] text-muted-foreground">/ {item.primary_uom_symbol ?? 'NOS'}</p>
                  </div>
                  {tier.discount_percent > 0 && (
                    <p className="text-[11px] text-muted-foreground mb-2">
                      Discount: <span className="font-mono">{tier.discount_percent}%</span>
                    </p>
                  )}
                  {reorder.suggested > 0 && (
                    <div className="flex items-center gap-1.5 mb-3 text-[11px]" style={{ color: INDIGO }}>
                      <Sparkles className="h-3 w-3" />
                      <span>Suggested reorder: <span className="font-mono font-semibold">{reorder.suggested}</span></span>
                    </div>
                  )}
                  <div className="mt-auto flex items-center gap-2">
                    <div className="flex items-center rounded-lg border border-border/50">
                      <button
                        onClick={() => setQty(item.id, qty - 1)}
                        className="px-2 py-1.5 text-muted-foreground hover:text-foreground"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <input
                        type="number"
                        value={qty}
                        onChange={e => setQty(item.id, parseInt(e.target.value, 10) || 1)}
                        className="w-12 text-center bg-transparent text-sm font-mono outline-none"
                      />
                      <button
                        onClick={() => setQty(item.id, qty + 1)}
                        className="px-2 py-1.5 text-muted-foreground hover:text-foreground"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleAdd(item)}
                      disabled={busyItem === item.id}
                      className="flex-1 rounded-lg gap-1.5"
                      style={{ background: INDIGO, color: 'white' }}
                    >
                      {busyItem === item.id
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <ShoppingCart className="h-3.5 w-3.5" />}
                      Add
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PartnerLayout>
  );
}
