/**
 * MobileDistributorCatalogPage.tsx — Mobile distributor catalog browse
 * Sprint T-Phase-1.1.1l-d · Reads inventory items, supports search + add to mobile cart.
 * Mobile cart uses session-scoped localStorage key for offline use; web cart uses IndexedDB.
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

const CATALOG_KEY = 'erp_inventory_items';
const mobileCartKey = (entity: string, userId: string) =>
  `opx_mobile_distributor_cart_${entity}_${userId}`;

interface MobileCartLine { item_id: string; item_code: string; item_name: string; uom: string; qty: number; rate_paise: number; }

function readSession(): MobileSession | null {
  try { const raw = sessionStorage.getItem('opx_mobile_session'); return raw ? (JSON.parse(raw) as MobileSession) : null; } catch { return null; }
}
function loadList<T>(key: string): T[] { try { const raw = localStorage.getItem(key); return raw ? (JSON.parse(raw) as T[]) : []; } catch { return []; } }

const fmtINR = (paise: number) => `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function MobileDistributorCatalogPage() {
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
    const key = mobileCartKey(session.entity_code, session.user_id ?? 'anon');
    const cart = loadList<MobileCartLine>(key);
    const idx = cart.findIndex(l => l.item_id === item.id);
    if (idx >= 0) {
      cart[idx] = { ...cart[idx], qty: cart[idx].qty + 1 };
    } else {
      cart.push({
        item_id: item.id,
        item_code: item.code,
        item_name: item.name,
        uom: item.primary_uom_symbol ?? 'NOS',
        qty: 1,
        rate_paise: Math.round((item.std_selling_rate ?? 0) * 100),
      });
    }
    // [JWT] POST /api/distributor/cart-lines
    localStorage.setItem(key, JSON.stringify(cart));
    toast.success(`Added ${item.name}`);
  }, [session]);

  if (!session) return null;

  return (
    <div className="p-4 max-w-md mx-auto space-y-3 pb-12">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-base font-semibold">Catalog</h1>
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
