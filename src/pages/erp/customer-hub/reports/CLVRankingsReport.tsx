/**
 * CLVRankingsReport.tsx — Sprint 13c · Module ch-r-clv
 * Ranks customers by projected 12-month CLV.
 * Teal-500 accent. Read-only.
 */

import { useEffect, useMemo, useState } from 'react';
import { Trophy, Crown, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { formatINR } from '@/lib/india-validations';
import { computeCLV } from '@/lib/customer-clv-engine';
import type { CLVResult } from '@/types/customer-clv';
import { logAudit } from '@/lib/card-audit-engine';
import { DEFAULT_ENTITY_SHORTCODE } from '@/lib/default-entity';

const ENTITY = DEFAULT_ENTITY_SHORTCODE;

interface CustomerLite { id: string; legalName?: string; partyName?: string; city?: string }
interface OrderLite {
  customer_id?: string; placed_at?: string;
  order_value_paise?: number; total_paise?: number;
}

function ls<T>(k: string): T[] {
  try { const r = localStorage.getItem(k); return r ? (JSON.parse(r) as T[]) : []; } catch { return []; }
}

function loadCustomers(): CustomerLite[] {
  try {
    const raw = localStorage.getItem('erp_group_customer_master');
    if (raw) return JSON.parse(raw) as CustomerLite[];
  } catch { /* ignore */ }
  return [];
}

function loadOrders(): OrderLite[] {
  const keys = [
    `erp_customer_orders_${ENTITY}`,
    `erp_distributor_orders_${ENTITY}`,
  ];
  const out: OrderLite[] = [];
  for (const k of keys) {
    try {
      const raw = localStorage.getItem(k);
      if (raw) out.push(...(JSON.parse(raw) as OrderLite[]));
    } catch { /* ignore */ }
  }
  return out;
}

const TIER_LABEL: Record<CLVResult['clv_rank_tier'], string> = {
  vip: 'VIP', growth: 'Growth', standard: 'Standard',
  at_risk: 'At Risk', churned: 'Churned',
};

const TIER_COLOR: Record<CLVResult['clv_rank_tier'], string> = {
  vip: 'hsl(45, 85%, 55%)',
  growth: 'hsl(160, 70%, 45%)',
  standard: 'hsl(220, 9%, 60%)',
  at_risk: 'hsl(25, 90%, 55%)',
  churned: 'hsl(0, 0%, 50%)',
};

export function CLVRankingsReportPanel() {
  const [customers, setCustomers] = useState<CustomerLite[]>([]);
  const [orders, setOrders] = useState<OrderLite[]>([]);
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState<string>('all');

  useEffect(() => {
    setCustomers(loadCustomers());
    setOrders(loadOrders());
    // [JWT] GET /api/customers/clv-rankings
    logAudit({
      entityCode: ENTITY, userId: 'system', userName: 'system',
      cardId: 'customer-hub', moduleId: 'ch-r-clv',
      action: 'report_run', refType: 'report', refId: 'clv_rankings',
      refLabel: 'CLV Rankings',
    });
  }, []);

  const ranked = useMemo(() => {
    return customers.map(c => {
      const myOrders = orders
        .filter(o => o.customer_id === c.id && o.placed_at)
        .map(o => ({
          placed_at: o.placed_at as string,
          value_paise: o.order_value_paise ?? o.total_paise ?? 0,
        }))
        .sort((a, b) => a.placed_at.localeCompare(b.placed_at));
      const first = myOrders[0]?.placed_at ?? null;
      const last  = myOrders[myOrders.length - 1]?.placed_at ?? null;
      const clv = computeCLV({
        customer_id: c.id,
        historical_orders: myOrders,
        first_order_at: first,
        last_order_at: last,
        has_churned: false,
      });
      const name = c.legalName ?? c.partyName ?? c.id;
      return { ...clv, name, city: c.city ?? '—' };
    }).sort((a, b) => b.projected_12m_value_paise - a.projected_12m_value_paise);
  }, [customers, orders]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return ranked.filter(r =>
      (tierFilter === 'all' || r.clv_rank_tier === tierFilter) &&
      (!q || r.name.toLowerCase().includes(q) || r.city.toLowerCase().includes(q)),
    );
  }, [ranked, search, tierFilter]);

  const totals = useMemo(() => {
    const projected = ranked.reduce((s, r) => s + r.projected_12m_value_paise, 0);
    const vipCount = ranked.filter(r => r.clv_rank_tier === 'vip').length;
    return { projected, vipCount };
  }, [ranked]);

  const TIER_FILTERS: { id: string; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'vip', label: 'VIP' },
    { id: 'growth', label: 'Growth' },
    { id: 'standard', label: 'Standard' },
    { id: 'at_risk', label: 'At Risk' },
  ];

  return (
    <div className="space-y-4 animate-fade-in max-w-6xl">
      <header>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Trophy className="h-5 w-5 text-teal-500" />
          CLV Rankings
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Customers ranked by projected 12-month value · sortable, filterable
        </p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card className="p-3">
          <div className="flex items-center gap-2 text-muted-foreground text-[11px]">
            <Crown className="h-3.5 w-3.5" /> VIP Customers
          </div>
          <p className="text-2xl font-bold font-mono mt-1 text-teal-600">{totals.vipCount}</p>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2 text-muted-foreground text-[11px]">
            <TrendingUp className="h-3.5 w-3.5" /> Total Projected (12m)
          </div>
          <p className="text-lg font-bold font-mono mt-1">{formatINR(totals.projected)}</p>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2 text-muted-foreground text-[11px]">
            <Trophy className="h-3.5 w-3.5" /> Customers Ranked
          </div>
          <p className="text-2xl font-bold font-mono mt-1">{ranked.length}</p>
        </Card>
      </div>

      <Card className="p-3 flex flex-col md:flex-row gap-2 md:items-center">
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search name or city..."
          className="h-8 text-xs flex-1 max-w-xs"
        />
        <div className="flex gap-1 flex-wrap">
          {TIER_FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => setTierFilter(f.id)}
              className={`px-2.5 py-1 text-[10px] rounded-md border transition-colors ${
                tierFilter === f.id
                  ? 'bg-teal-500/15 border-teal-500/40 text-teal-700 dark:text-teal-300'
                  : 'border-border text-muted-foreground hover:bg-muted/40'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        {filtered.length === 0 ? (
          <p className="text-xs text-muted-foreground py-10 text-center">No customers match.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="border-b border-border bg-muted/30">
                <tr className="text-muted-foreground">
                  <th className="text-left py-2 px-3 font-medium">Rank</th>
                  <th className="text-left py-2 px-3 font-medium">Customer</th>
                  <th className="text-left py-2 px-3 font-medium">City</th>
                  <th className="text-left py-2 px-3 font-medium">Tier</th>
                  <th className="text-right py-2 px-3 font-medium">AOV</th>
                  <th className="text-right py-2 px-3 font-medium">Freq/yr</th>
                  <th className="text-right py-2 px-3 font-medium">Retention</th>
                  <th className="text-right py-2 px-3 font-medium">12m Projected</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, idx) => (
                  <tr key={r.customer_id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="py-2 px-3 font-mono text-muted-foreground">#{idx + 1}</td>
                    <td className="py-2 px-3 font-medium">{r.name}</td>
                    <td className="py-2 px-3 text-muted-foreground">{r.city}</td>
                    <td className="py-2 px-3">
                      <Badge
                        variant="outline" className="text-[9px] uppercase"
                        style={{ borderColor: TIER_COLOR[r.clv_rank_tier], color: TIER_COLOR[r.clv_rank_tier] }}
                      >
                        {TIER_LABEL[r.clv_rank_tier]}
                      </Badge>
                    </td>
                    <td className="py-2 px-3 text-right font-mono">{formatINR(r.avg_order_value_paise)}</td>
                    <td className="py-2 px-3 text-right font-mono">{r.purchase_frequency_per_year}</td>
                    <td className="py-2 px-3 text-right font-mono">{(r.retention_probability * 100).toFixed(0)}%</td>
                    <td className="py-2 px-3 text-right font-mono font-semibold text-teal-600">
                      {formatINR(r.projected_12m_value_paise)}
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

export default CLVRankingsReportPanel;
