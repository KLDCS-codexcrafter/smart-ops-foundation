/**
 * @file        src/features/insightx-operix-score/OperixScorePage.tsx
 * @page        First-Class Standalone Page #61 · Operix Score (the login-screen number).
 * @sprint      Sprint 133 · T-Phase-7.D.3.4 · 🌟 Arc D.3 · #3 TOP-1%
 * @decisions   Reads ONLY operix-score-engine (composes from aggregator +
 *              comply360-health · §H frozen engines stay 0-DIFF · NEVER edited).
 *              Surfaces the latest variance narrative (variance-narrative-engine).
 *              NOT a sibling. Registered as InsightXModule 'ix-operix-score'.
 */
import { useMemo, useState } from 'react';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Gauge, RefreshCw, FileText } from 'lucide-react';
import {
  computeOperixScore,
  getScoreTrend,
  OPERIX_SCORE_WEIGHTS,
  type OperixScore,
  type OperixBand,
} from '@/lib/operix-score-engine';
import {
  narrateVariance,
  NARRATIVE_SUBJECTS,
  type VarianceNarrative,
} from '@/lib/variance-narrative-engine';

const BAND_LABEL: Record<OperixBand, string> = {
  strong:   'STRONG · 85+',
  healthy:  'HEALTHY · 65–84',
  weak:     'WEAK · 40–64',
  critical: 'CRITICAL · <40',
};

const BAND_TONE: Record<OperixBand, string> = {
  strong:   'text-success',
  healthy:  'text-primary',
  weak:     'text-warning',
  critical: 'text-destructive',
};

const DIMENSION_LABEL: Record<string, string> = {
  compliance:    'Compliance',
  assets:        'Assets',
  receivables:   'Receivables',
  inventory:     'Inventory',
  profitability: 'Profitability',
  operations:    'Operations',
};

export default function OperixScorePage(): JSX.Element {
  const [tick, setTick] = useState(0);
  const score: OperixScore = useMemo(
    () => computeOperixScore({ fy: 'FY26' }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tick],
  );
  const trend = useMemo(() => getScoreTrend({ fy: 'FY26', periods: 6 }), [tick]); // eslint-disable-line react-hooks/exhaustive-deps
  const narrative: VarianceNarrative = useMemo(
    () => narrateVariance({ subject_metric: NARRATIVE_SUBJECTS[0].label, fy: 'FY26' }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tick],
  );

  return (
    <div className="min-h-full bg-background p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
        <header className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Gauge className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-semibold">Operix Score</h1>
              <Badge variant="outline" className="ml-2">FY {score.fy}</Badge>
            </div>
            <p className="text-muted-foreground max-w-3xl">
              One composite 0–100 enterprise-health number · composed from cross-card
              signals (FR-44) · §H health-score engines stay 0-DIFF.
            </p>
          </div>
          <Button variant="outline" onClick={() => setTick((n) => n + 1)}>
            <RefreshCw className="h-4 w-4 mr-2" /> Recompute
          </Button>
        </header>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg">The Number</CardTitle>
            <CardDescription>
              Weighted composite · weights_sum = {score.weights_sum.toFixed(2)}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-end gap-6">
            <div className={`font-mono text-7xl tracking-tight ${BAND_TONE[score.band]}`}>
              {score.score.toFixed(0)}
            </div>
            <div className="space-y-1">
              <Badge variant="secondary" className="text-sm">
                {BAND_LABEL[score.band]}
              </Badge>
              <p className="text-xs text-muted-foreground font-mono">
                computed_at {score.computed_at}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base">Component Breakdown</CardTitle>
            <CardDescription>
              Each dimension's contribution to the score · raw × weight = weighted.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dimension</TableHead>
                  <TableHead className="text-right">Raw</TableHead>
                  <TableHead className="text-right">Weight</TableHead>
                  <TableHead className="text-right">Weighted</TableHead>
                  <TableHead>Band</TableHead>
                  <TableHead>Source</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {score.components.map((c) => (
                  <TableRow key={c.dimension}>
                    <TableCell className="font-medium">{DIMENSION_LABEL[c.dimension] ?? c.dimension}</TableCell>
                    <TableCell className="text-right font-mono">{c.raw.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-mono">{(OPERIX_SCORE_WEIGHTS[c.dimension] * 100).toFixed(0)}%</TableCell>
                    <TableCell className="text-right font-mono">{c.weighted.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={BAND_TONE[c.band]}>{c.band}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground truncate max-w-xs" title={c.source_ref}>
                      {c.source_ref}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {trend.length > 0 && (
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-base">Score Trend</CardTitle>
              <CardDescription>In-session series (resets on reload · §O).</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-2 h-32">
                {trend.map((pt) => (
                  <div key={pt.period} className="flex flex-col items-center gap-1 flex-1">
                    <div
                      className="w-full bg-primary/60 rounded-t"
                      style={{ height: `${Math.max(2, pt.score)}%` }}
                      title={`${pt.period} · ${pt.score}`}
                    />
                    <span className="text-[10px] font-mono text-muted-foreground">{pt.period}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" /> What Changed &amp; Why
            </CardTitle>
            <CardDescription>
              Auto-narrative · deterministic NLG · no LLM · narrates the causal chain.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="font-semibold">{narrative.headline}</div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {narrative.paragraph}
            </p>
            {narrative.drivers.length > 0 && (
              <div className="space-y-1">
                {narrative.drivers.slice(0, 5).map((d, i) => (
                  <div key={`${d.driver}-${i}`} className="text-xs font-mono text-muted-foreground">
                    #{i + 1} · {d.driver} · {d.contribution_pct.toFixed(1)}% · {d.source_ref}
                  </div>
                ))}
              </div>
            )}
            {!narrative.chain_complete && narrative.gap_notes.length > 0 && (
              <div className="text-xs text-warning">
                §L · {narrative.gap_notes.length} step(s) honestly skipped (no fabrication).
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
