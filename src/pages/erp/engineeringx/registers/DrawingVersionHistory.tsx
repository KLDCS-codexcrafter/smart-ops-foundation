/**
 * @file        src/pages/erp/engineeringx/registers/DrawingVersionHistory.tsx
 * @purpose     Version history view across all drawings · DocVault canonical zero-touch
 * @who         Engineering Lead · Document Controller
 * @when        2026-05-10
 * @sprint      T-Phase-1.A.11 EngineeringX Drawing Register + Version Control · Q-LOCK-4a · Block E.2
 * @iso         ISO 9001:2015 §7.5 · ISO 25010 Usability
 * @whom        Audit Owner
 * @decisions   FR-73 Hub-and-Spoke 5th CONSUMER · D-NEW-CO drawing version supersession marker
 * @disciplines FR-29 · FR-30
 * @reuses      engineeringx-engine.listDrawings · listDrawingVersions
 * @[JWT]       reads via engineeringx-engine → docvault-engine
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
import { ArrowLeft, History } from 'lucide-react';
import { useEntityCode } from '@/hooks/useEntityCode';
import { listDrawings, listDrawingVersions } from '@/lib/engineeringx-engine';
import { DRAWING_STATUS_COLORS, parseDrawingCustomTags } from '@/types/engineering-drawing';
import type { EngineeringXModule } from '../EngineeringXSidebar.types';

interface Props {
  onNavigate?: (m: EngineeringXModule) => void;
}

export function DrawingVersionHistory({ onNavigate }: Props): JSX.Element {
  const { entityCode } = useEntityCode();
  const drawings = useMemo(() => (entityCode ? listDrawings(entityCode) : []), [entityCode]);
  const [selected, setSelected] = useState<string>(drawings[0]?.id ?? '');

  const versions = useMemo(
    () => (entityCode && selected ? listDrawingVersions(entityCode, selected) : []),
    [entityCode, selected],
  );

  return (
    <div className="p-6 space-y-4 max-w-5xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => onNavigate?.('welcome')}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <History className="h-6 w-6 text-primary" /> Drawing Version History
        </h2>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Select drawing</CardTitle>
            <Select value={selected} onValueChange={setSelected}>
              <SelectTrigger className="w-[320px]">
                <SelectValue placeholder="Select a drawing" />
              </SelectTrigger>
              <SelectContent>
                {drawings.length === 0 ? (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">No drawings</div>
                ) : drawings.map((d) => {
                  const meta = parseDrawingCustomTags(d.tags?.custom_tags);
                  return (
                    <SelectItem key={d.id} value={d.id}>
                      {meta.drawing_no ?? d.id} · {d.title}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Version</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Uploaded At</TableHead>
                <TableHead>Uploaded By</TableHead>
                <TableHead>Approved By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {versions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No versions to display.
                  </TableCell>
                </TableRow>
              ) : versions.map((v) => (
                <TableRow key={v.version_no}>
                  <TableCell className="font-mono">{v.version_no}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={DRAWING_STATUS_COLORS[v.version_status] ?? ''}>
                      {v.version_status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(v.uploaded_at).toLocaleString()}
                  </TableCell>
                  <TableCell>{v.uploaded_by}</TableCell>
                  <TableCell>{v.approved_by ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
