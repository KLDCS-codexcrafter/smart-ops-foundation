/**
 * SocialProofReport.tsx — Sprint 13c · Module ch-r-social-proof
 * Admin view of social proof signals across catalog.
 * Teal-500 accent. Read-only.
 */

import { useEffect, useMemo, useState } from 'react';
import { Sparkles, TrendingUp, Star, Users } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { signalsForCatalog, type SocialProofSignal } from '@/lib/social-proof-engine';
import { logAudit } from '@/lib/card-audit-engine';

const ENTITY = 'SMRT';

interface ItemLite { id: string; name?: string; itemName?: string; category?: string }
interface OrderRowLite {
  placed_at?: string; city?: string;
  items?: { item_id: string; qty: number }[];
  item_id?: string; qty?: number;
}
interface RatingLite { item_id?: string; stars?: number; rated_at?: string }

function ls<T>(k: string): T[] {
  try { const r = localStorage.getItem(k); return r ? (JSON.parse(r) as T[]) : []; } catch { return []; }
}

function loadItems(): ItemLite[] {
  try {
    const raw = localStorage.getItem('erp_group_item_master');
    if (raw) return JSON.parse(raw) as ItemLite[];
  } catch { /* ignore */ }
  return [];
}

const KIND_ICON: Record<SocialProofSignal['kind'], React.ComponentType<{ className?: string }>> = {
  recent_buyers: Users,
  trending_location: TrendingUp,
  top_rated: Star,
  rating_count: Star,
};

const KIND_LABEL: Record<SocialProofSignal['kind'], string> = {
  recent_buyers: 'Recent Buyers',
  trending_location: 'Trending',
  top_rated: 'Top Rated',
  rating_count: 'Reviewed',
};

export function SocialProofReportPanel() {
  const [items, setItems] = useState<ItemLite[]>([]);
  const [orderRows, setOrderRows] = useState<OrderRowLite[]>([]);
  const [ratings, setRatings] = useState<RatingLite[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setItems(loadItems());
    const all: OrderRowLite[] = [];
    for (const k of [`erp_customer_orders_${ENTITY}`, `erp_distributor_orders_${ENTITY}`]) {
      try {
        const raw = localStorage.getItem(k);
        if (raw) all.push(...(JSON.parse(raw) as OrderRowLite[]));
      } catch { /* ignore */ }
    }
    setOrderRows(all);
    setRatings(ls<RatingLite>(`erp_item_ratings_${ENTITY}`));
    // [JWT] GET /api/social-proof/admin
    logAudit({
      entityCode: ENTITY, userId: 'system', userName: 'system',
      cardId: 'customer-hub', moduleId: 'ch-r-social-proof',
      action: 'report_run', refType: 'report', refId: 'social_proof',
      refLabel: 'Social Proof Dashboard',
    });
  }, []);

  const flatOrders = useMemo(() => {
    const out: { item_id: string; qty: number; placed_at: string; city?: string }[] = [];
    for (const o of orderRows) {
      if (!o.placed_at) continue;
      if (Array.isArray(o.items)) {
        for (const it of o.items) {
          out.push({ item_id: it.item_id, qty: it.qty, placed_at: o.placed_at, city: o.city });
        }
      } else if (o.item_id) {
        out.push({ item_id: o.item_id, qty: o.qty ?? 1, placed_at: o.placed_at, city: o.city });
      }
    }
    return out;
  }, [orderRows]);

  const flatRatings = useMemo(() =>
    ratings
      .filter(r => r.item_id && typeof r.stars === 'number')
      .map(r => ({
        item_id: r.item_id as string,
        stars: r.stars as number,
        rated_at: r.rated_at ?? new Date().toISOString(),
      })),
  [ratings]);

  const signalMap = useMemo(
    () => signalsForCatalog(items.map(i => i.id), flatOrders, flatRatings),
    [items, flatOrders, flatRatings],
  );

  const itemRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items
      .map(i => ({
        item: i,
        name: i.name ?? i.itemName ?? i.id,
        signals: signalMap.get(i.id) ?? [],
      }))
      .filter(r => r.signals.length > 0)
      .filter(r => !q || r.name.toLowerCase().includes(q))
      .sort((a, b) =>
        (b.signals[0]?.strength ?? 0) - (a.signals[0]?.strength ?? 0),
      );
  }, [items, signalMap, search]);

  const totals = useMemo(() => {
    let recent = 0, trending = 0, topRated = 0;
    for (const arr of signalMap.values()) {
      for (const s of arr) {
        if (s.kind === 'recent_buyers') recent++;
        if (s.kind === 'trending_location') trending++;
        if (s.kind === 'top_rated') topRated++;
      }
    }
    return { recent, trending, topRated, items: itemRows.length };
  }, [signalMap, itemRows]);

  return (
    <div className="space-y-4 animate-fade-in max-w-6xl">
      <header>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-teal-500" />
          Social Proof Dashboard
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Items currently surfacing trust signals to shoppers
        </p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3">
          <div className="text-[11px] text-muted-foreground">Items With Signals</div>
          <p className="text-2xl font-bold font-mono mt-1 text-teal-600">{totals.items}</p>
        </Card>
        <Card className="p-3">
          <div className="text-[11px] text-muted-foreground">Recent-Buyer Pings</div>
          <p className="text-2xl font-bold font-mono mt-1">{totals.recent}</p>
        </Card>
        <Card className="p-3">
          <div className="text-[11px] text-muted-foreground">Trending Locally</div>
          <p className="text-2xl font-bold font-mono mt-1">{totals.trending}</p>
        </Card>
        <Card className="p-3">
          <div className="text-[11px] text-muted-foreground">Top-Rated</div>
          <p className="text-2xl font-bold font-mono mt-1">{totals.topRated}</p>
        </Card>
      </div>

      <Card className="p-3">
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search item name..."
          className="h-8 text-xs max-w-xs"
        />
      </Card>

      <Card className="p-0 overflow-hidden">
        {itemRows.length === 0 ? (
          <p className="text-xs text-muted-foreground py-10 text-center">
            No items currently meet signal thresholds. As orders & ratings grow, signals appear here.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="border-b border-border bg-muted/30">
                <tr className="text-muted-foreground">
                  <th className="text-left py-2 px-3 font-medium">Item</th>
                  <th className="text-left py-2 px-3 font-medium">Active Signals</th>
                  <th className="text-right py-2 px-3 font-medium">Strength</th>
                </tr>
              </thead>
              <tbody>
                {itemRows.map(row => (
                  <tr key={row.item.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="py-2 px-3 font-medium">{row.name}</td>
                    <td className="py-2 px-3">
                      <div className="flex flex-col gap-1">
                        {row.signals.map((s, i) => {
                          const Icon = KIND_ICON[s.kind];
                          return (
                            <div key={`${row.item.id}-${i}`} className="flex items-center gap-2">
                              <Badge variant="outline" className="text-[9px] gap-1 border-teal-500/30 text-teal-700 dark:text-teal-300">
                                <Icon className="h-2.5 w-2.5" />
                                {KIND_LABEL[s.kind]}
                              </Badge>
                              <span className="text-[11px] text-muted-foreground">{s.text}</span>
                            </div>
                          );
                        })}
                      </div>
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-teal-600">
                      {row.signals[0]?.strength ?? 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

export default SocialProofReportPanel;
