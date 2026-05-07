/**
 * @file     QCEntryGrid.tsx
 * @sprint   T-Phase-1.3-3b-pre-2 · Block E · D-630 · Q53=a (grid/parameter matrix mode)
 * @purpose  Parameter × line matrix · best for SPC-style multi-parameter inspections.
 */
import { useMemo, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { updateInspectionLine } from '@/lib/qa-inspection-engine';
import { qaInspectionKey } from '@/types/qa-inspection';
import type { QaInspectionRecord, QaInspectionLine } from '@/types/qa-inspection';

export interface QCEntryGridProps {
  inspection: QaInspectionRecord;
  onLineUpdate: () => void;
}

function collectParamKeys(lines: QaInspectionLine[]): string[] {
  const set = new Set<string>();
  for (const l of lines) {
    for (const k of Object.keys(l.inspection_parameters ?? {})) set.add(k);
  }
  return Array.from(set);
}

export function QCEntryGrid({ inspection, onLineUpdate }: QCEntryGridProps): JSX.Element {
  const { entityCode } = useEntityCode();
  const user = useCurrentUser();
  const paramKeys = useMemo(() => collectParamKeys(inspection.lines), [inspection.lines]);

  const [paramDraft, setParamDraft] = useState<Record<string, Record<string, string>>>(() => {
    const m: Record<string, Record<string, string>> = {};
    for (const l of inspection.lines) m[l.id] = { ...(l.inspection_parameters ?? {}) };
    return m;
  });

  const setParam = (lineId: string, key: string, value: string): void => {
    setParamDraft(prev => ({ ...prev, [lineId]: { ...prev[lineId], [key]: value } }));
  };

  // Persist parameters by writing directly via storage-rewrite then bumping line qty fields.
  // qa-inspection-engine.updateInspectionLine handles qty/reason; for parameters we mutate
  // the record in-place via storage and call updateInspectionLine to re-stamp updated_at.
  const persist = async (line: QaInspectionLine): Promise<void> => {
    try {
      const raw = localStorage.getItem(qaInspectionKey(entityCode));
      if (raw) {
        const list = JSON.parse(raw) as QaInspectionRecord[];
        const idx = list.findIndex(r => r.id === inspection.id);
        if (idx >= 0) {
          list[idx] = {
            ...list[idx],
            lines: list[idx].lines.map(l =>
              l.id === line.id
                ? { ...l, inspection_parameters: { ...paramDraft[line.id] } }
                : l,
            ),
          };
          // [JWT] PATCH /api/qa/inspections/:id/lines/:lineId/parameters
          localStorage.setItem(qaInspectionKey(entityCode), JSON.stringify(list));
        }
      }
      await updateInspectionLine(
        inspection.id, line.id,
        line.qty_passed, line.qty_failed, line.failure_reason,
        entityCode, user?.id ?? 'demo-user',
      );
      onLineUpdate();
    } catch (e) {
      toast.error(`Save failed: ${(e as Error).message}`);
    }
  };

  if (paramKeys.length === 0) {
    return (
      <div className="p-6 text-sm text-muted-foreground text-center border rounded-lg">
        No QC parameters captured for these lines yet · use Per-Line Table or Wizard to enter qty values first.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Item</TableHead>
          {paramKeys.map(k => <TableHead key={k} className="text-xs">{k}</TableHead>)}
        </TableRow>
      </TableHeader>
      <TableBody>
        {inspection.lines.map(line => (
          <TableRow key={line.id}>
            <TableCell className="font-medium">{line.item_name}</TableCell>
            {paramKeys.map(k => (
              <TableCell key={k}>
                <Input
                  value={paramDraft[line.id]?.[k] ?? ''}
                  onChange={e => setParam(line.id, k, e.target.value)}
                  onBlur={() => persist(line)}
                  className="h-8 w-32 font-mono text-xs"
                  placeholder="—"
                />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
