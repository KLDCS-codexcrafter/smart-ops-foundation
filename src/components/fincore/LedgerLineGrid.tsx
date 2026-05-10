/**
 * LedgerLineGrid.tsx — Inline editable ledger line table
 * Used in: Journal, Contra, accounting-mode invoices
 */
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableHead, TableHeader, TableRow, TableCell } from '@/components/ui/table';
import { Plus, Trash2 } from 'lucide-react';
import { onEnterNext } from '@/lib/keyboard';
import type { VoucherLedgerLine } from '@/types/voucher';

interface LedgerLineGridProps {
  lines: VoucherLedgerLine[];
  onChange: (lines: VoucherLedgerLine[]) => void;
  showDrCr?: boolean;
}

function emptyLine(): VoucherLedgerLine {
  return {
    id: `ll-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    ledger_id: '', ledger_code: '', ledger_name: '', ledger_group_code: '',
    dr_amount: 0, cr_amount: 0, narration: '',
  };
}

export function LedgerLineGrid({ lines, onChange, showDrCr = true }: LedgerLineGridProps) {
  const updateLine = (idx: number, field: keyof VoucherLedgerLine, value: string | number) => {
    const updated = [...lines];
    updated[idx] = { ...updated[idx], [field]: value };
    onChange(updated);
  };

  const addLine = () => onChange([...lines, emptyLine()]);
  const removeLine = (idx: number) => onChange(lines.filter((_, i) => i !== idx));

  const totalDr = lines.reduce((s, l) => s + l.dr_amount, 0);
  const totalCr = lines.reduce((s, l) => s + l.cr_amount, 0);
  const diff = Math.abs(totalDr - totalCr);

  return (
    <div data-keyboard-form className="space-y-2">
      <div className="overflow-x-auto border rounded-md">
        <Table>
          <TableHeader>
            <TableRow className="text-[10px]">
              <TableHead className="w-8">#</TableHead>
              <TableHead className="min-w-[200px]">Ledger</TableHead>
              {showDrCr && <TableHead className="w-24">Debit (₹)</TableHead>}
              {showDrCr && <TableHead className="w-24">Credit (₹)</TableHead>}
              {!showDrCr && <TableHead className="w-24">Amount (₹)</TableHead>}
              <TableHead className="min-w-[120px]">Narration</TableHead>
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.map((line, idx) => (
              <TableRow key={line.id} className="text-xs">
                <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                <TableCell>
                  <Input value={line.ledger_name} onChange={e => updateLine(idx, 'ledger_name', e.target.value)}
                    onKeyDown={onEnterNext} className="h-7 text-xs" placeholder="Ledger name" />
                </TableCell>
                {showDrCr && (
                  <TableCell>
                    <Input type="number" value={line.dr_amount || ''} onChange={e => updateLine(idx, 'dr_amount', Number(e.target.value))}
                      onKeyDown={onEnterNext} className="h-7 text-xs w-24" />
                  </TableCell>
                )}
                {showDrCr && (
                  <TableCell>
                    <Input type="number" value={line.cr_amount || ''} onChange={e => updateLine(idx, 'cr_amount', Number(e.target.value))}
                      onKeyDown={onEnterNext} className="h-7 text-xs w-24" />
                  </TableCell>
                )}
                {!showDrCr && (
                  <TableCell>
                    <Input type="number" value={line.dr_amount || ''} onChange={e => updateLine(idx, 'dr_amount', Number(e.target.value))}
                      onKeyDown={onEnterNext} className="h-7 text-xs w-24" />
                  </TableCell>
                )}
                <TableCell>
                  <Input value={line.narration} onChange={e => updateLine(idx, 'narration', e.target.value)}
                    onKeyDown={onEnterNext} className="h-7 text-xs" placeholder="Line narration" />
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeLine(idx)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={addLine} className="text-xs">
          <Plus className="h-3 w-3 mr-1" /> Add Line
        </Button>
        {showDrCr && (
          <div className="flex items-center gap-4 text-xs font-mono">
            <span>Dr: ₹{totalDr.toLocaleString('en-IN')}</span>
            <span>Cr: ₹{totalCr.toLocaleString('en-IN')}</span>
            <span className={diff > 0.01 ? 'text-destructive font-bold' : 'text-green-600 dark:text-green-400'}>
              Diff: ₹{diff.toLocaleString('en-IN')}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
