/**
 * @file        src/pages/erp/engineeringx/registers/BomRegister.tsx
 * @sprint      T-Phase-1.A.12 · Q-LOCK-5a · Block C.2 · BOM register · D-NEW-CP institutional pattern
 */
import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { ArrowLeft, List, Trash2, Cog } from 'lucide-react';
import { toast } from 'sonner';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { listDrawings } from '@/lib/engineeringx-engine';
import {
  loadBomEntries, deleteBomEntry,
} from '@/lib/engineeringx-bom-engine';
import { parseDrawingCustomTags } from '@/types/engineering-drawing';
import type { EngineeringXModule } from '../EngineeringXSidebar.types';

interface Props {
  onNavigate?: (m: EngineeringXModule) => void;
}

export function BomRegister({ onNavigate }: Props): JSX.Element {
  const { entityCode } = useEntityCode();
  const user = useCurrentUser();
  const userCtx = { id: user?.id ?? 'demo-user', name: user?.name ?? 'Demo User' };
  const [filter, setFilter] = useState<string>('all');
  const [tick, setTick] = useState(0);

  const drawings = useMemo(
    () => (entityCode ? listDrawings(entityCode) : []),
    [entityCode],
  );
  const drawingMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const d of drawings) {
      const meta = parseDrawingCustomTags(d.tags?.custom_tags);
      m.set(d.id, meta.drawing_no ?? d.id);
    }
    return m;
  }, [drawings]);

  const entries = useMemo(() => {
    if (!entityCode) return [];
    const all = loadBomEntries(entityCode);
    return filter === 'all' ? all : all.filter((b) => b.drawing_id === filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityCode, filter, tick]);

  function onDelete(id: string): void {
    if (!entityCode) return;
    deleteBomEntry(entityCode, id, userCtx);
    setTick((t) => t + 1);
    toast.success('Marked obsolete');
  }

  return (
    <div className="p-6 space-y-4 max-w-6xl">
      <div className="flex items-center gap-3 justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => onNavigate?.('welcome')}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <List className="h-6 w-6 text-primary" /> BOM Register
          </h2>
        </div>
        <Button onClick={() => onNavigate?.('bom-extractor')}>
          <Cog className="h-4 w-4 mr-1" /> Extract BOM
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Filters</CardTitle></CardHeader>
        <CardContent>
          <div className="max-w-md">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All drawings</SelectItem>
                {drawings.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {drawingMap.get(d.id)} — {d.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>BOM lines ({entries.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">
              No BOM entries. Extract from a drawing to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item No</TableHead>
                  <TableHead>Material Code</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Drawing No</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-mono">{e.item_no}</TableCell>
                    <TableCell className="font-mono">{e.material_code}</TableCell>
                    <TableCell>{e.description}</TableCell>
                    <TableCell className="font-mono">{e.qty}</TableCell>
                    <TableCell>{e.unit}</TableCell>
                    <TableCell className="font-mono">
                      {drawingMap.get(e.drawing_id) ?? e.drawing_id}
                    </TableCell>
                    <TableCell>{e.status}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onDelete(e.id)}
                        disabled={e.status === 'obsolete'}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
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
