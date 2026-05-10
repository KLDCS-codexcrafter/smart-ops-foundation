/**
 * @file        src/pages/erp/engineeringx/registers/ReferenceProjectLibrary.tsx
 * @sprint      T-Phase-1.A.12 · Q-LOCK-6a · Block D.1 · Reference Library · ProjX + EngineeringX consumer · zero-touch
 */
import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, BookMarked, Copy } from 'lucide-react';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useProjects } from '@/hooks/useProjects';
import { listDrawingsByProject } from '@/lib/engineeringx-engine';
import { parseDrawingCustomTags } from '@/types/engineering-drawing';
import type { EngineeringXModule } from '../EngineeringXSidebar.types';

interface Props {
  onNavigate?: (m: EngineeringXModule) => void;
}

export function ReferenceProjectLibrary({ onNavigate }: Props): JSX.Element {
  const { entityCode } = useEntityCode();
  const { projects } = useProjects(entityCode);

  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedDrawingId, setSelectedDrawingId] = useState<string>('');

  // Phase 1 rule-based ranking · sort projects by created_at desc (last 90 days first)
  const rankedProjects = useMemo(() => {
    const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
    return [...projects].sort((a, b) => {
      const aRecent = new Date(a.created_at).getTime() > cutoff ? 0 : 1;
      const bRecent = new Date(b.created_at).getTime() > cutoff ? 0 : 1;
      if (aRecent !== bRecent) return aRecent - bRecent;
      return b.created_at.localeCompare(a.created_at);
    });
  }, [projects]);

  const drawings = useMemo(() => {
    if (!entityCode || !selectedProjectId) return [];
    return listDrawingsByProject(entityCode, selectedProjectId);
  }, [entityCode, selectedProjectId]);

  const selectedDrawing = useMemo(
    () => drawings.find((d) => d.id === selectedDrawingId) ?? null,
    [drawings, selectedDrawingId],
  );

  function onClone(): void {
    if (!selectedDrawingId) return;
    sessionStorage.setItem('engineeringx_clone_source_id', selectedDrawingId);
    onNavigate?.('clone-drawing');
  }

  return (
    <div className="p-6 space-y-4 max-w-6xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => onNavigate?.('welcome')}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <BookMarked className="h-6 w-6 text-primary" /> Reference Project Library
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Projects ({rankedProjects.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[60vh] overflow-y-auto">
            {rankedProjects.length === 0 ? (
              <div className="text-sm text-muted-foreground">No projects</div>
            ) : rankedProjects.map((p) => (
              <button
                key={p.id}
                onClick={() => { setSelectedProjectId(p.id); setSelectedDrawingId(''); }}
                className={`w-full text-left p-2 rounded border ${
                  selectedProjectId === p.id ? 'border-primary bg-primary/5' : 'border-border'
                }`}
              >
                <div className="font-medium text-sm">{p.project_name}</div>
                <div className="text-xs text-muted-foreground font-mono">
                  {p.project_no} · {p.project_type}
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Drawings ({drawings.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[60vh] overflow-y-auto">
            {!selectedProjectId ? (
              <div className="text-sm text-muted-foreground">Select a project</div>
            ) : drawings.length === 0 ? (
              <div className="text-sm text-muted-foreground">No drawings on this project</div>
            ) : drawings.map((d) => {
              const meta = parseDrawingCustomTags(d.tags?.custom_tags);
              return (
                <button
                  key={d.id}
                  onClick={() => setSelectedDrawingId(d.id)}
                  className={`w-full text-left p-2 rounded border ${
                    selectedDrawingId === d.id ? 'border-primary bg-primary/5' : 'border-border'
                  }`}
                >
                  <div className="font-medium text-sm">{d.title}</div>
                  <div className="text-xs text-muted-foreground font-mono">
                    {meta.drawing_no} · {meta.drawing_subtype}
                  </div>
                </button>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Preview</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {!selectedDrawing ? (
              <div className="text-sm text-muted-foreground">Select a drawing to preview</div>
            ) : (
              <>
                <div className="font-semibold">{selectedDrawing.title}</div>
                <div className="text-sm text-muted-foreground">
                  {selectedDrawing.description ?? '—'}
                </div>
                <div className="flex flex-wrap gap-1">
                  {(selectedDrawing.tags?.custom_tags ?? []).map((t) => (
                    <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
                  ))}
                </div>
                <Button onClick={onClone} className="w-full">
                  <Copy className="h-4 w-4 mr-2" /> Clone to current project
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
