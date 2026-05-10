/**
 * @file        src/pages/erp/engineeringx/EngineeringXWelcome.tsx
 * @purpose     EngineeringX welcome panel · landing dashboard · stats summary
 * @who         Engineering · Production · Procurement
 * @when        2026-05-10
 * @sprint      T-Phase-1.A.10 EngineeringX Foundation · Q-LOCK-1a · Block E.1
 * @iso         ISO 9001:2015 §7.5 · ISO 25010 Usability
 * @whom        Audit Owner
 * @decisions   D-NEW-BV Phase 1 mock pattern · FR-30 11/11 header standard
 * @disciplines FR-30 · FR-67
 * @reuses      engineeringx-engine.loadDrawings · loadDrawingsByStatus · EngineeringXModule type
 * @[JWT]       reads via engineeringx-engine · GET /api/engineeringx/drawings (Phase 2)
 */
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, FilePlus, CheckSquare, Sparkles, BookMarked } from 'lucide-react';
import { useEntityCode } from '@/hooks/useEntityCode';
import { loadDrawings, loadDrawingsByStatus } from '@/lib/engineeringx-engine';
import type { EngineeringXModule } from './EngineeringXSidebar.types';

interface Props {
  onNavigate?: (m: EngineeringXModule) => void;
}

export function EngineeringXWelcome({ onNavigate }: Props) {
  const { entityCode } = useEntityCode();
  const stats = useMemo(() => {
    const all = loadDrawings(entityCode);
    return {
      total: all.length,
      draft: loadDrawingsByStatus(entityCode, 'draft').length,
      submitted: loadDrawingsByStatus(entityCode, 'submitted').length,
      approved: loadDrawingsByStatus(entityCode, 'approved').length,
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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
      </div>

      <Card>
        <CardHeader><CardTitle>Quick Actions</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Button variant="outline" onClick={() => onNavigate?.('drawing-register-placeholder')} className="h-auto py-3">
            <FileText className="h-4 w-4 mr-2" /> Drawing Register
          </Button>
          <Button variant="outline" onClick={() => onNavigate?.('drawing-entry-placeholder')} className="h-auto py-3">
            <FilePlus className="h-4 w-4 mr-2" /> New Drawing
          </Button>
          <Button variant="outline" onClick={() => onNavigate?.('reference-projects-placeholder')} className="h-auto py-3">
            <BookMarked className="h-4 w-4 mr-2" /> Reference Projects
          </Button>
          <Button variant="outline" onClick={() => onNavigate?.('bom-placeholder')} className="h-auto py-3">
            <CheckSquare className="h-4 w-4 mr-2" /> BOM-from-Drawing
          </Button>
          <Button variant="outline" onClick={() => onNavigate?.('similarity-placeholder')} className="h-auto py-3">
            <Sparkles className="h-4 w-4 mr-2" /> AI Similarity
          </Button>
        </CardContent>
      </Card>

      <div className="text-xs text-muted-foreground/70">
        Tier 1 #5 · Sinha-anchor · Foundation v21 · Drawing Register/Entry workflows ship at A.11.
      </div>
    </div>
  );
}
