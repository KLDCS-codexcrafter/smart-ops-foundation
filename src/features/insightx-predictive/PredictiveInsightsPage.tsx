/**
 * @file        src/features/insightx-predictive/PredictiveInsightsPage.tsx
 * @page        First-Class Standalone Page #63 · β Predictive Insights · #6 explainable
 *              · NL-query bar. Registered as InsightXModule 'ix-predictive'.
 * @sprint      Sprint 135 · T-Phase-7.D.3.6 · 🌟 Arc D.3
 * @decisions   Reads ONLY predictive-insight-engine (predict + queryInsights).
 *              4 numeric ML scenarios (64/65/66/68) · scenario 67 is Phase-8.
 *              NOT a sibling. "Auditable AI" — every prediction shows its drivers.
 */
import { useMemo, useState } from 'react';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sparkles, Search, Lightbulb } from 'lucide-react';
import {
  predict,
  queryInsights,
  PREDICTIVE_SCENARIOS,
  type Prediction,
  type PredictiveScenario,
  type NLQueryResult,
} from '@/lib/predictive-insight-engine';

const SCENARIO_LABELS: Record<PredictiveScenario, { title: string; description: string }> = {
  breakdown_30d: {
    title: 'Asset Breakdown · 30-day',
    description: 'Linear regression on the predictive-maintenance signal trend.',
  },
  useful_life: {
    title: 'Asset Useful Life',
    description: 'Holt-Winters exponential smoothing on usage with seasonal capture.',
  },
  replacement_cost: {
    title: 'Replacement Cost',
    description: 'Linear regression on price-index history.',
  },
  premium_optimization: {
    title: 'Insurance Premium Optimisation',
    description: 'ARIMA-lite AR(1) + drift on the risk profile.',
  },
};

// Deterministic mock history — replace with real source reads in Phase 8.
const MOCK_HISTORY: Record<PredictiveScenario, { period: string; value: number }[]> = {
  breakdown_30d:        [{period:'D-90',value:12},{period:'D-60',value:15},{period:'D-30',value:18},{period:'D-0',value:22}],
  useful_life:          [{period:'Q1',value:1000},{period:'Q2',value:1080},{period:'Q3',value:1150},{period:'Q4',value:1210},{period:'Q5',value:1290},{period:'Q6',value:1360},{period:'Q7',value:1430},{period:'Q8',value:1500}],
  replacement_cost:     [{period:'FY22',value:480000},{period:'FY23',value:495000},{period:'FY24',value:512000},{period:'FY25',value:528000},{period:'FY26',value:546000}],
  premium_optimization: [{period:'Y1',value:42000},{period:'Y2',value:43500},{period:'Y3',value:44200},{period:'Y4',value:45100},{period:'Y5',value:45900}],
};

export default function PredictiveInsightsPage(): JSX.Element {
  const predictions = useMemo<Prediction[]>(
    () => PREDICTIVE_SCENARIOS.map((s) =>
      predict({ scenario: s, subject_id: `subj-${s}`, history: MOCK_HISTORY[s] }),
    ),
    [],
  );

  const [nlQuery, setNlQuery] = useState('');
  const [nlResult, setNlResult] = useState<NLQueryResult | null>(null);

  const runQuery = (): void => {
    setNlResult(queryInsights(nlQuery));
  };

  return (
    <div className="min-h-full bg-background p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
        <header className="space-y-2">
          <div className="flex items-center gap-3">
            <Sparkles className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-semibold">Predictive Insights</h1>
            <Badge variant="outline">β · Lens 10</Badge>
            <Badge variant="secondary">Auditable AI</Badge>
          </div>
          <p className="text-muted-foreground max-w-3xl">
            In-house statistical ML (linear regression · Holt-Winters · ARIMA-lite).
            <span className="font-mono"> No ML library · no LLM · no new runtime dep.</span>
            Every prediction exposes its drivers, coefficients, r² and 95% confidence band
            (#6 explainable-by-design). Scenario 67 (invoice NLP) is Phase-8.
          </p>
        </header>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Search className="h-4 w-4" /> NL Query · Ask the 75-scenario registry
            </CardTitle>
            <CardDescription>
              Deterministic keyword / synonym intent-match · NO LLM. Try "AR ageing over 90 days" or "revenue forecast".
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder='e.g. "cash forecast" or "budget variance"'
                value={nlQuery}
                onChange={(e) => setNlQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') runQuery(); }}
              />
              <Button onClick={runQuery}>Query</Button>
            </div>
            {nlResult && (
              <div className="rounded-lg border border-border bg-muted/20 p-3 text-sm space-y-1">
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-warning" />
                  {nlResult.matched_scenario_id ? (
                    <>
                      <Badge variant="default">{nlResult.matched_scenario_id}</Badge>
                      {nlResult.lens && <Badge variant="outline">{nlResult.lens}</Badge>}
                      <span className="text-xs text-muted-foreground font-mono">score {nlResult.match_score}</span>
                    </>
                  ) : (
                    <Badge variant="outline">No match</Badge>
                  )}
                </div>
                <p className="text-muted-foreground">{nlResult.interpretation}</p>
                {nlResult.result && (
                  <div className="font-mono text-xs">value = {String(nlResult.result.value)} · source = {nlResult.result.source_ref}</div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {predictions.map((p) => (
            <Card key={p.scenario} className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-base">
                  <span>{SCENARIO_LABELS[p.scenario].title}</span>
                  <Badge variant="outline" className="font-mono">{p.explanation.model}</Badge>
                </CardTitle>
                <CardDescription>{SCENARIO_LABELS[p.scenario].description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-baseline gap-3">
                  <div className="font-mono text-3xl">{p.predicted_value}</div>
                  <div className="text-xs text-muted-foreground">horizon {p.horizon}</div>
                </div>
                <div className="rounded-lg border border-border bg-muted/10 p-3 space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Explanation · #6 auditable AI
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>r² <span className="font-mono ml-1">{p.explanation.r_squared}</span></div>
                    <div>95% band <span className="font-mono ml-1">[{p.explanation.confidence_band.low} · {p.explanation.confidence_band.high}]</span></div>
                  </div>
                  <div className="space-y-1">
                    {p.explanation.drivers.map((d) => (
                      <div key={d.name} className="flex items-center justify-between text-xs">
                        <span className="font-mono">{d.name}</span>
                        <span className="text-muted-foreground">
                          coef <span className="font-mono">{d.coefficient}</span> · contrib <span className="font-mono">{d.contribution_pct}%</span>
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="text-xs text-muted-foreground italic">{p.explanation.notes}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
