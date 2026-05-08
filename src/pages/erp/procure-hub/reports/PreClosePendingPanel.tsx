/**
 * @file        PreClosePendingPanel.tsx
 * @purpose     Dashboard of RFQs eligible for pre-close per existing rfq-engine logic.
 * @sprint      T-Phase-1.A.3.c-Procure360-OOB-Polish-PEQ-FU
 * @decisions   D-NEW-AO · D-NEW-AQ
 * @disciplines FR-19 · FR-30 · FR-50
 * @reuses      pre-close-batch · rfq-engine types
 * @[JWT]       n/a · derived view
 */

import { useMemo } from 'react';
import { useEntityCode } from '@/hooks/useEntityCode';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { listPreCloseCandidates } from '@/lib/pre-close-batch';
import type { PreCloseRecommendation } from '@/lib/rfq-engine';

export function PreClosePendingPanel(): JSX.Element {
  const { entityCode } = useEntityCode();
  const recs = useMemo<PreCloseRecommendation[]>(
    () => listPreCloseCandidates(entityCode),
    [entityCode],
  );

  const kpis = useMemo(() => {
    const total = recs.length;
    const deadlinePassed = recs.filter((r) => r.pct_elapsed >= 100).length;
    const majorityQuoted = recs.filter(
      (r) => r.vendors_quoted >= Math.ceil(r.vendors_invited / 2) && r.pct_elapsed < 100,
    ).length;
    const avgElapsed = total === 0
      ? 0
      : Math.round((recs.reduce((s, r) => s + r.pct_elapsed, 0) / total) * 10) / 10;
    return { total, deadlinePassed, majorityQuoted, avgElapsed };
  }, [recs]);

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Pre-Close Pending</h1>
        <p className="text-sm text-muted-foreground">RFQs eligible for pre-close · sorted by urgency.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Candidates</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold font-mono">{kpis.total}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Deadline Passed</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold font-mono text-destructive">{kpis.deadlinePassed}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Majority Quoted Early</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold font-mono">{kpis.majorityQuoted}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Avg % Elapsed</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold font-mono">{kpis.avgElapsed}%</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          {recs.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No RFQs eligible for pre-close.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-2">RFQ #</th>
                  <th className="text-right p-2">Invited</th>
                  <th className="text-right p-2">Quoted</th>
                  <th className="text-right p-2">Missing</th>
                  <th className="text-right p-2">% Elapsed</th>
                  <th className="text-left p-2">Reason</th>
                  <th className="text-left p-2">Recommended Action</th>
                </tr>
              </thead>
              <tbody>
                {recs.map((r) => (
                  <tr key={r.rfq_id} className="border-t align-top">
                    <td className="p-2 font-mono">{r.rfq_no}</td>
                    <td className="p-2 text-right font-mono">{r.vendors_invited}</td>
                    <td className="p-2 text-right font-mono">{r.vendors_quoted}</td>
                    <td className="p-2 text-right font-mono">{r.vendors_missing}</td>
                    <td className="p-2 text-right font-mono">{r.pct_elapsed.toFixed(1)}%</td>
                    <td className="p-2"><Badge variant={r.pct_elapsed >= 100 ? 'destructive' : 'secondary'}>{r.reason}</Badge></td>
                    <td className="p-2 text-xs text-muted-foreground">{r.recommended_action}</td>
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
