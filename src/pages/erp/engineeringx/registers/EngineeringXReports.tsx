/**
 * @file        src/pages/erp/engineeringx/registers/EngineeringXReports.tsx
 * @purpose     EngineeringX 4-stat closeout dashboard + activity timeline + reference library usage
 * @who         Engineering Lead · Plant Head
 * @when        2026-05-10
 * @sprint      T-Phase-1.A.13 · Q-LOCK-9a · Block B.4 · CLOSEOUT reports panel
 * @iso         ISO 9001:2015 §9.1 · ISO 25010 Usability
 * @whom        Audit Owner · Engineering Lead
 * @decisions   Cross-card consumer queries · D-NEW-CP reverse query for reference library usage
 * @disciplines FR-30 · FR-50 · FR-67
 * @reuses      engineeringx-engine listDrawings · engineeringx-bom-engine loadBomEntries · engineeringx-analysis-engine listReadyForProduction
 * @[JWT]       Phase 1 mock · Phase 2 wires real reporting via edge function
 */
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BarChart3 } from 'lucide-react';
import { useEntityCode } from '@/hooks/useEntityCode';
import { listDrawings } from '@/lib/engineeringx-engine';
import { loadBomEntries } from '@/lib/engineeringx-bom-engine';
import { listReadyForProduction } from '@/lib/engineeringx-analysis-engine';
import { parseDrawingCustomTags } from '@/types/engineering-drawing';
import type { EngineeringXModule } from '../EngineeringXSidebar.types';

interface Props {
  onNavigate?: (m: EngineeringXModule) => void;
}

export function EngineeringXReports({ onNavigate }: Props): JSX.Element {
  const { entityCode } = useEntityCode();

  const stats = useMemo(() => {
    if (!entityCode) {
      return { total: 0, withBom: 0, approved: 0, ready: 0, bomRate: 0, approvalRate: 0 };
    }
    const all = listDrawings(entityCode);
    const bom = loadBomEntries(entityCode);
    const drawingsWithBom = new Set(bom.map((b) => b.drawing_id));
    const approved = all.filter((d) =>
      d.versions?.some(
        (v) => v.version_no === d.current_version && v.version_status === 'approved',
      ),
    ).length;
    const ready = listReadyForProduction(entityCode).length;
    return {
      total: all.length,
      withBom: drawingsWithBom.size,
      approved,
      ready,
      bomRate: all.length ? Math.round((drawingsWithBom.size / all.length) * 100) : 0,
      approvalRate: all.length ? Math.round((approved / all.length) * 100) : 0,
    };
  }, [entityCode]);

  const recentActivity = useMemo(() => {
    if (!entityCode) return [];
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const all = listDrawings(entityCode);
    const events: Array<{ ts: string; label: string; drawingNo: string }> = [];
    for (const d of all) {
      const m = parseDrawingCustomTags(d.tags?.custom_tags);
      const drawingNo = m.drawing_no ?? d.id.slice(0, 8);
      if (d.created_at && new Date(d.created_at).getTime() > cutoff) {
        events.push({ ts: d.created_at, label: 'Created', drawingNo });
      }
      for (const v of d.versions ?? []) {
        if (v.approved_at && new Date(v.approved_at).getTime() > cutoff) {
          events.push({ ts: v.approved_at, label: `Approved v${v.version_no}`, drawingNo });
        }
      }
    }
    return events.sort((a, b) => (a.ts < b.ts ? 1 : -1)).slice(0, 10);
  }, [entityCode]);

  const topReferenced = useMemo(() => {
    if (!entityCode) return [];
    const all = listDrawings(entityCode);
    const counts = new Map<string, number>();
    for (const d of all) {
      const m = parseDrawingCustomTags(d.tags?.custom_tags);
      const ref = m.reference_source_drawing_id;
      if (ref) counts.set(ref, (counts.get(ref) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, count]) => {
        const parent = all.find((d) => d.id === id);
        const m = parent ? parseDrawingCustomTags(parent.tags?.custom_tags) : {};
        return {
          id,
          drawingNo: m.drawing_no ?? id.slice(0, 8),
          title: parent?.title ?? '(deleted)',
          count,
        };
      });
  }, [entityCode]);

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <div className="flex items-center gap-3">
        {onNavigate && (
          <Button variant="ghost" size="sm" onClick={() => onNavigate('welcome')}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        )}
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-primary" />
          EngineeringX Reports
        </h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4">
          <div className="text-sm text-muted-foreground">Total Drawings</div>
          <div className="text-3xl font-bold font-mono">{stats.total}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-sm text-muted-foreground">BOM Extraction Rate</div>
          <div className="text-3xl font-bold font-mono">{stats.bomRate}%</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-sm text-muted-foreground">Approval Rate</div>
          <div className="text-3xl font-bold font-mono">{stats.approvalRate}%</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-sm text-muted-foreground">Production-Ready</div>
          <div className="text-3xl font-bold font-mono text-success">{stats.ready}</div>
        </CardContent></Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Activity Timeline (last 30 days)</CardTitle></CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <div className="text-sm text-muted-foreground">No recent activity.</div>
            ) : (
              <ul className="space-y-2 text-sm">
                {recentActivity.map((e, idx) => (
                  <li
                    key={`${e.ts}-${e.drawingNo}-${idx}`}
                    className="flex items-center justify-between"
                  >
                    <div>
                      <span className="font-mono text-xs text-muted-foreground mr-2">
                        {e.drawingNo}
                      </span>
                      <span>{e.label}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(e.ts).toLocaleDateString('en-IN')}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Top 5 Most-Cloned Drawings</CardTitle></CardHeader>
          <CardContent>
            {topReferenced.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                No drawings have been cloned yet.
              </div>
            ) : (
              <ul className="space-y-2">
                {topReferenced.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center justify-between p-2 border rounded"
                  >
                    <div>
                      <div className="font-mono text-xs text-muted-foreground">{r.drawingNo}</div>
                      <div className="font-medium">{r.title}</div>
                    </div>
                    <div className="font-mono text-lg">{r.count}×</div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
