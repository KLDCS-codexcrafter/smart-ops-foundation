/**
 * @file        src/pages/erp/servicedesk/phase2-preview/ServicePerformanceBenchmark.tsx
 * @purpose     S39 Service Performance Benchmark · Tier-L FOUNDATION · promoted at A.3
 *              Own-tenant metrics LIVE today. Network benchmark = Wave-2 honest banner.
 * @sprint      T-Phase-1.A.3 · T-A3-ServiceDesk-Capstone · Pass 3 of 3
 * @iso         Functional Suitability + Usability
 * @reuses      servicedesk-capstone-engine.computeOwnPerformance (pure)
 */
import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Gauge } from 'lucide-react';
import {
  computeOwnPerformance,
  type OwnPerformanceMetrics,
} from '@/lib/servicedesk-capstone-engine';
import { useEntityCode } from '@/hooks/useEntityCode';

export function ServicePerformanceBenchmark(): JSX.Element {
  const { entityCode } = useEntityCode();
  const [m, setM] = useState<OwnPerformanceMetrics | null>(null);

  useEffect(() => {
    setM(computeOwnPerformance(entityCode));
  }, [entityCode]);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3">
        <Gauge className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Service Performance Benchmark</h1>
          <Badge variant="default">S39 · Tier-L Foundation</Badge>
        </div>
      </div>

      <div className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">
        <span className="font-semibold">Wave-2 banner · </span>
        Anonymised cross-tenant network benchmarks activate when the Operix tenant data plane lands in Wave-2.
        Your own-tenant metrics are live today.
      </div>

      {m && (
        <div className="grid grid-cols-3 gap-4">
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Tickets total</div>
            <div className="text-3xl font-mono mt-2">{m.tickets_total}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Tickets resolved</div>
            <div className="text-3xl font-mono mt-2">{m.tickets_resolved}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Reopened</div>
            <div className="text-3xl font-mono mt-2">{m.reopened_pct}%</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Avg response</div>
            <div className="text-3xl font-mono mt-2">
              {m.avg_response_minutes === null ? '—' : `${m.avg_response_minutes} min`}
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Avg resolution</div>
            <div className="text-3xl font-mono mt-2">
              {m.avg_resolution_hours === null ? '—' : `${m.avg_resolution_hours} h`}
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">First-time-fix</div>
            <div className="text-3xl font-mono mt-2 text-success">{m.first_time_fix_pct}%</div>
          </Card>
        </div>
      )}
    </div>
  );
}
