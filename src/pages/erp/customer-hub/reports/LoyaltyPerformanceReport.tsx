/**
 * LoyaltyPerformanceReport.tsx — Sprint 13c · Module ch-r-loyalty · RPT-12c chart-layer swap
 * Tier distribution + earn vs redeem + top earners. Wires cu-loyalty.
 */

import { useEffect, useMemo, useState } from 'react';
import { Award, TrendingUp, Gift, Users, ShieldCheck } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ReportChart } from '@/components/operix-core/report-framework';
import { getKpi, defaultChartConfig, signReport } from '@/lib/report-framework';
import {
  loyaltyStateKey, loyaltyLedgerKey,
  type CustomerLoyaltyState, type LoyaltyLedgerEntry, type LoyaltyTier,
} from '@/types/customer-loyalty';
import { logAudit } from '@/lib/card-audit-engine';
import { DEFAULT_ENTITY_SHORTCODE } from '@/lib/default-entity';

interface CustomerLite { id: string; legalName?: string; partyName?: string }

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

const TIER_ORDER: LoyaltyTier[] = ['bronze', 'silver', 'gold', 'platinum'];
const TIER_COLORS: Record<LoyaltyTier, string> = {
  bronze: 'hsl(25, 65%, 50%)',
  silver: 'hsl(220, 9%, 65%)',
  gold: 'hsl(45, 85%, 55%)',
  platinum: 'hsl(190, 90%, 50%)',
};

export function LoyaltyPerformanceReportPanel() {
  const { entityCode } = useEntityCode();
  const [states, setStates] = useState<CustomerLoyaltyState[]>([]);
  const [ledger, setLedger] = useState<LoyaltyLedgerEntry[]>([]);
  const [customers, setCustomers] = useState<CustomerLite[]>([]);

  useEffect(() => {
    setStates(ls<CustomerLoyaltyState>(loyaltyStateKey(entityCode)));
    setLedger(ls<LoyaltyLedgerEntry>(loyaltyLedgerKey(entityCode)));
    setCustomers(loadCustomers());
    // [JWT] GET /api/loyalty/performance
    logAudit({
      entityCode: entityCode, userId: 'system', userName: 'system',
      cardId: 'customer-hub', moduleId: 'ch-r-loyalty',
      action: 'report_run', refType: 'report', refId: 'loyalty_performance',
      refLabel: 'Loyalty Performance',
    });
  }, []);

  const tierData = useMemo(() => {
    const counts: Record<LoyaltyTier, number> = { bronze: 0, silver: 0, gold: 0, platinum: 0 };
    for (const s of states) counts[s.current_tier]++;
    return TIER_ORDER.map(t => ({ tier: t.toUpperCase(), count: counts[t] }));
  }, [states]);

  const totals = useMemo(() => {
    let earned = 0, redeemed = 0;
    for (const e of ledger) {
      if (e.points_delta > 0) earned += e.points_delta;
      else redeemed += -e.points_delta;
    }
    return { earned, redeemed, net: earned - redeemed };
  }, [ledger]);

  const topEarners = useMemo(() => {
    const nameOf = (id: string) => {
      const c = customers.find(x => x.id === id);
      return c?.legalName ?? c?.partyName ?? id;
    };
    return [...states]
      .sort((a, b) => b.lifetime_points_earned - a.lifetime_points_earned)
      .slice(0, 10)
      .map(s => ({ ...s, name: nameOf(s.customer_id) }));
  }, [states, customers]);

  const hash = useMemo(() => signReport(tierData), [tierData]);
  const short = hash.replace('fnv1a:', '').slice(0, 10);
  const cfg = getKpi('cu-loyalty')?.defaultChart ?? defaultChartConfig({
    chartType: 'column', xKey: 'tier',
    series: [{ key: 'count', label: 'Members' }],
    title: 'Loyalty members by tier',
  });

  return (
    <div className="space-y-4 animate-fade-in max-w-6xl">
      <header className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Award className="h-5 w-5 text-teal-500" />
            Loyalty Performance
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Tier distribution · earn vs redeem · top loyalty earners
          </p>
        </div>
        <Badge variant="outline" className="text-[10px] font-mono" data-testid="cu-loyalty-integrity-badge" title={hash}>
          <ShieldCheck className="h-3 w-3 mr-1" />{short}
        </Badge>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3">
          <div className="flex items-center gap-2 text-muted-foreground text-[11px]">
            <Users className="h-3.5 w-3.5" /> Enrolled
          </div>
          <p className="text-2xl font-bold font-mono mt-1">{states.length}</p>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2 text-muted-foreground text-[11px]">
            <TrendingUp className="h-3.5 w-3.5" /> Points Earned
          </div>
          <p className="text-2xl font-bold font-mono mt-1 text-success">
            {totals.earned.toLocaleString('en-IN')}
          </p>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2 text-muted-foreground text-[11px]">
            <Gift className="h-3.5 w-3.5" /> Points Redeemed
          </div>
          <p className="text-2xl font-bold font-mono mt-1 text-warning">
            {totals.redeemed.toLocaleString('en-IN')}
          </p>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2 text-muted-foreground text-[11px]">
            <Award className="h-3.5 w-3.5" /> Active Balance
          </div>
          <p className="text-2xl font-bold font-mono mt-1 text-teal-600">
            {totals.net.toLocaleString('en-IN')}
          </p>
        </Card>
      </div>

      <Card className="p-4" data-testid="cu-loyalty-chart-host">
        <h2 className="text-sm font-semibold mb-3">Tier Distribution</h2>
        {states.length === 0 ? (
          <p className="text-xs text-muted-foreground py-8 text-center">No loyalty data yet.</p>
        ) : (
          <div className="h-64">
            <ReportChart data={tierData} config={cfg} />
          </div>
        )}
      </Card>

      <Card className="p-4">
        <h2 className="text-sm font-semibold mb-3">Top 10 Lifetime Earners</h2>
        {topEarners.length === 0 ? (
          <p className="text-xs text-muted-foreground py-6 text-center">No data.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="border-b border-border">
                <tr className="text-muted-foreground">
                  <th className="text-left py-2 px-2 font-medium">#</th>
                  <th className="text-left py-2 px-2 font-medium">Customer</th>
                  <th className="text-left py-2 px-2 font-medium">Tier</th>
                  <th className="text-right py-2 px-2 font-medium">Lifetime Earned</th>
                  <th className="text-right py-2 px-2 font-medium">Lifetime Redeemed</th>
                  <th className="text-right py-2 px-2 font-medium">Balance</th>
                </tr>
              </thead>
              <tbody>
                {topEarners.map((c, idx) => (
                  <tr key={c.customer_id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="py-2 px-2 font-mono text-muted-foreground">{idx + 1}</td>
                    <td className="py-2 px-2 font-medium">{c.name}</td>
                    <td className="py-2 px-2">
                      <Badge
                        variant="outline"
                        className="text-[9px] uppercase"
                        style={{ borderColor: TIER_COLORS[c.current_tier], color: TIER_COLORS[c.current_tier] }}
                      >
                        {c.current_tier}
                      </Badge>
                    </td>
                    <td className="py-2 px-2 text-right font-mono">{c.lifetime_points_earned.toLocaleString('en-IN')}</td>
                    <td className="py-2 px-2 text-right font-mono">{c.lifetime_points_redeemed.toLocaleString('en-IN')}</td>
                    <td className="py-2 px-2 text-right font-mono font-semibold text-teal-600">
                      {c.points_balance.toLocaleString('en-IN')}
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

export default LoyaltyPerformanceReportPanel;
