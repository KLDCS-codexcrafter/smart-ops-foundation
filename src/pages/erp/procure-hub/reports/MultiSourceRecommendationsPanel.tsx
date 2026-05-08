/**
 * @file        MultiSourceRecommendationsPanel.tsx
 * @purpose     Standalone dashboard for sourcing-recommendation-engine output.
 * @sprint      T-Phase-1.A.3.c-Procure360-OOB-Polish-PEQ-FU
 * @decisions   D-NEW-AN · D-NEW-AQ
 * @disciplines FR-19 · FR-30 · FR-50 · FR-58
 * @reuses      sourcing-recommendation-engine
 * @[JWT]       n/a · derived view
 */

import { useMemo } from 'react';
import { useEntityCode } from '@/hooks/useEntityCode';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  computeSourcingRecommendations,
  type SourcingRecommendation,
  type MultiSourceStrategy,
} from '@/lib/sourcing-recommendation-engine';

function strategyVariant(s: MultiSourceStrategy): 'default' | 'destructive' | 'secondary' | 'outline' {
  if (s === 'force_alternate') return 'destructive';
  if (s === 'split_3+') return 'default';
  if (s === 'split_2') return 'secondary';
  return 'outline';
}

export function MultiSourceRecommendationsPanel(): JSX.Element {
  const { entityCode } = useEntityCode();
  const recs = useMemo<SourcingRecommendation[]>(
    () => computeSourcingRecommendations(entityCode),
    [entityCode],
  );

  const kpis = useMemo(() => ({
    total: recs.length,
    forceAlt: recs.filter((r) => r.recommended_strategy === 'force_alternate').length,
    split3: recs.filter((r) => r.recommended_strategy === 'split_3+').length,
    single: recs.filter((r) => r.recommended_strategy === 'single').length,
  }), [recs]);

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Multi-Source Recommendations</h1>
        <p className="text-sm text-muted-foreground">
          Sourcing strategies derived from vendor scoring + concentration risk · per FR-40.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Recs</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold font-mono">{kpis.total}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Force Alternate</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold font-mono text-destructive">{kpis.forceAlt}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Split 3+</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold font-mono">{kpis.split3}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Single Source</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold font-mono text-muted-foreground">{kpis.single}</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          {recs.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No live enquiries with quotations yet · recommendations will populate as enquiries reach quotations_received / award_pending.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-2">Item</th>
                  <th className="text-left p-2">Strategy</th>
                  <th className="text-left p-2">Primary Vendor</th>
                  <th className="text-right p-2">Primary %</th>
                  <th className="text-left p-2">Alternates</th>
                  <th className="text-left p-2">Alternate Shares</th>
                  <th className="text-left p-2">Rationale</th>
                </tr>
              </thead>
              <tbody>
                {recs.map((r) => (
                  <tr key={`${r.context_id}-${r.item_id}`} className="border-t align-top">
                    <td className="p-2 font-medium">{r.item_name}</td>
                    <td className="p-2">
                      <Badge variant={strategyVariant(r.recommended_strategy)}>
                        {r.recommended_strategy.replace(/_/g, ' ')}
                      </Badge>
                    </td>
                    <td className="p-2">{r.primary_vendor_name}</td>
                    <td className="p-2 text-right font-mono">{r.primary_share_pct}%</td>
                    <td className="p-2 text-xs">{r.alternate_vendor_names.join(', ') || '—'}</td>
                    <td className="p-2 text-xs font-mono">
                      {r.alternate_shares_pct.length > 0 ? r.alternate_shares_pct.map((p) => `${p}%`).join(' · ') : '—'}
                    </td>
                    <td className="p-2 text-xs text-muted-foreground">
                      {r.rationale.map((line, i) => <div key={i}>{line}</div>)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
