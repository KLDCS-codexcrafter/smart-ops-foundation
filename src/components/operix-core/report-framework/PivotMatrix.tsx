/**
 * @file        PivotMatrix.tsx
 * @sprint      RPT-12a · Block 1 · Pivot Matrix UI
 * @purpose     Renders a 2-dim engine result as a rows × columns matrix with
 *              row/column totals. UI-only — the engine already groups multi-dim.
 *              No recharts; pure shadcn Table.
 */
import { useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { buildPivotModel } from './pivot-model';

export interface PivotMatrixProps {
  rows: Record<string, unknown>[];
  /** First dim → matrix rows, second dim → matrix columns. */
  groupBy: [string, string];
  /** Engine-aliased measure key (e.g. "sum_amount" or "count"). */
  measureKey: string;
  measureLabel?: string;
}


function fmt(n: number): string {
  if (!Number.isFinite(n)) return '—';
  return Number.isInteger(n) ? n.toLocaleString('en-IN') : n.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

export function PivotMatrix({ rows, groupBy, measureKey, measureLabel }: PivotMatrixProps): JSX.Element {
  const model = useMemo(() => buildPivotModel(rows, groupBy, measureKey), [rows, groupBy, measureKey]);
  const [rDim, cDim] = groupBy;

  if (model.rowKeys.length === 0 || model.colKeys.length === 0) {
    return (
      <div className="text-xs text-muted-foreground py-6 text-center" data-testid="pivot-empty">
        No data to pivot.
      </div>
    );
  }

  return (
    <div className="overflow-auto" data-testid="pivot-matrix" data-measure={measureLabel ?? measureKey}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs font-mono">{rDim} \\ {cDim}</TableHead>
            {model.colKeys.map((c) => (
              <TableHead key={`pc-${c}`} className="text-xs text-right">{c || '—'}</TableHead>
            ))}
            <TableHead className="text-xs text-right font-semibold">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {model.rowKeys.map((r) => (
            <TableRow key={`pr-${r}`}>
              <TableCell className="text-xs font-mono">{r || '—'}</TableCell>
              {model.colKeys.map((c) => (
                <TableCell key={`pcell-${r}-${c}`} className="text-xs text-right font-mono" data-testid={`pivot-cell-${r}-${c}`}>
                  {fmt(model.cells.get(`${r}\u0001${c}`) ?? 0)}
                </TableCell>
              ))}
              <TableCell className="text-xs text-right font-mono font-semibold" data-testid={`pivot-rowtotal-${r}`}>
                {fmt(model.rowTotals.get(r) ?? 0)}
              </TableCell>
            </TableRow>
          ))}
          <TableRow>
            <TableCell className="text-xs font-semibold">Total</TableCell>
            {model.colKeys.map((c) => (
              <TableCell key={`pct-${c}`} className="text-xs text-right font-mono font-semibold" data-testid={`pivot-coltotal-${c}`}>
                {fmt(model.colTotals.get(c) ?? 0)}
              </TableCell>
            ))}
            <TableCell className="text-xs text-right font-mono font-semibold" data-testid="pivot-grandtotal">
              {fmt(model.grandTotal)}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}

export default PivotMatrix;
