/**
 * MobileDistributorCatalogPage.tsx — Mobile distributor catalog browse
 * Sprint T-Phase-1.1.1l-d · Audit fix round 1.
 * Writes into the SAME IndexedDB cart store as the web (distributor-cart-store)
 * so the cart syncs across web + mobile.
 */
import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Search, Plus, Package, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { MobileSession } from '../MobileRouter';
import type { InventoryItem } from '@/types/inventory-item';
import { upsertLine, isAvailable } from '@/lib/distributor-cart-store';
import type { DistributorOrderLine } from '@/types/distributor-order';

const CATALOG_KEY = 'erp_inventory_items';

function readSession(): MobileSession | null {
  try { const raw = sessionStorage.getItem('opx_mobile_session'); return raw ? (JSON.parse(raw) as MobileSession) : null; } catch { return null; }
}
function loadList<T>(key: string): T[] { try { const raw = localStorage.getItem(key); return raw ? (JSON.parse(raw) as T[]) : []; } catch { return []; } }

const fmtINR = (paise: number) => `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function MobileDistributorCatalogPage() {
  const navigate = useNavigate();
  const session = useMemo(() => readSession(), []);
  const [search, setSearch] = useState('');
  const [busyItemId, setBusyItemId] = useState<string | null>(null);

  const items = useMemo<InventoryItem[]>(() => loadList<InventoryItem>(CATALOG_KEY), []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items.slice(0, 100);
    return items.filter(i => i.name.toLowerCase().includes(q) || i.code.toLowerCase().includes(q)).slice(0, 100);
  }, [items, search]);

  useEffect(() => {
    if (!isAvailable()) toast.error('Offline cart unavailable in this browser');
  }, []);

  const handleAdd = useCallback(async (item: InventoryItem) => {
    if (!session || !session.user_id) return;
    if (!isAvailable()) return;
    setBusyItemId(item.id);
    try {
      const ratePaise = Math.round((item.std_selling_rate ?? 0) * 100);
      const taxable = ratePaise; // qty 1
      const line: DistributorOrderLine = {
        id: `pol_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        item_id: item.id,
        item_code: item.code,
        item_name: item.name,
        uom: item.primary_uom_symbol ?? 'NOS',
        qty: 1,
        rate_paise: ratePaise,
        discount_percent: 0,
        taxable_paise: taxable,
        cgst_paise: 0,
        sgst_paise: 0,
        igst_paise: 0,
        total_paise: taxable,
        hsn_sac: null,
      };
      // [JWT] POST /api/distributor/cart-lines
      await upsertLine(session.user_id, session.entity_code, line);
      toast.success(`Added ${item.name}`);
    } catch (e) {
      toast.error('Could not add', { description: e instanceof Error ? e.message : 'Storage error' });
    } finally {
      setBusyItemId(null);
    }
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
                <Button size="sm" variant="outline" disabled={busyItemId === item.id} onClick={() => void handleAdd(item)}>
                  {busyItemId === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
