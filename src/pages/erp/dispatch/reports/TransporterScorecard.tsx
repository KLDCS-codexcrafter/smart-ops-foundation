/**
 * TransporterScorecard.tsx — Sprint 15c-3
 * MODULE ID: dh-r-transporter-scorecard
 * Numeric 0-100 score → 7-bucket letter grade. Tenant-configurable weights.
 * [JWT] GET/POST /api/dispatch/transporter-scorecards
 */

import { useEffect, useMemo, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Award, Settings, Download, TrendingUp, TrendingDown, Minus, LineChart as LineIcon,
} from 'lucide-react';
import {
  LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import { toast } from 'sonner';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import {
  type MatchLine, type Dispute, matchLinesKey, disputesKey,
} from '@/types/freight-reconciliation';
import { type TransporterInvoice, transporterInvoicesKey } from '@/types/transporter-invoice';
import {
  type TransporterScore, type ScorecardWeights, type LetterGrade,
  DEFAULT_WEIGHTS, WEIGHT_PRESETS,
  scorecardWeightsKey, transporterScoresKey, scoreToGrade,
} from '@/types/transporter-scorecard';
import { computeAllScorecards } from '@/lib/transporter-scorecard-engine';
import Decimal from 'decimal.js';

function ls<T>(k: string): T[] {
  try { const r = localStorage.getItem(k); return r ? (JSON.parse(r) as T[]) : []; }
  catch { return []; }
}

interface LogisticOption { id: string; partyName: string; }
function loadLogistics(): LogisticOption[] {
  try {
    // [JWT] GET /api/masters/logistics
    const r = localStorage.getItem('erp_group_logistic_master');
    if (!r) return [];
    return (JSON.parse(r) as Array<{ id: string; partyName: string; status?: string }>)
      .filter(l => l.status !== 'inactive')
      .map(l => ({ id: l.id, partyName: l.partyName }));
  } catch { return []; }
}

function gradeColor(g: LetterGrade): string {
  if (g === 'A+' || g === 'A') return 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30';
  if (g === 'B+' || g === 'B') return 'bg-blue-500/15 text-blue-700 border-blue-500/30';
  if (g === 'C+' || g === 'C') return 'bg-amber-500/15 text-amber-700 border-amber-500/30';
  return 'bg-destructive/15 text-destructive border-destructive/30';
}

export function TransporterScorecardPanel() {
  const { entityCode, userId } = useCardEntitlement();
  const today = new Date();
  const threeMonthsAgo = new Date(today); threeMonthsAgo.setMonth(today.getMonth() - 3);
  const [from, setFrom] = useState(threeMonthsAgo.toISOString().slice(0, 10));
  const [to, setTo] = useState(today.toISOString().slice(0, 10));

  const [weights, setWeights] = useState<ScorecardWeights>(() => {
    try {
      const r = localStorage.getItem(scorecardWeightsKey(entityCode));
      if (r) return JSON.parse(r) as ScorecardWeights;
    } catch { /* ignore */ }
    return { ...DEFAULT_WEIGHTS, updated_at: new Date(0).toISOString(), updated_by: 'system' };
  });

  const [scores, setScores] = useState<TransporterScore[]>([]);
  const [weightDialog, setWeightDialog] = useState(false);
  const [trendDialog, setTrendDialog] = useState<TransporterScore | null>(null);

  // Local sliders for weight dialog
  const [wDispute, setWDispute] = useState(weights.dispute_rate_pct);
  const [wAccuracy, setWAccuracy] = useState(weights.accuracy_pct);
  const [wCycle, setWCycle] = useState(weights.payment_cycle_pct);
  useEffect(() => {
    if (weightDialog) {
      setWDispute(weights.dispute_rate_pct);
      setWAccuracy(weights.accuracy_pct);
      setWCycle(weights.payment_cycle_pct);
    }
  }, [weightDialog, weights]);

  const recompute = useCallback(() => {
    const matches = ls<MatchLine>(matchLinesKey(entityCode));
    const invoices = ls<TransporterInvoice>(transporterInvoicesKey(entityCode));
    const disputes = ls<Dispute>(disputesKey(entityCode));
    const logistics = loadLogistics();
    const previousScores = ls<TransporterScore>(transporterScoresKey(entityCode));

    const computed = computeAllScorecards({
      logistics,
      match_lines: matches,
      invoices,
      disputes,
      weights,
      period_from: from,
      period_to: `${to}T23:59:59Z`,
      previous_scores: previousScores,
    });

    setScores(computed);
    // [JWT] POST /api/dispatch/transporter-scorecards (snapshot for trend)
    const allScores = [...previousScores, ...computed];
    localStorage.setItem(transporterScoresKey(entityCode), JSON.stringify(allScores));
  }, [entityCode, from, to, weights]);

  useEffect(() => { recompute(); }, [recompute]);

  const saveWeights = () => {
    const sum = wDispute + wAccuracy + wCycle;
    if (Math.abs(sum - 100) > 0.5) {
      toast.error('Weights must sum to 100%.');
      return;
    }
    const next: ScorecardWeights = {
      dispute_rate_pct: wDispute,
      accuracy_pct: wAccuracy,
      payment_cycle_pct: wCycle,
      updated_at: new Date().toISOString(),
      updated_by: userId,
    };
    setWeights(next);
    // [JWT] POST /api/dispatch/scorecard-weights
    localStorage.setItem(scorecardWeightsKey(entityCode), JSON.stringify(next));
    setWeightDialog(false);
    toast.success('Weights saved. Scorecard recomputed.');
  };

  const applyPreset = (preset: keyof typeof WEIGHT_PRESETS) => {
    const p = WEIGHT_PRESETS[preset];
    setWDispute(p.dispute_rate_pct);
    setWAccuracy(p.accuracy_pct);
    setWCycle(p.payment_cycle_pct);
  };

  const sortedScores = useMemo(() => {
    return [...scores].sort((a, b) => b.composite_score - a.composite_score);
  }, [scores]);

  const kpi = useMemo(() => {
    if (sortedScores.length === 0) {
      return { top: null, bottom: null, avg: 0 };
    }
    const top = sortedScores[0];
    const bottom = sortedScores[sortedScores.length - 1];
    const avg = sortedScores.reduce((s, x) => s + x.composite_score, 0) / sortedScores.length;
    return { top, bottom, avg };
  }, [sortedScores]);

  const trendData = useMemo(() => {
    if (!trendDialog) return [];
    const all = ls<TransporterScore>(transporterScoresKey(entityCode));
    const filtered = all
      .filter(s => s.logistic_id === trendDialog.logistic_id)
      .sort((a, b) => a.computed_at.localeCompare(b.computed_at))
      .slice(-12)
      .map(s => ({
        month: new Date(s.computed_at).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
        score: Number(s.composite_score.toFixed(1)),
      }));
    return filtered;
  }, [trendDialog, entityCode]);

  const exportCSV = () => {
    const headers = ['Rank', 'Transporter', 'Grade', 'Score', 'Δ vs prev', 'Lines',
      'Disputes', 'Within Tol', 'Avg Cycle (d)'];
    const rows = sortedScores.map((s, i) => [
      i + 1, s.logistic_name, s.grade, s.composite_score.toFixed(1),
      s.delta_vs_prev !== null ? s.delta_vs_prev.toFixed(1) : '—',
      s.total_lines, s.disputed_lines, s.within_tolerance_lines,
      s.avg_payment_cycle_days.toFixed(1),
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `transporter-scorecard-${from}-${to}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const wSum = wDispute + wAccuracy + wCycle;
  const sumValid = Math.abs(wSum - 100) <= 0.5;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Award className="h-5 w-5 text-blue-600" />
            Transporter Scorecard
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            7-bucket letter grades · Weights: D{weights.dispute_rate_pct}% / A{weights.accuracy_pct}% / P{weights.payment_cycle_pct}%
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
          <Button variant="outline" size="sm" onClick={() => setWeightDialog(true)}>
            <Settings className="h-3.5 w-3.5 mr-1" /> Configure Weights
          </Button>
          <Button variant="outline" size="sm" onClick={exportCSV} disabled={sortedScores.length === 0}>
            <Download className="h-3.5 w-3.5 mr-1" /> Export CSV
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Top Performer</p>
            <p className="text-lg font-bold mt-1 truncate">
              {kpi.top?.logistic_name ?? '—'}
            </p>
            {kpi.top && (
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className={`${gradeColor(kpi.top.grade)} text-[10px]`}>
                  {kpi.top.grade}
                </Badge>
                <span className="text-xs font-mono">{kpi.top.composite_score.toFixed(1)}</span>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Bottom Performer</p>
            <p className="text-lg font-bold mt-1 truncate">
              {kpi.bottom?.logistic_name ?? '—'}
            </p>
            {kpi.bottom && (
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className={`${gradeColor(kpi.bottom.grade)} text-[10px]`}>
                  {kpi.bottom.grade}
                </Badge>
                <span className="text-xs font-mono">{kpi.bottom.composite_score.toFixed(1)}</span>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Team Average</p>
            <p className="text-2xl font-bold font-mono mt-1">{kpi.avg.toFixed(1)}</p>
            <p className="text-[10px] text-muted-foreground">
              Grade: {scoreToGrade(kpi.avg)} · {sortedScores.length} transporters
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Leaderboard */}
      <Card>
        <CardContent className="p-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Rank</TableHead>
                <TableHead>Transporter</TableHead>
                <TableHead className="text-center">Grade</TableHead>
                <TableHead className="text-right">Score</TableHead>
                <TableHead className="text-right">Δ vs prev</TableHead>
                <TableHead className="text-right">Lines</TableHead>
                <TableHead className="text-right">Disputes</TableHead>
                <TableHead className="text-right">Accuracy</TableHead>
                <TableHead className="text-right">Cycle (d)</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedScores.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-xs text-muted-foreground py-6">
                    No data in this period. Reconcile some invoices first.
                  </TableCell>
                </TableRow>
              )}
              {sortedScores.map((s, i) => (
                <TableRow key={`score-${s.logistic_id}-${s.computed_at}`}>
                  <TableCell className="font-mono text-xs">{i + 1}</TableCell>
                  <TableCell className="text-sm font-medium">{s.logistic_name}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className={`${gradeColor(s.grade)} text-[10px] font-bold`}>
                      {s.grade}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    {s.composite_score.toFixed(1)}
                  </TableCell>
                  <TableCell className="text-right">
                    {s.delta_vs_prev === null ? (
                      <span className="text-muted-foreground">—</span>
                    ) : s.delta_vs_prev > 0 ? (
                      <span className="text-emerald-600 inline-flex items-center gap-1 text-xs font-mono">
                        <TrendingUp className="h-3 w-3" /> +{s.delta_vs_prev.toFixed(1)}
                      </span>
                    ) : s.delta_vs_prev < 0 ? (
                      <span className="text-destructive inline-flex items-center gap-1 text-xs font-mono">
                        <TrendingDown className="h-3 w-3" /> {s.delta_vs_prev.toFixed(1)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
                        <Minus className="h-3 w-3" /> 0
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">{s.total_lines}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{s.disputed_lines}</TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    {s.accuracy_score.toFixed(0)}%
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    {s.avg_payment_cycle_days.toFixed(1)}
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" className="h-7 px-2"
                      onClick={() => setTrendDialog(s)}
                      title="12-month trend"
                    >
                      <LineIcon className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Weight Settings Dialog */}
      <Dialog open={weightDialog} onOpenChange={setWeightDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Configure Scorecard Weights</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Each metric contributes a weighted % of the composite score. Weights must sum to 100.
            </p>
            <div>
              <Label className="text-xs">Presets</Label>
              <div className="flex gap-2 mt-1 flex-wrap">
                <Button size="sm" variant="outline" onClick={() => applyPreset('balanced')}>Balanced</Button>
                <Button size="sm" variant="outline" onClick={() => applyPreset('accuracy')}>Accuracy-focused</Button>
                <Button size="sm" variant="outline" onClick={() => applyPreset('cost')}>Cost-focused</Button>
                <Button size="sm" variant="outline" onClick={() => applyPreset('default')}>Default</Button>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <Label>Dispute Rate</Label>
                  <span className="font-mono">{wDispute.toFixed(0)}%</span>
                </div>
                <Slider value={[wDispute]} min={0} max={100} step={1}
                  onValueChange={(v) => setWDispute(v[0])} />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <Label>Accuracy</Label>
                  <span className="font-mono">{wAccuracy.toFixed(0)}%</span>
                </div>
                <Slider value={[wAccuracy]} min={0} max={100} step={1}
                  onValueChange={(v) => setWAccuracy(v[0])} />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <Label>Payment Cycle</Label>
                  <span className="font-mono">{wCycle.toFixed(0)}%</span>
                </div>
                <Slider value={[wCycle]} min={0} max={100} step={1}
                  onValueChange={(v) => setWCycle(v[0])} />
              </div>
            </div>
            <div className={`text-xs p-2 rounded border ${sumValid
              ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-700'
              : 'bg-destructive/10 border-destructive/40 text-destructive'}`}>
              Sum: {wSum.toFixed(0)}% {sumValid ? '✓' : '— must equal 100%'}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWeightDialog(false)}>Cancel</Button>
            <Button onClick={saveWeights} disabled={!sumValid}
              className="bg-blue-600 hover:bg-blue-700">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Trend Chart Modal */}
      <Dialog open={!!trendDialog} onOpenChange={(o) => !o && setTrendDialog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {trendDialog?.logistic_name} · 12-Month Trend
            </DialogTitle>
          </DialogHeader>
          <div className="h-72">
            {trendData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                No historical data available yet. Trend will populate after multiple recomputes.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis domain={[0, 100]} className="text-xs" />
                  <Tooltip />
                  <Line type="monotone" dataKey="score" stroke="hsl(217 91% 60%)"
                    strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default TransporterScorecardPanel;
