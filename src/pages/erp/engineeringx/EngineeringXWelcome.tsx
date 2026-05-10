/**
 * @file        src/pages/erp/engineeringx/EngineeringXWelcome.tsx
 * @purpose     EngineeringX welcome panel · landing dashboard · stats consume DocVault canonical (FR-73 5th consumer)
 * @who         Engineering · Production · Procurement
 * @when        2026-05-10
 * @sprint      T-Phase-1.A.11 EngineeringX Drawing Register + Version Control · Q-LOCK-1a · Block H.1
 * @iso         ISO 9001:2015 §7.5 · ISO 25010 Usability
 * @whom        Audit Owner
 * @decisions   FR-73 Hub-and-Spoke 5th CONSUMER · D-NEW-BV Phase 1 mock · FR-30 11/11 header
 * @disciplines FR-30 · FR-67
 * @reuses      engineeringx-engine.listDrawings · listDrawingsByStatus · EngineeringXModule type
 * @[JWT]       reads via engineeringx-engine → docvault-engine
 */
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, FilePlus, CheckSquare, Sparkles, BookMarked, Cog } from 'lucide-react';
import { useEntityCode } from '@/hooks/useEntityCode';
import { listDrawings, listDrawingsByStatus } from '@/lib/engineeringx-engine';
import { loadBomEntries } from '@/lib/engineeringx-bom-engine';
import type { EngineeringXModule } from './EngineeringXSidebar.types';

interface Props {
  onNavigate?: (m: EngineeringXModule) => void;
}

export function EngineeringXWelcome({ onNavigate }: Props): JSX.Element {
  const { entityCode } = useEntityCode();
  const stats = useMemo(() => {
    if (!entityCode) return { total: 0, draft: 0, submitted: 0, approved: 0, withBom: 0 };
    const all = listDrawings(entityCode);
    const bom = loadBomEntries(entityCode);
    const drawingsWithBom = new Set(bom.map((b) => b.drawing_id));
    return {
      total: all.length,
      draft: listDrawingsByStatus(entityCode, 'draft').length,
      submitted: listDrawingsByStatus(entityCode, 'submitted').length,
      approved: listDrawingsByStatus(entityCode, 'approved').length,
      withBom: drawingsWithBom.size,
    };
  }, [entityCode]);

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <FileText className="h-8 w-8 text-primary" />
          EngineeringX
        </h1>
        <p className="text-muted-foreground">
          Engineering design control · drawing register · version control · BOM-from-drawing · Reference Project Library · AI similarity prediction.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card><CardContent className="p-4">
          <div className="text-sm text-muted-foreground">Total Drawings</div>
          <div className="text-3xl font-bold font-mono">{stats.total}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-sm text-muted-foreground">Draft</div>
          <div className="text-3xl font-bold font-mono">{stats.draft}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-sm text-muted-foreground">Submitted</div>
          <div className="text-3xl font-bold font-mono">{stats.submitted}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-sm text-muted-foreground">Approved</div>
          <div className="text-3xl font-bold font-mono text-success">{stats.approved}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-sm text-muted-foreground">Drawings with BOM</div>
          <div className="text-3xl font-bold font-mono">{stats.withBom}</div>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Quick Actions</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Button variant="outline" onClick={() => onNavigate?.('drawing-register')} className="h-auto py-3">
            <FileText className="h-4 w-4 mr-2" /> Drawing Register
          </Button>
          <Button variant="outline" onClick={() => onNavigate?.('drawing-entry')} className="h-auto py-3">
            <FilePlus className="h-4 w-4 mr-2" /> New Drawing
          </Button>
          <Button variant="outline" onClick={() => onNavigate?.('drawing-approvals')} className="h-auto py-3">
            <CheckSquare className="h-4 w-4 mr-2" /> Approvals Pending
          </Button>
          <Button variant="outline" onClick={() => onNavigate?.('bom-extractor')} className="h-auto py-3">
            <Cog className="h-4 w-4 mr-2" /> BOM Extractor
          </Button>
          <Button variant="outline" onClick={() => onNavigate?.('reference-library')} className="h-auto py-3">
            <BookMarked className="h-4 w-4 mr-2" /> Reference Library
          </Button>
          <Button variant="outline" onClick={() => onNavigate?.('similarity-predictor')} className="h-auto py-3">
            <Sparkles className="h-4 w-4 mr-2" /> AI Similarity
          </Button>
        </CardContent>
      </Card>

      <div className="rounded-lg border bg-success/5 p-4 text-sm">
        <div className="font-semibold text-success mb-1">EngineeringX · 6/6 OOB innovations LIVE ⭐</div>
        <div className="text-muted-foreground">
          Drawing register · version control · approval workflow · BOM-from-drawing ·
          Reference Project Library · AI similarity / change-impact / production handoff.
          A.13 Closeout · MOAT #21 · 4-sprint EngineeringX arc complete.
        </div>
      </div>

      <div className="text-xs text-muted-foreground/70">
        Tier 1 #5 · Sinha-anchor demo readiness COMPLETE · Ask Dishani conversational layer integrated.
      </div>
    </div>
  );
}
