/**
 * SavingsROIDashboard.tsx — Sprint 15c-3
 * MODULE ID: dh-r-savings-roi
 * Compares flagged vs recovered amounts against platform subscription cost.
 * [JWT] GET/POST /api/dispatch/roi-benchmark
 */

import { useEffect, useMemo, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  TrendingUp, Settings, Download, AlertCircle, CheckCircle2, Lightbulb,
} from 'lucide-react';
import {
  BarChart, Bar, Line, ComposedChart, ResponsiveContainer,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts';
import { toast } from 'sonner';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import {
  type MatchLine, type Dispute, matchLinesKey, disputesKey,
} from '@/types/freight-reconciliation';
import { type TransporterInvoice, transporterInvoicesKey } from '@/types/transporter-invoice';
import {
  type ROIBenchmark, type SavingsOpportunity,
  DEFAULT_ROI_BENCHMARK, roiBenchmarkKey,
} from '@/types/transporter-scorecard';

function ls<T>(k: string): T[] {
  try { const r = localStorage.getItem(k); return r ? (JSON.parse(r) as T[]) : []; }
  catch { return []; }
}

interface LogisticOption { id: string; partyName: string; }
function loadLogistics(): LogisticOption[] {
  try {
    const r = localStorage.getItem('erp_group_logistic_master');
    if (!r) return [];
    return (JSON.parse(r) as Array<{ id: string; partyName: string; status?: string }>)
      .filter(l => l.status !== 'inactive')
      .map(l => ({ id: l.id, partyName: l.partyName }));
  } catch { return []; }
}

function fmtINR(n: number) {
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function monthsBetween(fromIso: string, toIso: string): number {
  const fr = new Date(fromIso); const to = new Date(toIso);
  const months = (to.getFullYear() - fr.getFullYear()) * 12 + (to.getMonth() - fr.getMonth()) + 1;
  return Math.max(1, months);
}

function ageDays(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
}

function resolutionPotential(ageD: number, variance: number): SavingsOpportunity['resolution_potential'] {
  if (ageD < 7 && variance > 5000) return 'high';
  if (ageD < 30 && variance > 1000) return 'medium';
  return 'low';
}

export function SavingsROIDashboardPanel() {
  const { entityCode, userId } = useCardEntitlement();
  const today = new Date();
  const sixMonthsAgo = new Date(today); sixMonthsAgo.setMonth(today.getMonth() - 6);
  const [from, setFrom] = useState(sixMonthsAgo.toISOString().slice(0, 10));
  const [to, setTo] = useState(today.toISOString().slice(0, 10));

  const [matches, setMatches] = useState<MatchLine[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [invoices, setInvoices] = useState<TransporterInvoice[]>([]);
  const [logistics, setLogistics] = useState<LogisticOption[]>([]);

  const [benchmark, setBenchmark] = useState<ROIBenchmark>(() => {
    try {
      const r = localStorage.getItem(roiBenchmarkKey(entityCode));
      if (r) return JSON.parse(r) as ROIBenchmark;
    } catch { /* ignore */ }
    return DEFAULT_ROI_BENCHMARK;
  });

  const [benchDialog, setBenchDialog] = useState(false);
  const [benchAmount, setBenchAmount] = useState(benchmark.monthly_subscription_paise / 100);
  const [benchTier, setBenchTier] = useState(benchmark.tier_label);

  const refresh = useCallback(() => {
    setMatches(ls<MatchLine>(matchLinesKey(entityCode)));
    setDisputes(ls<Dispute>(disputesKey(entityCode)));
    setInvoices(ls<TransporterInvoice>(transporterInvoicesKey(entityCode)));
    setLogistics(loadLogistics());
  }, [entityCode]);

  useEffect(() => { refresh(); }, [refresh]);

  const inRange = useCallback((iso: string) => iso >= from && iso <= `${to}T23:59:59Z`, [from, to]);

  const periodInvoices = useMemo(() => invoices.filter(i => inRange(i.uploaded_at)), [invoices, inRange]);
  const periodInvIds = useMemo(() => new Set(periodInvoices.map(i => i.id)), [periodInvoices]);
  const periodMatches = useMemo(() => matches.filter(m => periodInvIds.has(m.invoice_id)),
    [matches, periodInvIds]);
  const periodDisputes = useMemo(() => disputes.filter(d => periodInvIds.has(d.invoice_id)),
    [disputes, periodInvIds]);

  const kpi = useMemo(() => {
    const flaggedLines = periodMatches.filter(m => m.status === 'over_billed' || m.status === 'ghost_lr');
    const totalFlagged = flaggedLines.reduce((s, m) => s + Math.max(0, m.variance_amount), 0);

    const recoveredFromDisputes = periodDisputes.reduce((s, d) => {
      if (d.status === 'resolved_in_favor_of_us') return s + (d.variance_amount ?? 0);
      if (d.status === 'resolved_split') return s + (d.resolution_amount ?? 0);
      return s;
    }, 0);

    const recoveryRate = totalFlagged > 0 ? (recoveredFromDisputes / totalFlagged) * 100 : 0;

    const months = monthsBetween(from, to);
    const subscriptionForPeriod = (benchmark.monthly_subscription_paise / 100) * months;
    const roiMultiple = subscriptionForPeriod > 0 ? recoveredFromDisputes / subscriptionForPeriod : 0;

    return {
      totalFlagged,
      recoveredFromDisputes,
      recoveryRate,
      roiMultiple,
      subscriptionForPeriod,
      months,
    };
  }, [periodMatches, periodDisputes, from, to, benchmark]);

  const paybackMonths = useMemo(() => {
    if (kpi.recoveredFromDisputes <= 0) return null;
    const monthlyRecovery = kpi.recoveredFromDisputes / kpi.months;
    if (monthlyRecovery <= 0) return null;
    return (benchmark.monthly_subscription_paise / 100) / monthlyRecovery;
  }, [kpi, benchmark]);

  const monthlyTrend = useMemo(() => {
    // Last 12 months
    const buckets = new Map<string, { month: string; flagged: number; recovered: number }>();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i);
      const key = d.toISOString().slice(0, 7);
      const label = d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
      buckets.set(key, { month: label, flagged: 0, recovered: 0 });
    }
    for (const m of matches.filter(x => x.status === 'over_billed' || x.status === 'ghost_lr')) {
      const inv = invoices.find(i => i.id === m.invoice_id);
      if (!inv) continue;
      const key = inv.uploaded_at.slice(0, 7);
      const b = buckets.get(key);
      if (b) b.flagged += Math.max(0, m.variance_amount);
    }
    for (const d of disputes) {
      if (!d.resolved_at) continue;
      const key = d.resolved_at.slice(0, 7);
      const b = buckets.get(key);
      if (!b) continue;
      if (d.status === 'resolved_in_favor_of_us') b.recovered += d.variance_amount ?? 0;
      else if (d.status === 'resolved_split') b.recovered += d.resolution_amount ?? 0;
    }
    let cum = 0;
    const subPerMonth = benchmark.monthly_subscription_paise / 100;
    return Array.from(buckets.values()).map((b) => {
      cum += b.recovered;
      const cumSub = subPerMonth * (Array.from(buckets.values()).indexOf(b) + 1);
      const cumROI = cumSub > 0 ? (cum / cumSub) * 100 : 0;
      return { ...b, cumROI: Number(cumROI.toFixed(1)) };
    });
  }, [matches, invoices, disputes, benchmark]);

  const opportunities = useMemo<SavingsOpportunity[]>(() => {
    const flagged = matches.filter(m => m.status === 'over_billed' || m.status === 'ghost_lr');
    const list: SavingsOpportunity[] = [];
    for (const m of flagged) {
      const dsp = disputes.find(d => d.match_line_id === m.id);
      const isResolved = dsp && (dsp.status === 'resolved_in_favor_of_us'
        || dsp.status === 'resolved_in_favor_of_transporter'
        || dsp.status === 'resolved_split'
        || dsp.status === 'withdrawn');
      if (isResolved) continue;
      const inv = invoices.find(i => i.id === m.invoice_id);
      const ageD = ageDays(m.computed_at);
      list.push({
        match_line_id: m.id,
        lr_no: m.lr_no,
        logistic_id: inv?.logistic_id ?? '',
        logistic_name: inv?.logistic_name ?? 'Unknown',
        variance_amount: Math.max(0, m.variance_amount),
        status: m.status,
        dispute_id: dsp?.id ?? null,
        dispute_status: dsp?.status ?? null,
        age_days: ageD,
        resolution_potential: resolutionPotential(ageD, Math.max(0, m.variance_amount)),
      });
    }
    return list.sort((a, b) => b.variance_amount - a.variance_amount).slice(0, 3);
  }, [matches, invoices, disputes]);

  const byTransporter = useMemo(() => {
    const map = new Map<string, { name: string; flagged: number; recovered: number }>();
    for (const l of logistics) map.set(l.id, { name: l.partyName, flagged: 0, recovered: 0 });
    for (const m of periodMatches.filter(x => x.status === 'over_billed' || x.status === 'ghost_lr')) {
      const inv = periodInvoices.find(i => i.id === m.invoice_id);
      if (!inv) continue;
      const cur = map.get(inv.logistic_id);
      if (cur) cur.flagged += Math.max(0, m.variance_amount);
    }
    for (const d of periodDisputes) {
      const cur = map.get(d.logistic_id);
      if (!cur) continue;
      if (d.status === 'resolved_in_favor_of_us') cur.recovered += d.variance_amount ?? 0;
      else if (d.status === 'resolved_split') cur.recovered += d.resolution_amount ?? 0;
    }
    return Array.from(map.values())
      .filter(x => x.flagged > 0 || x.recovered > 0)
      .sort((a, b) => (b.flagged - b.recovered) - (a.flagged - a.recovered));
  }, [logistics, periodMatches, periodInvoices, periodDisputes]);

  const saveBenchmark = () => {
    if (benchAmount <= 0) {
      toast.error('Subscription cost must be positive.');
      return;
    }
    const next: ROIBenchmark = {
      monthly_subscription_paise: Math.round(benchAmount * 100),
      tier_label: benchTier || 'Custom',
      updated_at: new Date().toISOString(),
      updated_by: userId,
    };
    setBenchmark(next);
    // [JWT] POST /api/dispatch/roi-benchmark
    localStorage.setItem(roiBenchmarkKey(entityCode), JSON.stringify(next));
    setBenchDialog(false);
    toast.success('ROI benchmark updated.');
  };

  const exportCSV = () => {
    const headers = ['Transporter', 'Flagged (₹)', 'Recovered (₹)', 'Net Savings (₹)'];
    const rows = byTransporter.map(b => [
      b.name, b.flagged.toFixed(0), b.recovered.toFixed(0), (b.recovered - b.flagged).toFixed(0),
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `savings-roi-${from}-${to}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const potentialColor = (p: 'high' | 'medium' | 'low') =>
    p === 'high' ? 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30'
    : p === 'medium' ? 'bg-amber-500/15 text-amber-700 border-amber-500/30'
    : 'bg-muted text-muted-foreground border-border';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            Savings &amp; ROI Dashboard
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Benchmark: {fmtINR(benchmark.monthly_subscription_paise / 100)}/mo · {benchmark.tier_label} tier
          </p>
        </div>
        <div className="flex items-end gap-2 flex-wrap">
          <div>
            <Label className="text-[10px]">From</Label>
            <Input type="date" value={from} onChange={e => setFrom(e.target.value)}
              className="h-8 text-xs w-36" />
          </div>
          <div>
            <Label className="text-[10px]">To</Label>
            <Input type="date" value={to} onChange={e => setTo(e.target.value)}
              className="h-8 text-xs w-36" />
          </div>
          <Button variant="outline" size="sm" onClick={() => setBenchDialog(true)}>
            <Settings className="h-3.5 w-3.5 mr-1" /> Configure Benchmark
          </Button>
          <Button variant="outline" size="sm" onClick={exportCSV} disabled={byTransporter.length === 0}>
            <Download className="h-3.5 w-3.5 mr-1" /> Export CSV
          </Button>
        </div>
      </div>

      {/* 4 KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Flagged</p>
            <p className="text-2xl font-bold font-mono mt-1">{fmtINR(kpi.totalFlagged)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Recovered</p>
            <p className="text-2xl font-bold font-mono mt-1 text-emerald-600">
              {fmtINR(kpi.recoveredFromDisputes)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Recovery Rate</p>
            <p className="text-2xl font-bold font-mono mt-1">{kpi.recoveryRate.toFixed(1)}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">ROI Multiple</p>
            <p className="text-2xl font-bold font-mono mt-1 text-blue-600">
              {kpi.roiMultiple.toFixed(2)}x
            </p>
            <p className="text-[10px] text-muted-foreground">
              vs {fmtINR(kpi.subscriptionForPeriod)} cost
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Payback indicator */}
      {paybackMonths !== null && paybackMonths <= kpi.months ? (
        <div className="border rounded-lg p-3 bg-emerald-500/10 border-emerald-500/40 flex items-start gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
          <p className="text-xs">
            <strong className="text-emerald-700">Payback: {paybackMonths.toFixed(1)} months.</strong>{' '}
            Platform pays for itself via recovered overcharges.
          </p>
        </div>
      ) : (
        <div className="border rounded-lg p-3 bg-amber-500/10 border-amber-500/40 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-xs">
            <strong className="text-amber-700">Payback pending:</strong>{' '}
            {fmtINR(Math.max(0, kpi.subscriptionForPeriod - kpi.recoveredFromDisputes))} more recovery needed to break even this period.
          </p>
        </div>
      )}

      {/* Monthly trend */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold mb-3">Monthly Trend (12 months)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis yAxisId="left" className="text-xs" />
                <YAxis yAxisId="right" orientation="right" className="text-xs" unit="%" />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar yAxisId="left" dataKey="flagged" fill="hsl(0 84% 60%)" name="Flagged" />
                <Bar yAxisId="left" dataKey="recovered" fill="hsl(160 84% 39%)" name="Recovered" />
                <Line yAxisId="right" type="monotone" dataKey="cumROI"
                  stroke="hsl(217 91% 60%)" strokeWidth={2} name="Cumulative ROI %" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Top 3 Opportunities */}
      <div>
        <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-amber-600" />
          Top 3 Savings Opportunities
        </h3>
        {opportunities.length === 0 ? (
          <Card><CardContent className="p-6 text-center text-xs text-muted-foreground">
            No unresolved over-billed lines. Excellent control.
          </CardContent></Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {opportunities.map(o => (
              <Card key={`opp-${o.match_line_id}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <Badge variant="outline" className={`${potentialColor(o.resolution_potential)} text-[10px] capitalize`}>
                      {o.resolution_potential} potential
                    </Badge>
                    <span className="text-[10px] text-muted-foreground font-mono">{o.age_days}d old</span>
                  </div>
                  <p className="text-sm font-bold font-mono">{fmtINR(o.variance_amount)}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    LR <span className="font-mono">{o.lr_no}</span> · {o.logistic_name}
                  </p>
                  <div className="mt-3">
                    {o.dispute_id ? (
                      <Badge variant="outline" className="text-[10px] capitalize">
                        Dispute: {o.dispute_status?.replace(/_/g, ' ')}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-700 border-blue-500/30">
                        No dispute raised
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* By Transporter */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold mb-3">By Transporter</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Transporter</TableHead>
                <TableHead className="text-right">Flagged</TableHead>
                <TableHead className="text-right">Recovered</TableHead>
                <TableHead className="text-right">Net Savings</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {byTransporter.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-xs text-muted-foreground py-6">
                    No flagged or recovered amounts in this period.
                  </TableCell>
                </TableRow>
              )}
              {byTransporter.map(b => {
                const net = b.recovered - b.flagged;
                return (
                  <TableRow key={`bt-${b.name}`}>
                    <TableCell className="text-sm">{b.name}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{fmtINR(b.flagged)}</TableCell>
                    <TableCell className="text-right font-mono text-xs text-emerald-600">
                      {fmtINR(b.recovered)}
                    </TableCell>
                    <TableCell className={`text-right font-mono text-xs ${net >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                      {net >= 0 ? '+' : ''}{fmtINR(net)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Benchmark Dialog */}
      <Dialog open={benchDialog} onOpenChange={setBenchDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Configure ROI Benchmark</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Monthly Platform Subscription Cost (₹)</Label>
              <Input type="number" value={benchAmount}
                onChange={e => setBenchAmount(parseFloat(e.target.value) || 0)}
                className="mt-1 font-mono" />
              <p className="text-[10px] text-muted-foreground mt-1">
                Default: ₹2,499 (Growth tier)
              </p>
            </div>
            <div>
              <Label className="text-xs">Tier Label</Label>
              <Input value={benchTier} onChange={e => setBenchTier(e.target.value)}
                className="mt-1" placeholder="Starter / Growth / Enterprise" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBenchDialog(false)}>Cancel</Button>
            <Button onClick={saveBenchmark} className="bg-blue-600 hover:bg-blue-700">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default SavingsROIDashboardPanel;
