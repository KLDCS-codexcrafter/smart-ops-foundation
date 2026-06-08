/**
 * @file        src/features/command-center/modules/MasterHealthScorecardPage.tsx
 * @sprint      B6 · T-B6-Master-Health · Pillar-B CLOSE
 * @purpose     Master Health cockpit · overall score + per-type cards + critical
 *              findings list with drill-through to EXISTING governance panels
 *              (no duplicate merge UI · AC7).
 */
import { useMemo, useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Activity, AlertOctagon, AlertTriangle, ShieldCheck, RefreshCw, ArrowRight,
} from 'lucide-react';
import { useEntityCode } from '@/hooks/useEntityCode';
import {
  runMasterHealth, loadLastRun, getCriticalFindings,
} from '@/lib/master-health-scorecard-engine';
import type {
  MasterHealthCheck, MasterHealthReport, MasterHealthSeverity,
} from '@/types/master-health';

const DIM_LABEL: Record<string, string> = {
  duplicates: 'Duplicates',
  sleeping: 'Sleeping',
  incomplete: 'Incomplete',
  orphaned: 'Orphaned',
  ssot_coverage: 'SSOT Coverage',
};

function sevTone(s: MasterHealthSeverity): string {
  if (s === 'critical') return 'text-destructive';
  if (s === 'warn') return 'text-warning';
  return 'text-success';
}
function sevBadge(s: MasterHealthSeverity): string {
  if (s === 'critical') return 'bg-destructive text-destructive-foreground';
  if (s === 'warn') return 'bg-warning text-warning-foreground';
  return 'bg-success text-success-foreground';
}
function scoreTone(score: number): string {
  if (score >= 85) return 'text-success';
  if (score >= 65) return 'text-primary';
  if (score >= 40) return 'text-warning';
  return 'text-destructive';
}

export default function MasterHealthScorecardPage(): JSX.Element {
  const { entityCode } = useEntityCode();
  const [report, setReport] = useState<MasterHealthReport | null>(
    () => (entityCode ? loadLastRun(entityCode) : null),
  );
  const [busy, setBusy] = useState(false);

  const runScan = useCallback(() => {
    if (!entityCode) return;
    setBusy(true);
    // Synchronous engine call — UI defers a tick for spinner.
    setTimeout(() => {
      const next = runMasterHealth(entityCode, new Date());
      setReport(next);
      setBusy(false);
    }, 50);
  }, [entityCode]);

  const criticals = useMemo<MasterHealthCheck[]>(
    () => (report ? getCriticalFindings(report) : []),
    [report],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold">Master Health Scorecard</h1>
            <Badge variant="outline" className="font-mono">B.6 · Pillar-B</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            One score across duplicates · sleeping · incomplete · orphaned · SSOT coverage.
            Detection is delegated to idea-3 and idea-9; this cockpit aggregates and drills through to existing panels.
          </p>
        </div>
        <Button onClick={runScan} disabled={busy || !entityCode}>
          <RefreshCw className={`h-4 w-4 mr-2 ${busy ? 'animate-spin' : ''}`} />
          {busy ? 'Scanning…' : 'Run Health Check'}
        </Button>
      </div>

      {/* Honesty banner — verbatim per AC9 */}
      <Card className="p-4 glass-card border-warning/40">
        <p className="text-xs text-muted-foreground leading-relaxed">
          Health is computed from current device data; cross-device integrity and server-scale scanning arrive with Wave-2.
          Unavailable checks are shown honestly, not as zero.
        </p>
      </Card>

      {!report && (
        <Card className="p-8 text-center">
          <Activity className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            No health report yet for entity <span className="font-mono">{entityCode || '—'}</span>.
            Run a scan to assemble checks from the existing governance engines.
          </p>
        </Card>
      )}

      {report && (
        <>
          {/* Headline */}
          <Card className="p-6 glass-card">
            <div className="flex items-end justify-between gap-6">
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider">Overall Health</div>
                <div className={`font-mono text-5xl font-bold ${scoreTone(report.overall_score)}`}>
                  {report.overall_score}
                  <span className="text-base text-muted-foreground"> / 100</span>
                </div>
                <div className="text-xs text-muted-foreground mt-1 font-mono">
                  Generated · {new Date(report.generated_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                </div>
              </div>
              <div className="text-right text-xs text-muted-foreground space-y-1">
                <div>{report.by_type.length} master types scanned</div>
                <div>{criticals.length} critical findings</div>
              </div>
            </div>
          </Card>

          {/* Per-master-type grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {report.by_type.map((t) => (
              <Card key={String(t.master_type)} className="p-4 glass-card">
                <div className="flex items-center justify-between">
                  <div className="font-semibold capitalize">{String(t.master_type).replace('_', ' ')}</div>
                  <div className={`font-mono text-2xl font-bold ${scoreTone(t.score_0_100)}`}>
                    {t.score_0_100}
                  </div>
                </div>
                <div className="mt-3 space-y-1">
                  {t.checks.map((c) => (
                    <div key={c.dimension} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{DIM_LABEL[c.dimension] ?? c.dimension}</span>
                      <span className="flex items-center gap-2">
                        <span className="font-mono">{c.count}</span>
                        <Badge className={`${sevBadge(c.severity)} text-[10px] px-1.5 py-0`}>
                          {c.source === 'unavailable' ? 'n/a' : c.severity}
                        </Badge>
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>

          {/* Critical findings */}
          <Card className="p-4 glass-card">
            <div className="flex items-center gap-2 mb-3">
              <AlertOctagon className="h-4 w-4 text-destructive" />
              <h2 className="font-semibold">Critical Findings</h2>
              <Badge variant="outline" className="font-mono">{criticals.length}</Badge>
            </div>
            {criticals.length === 0 ? (
              <p className="text-xs text-muted-foreground">No critical findings · all dimensions within thresholds.</p>
            ) : (
              <div className="space-y-2">
                {criticals.map((c, i) => (
                  <div
                    key={`${c.master_type}-${c.dimension}-${i}`}
                    className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <AlertTriangle className={`h-3.5 w-3.5 ${sevTone(c.severity)}`} />
                      <span className="font-medium capitalize">{String(c.master_type)}</span>
                      <span className="text-muted-foreground">· {DIM_LABEL[c.dimension] ?? c.dimension}</span>
                      <span className="text-muted-foreground">· {c.detail}</span>
                    </div>
                    {c.drill_route && (
                      <a
                        href={c.drill_route}
                        className="text-primary hover:underline inline-flex items-center gap-1"
                      >
                        Drill through <ArrowRight className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
