/**
 * @file     EMIPreviewModal.tsx
 * @purpose  Read-only EMI amortization preview for Borrowing ledgers.
 *           Shows first 5 + last 2 rows; "Regenerate" recomputes using
 *           current principal/rate/tenure/firstEmiDate.
 * @sprint   T-H1.5-C-S6.5b
 */
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { RefreshCw } from 'lucide-react';
import { buildEMISchedule, type EMIScheduleRow, type BuildScheduleInput }
  from '@/features/ledger-master/lib/emi-schedule-builder';
import { useMemo, useState } from 'react';

interface Props {
  open: boolean;
  input: BuildScheduleInput;
  onClose: () => void;
  onRegenerated?: (rows: EMIScheduleRow[]) => void;
}

const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export function EMIPreviewModal({ open, input, onClose, onRegenerated }: Props) {
  const [rows, setRows] = useState<EMIScheduleRow[]>(() => buildEMISchedule(input));

  const initialRows = useMemo(() => buildEMISchedule(input), [input]);

  const regenerate = () => {
    const next = buildEMISchedule(input);
    setRows(next);
    onRegenerated?.(next);
  };

  const display = rows.length > 0 ? rows : initialRows;
  const head = display.slice(0, 5);
  const tail = display.length > 7 ? display.slice(-2) : [];
  const showEllipsis = display.length > 7;

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>EMI Schedule Preview</DialogTitle>
        </DialogHeader>

        {display.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            Provide principal, rate, tenure and first EMI date to preview the schedule.
          </p>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-4 text-xs">
              <span>Total EMIs: <strong className="font-mono">{display.length}</strong></span>
              <span>Total Principal: <strong className="font-mono">
                {fmt(display.reduce((s, r) => s + r.principal, 0))}
              </strong></span>
              <span>Total Interest: <strong className="font-mono">
                {fmt(display.reduce((s, r) => s + r.interest, 0))}
              </strong></span>
            </div>

            <div className="rounded-xl border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">EMI #</TableHead>
                    <TableHead className="text-xs">Due Date</TableHead>
                    <TableHead className="text-xs text-right">Principal</TableHead>
                    <TableHead className="text-xs text-right">Interest</TableHead>
                    <TableHead className="text-xs text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {head.map(r => (
                    <TableRow key={r.emiNumber}>
                      <TableCell className="text-xs font-mono">{r.emiNumber}</TableCell>
                      <TableCell className="text-xs">{r.dueDate}</TableCell>
                      <TableCell className="text-xs font-mono text-right">{fmt(r.principal)}</TableCell>
                      <TableCell className="text-xs font-mono text-right">{fmt(r.interest)}</TableCell>
                      <TableCell className="text-xs font-mono text-right">{fmt(r.runningBalance)}</TableCell>
                    </TableRow>
                  ))}
                  {showEllipsis && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-xs text-muted-foreground">
                        … {display.length - 7} rows hidden …
                      </TableCell>
                    </TableRow>
                  )}
                  {tail.map(r => (
                    <TableRow key={`tail-${r.emiNumber}`}>
                      <TableCell className="text-xs font-mono">{r.emiNumber}</TableCell>
                      <TableCell className="text-xs">{r.dueDate}</TableCell>
                      <TableCell className="text-xs font-mono text-right">{fmt(r.principal)}</TableCell>
                      <TableCell className="text-xs font-mono text-right">{fmt(r.interest)}</TableCell>
                      <TableCell className="text-xs font-mono text-right">{fmt(r.runningBalance)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={regenerate} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" /> Regenerate
          </Button>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
