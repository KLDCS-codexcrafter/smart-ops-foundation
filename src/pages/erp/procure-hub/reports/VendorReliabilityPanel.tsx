/**
 * @file        VendorReliabilityPanel.tsx
 * @purpose     Top-50 vendors by composite score · tracker for reliability tier.
 * @sprint      T-Phase-1.A.3.c-Procure360-OOB-Polish-PEQ-FU
 * @decisions   D-NEW-AQ
 * @disciplines FR-19 · FR-30 · FR-50
 * @reuses      vendor-scoring-engine
 * @[JWT]       n/a · derived view
 */

import { useMemo } from 'react';
import { useEntityCode } from '@/hooks/useEntityCode';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getTopVendorsByScore, type VendorScore } from '@/lib/vendor-scoring-engine';

function topQuartileThreshold(scores: number[]): number {
  if (scores.length === 0) return 0;
  const sorted = [...scores].sort((a, b) => a - b);
  const idx = Math.floor(sorted.length * 0.75);
  return Math.round((sorted[Math.min(idx, sorted.length - 1)] ?? 0) * 100) / 100;
}

export function VendorReliabilityPanel(): JSX.Element {
  const { entityCode } = useEntityCode();
  const vendors = useMemo<VendorScore[]>(
    () => getTopVendorsByScore(entityCode, 50),
    [entityCode],
  );

  const kpis = useMemo(() => {
    const total = vendors.length;
    const avg = total === 0 ? 0
      : Math.round((vendors.reduce((s, v) => s + v.total_score, 0) / total) * 100) / 100;
    const topQ = topQuartileThreshold(vendors.map((v) => v.total_score));
    return { total, avg, topQ };
  }, [vendors]);

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Vendor Reliability</h1>
        <p className="text-sm text-muted-foreground">Composite score (price · quality · delivery · responsiveness · payment · compliance).</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Vendors Scored</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold font-mono">{kpis.total}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Avg Score</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold font-mono">{kpis.avg}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Top Quartile (≥)</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold font-mono">{kpis.topQ}</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          {vendors.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No vendors scored yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="text-right p-2">Rank</th>
                  <th className="text-left p-2">Vendor</th>
                  <th className="text-right p-2">Total Score</th>
                  <th className="text-left p-2">Top Factors</th>
                  <th className="text-right p-2">RFQs</th>
                  <th className="text-right p-2">Awards</th>
                </tr>
              </thead>
              <tbody>
                {vendors.map((v, i) => {
                  const tier = v.total_score >= kpis.topQ
                    ? <Badge>Top quartile</Badge>
                    : <Badge variant="outline">Standard</Badge>;
                  const topFactors = [...v.factor_breakdown]
                    .sort((a, b) => b.weighted_score - a.weighted_score)
                    .slice(0, 3)
                    .map((f) => `${f.name}:${f.weighted_score}`)
                    .join(' · ');
                  return (
                    <tr key={v.vendor_id} className="border-t">
                      <td className="p-2 text-right font-mono">{i + 1}</td>
                      <td className="p-2">
                        <div className="font-medium">{v.vendor_name}</div>
                        <div className="text-xs text-muted-foreground">{tier}</div>
                      </td>
                      <td className="p-2 text-right font-mono">{v.total_score}</td>
                      <td className="p-2 text-xs font-mono text-muted-foreground">{topFactors}</td>
                      <td className="p-2 text-right font-mono">{v.rfq_count}</td>
                      <td className="p-2 text-right font-mono">{v.award_count}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
