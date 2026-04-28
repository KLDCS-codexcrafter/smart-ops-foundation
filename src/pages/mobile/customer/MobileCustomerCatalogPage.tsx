/**
 * MobileCustomerCatalogPage.tsx — Mobile customer catalog
 * Sprint T-Phase-1.1.1l-d · Reads same CATALOG_KEY as web; writes to customerCartKey for sync.
 */
import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Search, Plus, Package } from 'lucide-react';
import { toast } from 'sonner';
import type { MobileSession } from '../MobileRouter';
import type { InventoryItem } from '@/types/inventory-item';
import {
  type CustomerCart, type CustomerCartLine,
  customerCartKey,
} from '@/types/customer-order';

const CATALOG_KEY = 'erp_inventory_items';

function readSession(): MobileSession | null {
  try { const raw = sessionStorage.getItem('opx_mobile_session'); return raw ? (JSON.parse(raw) as MobileSession) : null; } catch { return null; }
}
function loadList<T>(key: string): T[] { try { const raw = localStorage.getItem(key); return raw ? (JSON.parse(raw) as T[]) : []; } catch { return []; } }

const fmtINR = (paise: number) => `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function MobileCustomerCatalogPage() {
  const navigate = useNavigate();
  const session = useMemo(() => readSession(), []);
  const [search, setSearch] = useState('');

  const items = useMemo<InventoryItem[]>(() => loadList<InventoryItem>(CATALOG_KEY), []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items.slice(0, 100);
    return items.filter(i => i.name.toLowerCase().includes(q) || i.code.toLowerCase().includes(q)).slice(0, 100);
  }, [items, search]);

  const handleAdd = useCallback((item: InventoryItem) => {
    if (!session) return;
    const customerId = session.user_id ?? 'anon';
    const key = customerCartKey(session.entity_code);
    const allCarts = loadList<CustomerCart>(key);
    let cart = allCarts.find(c => c.customer_id === customerId);
    const now = new Date().toISOString();
    const unit = Math.round((item.std_selling_rate ?? 0) * 100);

    if (!cart) {
      cart = {
        id: customerId, customer_id: customerId, entity_code: session.entity_code,
        lines: [], subtotal_paise: 0, created_at: now, updated_at: now,
      };
      allCarts.push(cart);
    }
    const idx = cart.lines.findIndex(l => l.item_id === item.id);
    if (idx >= 0) {
      cart.lines[idx] = {
        ...cart.lines[idx],
        qty: cart.lines[idx].qty + 1,
        line_total_paise: (cart.lines[idx].qty + 1) * cart.lines[idx].unit_price_paise,
      };
    } else {
      const line: CustomerCartLine = {
        id: `cl-${Date.now()}-${idx}`,
        item_id: item.id, item_code: item.code, item_name: item.name,
        uom: item.primary_uom_symbol ?? 'NOS',
        qty: 1, unit_price_paise: unit, line_total_paise: unit,
      };
      cart.lines.push(line);
    }
    cart.subtotal_paise = cart.lines.reduce((s, l) => s + l.line_total_paise, 0);
    cart.updated_at = now;
    // [JWT] POST /api/customer/cart
    localStorage.setItem(key, JSON.stringify(allCarts));
    toast.success(`Added ${item.name}`);
  }, [session]);

  if (!session) return null;

  return (
    <div className="p-4 max-w-md mx-auto space-y-3 pb-12">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-base font-semibold">Browse Catalog</h1>
        <Badge variant="outline" className="ml-auto text-[10px]">{filtered.length}</Badge>
      </div>

      <div className="relative">
        <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
        <Input placeholder="Search products" value={search} onChange={e => setSearch(e.target.value)} className="pl-8" />
      </div>

      {filtered.length === 0 ? (
        <Card className="p-6 text-center">
          <Package className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No products found</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(item => (
            <Card key={item.id} className="p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{item.name}</p>
                  <p className="text-[10px] text-muted-foreground font-mono">
                    {item.code} · {item.primary_uom_symbol ?? 'NOS'}
                  </p>
                  <p className="text-sm font-mono font-semibold mt-1">
                    {fmtINR(Math.round((item.std_selling_rate ?? 0) * 100))}
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => handleAdd(item)}>
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
