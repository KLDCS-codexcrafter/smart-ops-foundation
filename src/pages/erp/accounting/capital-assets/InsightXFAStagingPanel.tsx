/**
 * @file        src/pages/erp/accounting/capital-assets/InsightXFAStagingPanel.tsx
 * @purpose     UI for InsightX FA staging surface · Phase 5 prep · Q-LOCK-10 A.
 * @reachable   Via FinCorePage switch case 'fc-fa-insightx-staging'.
 */
import { useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  stageAssetUnitRecords,
  stageIoTSignals,
  listETLJobs,
  triggerStubETLRun,
} from '@/lib/insightx-fa-staging-engine';

export interface InsightXFAStagingPanelProps {
  entityCode: string;
}

export function InsightXFAStagingPanel({ entityCode }: InsightXFAStagingPanelProps) {
  const [tick, setTick] = useState(0);
  const tables = useMemo(
    () => [stageAssetUnitRecords(entityCode), stageIoTSignals(entityCode)],
    [entityCode, tick],
  );
  const jobs = useMemo(() => listETLJobs(entityCode), [entityCode, tick]);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">InsightX FA Staging</h1>
        <Badge variant="outline">Phase 5 InsightX integration: not yet live</Badge>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Staging tables</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {tables.map((t) => (
            <div key={t.table_name} className="flex items-center justify-between text-sm border-b border-border pb-2">
              <span className="font-mono">{t.table_name}</span>
              <span className="text-muted-foreground font-mono">{t.row_count} rows · {t.schema.length} cols</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">ETL jobs ({jobs.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {jobs.length === 0 && (
            <p className="text-sm text-muted-foreground">No ETL jobs registered.</p>
          )}
          {jobs.map((j) => (
            <div key={j.job_id} className="flex items-center justify-between text-sm border-b border-border pb-2">
              <div>
                <div className="font-mono">{j.job_id}</div>
                <div className="text-xs text-muted-foreground">{j.source_table} → {j.target_warehouse} · {j.schedule}</div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={j.last_run_status === 'success' ? 'default' : 'secondary'}>{j.last_run_status}</Badge>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => { triggerStubETLRun(entityCode, j.job_id); setTick((n) => n + 1); }}
                >
                  Trigger stub run
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export default InsightXFAStagingPanel;
