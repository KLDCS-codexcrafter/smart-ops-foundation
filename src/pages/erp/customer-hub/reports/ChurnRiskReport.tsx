/**
 * ChurnRiskReport.tsx — Sprint 13c · Module ch-r-churn
 * At-risk customers ranked with retention nudge suggestions.
 * Teal-500 accent. Read-only.
 */

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Activity, Mail, Gift } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { computeChurn, highestChurnRisk } from '@/lib/customer-churn-engine';
import type { ChurnResult, ChurnRiskTier } from '@/lib/customer-churn-engine';
import { logAudit } from '@/lib/card-audit-engine';
import { toast } from 'sonner';
import { DEFAULT_ENTITY_SHORTCODE } from '@/lib/default-entity';

const ENTITY = DEFAULT_ENTITY_SHORTCODE;

interface CustomerLite { id: string; legalName?: string; partyName?: string; city?: string }
interface OrderLite {
  customer_id?: string; placed_at?: string;
  order_value_paise?: number; total_paise?: number;
}
interface ComplaintLite { customer_id?: string; status?: string }
interface RatingLite { customer_id?: string; stars?: number; rated_at?: string }

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
  const out: OrderLite[] = [];
  for (const k of [`erp_customer_orders_${ENTITY}`, `erp_distributor_orders_${ENTITY}`]) {
    try {
      const raw = localStorage.getItem(k);
      if (raw) out.push(...(JSON.parse(raw) as OrderLite[]));
    } catch { /* ignore */ }
  }
  return out;
}

const TIER_COLOR: Record<ChurnRiskTier, string> = {
  safe: 'hsl(160, 70%, 45%)',
  watch: 'hsl(45, 85%, 55%)',
  at_risk: 'hsl(25, 90%, 55%)',
  critical: 'hsl(0, 80%, 55%)',
  gone: 'hsl(0, 0%, 50%)',
};

const TIER_LABEL: Record<ChurnRiskTier, string> = {
  safe: 'Safe', watch: 'Watch', at_risk: 'At Risk', critical: 'Critical', gone: 'Lost',
};

export function ChurnRiskReportPanel() {
  const [customers, setCustomers] = useState<CustomerLite[]>([]);
  const [orders, setOrders] = useState<OrderLite[]>([]);
  const [complaints, setComplaints] = useState<ComplaintLite[]>([]);
  const [ratings, setRatings] = useState<RatingLite[]>([]);

  useEffect(() => {
    setCustomers(loadCustomers());
    setOrders(loadOrders());
    setComplaints(ls<ComplaintLite>(`erp_customer_complaints_${ENTITY}`));
    setRatings(ls<RatingLite>(`erp_item_ratings_${ENTITY}`));
    // [JWT] GET /api/customers/churn-risk
    logAudit({
      entityCode: ENTITY, userId: 'system', userName: 'system',
      cardId: 'customer-hub', moduleId: 'ch-r-churn',
      action: 'report_run', refType: 'report', refId: 'churn_risk',
      refLabel: 'Churn Risk',
    });
  }, []);

  const results = useMemo(() => {
    return customers.map(c => {
      const myOrders = orders
        .filter(o => o.customer_id === c.id && o.placed_at)
        .map(o => ({
          placed_at: o.placed_at as string,
          value_paise: o.order_value_paise ?? o.total_paise ?? 0,
        }))
        .sort((a, b) => a.placed_at.localeCompare(b.placed_at));
      const open = complaints.filter(x => x.customer_id === c.id && x.status !== 'resolved').length;
      const myRatings = ratings
        .filter(r => r.customer_id === c.id && typeof r.stars === 'number')
        .sort((a, b) => (b.rated_at ?? '').localeCompare(a.rated_at ?? ''))
        .slice(0, 5);
      const avg = myRatings.length > 0
        ? myRatings.reduce((s, r) => s + (r.stars ?? 0), 0) / myRatings.length
        : null;

      const r = computeChurn({
        customer_id: c.id,
        historical_orders: myOrders,
        first_order_at: myOrders[0]?.placed_at ?? null,
        last_order_at: myOrders[myOrders.length - 1]?.placed_at ?? null,
        open_complaints: open,
        recent_rating_avg: avg,
      });
      const name = c.legalName ?? c.partyName ?? c.id;
      return { ...r, name };
    });
  }, [customers, orders, complaints, ratings]);

  const topRisk = useMemo(() => highestChurnRisk(results, 25), [results]);

  const tally = useMemo(() => {
    const t: Record<ChurnRiskTier, number> = { safe: 0, watch: 0, at_risk: 0, critical: 0, gone: 0 };
    for (const r of results) t[r.risk_tier]++;
    return t;
  }, [results]);

  function nudgeAction(r: ChurnResult & { name: string }, kind: 'email' | 'reward') {
    // [JWT] POST /api/customers/{id}/nudge
    logAudit({
      entityCode: ENTITY, userId: 'system', userName: 'system',
      cardId: 'customer-hub', moduleId: 'ch-r-churn',
      action: 'master_save',
      refType: 'churn_nudge', refId: r.customer_id,
      refLabel: `${kind} → ${r.name}`,
    });
    toast.success(`${kind === 'email' ? 'Win-back email' : 'Reward voucher'} queued for ${r.name}`);
  }

  return (
    <div className="space-y-4 animate-fade-in max-w-6xl">
      <header>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-teal-500" />
          Churn Risk
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Customers losing engagement · take action before they leave
        </p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {(Object.keys(tally) as ChurnRiskTier[]).map(t => (
          <Card key={t} className="p-3">
            <div className="text-[10px] uppercase tracking-wide" style={{ color: TIER_COLOR[t] }}>
              {TIER_LABEL[t]}
            </div>
            <p className="text-2xl font-bold font-mono mt-1">{tally[t]}</p>
          </Card>
        ))}
      </div>

      <Card className="p-4">
        <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Activity className="h-4 w-4 text-teal-500" />
          Top 25 At-Risk Customers
        </h2>
        {topRisk.length === 0 ? (
          <p className="text-xs text-muted-foreground py-10 text-center">
            No at-risk customers. Healthy engagement across base.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="border-b border-border">
                <tr className="text-muted-foreground">
                  <th className="text-left py-2 px-2 font-medium">Customer</th>
                  <th className="text-left py-2 px-2 font-medium">Risk</th>
                  <th className="text-right py-2 px-2 font-medium">Probability</th>
                  <th className="text-right py-2 px-2 font-medium">Days Silent</th>
                  <th className="text-left py-2 px-2 font-medium">Signal</th>
                  <th className="text-right py-2 px-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {topRisk.map((r) => {
                  const ranked = r as ChurnResult & { name: string };
                  return (
                    <tr key={r.customer_id} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="py-2 px-2 font-medium">{ranked.name}</td>
                      <td className="py-2 px-2">
                        <Badge
                          variant="outline" className="text-[9px] uppercase"
                          style={{ borderColor: TIER_COLOR[r.risk_tier], color: TIER_COLOR[r.risk_tier] }}
                        >
                          {TIER_LABEL[r.risk_tier]}
                        </Badge>
                      </td>
                      <td className="py-2 px-2 text-right font-mono font-semibold">
                        {(r.churn_probability * 100).toFixed(0)}%
                      </td>
                      <td className="py-2 px-2 text-right font-mono">{r.days_since_last_order}</td>
                      <td className="py-2 px-2 text-muted-foreground">{r.signal}</td>
                      <td className="py-2 px-2 text-right">
                        <div className="inline-flex gap-1">
                          <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]"
                            onClick={() => nudgeAction(ranked, 'email')}>
                            <Mail className="h-3 w-3 mr-1" /> Email
                          </Button>
                          <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]"
                            onClick={() => nudgeAction(ranked, 'reward')}>
                            <Gift className="h-3 w-3 mr-1" /> Reward
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

export default ChurnRiskReportPanel;
