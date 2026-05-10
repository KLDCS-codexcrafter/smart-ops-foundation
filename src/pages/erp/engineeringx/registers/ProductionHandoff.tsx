/**
 * @file        src/pages/erp/engineeringx/registers/ProductionHandoff.tsx
 * @purpose     Production handoff register · drawings ready for production (approved + BOM extracted)
 * @who         Production Planner · Engineering Lead
 * @when        2026-05-10
 * @sprint      T-Phase-1.A.13 · Q-LOCK-8a · Block B.3 · cross-card consumer query for Production card
 * @iso         ISO 9001:2015 §8.5 · ISO 25010 Usability
 * @whom        Audit Owner · Production Planner
 * @decisions   Cross-card consumer query (analysis engine listReadyForProduction) · institutional pattern
 * @disciplines FR-30 · FR-50
 * @reuses      engineeringx-analysis-engine · engineeringx-bom-engine listBomByDrawing · useProjects
 * @[JWT]       Phase 1 mock · Phase 2 wires Production card consumer via spoke
 */
import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Send } from 'lucide-react';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useProjects } from '@/hooks/useProjects';
import { listReadyForProduction } from '@/lib/engineeringx-analysis-engine';
import { listBomByDrawing } from '@/lib/engineeringx-bom-engine';
import { parseDrawingCustomTags } from '@/types/engineering-drawing';
import type { EngineeringXModule } from '../EngineeringXSidebar.types';

interface Props {
  onNavigate?: (m: EngineeringXModule) => void;
}

export function ProductionHandoff({ onNavigate }: Props): JSX.Element {
  const { entityCode } = useEntityCode();
  const { projects } = useProjects(entityCode);
  const [search, setSearch] = useState('');

  const rows = useMemo(() => {
    if (!entityCode) return [];
    return listReadyForProduction(entityCode).map((d) => {
      const meta = parseDrawingCustomTags(d.tags?.custom_tags);
      const project = projects.find((p) => p.id === d.project_id);
      const bomCount = listBomByDrawing(entityCode, d.id).length;
      return {
        id: d.id,
        drawingNo: meta.drawing_no ?? d.id.slice(0, 8),
        title: d.title,
        type: meta.drawing_subtype ?? '—',
        projectName: project?.project_name ?? '—',
        bomLines: bomCount,
        approvedVersion: d.current_version,
      };
    });
  }, [entityCode, projects]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      r.drawingNo.toLowerCase().includes(q) ||
      r.title.toLowerCase().includes(q) ||
      r.projectName.toLowerCase().includes(q),
    );
  }, [rows, search]);

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <div className="flex items-center gap-3">
        {onNavigate && (
          <Button variant="ghost" size="sm" onClick={() => onNavigate('welcome')}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        )}
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Send className="h-6 w-6 text-primary" />
          Production Handoff
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            Drawings ready for production
            <Badge className="ml-2" variant="secondary">{filtered.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="Search drawing no, title, project…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
          {filtered.length === 0 ? (
            <div className="text-sm text-muted-foreground p-6 text-center">
              No drawings ready for production yet · approve a drawing and extract its BOM.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Drawing No</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead className="text-right">BOM Lines</TableHead>
                  <TableHead>Approved Version</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.drawingNo}</TableCell>
                    <TableCell>{r.title}</TableCell>
                    <TableCell>{r.type}</TableCell>
                    <TableCell>{r.projectName}</TableCell>
                    <TableCell className="text-right font-mono">{r.bomLines}</TableCell>
                    <TableCell className="font-mono text-xs">{r.approvedVersion}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
