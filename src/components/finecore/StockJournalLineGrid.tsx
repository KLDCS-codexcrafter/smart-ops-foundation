/**
 * StockJournalLineGrid.tsx — Consumption/Production line grid for Stock Journal
 */
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableHead, TableHeader, TableRow, TableCell } from '@/components/ui/table';
import { Plus, Trash2 } from 'lucide-react';
import { onEnterNext } from '@/lib/keyboard';

export interface StockJournalLine {
  id: string;
  item_name: string;
  item_id: string;
  godown_name: string;
  godown_id: string;
  batch_id: string;
  qty: number;
  uom: string;
  rate: number;
  value: number;
}

interface StockJournalLineGridProps {
  lines: StockJournalLine[];
  onChange: (lines: StockJournalLine[]) => void;
  side: 'consumption' | 'production';
}

function emptyLine(): StockJournalLine {
  return {
    id: `sjl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    item_name: '', item_id: '', godown_name: '', godown_id: '',
    batch_id: '', qty: 0, uom: 'NOS', rate: 0, value: 0,
  };
}

export function StockJournalLineGrid({ lines, onChange, side }: StockJournalLineGridProps) {
  const updateLine = (idx: number, field: keyof StockJournalLine, val: string | number) => {
    const updated = [...lines];
    updated[idx] = { ...updated[idx], [field]: val };
    if (field === 'qty' || field === 'rate') {
      updated[idx].value = updated[idx].qty * updated[idx].rate;
    }
    onChange(updated);
  };

  const addLine = () => onChange([...lines, emptyLine()]);
  const removeLine = (idx: number) => onChange(lines.filter((_, i) => i !== idx));

  const totalValue = lines.reduce((s, l) => s + l.value, 0);

  return (
    <div data-keyboard-form className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {side === 'consumption' ? 'Source (Consumption)' : 'Destination (Production)'}
      </p>
      <div className="overflow-x-auto border rounded-md">
        <Table>
          <TableHeader>
            <TableRow className="text-[10px]">
              <TableHead className="w-8">#</TableHead>
              <TableHead className="min-w-[140px]">Item</TableHead>
              <TableHead className="w-24">Godown</TableHead>
              <TableHead className="w-16">Qty</TableHead>
              <TableHead className="w-16">UOM</TableHead>
              <TableHead className="w-20">Rate</TableHead>
              <TableHead className="w-20">Value</TableHead>
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.map((line, idx) => (
              <TableRow key={line.id} className="text-xs">
                <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                <TableCell>
                  <Input value={line.item_name} onChange={e => updateLine(idx, 'item_name', e.target.value)}
                    onKeyDown={onEnterNext} className="h-7 text-xs" placeholder="Item" />
                </TableCell>
                <TableCell>
                  <Input value={line.godown_name} onChange={e => updateLine(idx, 'godown_name', e.target.value)}
                    onKeyDown={onEnterNext} className="h-7 text-xs w-24" placeholder="Godown" />
                </TableCell>
                <TableCell>
                  <Input type="number" value={line.qty || ''} onChange={e => updateLine(idx, 'qty', Number(e.target.value))}
                    onKeyDown={onEnterNext} className="h-7 text-xs w-16" />
                </TableCell>
                <TableCell>
                  <Input value={line.uom} onChange={e => updateLine(idx, 'uom', e.target.value)}
                    onKeyDown={onEnterNext} className="h-7 text-xs w-16" />
                </TableCell>
                <TableCell>
                  <Input type="number" value={line.rate || ''} onChange={e => updateLine(idx, 'rate', Number(e.target.value))}
                    onKeyDown={onEnterNext} className="h-7 text-xs w-20" />
                </TableCell>
                <TableCell className="font-mono text-right">{line.value.toLocaleString('en-IN')}</TableCell>
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
        <span className="text-xs font-mono text-muted-foreground">Total: ₹{totalValue.toLocaleString('en-IN')}</span>
      </div>
    </div>
  );
}
