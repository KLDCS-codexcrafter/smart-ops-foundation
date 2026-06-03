/**
 * @file        src/features/insightx-overview/InsightXOverviewPage.tsx
 * @page        First-Class Standalone Page #56 · landing page of the InsightX shell
 * @sprint      Sprint 130 · T-Phase-7.D.3.1 · 🌟 ARC D.3 OPENER
 * @decisions   Reads ONLY insightx-aggregator-engine (no dead UI). Surfaces the
 *              11-lens coverage, the 75-scenario registry browser, and one sample
 *              aggregated insight per lens.
 *              NOT a sibling. Registered as InsightXModule 'ix-overview'.
 */
import { useMemo, useState } from 'react';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { BarChart3, Sparkles, Database } from 'lucide-react';
import {
  INSIGHT_LENSES,
  getScenarioRegistry,
  getRegistryCoverage,
  aggregateInsight,
  type InsightLens,
  type AggregatedInsight,
} from '@/lib/insightx-aggregator-engine';

const LENS_LABELS: Record<InsightLens, string> = {
  cfo_finance:      'CFO / Finance',
  operations_plant: 'Operations / Plant',
  maintenance:      'Maintenance',
  compliance_grc:   'Compliance / GRC',
  esg:              'ESG',
  hr:               'HR',
  procurement:      'Procurement',
  insurance_risk:   'Insurance / Risk',
  cross_card:       'Cross-Card',
  ai_predictive:    'AI / Predictive',
  differentiation:  'Differentiation',
};

export default function InsightXOverviewPage(): JSX.Element {
  const coverage = useMemo(() => getRegistryCoverage(), []);
  const registry = useMemo(() => getScenarioRegistry(), []);

  // One sample backed insight per lens (computed on mount).
  const samples = useMemo(() => {
    const out: Record<string, AggregatedInsight | null> = {};
    for (const lens of INSIGHT_LENSES) {
      const first = registry.find((e) => e.lens === lens && e.backed);
      try {
        out[lens] = first ? aggregateInsight(first.scenario_id) : null;
      } catch {
        out[lens] = null;
      }
    }
    return out;
  }, [registry]);

  const totalBacked = coverage.reduce((s, c) => s + c.backed, 0);
  const totalScenarios = coverage.reduce((s, c) => s + c.total, 0);

  const [filterLens, setFilterLens] = useState<InsightLens | 'all'>('all');
  const visibleRows = filterLens === 'all'
    ? registry
    : registry.filter((e) => e.lens === filterLens);

  return (
    <div className="min-h-full bg-background p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
        <header className="space-y-2">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-semibold">InsightX · Overview</h1>
            <Badge variant="outline" className="ml-2">Phase 7 · Arc D.3 OPENER</Badge>
          </div>
          <p className="text-muted-foreground max-w-3xl">
            Cross-card analytics registry — {totalScenarios} scenarios across {INSIGHT_LENSES.length} lenses.
            This sprint surfaces the {totalBacked} BACKED scenarios; the rest light up in S131–S135.
            Aggregator READS source engines — recomputes nothing (FR-44 · DP-D3-3).
          </p>
        </header>

        <Tabs defaultValue="coverage" className="w-full">
          <TabsList>
            <TabsTrigger value="coverage">11-Lens Coverage</TabsTrigger>
            <TabsTrigger value="registry">Scenario Registry · {totalScenarios}</TabsTrigger>
            <TabsTrigger value="samples">Sample Insights</TabsTrigger>
          </TabsList>

          <TabsContent value="coverage" className="space-y-4 pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {coverage.map((c) => {
                const pct = c.total === 0 ? 0 : Math.round((c.backed / c.total) * 100);
                return (
                  <Card key={c.lens} className="glass-card">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Sparkles className="h-4 w-4 text-primary" />
                        {LENS_LABELS[c.lens]}
                      </CardTitle>
                      <CardDescription className="font-mono">
                        {c.backed} / {c.total} backed · {pct}%
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-2 w-full rounded bg-muted overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${pct}%` }}
                          aria-label={`${pct}% backed`}
                        />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="registry" className="space-y-4 pt-4">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Database className="h-4 w-4 text-primary" />
                  Scenario Registry Browser
                </CardTitle>
                <CardDescription>
                  Filter by lens. Backed scenarios cite a source engine; unbacked ones land in S131–S135.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 mb-4">
                  <Badge
                    variant={filterLens === 'all' ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => setFilterLens('all')}
                  >
                    All · {totalScenarios}
                  </Badge>
                  {INSIGHT_LENSES.map((lens) => (
                    <Badge
                      key={lens}
                      variant={filterLens === lens ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => setFilterLens(lens)}
                    >
                      {LENS_LABELS[lens]}
                    </Badge>
                  ))}
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Scenario</TableHead>
                      <TableHead>Lens</TableHead>
                      <TableHead>Source Engine</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleRows.map((e) => (
                      <TableRow key={e.scenario_id}>
                        <TableCell className="font-mono text-xs">{e.title}</TableCell>
                        <TableCell>{LENS_LABELS[e.lens]}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {e.source_engine ?? '—'}
                        </TableCell>
                        <TableCell>
                          {e.backed
                            ? <Badge variant="default">Backed</Badge>
                            : <Badge variant="outline">Deferred</Badge>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="samples" className="space-y-4 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {INSIGHT_LENSES.map((lens) => {
                const sample = samples[lens];
                return (
                  <Card key={lens} className="glass-card">
                    <CardHeader>
                      <CardTitle className="text-base">{LENS_LABELS[lens]}</CardTitle>
                      <CardDescription>
                        {sample
                          ? `Sample: ${sample.scenario_id}`
                          : 'No backed scenario yet (S131–S135).'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="text-sm space-y-1">
                      {sample ? (
                        <>
                          <p className="font-mono">value: {String(sample.value)}</p>
                          <p className="text-xs text-muted-foreground">
                            source_ref: {sample.source_ref}
                          </p>
                        </>
                      ) : (
                        <p className="text-muted-foreground text-xs">
                          Aggregator will surface this scenario once its source engine lands.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
