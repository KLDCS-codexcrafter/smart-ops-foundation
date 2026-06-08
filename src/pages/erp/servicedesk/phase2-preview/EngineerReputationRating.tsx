/**
 * @file        src/pages/erp/servicedesk/phase2-preview/EngineerReputationRating.tsx
 * @purpose     S40 Engineer Reputation Rating · Tier-L FOUNDATION · promoted at A.3
 *              Per-engineer rollup from local tickets LIVE today.
 *              Cross-customer aggregation = Wave-2 honest banner.
 * @sprint      T-Phase-1.A.3 · T-A3-ServiceDesk-Capstone · Pass 3 of 3
 * @iso         Functional Suitability + Usability
 * @reuses      servicedesk-capstone-engine.computeEngineerReputation (pure)
 */
import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star } from 'lucide-react';
import {
  computeEngineerReputation,
  type EngineerReputation,
} from '@/lib/servicedesk-capstone-engine';
import { useEntityCode } from '@/hooks/useEntityCode';

export function EngineerReputationRating(): JSX.Element {
  const { entityCode } = useEntityCode();
  const [rows, setRows] = useState<EngineerReputation[]>([]);

  useEffect(() => {
    setRows(computeEngineerReputation(entityCode));
  }, [entityCode]);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3">
        <Star className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Engineer Reputation Rating</h1>
          <Badge variant="default">S40 · Tier-L Foundation</Badge>
        </div>
      </div>

      <div className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">
        <span className="font-semibold">Wave-2 banner · </span>
        Cross-customer (network-wide) reputation aggregation activates with the Wave-2 identity-linked engineer pool.
        Per-engineer tenant rollup is live today.
      </div>

      <Card className="p-4">
        <h2 className="font-semibold mb-3">Engineer scoreboard ({rows.length})</h2>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No ticket history with assigned engineers yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th className="py-2">Engineer</th>
                <th>Closed</th>
                <th>Reopened</th>
                <th>On-time %</th>
                <th>Reputation</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.engineer_id} className="border-t border-border">
                  <td className="py-2 font-mono text-xs">{r.engineer_id}</td>
                  <td className="font-mono">{r.closed_count}</td>
                  <td className="font-mono">{r.reopened_count}</td>
                  <td className="font-mono">{r.on_time_pct}%</td>
                  <td>
                    <Badge variant={r.reputation_score >= 75 ? 'default' : r.reputation_score >= 50 ? 'secondary' : 'destructive'}>
                      {r.reputation_score}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
