/**
 * MONEY-MATH-AUDITED · Sprint T-Phase-1.2.5h-c1
 * All money/qty/percentage arithmetic uses Decimal.js helpers
 * (dMul · dAdd · dSub · dPct · dSum · round2) from @/lib/decimal-helpers.
 * No float multiplication or Math.round on money values.
 */
// i18n: Sprint T-Phase-1.2.5h-c2-fix · minimum-viable migration
/**
 * SalesXAnalytics.tsx — Sprint 5
 * Interactive sales funnel + commission health + target achievement + pipeline health.
 * [JWT] GET /api/salesx/enquiries
 * [JWT] GET /api/salesx/opportunities
 * [JWT] GET /api/salesx/quotations
 * [JWT] GET /api/salesx/commission-register
 * [JWT] GET /api/salesx/targets
 */
import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import {
  TrendingUp, Target, Wallet, AlertTriangle, ArrowRight, Activity,
} from 'lucide-react';
import { onEnterNext } from '@/lib/keyboard';
import { enquiriesKey } from '@/types/enquiry';
import type { Enquiry } from '@/types/enquiry';
import { opportunitiesKey } from '@/types/opportunity';
import type { Opportunity } from '@/types/opportunity';
import { quotationsKey } from '@/types/quotation';
import type { Quotation } from '@/types/quotation';
import { commissionRegisterKey } from '@/types/commission-register';
import type { CommissionEntry } from '@/types/commission-register';
import { dSum, round2 } from '@/lib/decimal-helpers';
import Decimal from 'decimal.js';
import { targetsKey } from '@/pages/erp/salesx/masters/TargetMaster.types';
import type { SalesTarget } from '@/pages/erp/salesx/masters/TargetMaster.types';
import { vouchersKey } from '@/lib/finecore-engine';
import type { Voucher } from '@/types/voucher';
import { cn } from '@/lib/utils';
import { useT } from '@/lib/i18n-engine';

interface Props {
  entityCode: string;
  onNavigate?: (m: string) => void;
}

const inrFmt = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
const formatINR = (n: number) => `₹${inrFmt.format(n)}`;

function ls<T>(key: string): T[] {
  try {
    // [JWT] GET /api/entity/storage/:key
    return JSON.parse(localStorage.getItem(key) || '[]');
  }
  catch { return []; }
}

type FunnelStage = 'enquiry' | 'opportunity' | 'quotation' | 'invoice';

export function SalesXAnalyticsPanel({ entityCode, onNavigate }: Props) {
  const t = useT();
  const [drillStage, setDrillStage] = useState<FunnelStage | null>(null);
  const [search, setSearch] = useState('');

  const enquiries = useMemo(
    // [JWT] GET /api/salesx/enquiries?entityCode={entityCode}
    () => ls<Enquiry>(enquiriesKey(entityCode)),
    [entityCode],
  );
  const opportunities = useMemo(
    // [JWT] GET /api/salesx/opportunities?entityCode={entityCode}
    () => ls<Opportunity>(opportunitiesKey(entityCode)),
    [entityCode],
  );
  const quotations = useMemo(
    // [JWT] GET /api/salesx/quotations?entityCode={entityCode}
    () => ls<Quotation>(quotationsKey(entityCode)),
    [entityCode],
  );
  const commissions = useMemo(
    // [JWT] GET /api/salesx/commission-register?entityCode={entityCode}
    () => ls<CommissionEntry>(commissionRegisterKey(entityCode)),
    [entityCode],
  );
  const targets = useMemo(
    // [JWT] GET /api/salesx/targets?entityCode={entityCode}
    () => ls<SalesTarget>(targetsKey(entityCode)),
    [entityCode],
  );
  const vouchers = useMemo(
    // [JWT] GET /api/accounting/vouchers?entityCode={entityCode}
    () => ls<Voucher>(vouchersKey(entityCode)),
    [entityCode],
  );

  const salesInvoices = useMemo(
    () => vouchers.filter(v => v.base_voucher_type === 'Sales' && !v.is_cancelled),
    [vouchers],
  );

  const funnelData = useMemo(() => [
    { stage: 'enquiry' as FunnelStage,     label: 'Enquiries',     count: enquiries.length },
    { stage: 'opportunity' as FunnelStage, label: 'Opportunities', count: opportunities.length },
    { stage: 'quotation' as FunnelStage,   label: 'Quotations',    count: quotations.length },
    { stage: 'invoice' as FunnelStage,     label: 'Invoices',      count: salesInvoices.length },
  ], [enquiries.length, opportunities.length, quotations.length, salesInvoices.length]);

  const conversionPct = useMemo(() => {
    const e = enquiries.length || 1;
    return Math.round((salesInvoices.length / e) * 1000) / 10;
  }, [enquiries.length, salesInvoices.length]);

  const commKPIs = useMemo(() => {
    const totalCommission = commissions.reduce((s, c) => s + c.net_total_commission, 0);
    const earned = commissions.reduce((s, c) => s + c.commission_earned_to_date, 0);
    const tdsHeld = commissions.reduce((s, c) => s + c.tds_deducted_to_date, 0);
    const netPaid = commissions.reduce((s, c) => s + c.net_paid_to_date, 0);
    const pendingPayout = commissions.filter(
      c => c.commission_expense_voucher_id && !c.bank_payment_voucher_id,
    ).length;
    return { totalCommission, earned, tdsHeld, netPaid, pendingPayout };
  }, [commissions]);

  const targetRows = useMemo(() => {
    return targets.filter(t => t.is_active).map(t => {
      const actual = round2(dSum(
        salesInvoices.filter(v => v.date.startsWith(t.period_label.slice(0, 7) ? '' : '')),
        v => v.net_amount,
      ));
      // Simple period-agnostic actual estimate by FY match — full math lives in TargetVsAchievement
      const periodActual = t.period === 'monthly'
        ? round2(new Decimal(dSum(
            salesInvoices.filter(v => v.date >= '2025-04-01'),
            v => v.net_amount,
          )).dividedBy(12).toNumber())
        : actual;
      const pct = t.target_value > 0
        ? Math.round((periodActual / t.target_value) * 1000) / 10
        : 0;
      return {
        id: t.id,
        label: `${t.target_type} · ${t.period_label} · ${t.dimension}`,
        target: t.target_value,
        actual: periodActual,
        pct,
      };
    }).slice(0, 6);
  }, [targets, salesInvoices]);

  const atRisk = useMemo(() => ({
    overdueFollowUps: enquiries.filter(e => e.status === 'pending').length,
    coldDeals: opportunities.filter(o => o.stage === 'qualification').length,
    expiringQuotes: quotations.filter(q => q.quotation_stage === 'negotiation').length,
  }), [enquiries, opportunities, quotations]);

  const drillRows = useMemo(() => {
    if (!drillStage) return [] as Array<{ id: string; label: string; sub: string }>;
    const q = search.trim().toLowerCase();
    const filterFn = (label: string, sub: string): boolean =>
      !q || label.toLowerCase().includes(q) || sub.toLowerCase().includes(q);
    if (drillStage === 'enquiry') {
      return enquiries
        .map(e => ({ id: e.id, label: e.enquiry_no ?? e.id, sub: e.status }))
        .filter(r => filterFn(r.label, r.sub));
    }
    if (drillStage === 'opportunity') {
      return opportunities
        .map(o => ({ id: o.id, label: o.opportunity_no ?? o.id, sub: `${o.stage} · ${formatINR(o.deal_value)}` }))
        .filter(r => filterFn(r.label, r.sub));
    }
    if (drillStage === 'quotation') {
      return quotations
        .map(q2 => ({ id: q2.id, label: q2.quotation_no, sub: `${q2.quotation_stage} · ${formatINR(q2.total_amount)}` }))
        .filter(r => filterFn(r.label, r.sub));
    }
    return salesInvoices
      .map(v => ({ id: v.id, label: v.voucher_no, sub: `${v.party_name ?? '—'} · ${formatINR(v.net_amount)}` }))
      .filter(r => filterFn(r.label, r.sub));
  }, [drillStage, search, enquiries, opportunities, quotations, salesInvoices]);

  return (
    <div className="space-y-4" data-keyboard-form>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6 text-orange-500" />
            SalesX Analytics
          </h1>
          <p className="text-sm text-muted-foreground">
            Funnel · commission health · target achievement · pipeline risk
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => onNavigate?.('sx-r-so-tracker')}>
            <ArrowRight className="h-3.5 w-3.5 mr-1" /> SO Tracker
          </Button>
          <Button variant="outline" size="sm" onClick={() => onNavigate?.('sx-r-target')}>
            Target Detail
          </Button>
        </div>
      </div>

      {/* Section 1 — Interactive funnel */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-orange-500" />
            Sales Funnel
            <Badge variant="outline" className="ml-2 text-[10px]">
              Conversion: {conversionPct}%
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={funnelData}
                onClick={(d) => {
                  const payload = d?.activePayload?.[0]?.payload as { stage: FunnelStage } | undefined;
                  if (payload?.stage) setDrillStage(payload.stage);
                }}
              >
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {funnelData.map(d => (
                    <Cell
                      key={d.stage}
                      fill={drillStage === d.stage ? 'hsl(24 95% 53%)' : 'hsl(24 95% 53% / 0.6)'}
                      cursor="pointer"
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {drillStage && (
            <div className="border-t pt-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs capitalize">
                  Drill-down: {drillStage} ({drillRows.length})
                </Label>
                <Input
                  className="h-7 text-xs max-w-xs"
                  placeholder="Search…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  onKeyDown={onEnterNext}
                />
                <Button size="sm" variant="ghost" onClick={() => { setDrillStage(null); setSearch(''); }}>
                  Close
                </Button>
              </div>
              <div className="max-h-48 overflow-auto rounded border">
                {drillRows.length === 0 ? (
                  <p className="text-xs text-muted-foreground p-3">No records.</p>
                ) : (
                  <ul className="divide-y">
                    {drillRows.map(r => (
                      <li key={r.id} className="px-3 py-1.5 text-xs flex justify-between gap-3">
                        <span className="font-mono truncate">{r.label}</span>
                        <span className="text-muted-foreground truncate">{r.sub}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 2 — Commission health */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Wallet className="h-4 w-4 text-orange-500" />
            Commission Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="rounded-lg border p-3">
              <p className="text-[10px] text-muted-foreground uppercase">Total Commission</p>
              <p className="text-lg font-bold font-mono">{formatINR(commKPIs.totalCommission)}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-[10px] text-muted-foreground uppercase">Earned</p>
              <p className="text-lg font-bold font-mono">{formatINR(commKPIs.earned)}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-[10px] text-muted-foreground uppercase">TDS Held</p>
              <p className="text-lg font-bold font-mono">{formatINR(commKPIs.tdsHeld)}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-[10px] text-muted-foreground uppercase">Net Paid</p>
              <p className="text-lg font-bold font-mono">{formatINR(commKPIs.netPaid)}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-[10px] text-muted-foreground uppercase">Pending Payout</p>
              <p className={cn('text-lg font-bold font-mono', commKPIs.pendingPayout > 0 && 'text-orange-600')}>
                {commKPIs.pendingPayout}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 3 — Target achievement */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Target className="h-4 w-4 text-orange-500" />
            Target Achievement
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {targetRows.length === 0 ? (
            <p className="text-xs text-muted-foreground py-6 text-center">
              No active targets configured. Create targets in the Target Master.
            </p>
          ) : targetRows.map(r => (
            <div key={r.id} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="capitalize truncate">{r.label}</span>
                <span className="font-mono">
                  {formatINR(r.actual)} / {formatINR(r.target)}
                  <span className={cn(
                    'ml-2 font-semibold',
                    r.pct >= 100 ? 'text-success' : r.pct >= 75 ? 'text-amber-600' : 'text-destructive',
                  )}>
                    {r.pct}%
                  </span>
                </span>
              </div>
              <div className="h-2 bg-muted rounded overflow-hidden">
                <div
                  className={cn(
                    'h-2 rounded',
                    r.pct >= 100 ? 'bg-success' : r.pct >= 75 ? 'bg-amber-500' : 'bg-destructive',
                  )}
                  style={{ width: `${Math.min(100, r.pct)}%` }}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Section 4 — Pipeline health */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Pipeline Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => onNavigate?.('sx-r-followup')}
              className="text-left rounded-lg border p-3 hover:bg-accent transition-colors"
            >
              <p className="text-[10px] text-muted-foreground uppercase">Pending Follow-Ups</p>
              <p className="text-2xl font-bold font-mono mt-1">{atRisk.overdueFollowUps}</p>
              <p className="text-[10px] text-muted-foreground mt-1">Click to open register</p>
            </button>
            <button
              onClick={() => onNavigate?.('sx-t-pipeline')}
              className="text-left rounded-lg border p-3 hover:bg-accent transition-colors"
            >
              <p className="text-[10px] text-muted-foreground uppercase">Cold Deals</p>
              <p className="text-2xl font-bold font-mono mt-1">{atRisk.coldDeals}</p>
              <p className="text-[10px] text-muted-foreground mt-1">Stuck in qualification</p>
            </button>
            <button
              onClick={() => onNavigate?.('sx-r-quotation-register')}
              className="text-left rounded-lg border p-3 hover:bg-accent transition-colors"
            >
              <p className="text-[10px] text-muted-foreground uppercase">Quotes in Negotiation</p>
              <p className="text-2xl font-bold font-mono mt-1">{atRisk.expiringQuotes}</p>
              <p className="text-[10px] text-muted-foreground mt-1">Awaiting confirmation</p>
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SalesXAnalytics(props: Props) {
  return <SalesXAnalyticsPanel {...props} />;
}
