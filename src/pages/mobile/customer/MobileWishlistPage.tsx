/**
 * MobileWishlistPage.tsx — AM.4 Pass 2
 * Wishlist stored in localStorage (per entity × customer).
 * Hydrates from existing catalog (`erp_inventory_items`) · no fabricated data.
 */
import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Heart, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { MobileSession } from '../MobileRouter';
import type { InventoryItem } from '@/types/inventory-item';

const CATALOG_KEY = 'erp_inventory_items';
const WISHLIST_KEY = (entity: string, customer: string) => `erp_customer_wishlist_${entity}_${customer}`;

function readSession(): MobileSession | null {
  try { const raw = sessionStorage.getItem('opx_mobile_session'); return raw ? (JSON.parse(raw) as MobileSession) : null; } catch { return null; }
}
function loadList<T>(key: string): T[] { try { const raw = localStorage.getItem(key); return raw ? (JSON.parse(raw) as T[]) : []; } catch { return []; } }
const fmtINR = (paise: number) => `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function MobileWishlistPage() {
  const navigate = useNavigate();
  const session = useMemo(() => readSession(), []);
  const customerId = session?.user_id ?? 'anon';
  const [bump, setBump] = useState(0);

  const ids = useMemo<string[]>(() => {
    if (!session) return [];
    return loadList<string>(WISHLIST_KEY(session.entity_code, customerId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, customerId, bump]);

  const items = useMemo(() => {
    const cat = loadList<InventoryItem>(CATALOG_KEY);
    return ids.map(id => cat.find(c => c.id === id)).filter((x): x is InventoryItem => !!x);
  }, [ids]);

  const remove = useCallback((id: string) => {
    if (!session) return;
    const next = ids.filter(x => x !== id);
    try { localStorage.setItem(WISHLIST_KEY(session.entity_code, customerId), JSON.stringify(next)); } catch { /* ignore */ }
    setBump(b => b + 1);
    toast.success('Removed');
  }, [session, ids, customerId]);

  if (!session) return null;

  return (
    <div className="p-4 max-w-md mx-auto space-y-3 pb-12 animate-fade-in">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4" /></Button>
        <h1 className="text-base font-semibold">Wishlist</h1>
      </div>
      {items.length === 0 ? (
        <Card className="p-6 text-center">
          <Heart className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No items in wishlist</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map(it => (
            <Card key={it.id} className="p-3 flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1 cursor-pointer" onClick={() => navigate(`/mobile/customer/product/${encodeURIComponent(it.id)}`)}>
                <p className="text-sm font-medium truncate">{it.name}</p>
                <p className="text-[10px] text-muted-foreground font-mono">{it.code}</p>
                <p className="text-sm font-mono font-semibold mt-1">{fmtINR(Math.round((it.std_selling_rate ?? 0) * 100))}</p>
              </div>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-red-600" onClick={() => remove(it.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
