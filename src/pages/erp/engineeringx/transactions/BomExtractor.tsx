/**
 * @file        src/pages/erp/engineeringx/transactions/BomExtractor.tsx
 * @sprint      T-Phase-1.A.12 · Q-LOCK-4a · Block C.1 · BOM extractor panel · FR-73 5th consumer reuse · D-NEW-CP institutional pattern
 */
import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { ArrowLeft, Cog, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { listDrawings } from '@/lib/engineeringx-engine';
import {
  extractBomFromDrawing, listBomByDrawing, updateBomEntry, clearBomForDrawing,
} from '@/lib/engineeringx-bom-engine';
import { parseDrawingCustomTags } from '@/types/engineering-drawing';
import type { BomEntry } from '@/types/bom-entry';
import type { EngineeringXModule } from '../EngineeringXSidebar.types';

interface Props {
  onNavigate?: (m: EngineeringXModule) => void;
}

export function BomExtractor({ onNavigate }: Props): JSX.Element {
  const { entityCode } = useEntityCode();
  const user = useCurrentUser();
  const userCtx = { id: user?.id ?? 'demo-user', name: user?.name ?? 'Demo User' };

  const drawings = useMemo(
    () => (entityCode ? listDrawings(entityCode) : []),
    [entityCode],
  );

  const [drawingId, setDrawingId] = useState<string>('');
  const [entries, setEntries] = useState<BomEntry[]>([]);

  function refresh(id: string): void {
    if (!entityCode) return;
    setEntries(listBomByDrawing(entityCode, id));
  }

  function onSelectDrawing(id: string): void {
    setDrawingId(id);
    refresh(id);
  }

  function onExtract(): void {
    if (!entityCode || !drawingId) {
      toast.error('Select a drawing first');
      return;
    }
    const out = extractBomFromDrawing(entityCode, drawingId, userCtx);
    setEntries(out);
    toast.success(`Extracted ${out.length} BOM lines (Phase 1 mock)`);
  }

  function onClear(): void {
    if (!entityCode || !drawingId) return;
    const n = clearBomForDrawing(entityCode, drawingId, userCtx);
    refresh(drawingId);
    toast.success(`Cleared ${n} entries`);
  }

  function onConfirmAll(): void {
    if (!entityCode) return;
    for (const e of entries) {
      updateBomEntry(entityCode, e.id, { status: 'confirmed' }, userCtx);
    }
    refresh(drawingId);
    toast.success('BOM confirmed');
  }

  function onUpdateField(id: string, field: 'qty' | 'unit' | 'description', value: string): void {
    if (!entityCode) return;
    const patch = field === 'qty' ? { qty: Number(value) || 0 } : { [field]: value };
    updateBomEntry(entityCode, id, patch as Partial<BomEntry>, userCtx);
    refresh(drawingId);
  }

  return (
    <div className="p-6 space-y-4 max-w-5xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => onNavigate?.('welcome')}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Cog className="h-6 w-6 text-primary" /> BOM Extractor
        </h2>
      </div>

      <Card>
        <CardHeader><CardTitle>Source Drawing</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <Label>Drawing</Label>
              <Select value={drawingId} onValueChange={onSelectDrawing}>
                <SelectTrigger><SelectValue placeholder="Choose drawing" /></SelectTrigger>
                <SelectContent>
                  {drawings.length === 0 ? (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">No drawings</div>
                  ) : drawings.map((d) => {
                    const meta = parseDrawingCustomTags(d.tags?.custom_tags);
                    return (
                      <SelectItem key={d.id} value={d.id}>
                        {meta.drawing_no ?? d.id} — {d.title}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={onExtract} disabled={!drawingId}>Extract BOM</Button>
              <Button variant="outline" onClick={onClear} disabled={!drawingId || entries.length === 0}>
                <Trash2 className="h-4 w-4 mr-1" /> Clear
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {entries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Extracted lines ({entries.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Material</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-mono">{e.item_no}</TableCell>
                    <TableCell className="font-mono">{e.material_code}</TableCell>
                    <TableCell>
                      <Input
                        defaultValue={e.description}
                        onBlur={(ev) => onUpdateField(e.id, 'description', ev.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        defaultValue={e.qty}
                        className="w-20"
                        onBlur={(ev) => onUpdateField(e.id, 'qty', ev.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        defaultValue={e.unit}
                        className="w-20"
                        onBlur={(ev) => onUpdateField(e.id, 'unit', ev.target.value)}
                      />
                    </TableCell>
                    <TableCell>{e.status}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex gap-2 mt-4">
              <Button onClick={onConfirmAll}>Confirm BOM</Button>
              <Button variant="outline" onClick={() => onNavigate?.('bom-register')}>
                View Register
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
