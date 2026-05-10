/**
 * @file        src/pages/erp/engineeringx/registers/ChangeImpactAnalyzer.tsx
 * @purpose     Change-impact analyzer · drawing → impacted projects + impacted child drawings (reverse FK · D-NEW-CS)
 * @who         Engineering Lead · Project Manager
 * @when        2026-05-10
 * @sprint      T-Phase-1.A.13 · Q-LOCK-7a · Block B.2 · D-NEW-CS reverse FK pattern (POSSIBLE 16th canonical)
 * @iso         ISO 9001:2015 §8.5 · ISO 25010 Maintainability
 * @whom        Audit Owner · Engineering Lead · Project Manager
 * @decisions   D-NEW-CS Change-impact reverse FK pattern · D-NEW-CP institutional pattern reverse query · ProjX zero-touch consumer
 * @disciplines FR-30 · FR-50
 * @reuses      engineeringx-analysis-engine · useProjects · engineeringx-engine listDrawings
 * @[JWT]       Phase 1 mock · Phase 2 backend extends with version-tree traversal
 */
import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, GitBranch } from 'lucide-react';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useProjects } from '@/hooks/useProjects';
import { listDrawings } from '@/lib/engineeringx-engine';
import { getDrawingChangeImpactSummary } from '@/lib/engineeringx-analysis-engine';
import { parseDrawingCustomTags } from '@/types/engineering-drawing';
import type { EngineeringXModule } from '../EngineeringXSidebar.types';

interface Props {
  onNavigate?: (m: EngineeringXModule) => void;
}

export function ChangeImpactAnalyzer({ onNavigate }: Props): JSX.Element {
  const { entityCode } = useEntityCode();
  const { projects } = useProjects(entityCode);
  const drawings = useMemo(
    () => (entityCode ? listDrawings(entityCode) : []),
    [entityCode],
  );

  const [selectedId, setSelectedId] = useState<string>('');

  const summary = useMemo(() => {
    if (!entityCode || !selectedId) {
      return { impactedProjects: [], impactedDrawings: [] };
    }
    return getDrawingChangeImpactSummary(entityCode, selectedId, projects);
  }, [entityCode, selectedId, projects]);

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div className="flex items-center gap-3">
        {onNavigate && (
          <Button variant="ghost" size="sm" onClick={() => onNavigate('welcome')}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        )}
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <GitBranch className="h-6 w-6 text-primary" />
          Change Impact Analyzer
        </h1>
      </div>

      <Card>
        <CardHeader><CardTitle>Select drawing to analyze</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2 max-w-md">
            <Label>Drawing</Label>
            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger><SelectValue placeholder="Select a drawing…" /></SelectTrigger>
              <SelectContent>
                {drawings.map((d) => {
                  const m = parseDrawingCustomTags(d.tags?.custom_tags);
                  return (
                    <SelectItem key={d.id} value={d.id}>
                      {(m.drawing_no ?? d.id.slice(0, 8))} · {d.title}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {selectedId && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Impacted Projects ({summary.impactedProjects.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {summary.impactedProjects.length === 0 ? (
                <div className="text-sm text-muted-foreground">No linked projects.</div>
              ) : (
                summary.impactedProjects.map((p) => (
                  <div key={p.id} className="p-2 border rounded">
                    <div className="font-mono text-xs text-muted-foreground">{p.project_no}</div>
                    <div className="font-medium">{p.project_name}</div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                Impacted Drawings ({summary.impactedDrawings.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {summary.impactedDrawings.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  No drawings cloned from this drawing.
                </div>
              ) : (
                summary.impactedDrawings.map((d) => {
                  const m = parseDrawingCustomTags(d.tags?.custom_tags);
                  return (
                    <div key={d.id} className="p-2 border rounded">
                      <div className="font-mono text-xs text-muted-foreground">
                        {m.drawing_no ?? d.id.slice(0, 8)}
                      </div>
                      <div className="font-medium">{d.title}</div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
