/**
 * StockAdjustmentLineGrid.tsx — Line grid for Stock Adjustment voucher.
 *
 * PURPOSE      Each line captures: Item · Godown · Bin · Direction (write_off/write_on)
 *              · Qty · UOM · Reason · optional Narration.
 *              Auto-fills godown + bin from useItemPreferredLocation per line.
 *
 * INPUT        lines[], onChange, entityCode
 * OUTPUT       onChange(updatedLines[])
 *
 * DEPENDENCIES GodownPicker, useItemPreferredLocation hook, shadcn Select/Input/Table.
 *              Item field is plain text Input with TODO for T10-pre.2 ItemPicker.
 *
 * TALLY-ON-TOP Neutral. Parent voucher sets accounting_mode via tenant-config.
 *
 * SPEC DOC     Sprint T10-pre.1b Session B — per owner directive Q1 (Item=Input+TODO).
 */
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2 } from 'lucide-react';
import { GodownPicker } from '@/components/finecore/pickers/GodownPicker';
import { useItemPreferredLocation } from '@/hooks/useItemPreferredLocation';

export interface StockAdjustmentLine {
  id: string;
  item_id: string;
  item_name: string;
  godown_id: string;
  godown_name: string;
  bin_id?: string;
  bin_code?: string;
  qty: number;
  uom: string;
  direction: 'write_off' | 'write_on';
  reason: string;
  narration?: string;
}

const REASONS = [
  'Physical count variance',
  'Damage / Breakage',
  'Expiry / Obsolete',
  'Theft / Loss',
  'Re-packaging',
  'Sample / Display',
  'Production yield correction',
  'System correction',
  'Other',
];

interface StockAdjustmentLineGridProps {
  lines: StockAdjustmentLine[];
  onChange: (lines: StockAdjustmentLine[]) => void;
  entityCode: string;
}

export function StockAdjustmentLineGrid({ lines, onChange, entityCode }: StockAdjustmentLineGridProps) {
  const addLine = () => {
    onChange([...lines, {
      id: `line-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      item_id: '', item_name: '',
      godown_id: '', godown_name: '',
      qty: 0, uom: 'NOS',
      direction: 'write_off',
      reason: '',
    }]);
  };

  const updateLine = (idx: number, patch: Partial<StockAdjustmentLine>) => {
    onChange(lines.map((l, i) => i === idx ? { ...l, ...patch } : l));
  };

  const removeLine = (idx: number) => onChange(lines.filter((_, i) => i !== idx));

  return (
    <div className="space-y-2">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px]">Item</TableHead>
            <TableHead className="w-[160px]">Godown</TableHead>
            <TableHead className="w-[110px]">Bin</TableHead>
            <TableHead className="w-[110px]">Direction</TableHead>
            <TableHead className="w-[90px] text-right">Qty</TableHead>
            <TableHead className="w-[60px]">UOM</TableHead>
            <TableHead className="w-[160px]">Reason</TableHead>
            <TableHead className="w-[40px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {lines.map((line, idx) => (
            <StockAdjustmentRow
              key={line.id} line={line} entityCode={entityCode}
              onUpdate={(p) => updateLine(idx, p)}
              onRemove={() => removeLine(idx)}
            />
          ))}
        </TableBody>
      </Table>
      <Button variant="outline" size="sm" onClick={addLine}>
        <Plus className="h-3.5 w-3.5 mr-1" /> Add line
      </Button>
    </div>
  );
}

/** Per-row component so useItemPreferredLocation can be called per line. */
function StockAdjustmentRow({
  line, entityCode, onUpdate, onRemove,
}: {
  line: StockAdjustmentLine;
  entityCode: string;
  onUpdate: (patch: Partial<StockAdjustmentLine>) => void;
  onRemove: () => void;
}) {
  const preferred = useItemPreferredLocation(line.item_id, entityCode);

  return (
    <TableRow>
      <TableCell>
        {/* TODO (T10-pre.2): replace with real ItemPicker */}
        <Input
          value={line.item_name}
          onChange={e => onUpdate({ item_id: `tmp-${e.target.value.toLowerCase().replace(/\s+/g, '-')}`, item_name: e.target.value })}
          className="h-8 text-sm" placeholder="Item name"
        />
      </TableCell>
      <TableCell>
        <GodownPicker
          value={line.godown_id || preferred?.godownId || ''}
          onChange={(gid, gname) => onUpdate({ godown_id: gid, godown_name: gname })}
          entityCode={entityCode}
          compact
        />
      </TableCell>
      <TableCell>
        <Input
          value={line.bin_code ?? preferred?.binCode ?? ''}
          onChange={e => onUpdate({ bin_code: e.target.value })}
          className="h-8 text-sm font-mono" placeholder="Bin"
        />
      </TableCell>
      <TableCell>
        <Select value={line.direction} onValueChange={(v) => onUpdate({ direction: v as 'write_off' | 'write_on' })}>
          <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="write_off">Write Off</SelectItem>
            <SelectItem value="write_on">Write On</SelectItem>
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell className="text-right">
        <Input
          type="number"
          value={line.qty || ''}
          onChange={e => onUpdate({ qty: parseFloat(e.target.value) || 0 })}
          className="h-8 text-right font-mono"
        />
      </TableCell>
      <TableCell>
        <Input
          value={line.uom}
          onChange={e => onUpdate({ uom: e.target.value })}
          className="h-8 text-sm"
        />
      </TableCell>
      <TableCell>
        <Select value={line.reason} onValueChange={(v) => onUpdate({ reason: v })}>
          <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Reason" /></SelectTrigger>
          <SelectContent>
            {REASONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onRemove}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </TableCell>
    </TableRow>
  );
}
