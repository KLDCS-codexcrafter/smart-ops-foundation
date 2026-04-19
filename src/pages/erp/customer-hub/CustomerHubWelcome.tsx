/**
 * CustomerHubWelcome.tsx — Greeting · KPIs · loyalty summary · CLV top 10
 * Sprint 13a. Teal-500 accent. Mobile-responsive.
 */

import { useEffect, useMemo, useState } from 'react';
import {
  Users, Trophy, AlertTriangle, IndianRupee, Award, Gift,
  Tag, ShoppingBag, Sparkles, BarChart3,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatINR } from '@/lib/india-validations';
import { logAudit } from '@/lib/card-audit-engine';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import { computeCLV, topCLV } from '@/lib/customer-clv-engine';
import { computeChurn, highestChurnRisk } from '@/lib/customer-churn-engine';
import type { CLVResult } from '@/types/customer-clv';
import type { CustomerLoyaltyState, LoyaltyTier } from '@/types/customer-loyalty';
import { loyaltyStateKey } from '@/types/customer-loyalty';
import type { CustomerHubModule } from './CustomerHubSidebar';

interface CustomerLite {
  id: string;
  legalName?: string;
  partyName?: string;
  city?: string;
}

interface OrderLite {
  customer_id?: string;
  distributor_id?: string;
  placed_at?: string;
  order_value_paise?: number;
  total_paise?: number;
}

const ENTITY = 'SMRT';

function loadCustomers(): CustomerLite[] {
  try {
    // [JWT] GET /api/customer-master
    const raw = localStorage.getItem('erp_group_customer_master');
    if (raw) return JSON.parse(raw) as CustomerLite[];
  } catch { /* ignore */ }
  return [];
}

function loadOrders(): OrderLite[] {
  try {
    // [JWT] GET /api/orders
    const raw = localStorage.getItem(`erp_orders_${ENTITY}`);
    if (raw) return JSON.parse(raw) as OrderLite[];
  } catch { /* ignore */ }
  return [];
}

function loadLoyaltyStates(): CustomerLoyaltyState[] {
  try {
    // [JWT] GET /api/loyalty/states
    const raw = localStorage.getItem(loyaltyStateKey(ENTITY));
    if (raw) return JSON.parse(raw) as CustomerLoyaltyState[];
  } catch { /* ignore */ }
  return [];
}

function greetingFor(now: Date): string {
  const h = now.getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function tierBadgeClass(tier: CLVResult['clv_rank_tier']): string {
  switch (tier) {
    case 'vip':      return 'bg-teal-500/15 text-teal-600 border-teal-500/30';
    case 'growth':   return 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30';
    case 'standard': return 'bg-slate-500/15 text-slate-600 border-slate-500/30';
    case 'at_risk':  return 'bg-amber-500/15 text-amber-600 border-amber-500/30';
    case 'churned':  return 'bg-red-500/15 text-red-600 border-red-500/30';
  }
}

interface CustomerHubWelcomePanelProps {
  onModuleChange?: (m: CustomerHubModule) => void;
}

export function CustomerHubWelcomePanel({ onModuleChange }: CustomerHubWelcomePanelProps = {}) {
  const { entityCode, userId } = useCardEntitlement();
  const [now] = useState<Date>(() => new Date());

  const customers = useMemo(() => loadCustomers(), []);
  const orders    = useMemo(() => loadOrders(), []);
  const loyalty   = useMemo(() => loadLoyaltyStates(), []);

  // CLV per customer
  const clvResults = useMemo<CLVResult[]>(() => {
    return customers.map(c => {
      const myOrders = orders
        .filter(o => (o.customer_id ?? o.distributor_id) === c.id && o.placed_at)
        .map(o => ({
          placed_at: o.placed_at as string,
          value_paise: (o.order_value_paise ?? o.total_paise ?? 0),
        }));
      const sorted = [...myOrders].sort((a, b) => a.placed_at.localeCompare(b.placed_at));
      const first = sorted[0]?.placed_at ?? null;
      const last  = sorted[sorted.length - 1]?.placed_at ?? null;
      return computeCLV({
        customer_id: c.id,
        historical_orders: myOrders,
        first_order_at: first,
        last_order_at: last,
        has_churned: false,
      });
    });
  }, [customers, orders]);

  const topClv = useMemo(() => topCLV(clvResults, 10), [clvResults]);

  // G3: Churn computation for critical-risk banner
  const churnResults = useMemo(() => {
    return customers.map(c => {
      const myOrders = orders
        .filter(o => (o.customer_id ?? o.distributor_id) === c.id && o.placed_at)
        .map(o => ({
          placed_at: o.placed_at as string,
          value_paise: (o.order_value_paise ?? o.total_paise ?? 0),
        }));
      const sorted = [...myOrders].sort((a, b) => a.placed_at.localeCompare(b.placed_at));
      return computeChurn({
        customer_id: c.id,
        historical_orders: myOrders,
        first_order_at: sorted[0]?.placed_at ?? null,
        last_order_at: sorted[sorted.length - 1]?.placed_at ?? null,
        open_complaints: 0,
        recent_rating_avg: null,
      });
    });
  }, [customers, orders]);

  const critical = useMemo(
    () => highestChurnRisk(churnResults, 5).filter(r => r.risk_tier === 'critical'),
    [churnResults],
  );

  // KPIs
  const kpis = useMemo(() => {
    const totalCustomers = customers.length;
    const vipGrowth = clvResults.filter(c =>
      c.clv_rank_tier === 'vip' || c.clv_rank_tier === 'growth').length;
    const valid = clvResults.filter(c => c.projected_12m_value_paise > 0);
    const avgClv = valid.length === 0
      ? 0
      : Math.round(valid.reduce((s, c) => s + c.projected_12m_value_paise, 0) / valid.length);
    const atRisk = clvResults.filter(c => c.retention_probability < 0.3).length;
    return { totalCustomers, vipGrowth, avgClv, atRisk };
  }, [customers, clvResults]);

  // Loyalty summary
  const loyaltySummary = useMemo(() => {
    const active = loyalty.filter(l => l.points_balance > 0);
    const totalPoints = active.reduce((s, l) => s + l.points_balance, 0);
    const tierCounts: Record<LoyaltyTier, number> = {
      bronze: 0, silver: 0, gold: 0, platinum: 0,
    };
    for (const l of loyalty) tierCounts[l.current_tier]++;
    return { activeMembers: active.length, totalPoints, tierCounts };
  }, [loyalty]);

  // Card open audit
  useEffect(() => {
    logAudit({
      entityCode, userId, userName: userId,
      cardId: 'customer-hub',
      moduleId: 'ch-welcome',
      action: 'module_open',
    });
  }, [entityCode, userId]);

  const customerNameMap = useMemo(() => {
    const m = new Map<string, CustomerLite>();
    for (const c of customers) m.set(c.id, c);
    return m;
  }, [customers]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* GREETING */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {greetingFor(now)}, <span className="text-teal-600">{userId}</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Customer Hub · {entityCode} · {now.toLocaleDateString('en-IN', {
              day: '2-digit', month: 'short', year: 'numeric',
            })}
          </p>
        </div>
        <Badge variant="outline" className="self-start sm:self-end text-[10px] bg-teal-500/10 text-teal-600 border-teal-500/30">
          Sprint 13a · Foundation
        </Badge>
      </div>

      {/* G3: Critical churn risk banner */}
      {critical.length > 0 && (
        <Card className="bg-red-500/5 border-red-500/30">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">
                {critical.length} customer(s) at critical churn risk
              </p>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                Top: {critical[0].customer_id} — {critical[0].signal}
              </p>
            </div>
            {onModuleChange && (
              <Button
                variant="outline"
                size="sm"
                className="border-red-500/40 hover:bg-red-500/10 text-red-600"
                onClick={() => onModuleChange('ch-r-churn')}
              >
                View Dashboard
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* KPI CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="bg-card/60 backdrop-blur-xl border-teal-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Total Customers</p>
              <Users className="h-4 w-4 text-teal-500" />
            </div>
            <p className="text-2xl font-bold text-foreground font-mono">{kpis.totalCustomers}</p>
          </CardContent>
        </Card>
        <Card className="bg-card/60 backdrop-blur-xl border-emerald-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide">VIP + Growth</p>
              <Trophy className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-bold text-foreground font-mono">{kpis.vipGrowth}</p>
          </CardContent>
        </Card>
        <Card className="bg-card/60 backdrop-blur-xl border-teal-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Avg CLV (12m)</p>
              <IndianRupee className="h-4 w-4 text-teal-500" />
            </div>
            <p className="text-xl font-bold text-foreground font-mono">{formatINR(kpis.avgClv)}</p>
          </CardContent>
        </Card>
        <Card className="bg-card/60 backdrop-blur-xl border-amber-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide">At Risk</p>
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </div>
            <p className="text-2xl font-bold text-foreground font-mono">{kpis.atRisk}</p>
          </CardContent>
        </Card>
      </div>

      {/* LOYALTY SUMMARY */}
      <Card className="bg-card/60 backdrop-blur-xl">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-teal-500" />
              <h2 className="text-base font-semibold text-foreground">Loyalty Programme</h2>
            </div>
            <Badge variant="outline" className="text-[10px]">Active</Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-lg bg-teal-500/5 border border-teal-500/20 p-3">
              <p className="text-[11px] text-muted-foreground uppercase">Active members</p>
              <p className="text-2xl font-mono font-bold text-foreground">{loyaltySummary.activeMembers}</p>
            </div>
            <div className="rounded-lg bg-teal-500/5 border border-teal-500/20 p-3">
              <p className="text-[11px] text-muted-foreground uppercase">Points outstanding</p>
              <p className="text-2xl font-mono font-bold text-foreground">{loyaltySummary.totalPoints.toLocaleString('en-IN')}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                ≈ {formatINR(loyaltySummary.totalPoints * 10)} liability
              </p>
            </div>
            <div className="rounded-lg bg-card/60 border border-border p-3">
              <p className="text-[11px] text-muted-foreground uppercase mb-1">Tier distribution</p>
              <div className="space-y-0.5 text-xs font-mono">
                <div className="flex justify-between"><span>Bronze</span><span>{loyaltySummary.tierCounts.bronze}</span></div>
                <div className="flex justify-between"><span>Silver</span><span>{loyaltySummary.tierCounts.silver}</span></div>
                <div className="flex justify-between"><span>Gold</span><span>{loyaltySummary.tierCounts.gold}</span></div>
                <div className="flex justify-between text-teal-600"><span>Platinum</span><span>{loyaltySummary.tierCounts.platinum}</span></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* TOP-10 CLV */}
      <Card className="bg-card/60 backdrop-blur-xl">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-teal-500" />
              <h2 className="text-base font-semibold text-foreground">Top 10 by Projected CLV (12m)</h2>
            </div>
          </div>

          {topClv.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">
              CLV will populate once orders exist for your customers.
            </p>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="text-left py-2 font-medium">Customer</th>
                      <th className="text-left py-2 font-medium">City</th>
                      <th className="text-right py-2 font-medium">Historical</th>
                      <th className="text-right py-2 font-medium">Projected 12m</th>
                      <th className="text-right py-2 font-medium">Tier</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topClv.map(r => {
                      const c = customerNameMap.get(r.customer_id);
                      const name = c?.legalName ?? c?.partyName ?? r.customer_id;
                      return (
                        <tr
                          key={r.customer_id}
                          className="border-b border-border/40 hover:bg-muted/30 cursor-pointer"
                          onClick={() => {
                            logAudit({
                              entityCode, userId, userName: userId,
                              cardId: 'customer-hub',
                              moduleId: 'ch-welcome',
                              action: 'module_open',
                              refType: 'customer',
                              refId: r.customer_id,
                              refLabel: name,
                            });
                          }}
                        >
                          <td className="py-2 font-medium text-foreground">{name}</td>
                          <td className="py-2 text-muted-foreground">{c?.city ?? '—'}</td>
                          <td className="py-2 text-right font-mono">{formatINR(r.historical_value_paise)}</td>
                          <td className="py-2 text-right font-mono font-semibold">{formatINR(r.projected_12m_value_paise)}</td>
                          <td className="py-2 text-right">
                            <Badge variant="outline" className={`text-[10px] ${tierBadgeClass(r.clv_rank_tier)}`}>
                              {r.clv_rank_tier}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile card list */}
              <div className="md:hidden space-y-2">
                {topClv.map(r => {
                  const c = customerNameMap.get(r.customer_id);
                  const name = c?.legalName ?? c?.partyName ?? r.customer_id;
                  return (
                    <div key={r.customer_id} className="rounded-lg border border-border p-3 bg-card/40">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-semibold text-foreground">{name}</p>
                        <Badge variant="outline" className={`text-[10px] ${tierBadgeClass(r.clv_rank_tier)}`}>
                          {r.clv_rank_tier}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground">{c?.city ?? '—'}</p>
                      <div className="flex justify-between mt-2 text-xs font-mono">
                        <span className="text-muted-foreground">Hist {formatINR(r.historical_value_paise)}</span>
                        <span className="font-semibold">12m {formatINR(r.projected_12m_value_paise)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* QUICK ACTIONS */}
      <Card className="bg-card/60 backdrop-blur-xl">
        <CardContent className="p-4 space-y-3">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {[
              { label: 'Customer Segments', icon: Tag, hash: 'ch-m-segment', badge: '' },
              { label: 'Set up Rewards', icon: Gift, hash: 'ch-t-rewards', badge: '13b' },
              { label: 'View Catalog', icon: ShoppingBag, hash: 'ch-t-catalog', badge: '13b' },
              { label: 'Social Proof', icon: Sparkles, hash: 'ch-r-social-proof', badge: '13c' },
              { label: 'Churn Risk', icon: AlertTriangle, hash: 'ch-r-churn', badge: '13c' },
              { label: 'Loyalty Report', icon: BarChart3, hash: 'ch-r-loyalty', badge: '13c' },
            ].map(qa => (
              <Button
                key={qa.hash}
                variant="outline"
                className="h-auto py-3 justify-start text-left hover:bg-teal-500/5 hover:border-teal-500/30"
                onClick={() => { window.location.hash = qa.hash; window.location.reload(); }}
              >
                <qa.icon className="h-4 w-4 mr-2 text-teal-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-xs">{qa.label}</span>
                </div>
                {qa.badge && (
                  <Badge variant="outline" className="ml-auto text-[9px] h-4 px-1">{qa.badge}</Badge>
                )}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function CustomerHubWelcome() {
  return <CustomerHubWelcomePanel />;
}
