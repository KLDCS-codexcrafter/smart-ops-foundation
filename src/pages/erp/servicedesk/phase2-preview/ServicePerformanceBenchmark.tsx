/**
 * @file        src/pages/erp/servicedesk/phase2-preview/ServicePerformanceBenchmark.tsx
 * @purpose     S39 Service Performance Benchmark · Phase 2 Preview stub
 * @sprint      T-Phase-1.C.1f · Block I.1
 */
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Rocket } from 'lucide-react';

export function ServicePerformanceBenchmark(): JSX.Element {
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3">
        <Rocket className="h-6 w-6 text-muted-foreground" />
        <div>
          <h1 className="text-2xl font-bold">Service Performance Benchmark</h1>
          <Badge variant="secondary">[Phase 2] Preview · Coming Soon</Badge>
        </div>
      </div>
      <Card className="p-6 space-y-2 opacity-70">
        <p className="text-sm text-muted-foreground">
          S39 Tier 3 stub · Anonymised industry benchmarks for response time, resolution time, and CSAT
          across the Operix tenant network.
        </p>
        <div className="grid grid-cols-3 gap-3 mt-3">
          <div className="h-20 rounded-md bg-muted/40" />
          <div className="h-20 rounded-md bg-muted/40" />
          <div className="h-20 rounded-md bg-muted/40" />
        </div>
      </Card>
    </div>
  );
}
