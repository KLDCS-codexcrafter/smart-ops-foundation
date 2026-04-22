/**
 * StockTransferLineGrid.tsx — Line grid for Stock Transfer Dispatch voucher.
 *
 * PURPOSE      Each line captures: Item · From Godown · From Bin · Qty · UOM · Narration.
 *              Auto-fills source godown + bin from useItemPreferredLocation per line.
 *              Destination bin is NOT collected here — assigned at Receive (Polish 1.5).
 *
 * INPUT        lines[], onChange, entityCode
 * OUTPUT       onChange(updatedLines[])
 *
 * DEPENDENCIES GodownPicker, useItemPreferredLocation hook, shadcn Input/Table.
 *              Item field is plain text Input with TODO for T10-pre.2 ItemPicker.
 *
 * TALLY-ON-TOP Neutral. Parent voucher is inventory-only (no GL impact).
 *
 * SPEC DOC     Sprint T10-pre.1b Session B — per owner directive Q1 (Item=Input+TODO).
 */
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2 } from 'lucide-react';
import { GodownPicker } from '@/components/finecore/pickers/GodownPicker';
import { useItemPreferredLocation } from '@/hooks/useItemPreferredLocation';

export interface StockTransferLine {
  id: string;
  item_id: string;
  item_name: string;
  from_godown_id: string;
  from_godown_name: string;
  from_bin_id?: string;
  from_bin_code?: string;
  qty: number;
  uom: string;
  narration?: string;
  // NOTE: no destination bin — assigned at Receive (Polish 1.5)
}

interface StockTransferLineGridProps {
  lines: StockTransferLine[];
  onChange: (lines: StockTransferLine[]) => void;
  entityCode: string;
}

export function StockTransferLineGrid({ lines, onChange, entityCode }: StockTransferLineGridProps) {
  const addLine = () => {
    onChange([...lines, {
      id: `line-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      item_id: '', item_name: '',
      from_godown_id: '', from_godown_name: '',
      qty: 0, uom: 'NOS',
    }]);
  };

  const updateLine = (idx: number, patch: Partial<StockTransferLine>) => {
    onChange(lines.map((l, i) => i === idx ? { ...l, ...patch } : l));
  };

  const removeLine = (idx: number) => onChange(lines.filter((_, i) => i !== idx));

  return (
    <div className="space-y-2">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[220px]">Item</TableHead>
            <TableHead className="w-[180px]">From Godown</TableHead>
            <TableHead className="w-[130px]">From Bin</TableHead>
            <TableHead className="w-[100px] text-right">Qty</TableHead>
            <TableHead className="w-[70px]">UOM</TableHead>
            <TableHead className="w-[40px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {lines.map((line, idx) => (
            <StockTransferRow
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
function StockTransferRow({
  line, entityCode, onUpdate, onRemove,
}: {
  line: StockTransferLine;
  entityCode: string;
  onUpdate: (patch: Partial<StockTransferLine>) => void;
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
          value={line.from_godown_id || preferred?.godownId || ''}
          onChange={(gid, gname) => onUpdate({ from_godown_id: gid, from_godown_name: gname })}
          entityCode={entityCode}
          compact
        />
      </TableCell>
      <TableCell>
        <Input
          value={line.from_bin_code ?? preferred?.binCode ?? ''}
          onChange={e => onUpdate({ from_bin_code: e.target.value })}
          className="h-8 text-sm font-mono" placeholder="Bin"
        />
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
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onRemove}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </TableCell>
    </TableRow>
  );
}
