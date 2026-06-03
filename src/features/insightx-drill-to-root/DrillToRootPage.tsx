/**
 * @file        src/features/insightx-drill-to-root/DrillToRootPage.tsx
 * @page        First-Class Standalone Page #60 · #1 Cross-Card Drill-to-Root
 * @sprint      Sprint 132 · T-Phase-7.D.3.3 · 🌟 Arc D.3 · TOP-1% MOAT
 * @decisions   Reads ONLY cross-card-drilldown-engine. NOT a sibling.
 *              Registered as InsightXModule 'ix-drill-to-root'.
 *              In-session view config (React state only · §O no storage API).
 */
import { useState, useMemo } from 'react';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { GitBranch, AlertTriangle, CheckCircle2, Play, FileText } from 'lucide-react';
import {
  drillToRoot,
  listDrillTraces,
  DRILL_ANOMALIES,
  type CausalChain,
} from '@/lib/cross-card-drilldown-engine';
import { narrateVariance, type VarianceNarrative } from '@/lib/variance-narrative-engine';

const CARD_LABELS: Record<string, string> = {
  'fpa-planning': 'FP&A · Consolidation',
  'procure360':   'Procure360',
  'salesx':       'SalesX · Marketing',
  'payhub':       'PayHub · Treasury',
  'comply360':    'Comply360',
  'insightx':     'InsightX',
};

export default function DrillToRootPage(): JSX.Element {
  const [anomalyId, setAnomalyId] = useState<string>(DRILL_ANOMALIES[0].id);
  const [fy, setFy] = useState<string>('FY26');
  const [entityCode, setEntityCode] = useState<string>('OPX');
  const [current, setCurrent] = useState<CausalChain | null>(null);
  const [tick, setTick] = useState(0);

  const traces = useMemo(() => listDrillTraces(), [tick]); // eslint-disable-line react-hooks/exhaustive-deps

  const runWalk = () => {
    const anomaly = DRILL_ANOMALIES.find((a) => a.id === anomalyId);
    if (!anomaly) return;
    const result = drillToRoot({
      anomaly_metric: anomaly.label,
      fy,
      entity_code: entityCode.trim() || undefined,
    });
    setCurrent(result);
    setTick((n) => n + 1);
  };

  return (
    <div className="min-h-full bg-background p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
        <header className="space-y-2">
          <div className="flex items-center gap-3">
            <GitBranch className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-semibold">Drill-to-Root · Cross-Card</h1>
            <Badge variant="default" className="ml-2">TOP-1% Moat</Badge>
          </div>
          <p className="text-muted-foreground max-w-3xl">
            Walk an anomaly across departments — margin → vendor cost → scheme → AR/cash
            lag — by READING the source engines (FR-44 · no recompute). Honest chain
            gaps surface when a source has no data (no fabrication).
          </p>
        </header>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base">Pick an anomaly</CardTitle>
            <CardDescription>
              The engine walks the chain across {Object.keys(CARD_LABELS).length} known cards.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {DRILL_ANOMALIES.map((a) => (
                <Badge
                  key={a.id}
                  variant={anomalyId === a.id ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => setAnomalyId(a.id)}
                  title={a.hint}
                >
                  {a.label}
                </Badge>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">FY</label>
                <Input value={fy} onChange={(e) => setFy(e.target.value)} className="font-mono" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Entity Code</label>
                <Input value={entityCode} onChange={(e) => setEntityCode(e.target.value)} className="font-mono" />
              </div>
              <div className="flex items-end">
                <Button onClick={runWalk} className="w-full">
                  <Play className="h-4 w-4 mr-2" /> Walk the chain
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {current && (
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                {current.chain_complete
                  ? <CheckCircle2 className="h-4 w-4 text-success" />
                  : <AlertTriangle className="h-4 w-4 text-warning" />}
                Causal Chain · {current.anomaly} · FY {current.fy}
              </CardTitle>
              <CardDescription className="text-xs font-mono">
                {current.root_cause_summary}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Card</TableHead>
                    <TableHead>Metric</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Contribution %</TableHead>
                    <TableHead>Source Ref</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {current.chain.map((step, idx) => (
                    <TableRow key={`${step.card}-${idx}`}>
                      <TableCell className="font-mono text-xs">{idx + 1}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{CARD_LABELS[step.card] ?? step.card}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div>{step.metric}</div>
                        {step.note && <div className="text-xs text-muted-foreground">{step.note}</div>}
                      </TableCell>
                      <TableCell className="font-mono text-sm">{step.value.toLocaleString('en-IN')}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-24 rounded bg-muted overflow-hidden">
                            <div
                              className="h-full bg-primary"
                              style={{ width: `${Math.min(100, Math.max(0, step.contribution_pct))}%` }}
                            />
                          </div>
                          <span className="font-mono text-xs">{step.contribution_pct}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground truncate max-w-xs">
                        {step.source_ref}
                      </TableCell>
                    </TableRow>
                  ))}
                  {current.chain.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground text-sm">
                        No causal evidence READ for this anomaly — see chain gaps below.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              {current.gap_notes.length > 0 && (
                <div className="rounded-lg border border-warning/40 bg-warning/5 p-4 space-y-1">
                  <div className="text-sm font-semibold text-warning flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" /> Honest chain gaps
                  </div>
                  {current.gap_notes.map((g, i) => (
                    <p key={i} className="text-xs font-mono text-muted-foreground">{g}</p>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base">Recent traces · in-session</CardTitle>
            <CardDescription>
              Trace ledger resets on reload (§O · no storage API).
            </CardDescription>
          </CardHeader>
          <CardContent>
            {traces.length === 0 ? (
              <p className="text-sm text-muted-foreground">No traces yet — walk a chain above.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Trace</TableHead>
                    <TableHead>Anomaly</TableHead>
                    <TableHead>FY</TableHead>
                    <TableHead>Steps</TableHead>
                    <TableHead>Complete?</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {traces.slice().reverse().map((t) => (
                    <TableRow key={t.trace_id}>
                      <TableCell className="font-mono text-xs">{t.trace_id}</TableCell>
                      <TableCell className="text-sm">{t.anomaly}</TableCell>
                      <TableCell className="font-mono text-xs">{t.fy}</TableCell>
                      <TableCell className="font-mono text-xs">{t.chain.length}</TableCell>
                      <TableCell>
                        {t.chain_complete
                          ? <Badge variant="default">complete</Badge>
                          : <Badge variant="outline">gap · {t.gap_notes.length}</Badge>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
