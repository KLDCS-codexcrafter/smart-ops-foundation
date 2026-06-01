/**
 * SyncThrottlePanel — Sprint 98 Block 5 · operator view of idea-11 token buckets
 * across (entity_code, master_type). Read-only inspector; throttle decisions are
 * emitted by callers via recordThrottledSyncRun.
 */
import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Gauge, RefreshCw } from 'lucide-react';
import { getBucketState, DEFAULT_POLICY } from '@/lib/idea-11-sync-throttle-engine';
import { ALL_MASTER_TYPES, type MasterType } from '@/lib/master-replication-engine';
import { MOCK_ENTITIES } from '@/data/mock-entities';

interface Row {
  entity_code: string;
  master_type: MasterType;
  tokens: number | null;
  capacity: number;
  refill_per_minute: number;
  last_refill_at: string | null;
}

export function SyncThrottlePanel() {
  const [tick, setTick] = useState(0);

  const entityCodes = useMemo(
    () => Array.from(new Set(MOCK_ENTITIES.map((e) => e.shortCode))),
    [],
  );

  const rows: Row[] = useMemo(() => {
    void tick;
    const out: Row[] = [];
    for (const code of entityCodes) {
      for (const mt of ALL_MASTER_TYPES) {
        const state = getBucketState(code, mt);
        if (!state) continue;
        out.push({
          entity_code: code,
          master_type: mt,
          tokens: state.tokens,
          capacity: state.policy.capacity,
          refill_per_minute: state.policy.refill_per_minute,
          last_refill_at: state.last_refill_at,
        });
      }
    }
    return out;
  }, [entityCodes, tick]);

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 5000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Sync Throttle Inspector</h2>
        <p className="text-sm text-muted-foreground">
          Token-bucket state for master sync runs · default policy {DEFAULT_POLICY.capacity}{' '}
          tokens / {DEFAULT_POLICY.refill_per_minute} per minute.
        </p>
      </div>

      <Card className="glass-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Gauge className="w-4 h-4" /> Active Buckets
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => setTick((t) => t + 1)}>
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground border border-dashed rounded-lg">
              No active buckets · throttled sync runs will populate this view.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground border-b">
                    <th className="py-2 pr-3">Entity</th>
                    <th className="py-2 pr-3">Master</th>
                    <th className="py-2 pr-3 text-right">Tokens</th>
                    <th className="py-2 pr-3 text-right">Capacity</th>
                    <th className="py-2 pr-3 text-right">Refill/min</th>
                    <th className="py-2">Last Refill</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={`${r.entity_code}_${r.master_type}`} className="border-b border-border/40">
                      <td className="py-2 pr-3 font-mono">{r.entity_code}</td>
                      <td className="py-2 pr-3">
                        <Badge variant="outline" className="text-xs">{r.master_type}</Badge>
                      </td>
                      <td className="py-2 pr-3 text-right font-mono">
                        {r.tokens != null && r.tokens <= 0
                          ? <span className="text-destructive">{r.tokens}</span>
                          : r.tokens}
                      </td>
                      <td className="py-2 pr-3 text-right font-mono">{r.capacity}</td>
                      <td className="py-2 pr-3 text-right font-mono">{r.refill_per_minute}</td>
                      <td className="py-2 font-mono text-xs text-muted-foreground">
                        {r.last_refill_at?.replace('T', ' ').slice(0, 19) ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
