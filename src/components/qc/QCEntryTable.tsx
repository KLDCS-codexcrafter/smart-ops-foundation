/**
 * @file     QCEntryTable.tsx
 * @sprint   T-Phase-1.3-3b-pre-2 · Block D · D-629 · Q53=a (table mode)
 * @purpose  Per-line tabular QC entry · inline qty_passed/qty_failed/reason editing.
 */
import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { updateInspectionLine } from '@/lib/qa-inspection-engine';
import type { QaInspectionRecord, QaInspectionLine } from '@/types/qa-inspection';

export interface QCEntryTableProps {
  inspection: QaInspectionRecord;
  onLineUpdate: () => void;
}

interface Draft { qty_passed: string; qty_failed: string; failure_reason: string; }

function toDraft(l: QaInspectionLine): Draft {
  return {
    qty_passed: String(l.qty_passed ?? 0),
    qty_failed: String(l.qty_failed ?? 0),
    failure_reason: l.failure_reason ?? '',
  };
}

export function QCEntryTable({ inspection, onLineUpdate }: QCEntryTableProps): JSX.Element {
  const { entityCode } = useEntityCode();
  const user = useCurrentUser();
  const [drafts, setDrafts] = useState<Record<string, Draft>>(() => {
    const m: Record<string, Draft> = {};
    for (const l of inspection.lines) m[l.id] = toDraft(l);
    return m;
  });

  const set = (lineId: string, patch: Partial<Draft>): void => {
    setDrafts(prev => ({ ...prev, [lineId]: { ...prev[lineId], ...patch } }));
  };

  const persist = async (line: QaInspectionLine): Promise<void> => {
    const d = drafts[line.id];
    const qp = Number(d.qty_passed) || 0;
    const qf = Number(d.qty_failed) || 0;
    if (qp + qf > line.qty_inspected) {
      toast.error(`Pass + Fail cannot exceed inspected qty (${line.qty_inspected})`);
      return;
    }
    try {
      await updateInspectionLine(
        inspection.id, line.id, qp, qf,
        d.failure_reason.trim() || null,
        entityCode, user?.id ?? 'demo-user',
      );
      onLineUpdate();
    } catch (e) {
      toast.error(`Update failed: ${(e as Error).message}`);
    }
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Item</TableHead>
          <TableHead className="text-right">Inspected</TableHead>
          <TableHead className="text-right">Passed</TableHead>
          <TableHead className="text-right">Failed</TableHead>
          <TableHead>Failure Reason</TableHead>
          <TableHead>Params</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {inspection.lines.map(line => {
          const d = drafts[line.id] ?? toDraft(line);
          const paramKeys = Object.keys(line.inspection_parameters ?? {});
          return (
            <TableRow key={line.id}>
              <TableCell className="font-medium">{line.item_name}</TableCell>
              <TableCell className="text-right font-mono">{line.qty_inspected}</TableCell>
              <TableCell className="text-right">
                <Input type="number" value={d.qty_passed}
                  onChange={e => set(line.id, { qty_passed: e.target.value })}
                  onBlur={() => persist(line)}
                  className="h-8 w-20 text-right font-mono" />
              </TableCell>
              <TableCell className="text-right">
                <Input type="number" value={d.qty_failed}
                  onChange={e => set(line.id, { qty_failed: e.target.value })}
                  onBlur={() => persist(line)}
                  className="h-8 w-20 text-right font-mono" />
              </TableCell>
              <TableCell>
                <Input value={d.failure_reason}
                  onChange={e => set(line.id, { failure_reason: e.target.value })}
                  onBlur={() => persist(line)}
                  placeholder="(none)"
                  className="h-8" />
              </TableCell>
              <TableCell>
                {paramKeys.length === 0
                  ? <span className="text-xs text-muted-foreground">—</span>
                  : <div className="flex flex-wrap gap-1">
                      {paramKeys.slice(0, 4).map(k => (
                        <Badge key={k} variant="outline" className="text-xs">{k}</Badge>
                      ))}
                    </div>}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
