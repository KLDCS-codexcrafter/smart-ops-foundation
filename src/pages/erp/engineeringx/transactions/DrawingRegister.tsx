/**
 * @file        src/pages/erp/engineeringx/transactions/DrawingRegister.tsx
 * @purpose     Drawing Register panel · 6+ column table · Project filter · DocVault canonical consumer
 * @who         Engineering Lead · Document Controller · Production · Procurement · QualiCheck
 * @when        2026-05-10
 * @sprint      T-Phase-1.A.11 EngineeringX Drawing Register + Version Control · Q-LOCK-2a + Q-LOCK-6a · Block C
 * @iso         ISO 9001:2015 §7.5 · ISO 25010 Usability
 * @whom        Audit Owner
 * @decisions   FR-73 Hub-and-Spoke 5th CONSUMER · D-NEW-BV Phase 1 mock · FR-30 11/11 header
 * @disciplines FR-29 · FR-30 · FR-58
 * @reuses      engineeringx-engine.ts (FR-73.2 spoke) · useProjects (ProjX zero-touch) · useEntityCode
 * @[JWT]       reads via engineeringx-engine + docvault-engine
 */
import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { FilePlus, ArrowLeft, FileText } from 'lucide-react';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useProjects } from '@/hooks/useProjects';
import { listDrawings, listDrawingsByProject } from '@/lib/engineeringx-engine';
import {
  DRAWING_TYPE_LABELS, DRAWING_STATUS_COLORS, parseDrawingCustomTags,
} from '@/types/engineering-drawing';
import type { DrawingType } from '@/types/engineering-drawing';
import type { EngineeringXModule } from '../EngineeringXSidebar.types';
import type { Document } from '@/types/docvault';

interface Props {
  onNavigate?: (m: EngineeringXModule) => void;
}

export function DrawingRegister({ onNavigate }: Props): JSX.Element {
  const { entityCode } = useEntityCode();
  const { projects } = useProjects(entityCode);
  const [projectFilter, setProjectFilter] = useState<string>('all');

  const drawings = useMemo<Document[]>(() => {
    if (!entityCode) return [];
    if (projectFilter === 'all') return listDrawings(entityCode);
    return listDrawingsByProject(entityCode, projectFilter);
  }, [entityCode, projectFilter]);

  function getDrawingStatus(d: Document): string {
    const current = d.versions?.find((v) => v.version_no === d.current_version);
    return current?.version_status ?? 'draft';
  }

  function getProjectName(projectId?: string | null): string {
    if (!projectId) return '—';
    return projects.find((p) => p.id === projectId)?.project_name ?? projectId;
  }

  return (
    <div className="p-6 space-y-4 max-w-7xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => onNavigate?.('welcome')}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" /> Drawing Register
          </h2>
        </div>
        <Button onClick={() => onNavigate?.('drawing-entry')}>
          <FilePlus className="h-4 w-4 mr-2" /> New Drawing
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Project filter</CardTitle>
            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="w-[280px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All projects</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.project_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Drawing No</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Current Version</TableHead>
                <TableHead>Created</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {drawings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    No drawings found{projectFilter !== 'all' ? ' for this project' : ''}. Click "New Drawing" to add.
                  </TableCell>
                </TableRow>
              ) : (
                drawings.map((d) => {
                  const meta = parseDrawingCustomTags(d.tags?.custom_tags);
                  const status = getDrawingStatus(d);
                  const subtype = meta.drawing_subtype as DrawingType | undefined;
                  return (
                    <TableRow key={d.id}>
                      <TableCell className="font-mono">{meta.drawing_no ?? d.id}</TableCell>
                      <TableCell>{d.title}</TableCell>
                      <TableCell>{subtype ? DRAWING_TYPE_LABELS[subtype] : '—'}</TableCell>
                      <TableCell>{getProjectName(d.project_id)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={DRAWING_STATUS_COLORS[status] ?? ''}>
                          {status}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono">{d.current_version}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(d.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost" size="sm"
                          onClick={() => onNavigate?.('drawing-version-history')}
                        >
                          History
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
