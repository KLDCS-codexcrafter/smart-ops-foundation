/**
 * MobileShopSearchPage.tsx — AM.4 Pass 1
 * Consumer commerce search over existing `erp_inventory_items` catalog.
 * NO fabricated products/prices.
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Search as SearchIcon } from 'lucide-react';
import type { InventoryItem } from '@/types/inventory-item';

const CATALOG_KEY = 'erp_inventory_items';
function loadList<T>(key: string): T[] { try { const raw = localStorage.getItem(key); return raw ? (JSON.parse(raw) as T[]) : []; } catch { return []; } }
const fmtINR = (paise: number) => `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function MobileShopSearchPage() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const items = useMemo<InventoryItem[]>(() => loadList<InventoryItem>(CATALOG_KEY), []);

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return [];
    return items.filter(i =>
      i.name.toLowerCase().includes(term) ||
      i.code.toLowerCase().includes(term) ||
      (i.brand_name ?? '').toLowerCase().includes(term) ||
      (i.stock_group_name ?? '').toLowerCase().includes(term),
    ).slice(0, 80);
  }, [items, q]);

  return (
    <div className="p-4 max-w-md mx-auto space-y-3 pb-12 animate-fade-in">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-base font-semibold">Search</h1>
      </div>
      <div className="relative">
        <SearchIcon className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
        <Input autoFocus placeholder="Product · code · brand · category" value={q} onChange={e => setQ(e.target.value)} className="pl-8" />
      </div>
      {q.trim() === '' ? (
        <p className="text-xs text-muted-foreground text-center pt-6">Type to search the catalog.</p>
      ) : results.length === 0 ? (
        <Card className="p-6 text-center">
          <p className="text-sm text-muted-foreground">No matches for &ldquo;{q}&rdquo;.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {results.map(it => (
            <Card key={it.id} className="p-3 cursor-pointer" onClick={() => navigate(`/mobile/customer/product/${encodeURIComponent(it.id)}`)}>
              <p className="text-sm font-medium truncate">{it.name}</p>
              <p className="text-[10px] text-muted-foreground font-mono">{it.code} · {it.brand_name ?? '—'}</p>
              <p className="text-sm font-mono font-semibold mt-1">{fmtINR(Math.round((it.std_selling_rate ?? 0) * 100))}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
