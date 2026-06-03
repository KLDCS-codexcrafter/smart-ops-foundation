/**
 * @file        src/features/insightx-lens-explorer/LensExplorerPage.tsx
 * @page        First-Class Standalone Page #59 · 11-Lens Explorer
 * @sprint      Sprint 132 · T-Phase-7.D.3.3 · 🌟 Arc D.3
 * @decisions   Reads ONLY insightx-aggregator-engine · NO recompute (FR-44).
 *              NOT a sibling. Registered as InsightXModule 'ix-lens-explorer'.
 *              In-session view config (React state only · §O no storage API).
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
import { Layers, Sparkles, Eye } from 'lucide-react';
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

export default function LensExplorerPage(): JSX.Element {
  const registry = useMemo(() => getScenarioRegistry(), []);
  const coverage = useMemo(() => getRegistryCoverage(), []);

  const [activeLens, setActiveLens] = useState<InsightLens>('cfo_finance');
  const [showBackedOnly, setShowBackedOnly] = useState(false);

  const lensRows = useMemo(
    () => registry.filter((e) => e.lens === activeLens && (!showBackedOnly || e.backed)),
    [registry, activeLens, showBackedOnly],
  );

  const lensSamples = useMemo(() => {
    const out: Record<string, AggregatedInsight | { error: string }> = {};
    for (const row of lensRows) {
      if (!row.backed) continue;
      try {
        out[row.scenario_id] = aggregateInsight(row.scenario_id);
      } catch (err) {
        out[row.scenario_id] = { error: err instanceof Error ? err.message : String(err) };
      }
    }
    return out;
  }, [lensRows]);

  const activeCoverage = coverage.find((c) => c.lens === activeLens);
  const pct = activeCoverage && activeCoverage.total > 0
    ? Math.round((activeCoverage.backed / activeCoverage.total) * 100)
    : 0;

  return (
    <div className="min-h-full bg-background p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
        <header className="space-y-2">
          <div className="flex items-center gap-3">
            <Layers className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-semibold">11-Lens Explorer</h1>
            <Badge variant="outline" className="ml-2">Arc D.3</Badge>
          </div>
          <p className="text-muted-foreground max-w-3xl">
            Navigate the 75 cross-card scenarios across {INSIGHT_LENSES.length} canonical
            lenses. Each value cites its source engine — the aggregator READS, never
            recomputes (FR-44 · DP-D3-3).
          </p>
        </header>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base">Pick a lens</CardTitle>
            <CardDescription>
              In-session navigation only — no preferences are persisted (§O).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {INSIGHT_LENSES.map((lens) => {
                const cov = coverage.find((c) => c.lens === lens);
                return (
                  <Badge
                    key={lens}
                    variant={activeLens === lens ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => setActiveLens(lens)}
                  >
                    {LENS_LABELS[lens]} · {cov ? `${cov.backed}/${cov.total}` : '0/0'}
                  </Badge>
                );
              })}
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={showBackedOnly ? 'default' : 'outline'}
                onClick={() => setShowBackedOnly((v) => !v)}
              >
                <Eye className="h-3 w-3 mr-1" />
                {showBackedOnly ? 'Showing backed only' : 'Show all'}
              </Button>
              <span className="text-xs text-muted-foreground font-mono">
                {LENS_LABELS[activeLens]} · {pct}% backed
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" />
              Scenarios in this lens
            </CardTitle>
            <CardDescription>
              Backed rows are READ from their source engine on demand.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Scenario</TableHead>
                  <TableHead>Source Engine</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Source Ref</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lensRows.map((row) => {
                  const sample = lensSamples[row.scenario_id];
                  const isError = sample && 'error' in sample;
                  return (
                    <TableRow key={row.scenario_id}>
                      <TableCell className="font-mono text-xs">{row.title}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {row.source_engine ?? '—'}
                      </TableCell>
                      <TableCell>
                        {row.backed
                          ? <Badge variant="default">Backed</Badge>
                          : <Badge variant="outline">Deferred</Badge>}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {row.backed && sample && !isError
                          ? String((sample as AggregatedInsight).value)
                          : row.backed && isError
                            ? <span className="text-warning">err</span>
                            : '—'}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground truncate max-w-xs">
                        {row.backed && sample && !isError
                          ? (sample as AggregatedInsight).source_ref
                          : '—'}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {lensRows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground text-sm">
                      No scenarios match the current filter.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
