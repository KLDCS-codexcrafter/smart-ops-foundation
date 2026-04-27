/**
 * @file     CashFlowDashboard.tsx
 * @purpose  Cash-Flow Optimizer + 13-week Forecast dashboard.
 *           4 KPIs · 30/90 day projection chart · 13-week forecast bars ·
 *           suggested-timing table for approved requisitions · MSME priority.
 * @sprint   T-T8.7-SmartAP (Group B Sprint B.7)
 *
 * Pure presentation · IMPORTS engine query functions only · NO mutations.
 */
import { useMemo, useState } from 'react';
import {
  TrendingUp, TrendingDown, IndianRupee, AlertTriangle, Calendar, Wallet,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer,
  CartesianGrid, ReferenceLine, LineChart, Line,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useEntityCode } from '@/hooks/useEntityCode';
import { SelectCompanyGate } from '@/components/layout/SelectCompanyGate';
import {
  computeCashFlowProjection, forecastByWeek, suggestPaymentTiming,
  getCurrentBankBalances,
} from '@/lib/cash-flow-engine';
import type { PaymentRequisition } from '@/types/payment-requisition';
import { paymentRequisitionsKey } from '@/types/payment-requisition';

const inr = (n: number): string =>
  '₹' + Math.abs(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

interface Props { entityCode: string; mode?: 'cash-flow' | 'forecast' | 'all'; }

function loadReqs(entityCode: string): PaymentRequisition[] {
  try {
    const raw = localStorage.getItem(paymentRequisitionsKey(entityCode));
    return raw ? (JSON.parse(raw) as PaymentRequisition[]) : [];
  } catch { return []; }
}

function CashFlowDashboardPanel({ entityCode, mode = 'all' }: Props) {
  const [days] = useState<number>(30);

  const projection = useMemo(
    () => computeCashFlowProjection(entityCode, 90),
    [entityCode],
  );
  const forecast = useMemo(
    () => forecastByWeek(entityCode, 13),
    [entityCode],
  );
  const balances = useMemo(
    () => getCurrentBankBalances(entityCode),
    [entityCode],
  );
  const totalBalance = balances.reduce((s, b) => s + b.balance, 0);

  const window30 = projection.slice(0, days);
  const inflow30 = window30.reduce((s, p) => s + p.receivables, 0);
  const outflow30 = window30.reduce((s, p) => s + p.committed_payments, 0);
  const minProjected = window30.length
    ? Math.min(...window30.map(p => p.closing_balance))
    : totalBalance;

  const reqs = useMemo(() => loadReqs(entityCode).filter(r => r.status === 'approved'), [entityCode]);
  const suggestions = useMemo(
    () => reqs
      .map(r => suggestPaymentTiming(entityCode, r.id))
      .filter((s): s is NonNullable<typeof s> => s !== null),
    [reqs, entityCode],
  );

  const chartData = window30.map(p => ({
    date: p.date.slice(5),
    closing: Math.round(p.closing_balance),
    receivables: Math.round(p.receivables),
    committed: Math.round(p.committed_payments),
  }));

  const forecastChartData = forecast.map(w => ({
    week: w.week_start.slice(5),
    receivables: Math.round(w.receivables),
    committed: Math.round(w.committed),
    net: Math.round(w.net),
  }));

  const showCashFlow = mode === 'all' || mode === 'cash-flow';
  const showForecast = mode === 'all' || mode === 'forecast';

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
              <IndianRupee className="h-3.5 w-3.5" />Current Cash
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-mono text-2xl font-semibold">{inr(totalBalance)}</div>
            <div className="text-xs text-muted-foreground mt-1">{balances.length} bank ledgers</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5" />30-day Inflow
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-mono text-2xl font-semibold text-emerald-600">{inr(inflow30)}</div>
            <div className="text-xs text-muted-foreground mt-1">Receivables expected</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
              <TrendingDown className="h-3.5 w-3.5" />30-day Outflow
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-mono text-2xl font-semibold text-amber-700">{inr(outflow30)}</div>
            <div className="text-xs text-muted-foreground mt-1">Approved committed</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" />Min Projected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`font-mono text-2xl font-semibold ${minProjected < 0 ? 'text-destructive' : ''}`}>
              {inr(minProjected)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {minProjected < 0 ? 'Cash deficit warning' : 'Stays positive (30d)'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cash-flow projection chart */}
      {showCashFlow && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="h-4 w-4 text-violet-500" />30-day Cash Projection
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[320px]">
              <ResponsiveContainer>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`} />
                  <RTooltip formatter={(v: number) => inr(v)} />
                  <ReferenceLine y={0} stroke="hsl(var(--destructive))" strokeDasharray="3 3" />
                  <Line type="monotone" dataKey="closing" name="Closing balance"
                    stroke="hsl(258 90% 66%)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 13-week forecast */}
      {showForecast && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-violet-500" />13-Week Forecast
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[320px]">
              <ResponsiveContainer>
                <BarChart data={forecastChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`} />
                  <RTooltip formatter={(v: number) => inr(v)} />
                  <ReferenceLine y={0} stroke="hsl(var(--destructive))" strokeDasharray="3 3" />
                  <Bar dataKey="receivables" fill="hsl(160 65% 45%)" name="Receivables" />
                  <Bar dataKey="committed" fill="hsl(35 92% 55%)" name="Committed" />
                  <Bar dataKey="net" fill="hsl(258 90% 66%)" name="Net" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">
              Net = receivables − committed − auto-pay predicted. Negative weeks need attention.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Suggested timing */}
      {showCashFlow && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Wallet className="h-4 w-4 text-violet-500" />Suggested Payment Timing
            </CardTitle>
          </CardHeader>
          <CardContent>
            {suggestions.length === 0
              ? <p className="text-xs text-muted-foreground">No approved requisitions to schedule.</p>
              : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vendor</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Suggested Date</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>MSME</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {suggestions.map(s => (
                      <TableRow key={s.requisition_id} className="text-xs">
                        <TableCell>{s.vendor_name}</TableCell>
                        <TableCell className="text-right font-mono">{inr(s.amount)}</TableCell>
                        <TableCell className="font-mono">{s.suggested_date}</TableCell>
                        <TableCell className="text-muted-foreground">{s.reason}</TableCell>
                        <TableCell>
                          {s.msme_priority
                            ? <Badge variant="outline" className="bg-red-500/10 text-red-700 border-red-500/30 text-[9px]">PRIORITY</Badge>
                            : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface ExternalProps { entityCode?: string; mode?: 'cash-flow' | 'forecast' | 'all'; }

export function CashFlowDashboardScreen() { return <CashFlowDashboard />; }

export default function CashFlowDashboard({ entityCode: passed, mode }: ExternalProps = {}) {
  const { entityCode: ctx } = useEntityCode();
  const entityCode = passed ?? ctx;
  if (!entityCode) {
    return <SelectCompanyGate
      title="Select a company to view Cash-Flow"
      description="Cash-flow projections are scoped to a specific company." />;
  }
  return <CashFlowDashboardPanel entityCode={entityCode} mode={mode} />;
}
