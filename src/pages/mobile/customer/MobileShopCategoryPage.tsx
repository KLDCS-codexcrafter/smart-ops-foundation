/**
 * MobileShopCategoryPage.tsx — AM.4 Pass 1
 * Category browse · groups existing catalog by stock_group_name / category_type.
 */
import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Package } from 'lucide-react';
import type { InventoryItem } from '@/types/inventory-item';

const CATALOG_KEY = 'erp_inventory_items';
function loadList<T>(key: string): T[] { try { const raw = localStorage.getItem(key); return raw ? (JSON.parse(raw) as T[]) : []; } catch { return []; } }
const fmtINR = (paise: number) => `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function MobileShopCategoryPage() {
  const navigate = useNavigate();
  const params = useParams<{ name: string }>();
  const categoryName = decodeURIComponent(params.name ?? '');

  const items = useMemo<InventoryItem[]>(() => loadList<InventoryItem>(CATALOG_KEY), []);
  const filtered = useMemo(() =>
    items.filter(i => (i.stock_group_name ?? i.category_type ?? 'Other') === categoryName).slice(0, 200),
    [items, categoryName],
  );

  return (
    <div className="p-4 max-w-md mx-auto space-y-3 pb-12 animate-fade-in">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-base font-semibold truncate">{categoryName}</h1>
      </div>
      {filtered.length === 0 ? (
        <Card className="p-6 text-center">
          <Package className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No products in this category</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(it => (
            <Card key={it.id} className="p-3 cursor-pointer" onClick={() => navigate(`/mobile/customer/product/${encodeURIComponent(it.id)}`)}>
              <p className="text-sm font-medium truncate">{it.name}</p>
              <p className="text-[10px] text-muted-foreground font-mono">{it.code} · {it.primary_uom_symbol ?? 'NOS'}</p>
              <p className="text-sm font-mono font-semibold mt-1">{fmtINR(Math.round((it.std_selling_rate ?? 0) * 100))}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
