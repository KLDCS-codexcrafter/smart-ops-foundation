/**
 * @file        src/features/insightx-cockpit/InsightXCockpitPage.tsx
 * @page        First-Class Standalone Page #57 · Executive Cockpit (one tile per lens).
 * @sprint      Sprint 131 · T-Phase-7.D.3.2 · Arc D.3
 * @decisions   Reads ONLY insight-cockpit-engine (which reads the aggregator · no recompute).
 *              NOT a sibling. Registered as InsightXModule 'ix-cockpit'.
 */
import { useMemo } from 'react';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LayoutDashboard, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { buildExecutiveCockpit } from '@/lib/insight-cockpit-engine';
import type { InsightLens } from '@/lib/insightx-aggregator-engine';

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

function TrendIcon({ trend }: { trend: 'up' | 'down' | 'flat' }): JSX.Element {
  if (trend === 'up')   return <TrendingUp className="h-4 w-4 text-success" />;
  if (trend === 'down') return <TrendingDown className="h-4 w-4 text-warning" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
}

export default function InsightXCockpitPage(): JSX.Element {
  const cockpit = useMemo(() => buildExecutiveCockpit({ fy: 'FY26' }), []);

  return (
    <div className="min-h-full bg-background p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
        <header className="space-y-2">
          <div className="flex items-center gap-3">
            <LayoutDashboard className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-semibold">Executive Cockpit</h1>
            <Badge variant="outline" className="ml-2">FY {cockpit.fy}</Badge>
          </div>
          <p className="text-muted-foreground max-w-3xl">
            One headline tile per lens · sourced from the InsightX aggregator (no recompute · FR-44).
            Generated at <span className="font-mono text-xs">{cockpit.generated_at}</span>.
          </p>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {cockpit.tiles.map((tile) => (
            <Card key={tile.lens} className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-base">
                  <span>{LENS_LABELS[tile.lens]}</span>
                  <TrendIcon trend={tile.trend} />
                </CardTitle>
                <CardDescription className="text-xs">
                  {tile.headline}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="font-mono text-2xl">{String(tile.value)}</div>
                <div className="text-xs text-muted-foreground truncate" title={tile.source_ref}>
                  {tile.source_ref}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
