/**
 * InventoryLineGrid.tsx — Inline editable inventory line table
 * Used in: Sales Invoice, Purchase Invoice, Credit Note, Debit Note, Delivery Note, Receipt Note
 */
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableHead, TableHeader, TableRow, TableCell } from '@/components/ui/table';
import { Plus, Trash2 } from 'lucide-react';
import { onEnterNext } from '@/lib/keyboard';
import type { VoucherInventoryLine } from '@/types/voucher';

interface InventoryLineGridProps {
  lines: VoucherInventoryLine[];
  onChange: (lines: VoucherInventoryLine[]) => void;
  mode: 'sales' | 'purchase' | 'delivery' | 'grn' | 'credit' | 'debit';
  showTax?: boolean;
  isInterState?: boolean;
}

function emptyLine(): VoucherInventoryLine {
  return {
    id: `il-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    item_id: '', item_code: '', item_name: '', hsn_sac_code: '',
    godown_id: '', godown_name: '', qty: 0, uom: 'NOS', rate: 0,
    discount_percent: 0, discount_amount: 0, taxable_value: 0,
    gst_rate: 0, cgst_rate: 0, sgst_rate: 0, igst_rate: 0, cess_rate: 0,
    cgst_amount: 0, sgst_amount: 0, igst_amount: 0, cess_amount: 0,
    total: 0, gst_type: 'taxable', gst_source: 'none',
  };
}

function recalcLine(line: VoucherInventoryLine, isInterState: boolean): VoucherInventoryLine {
  const gross = line.qty * line.rate;
  const discAmt = gross * (line.discount_percent / 100);
  const taxable = gross - discAmt;
  const halfRate = line.gst_rate / 2;
  const cgst = isInterState ? 0 : Math.round(taxable * halfRate / 100 * 100) / 100;
  const sgst = isInterState ? 0 : Math.round(taxable * halfRate / 100 * 100) / 100;
  const igst = isInterState ? Math.round(taxable * line.gst_rate / 100 * 100) / 100 : 0;
  return {
    ...line,
    discount_amount: Math.round(discAmt * 100) / 100,
    taxable_value: Math.round(taxable * 100) / 100,
    cgst_rate: isInterState ? 0 : halfRate,
    sgst_rate: isInterState ? 0 : halfRate,
    igst_rate: isInterState ? line.gst_rate : 0,
    cgst_amount: cgst, sgst_amount: sgst, igst_amount: igst,
    total: Math.round((taxable + cgst + sgst + igst + line.cess_amount) * 100) / 100,
  };
}

export function InventoryLineGrid({ lines, onChange, mode, showTax = true, isInterState = false }: InventoryLineGridProps) {
  const [focusedIdx, setFocusedIdx] = useState<number | null>(null);

  const updateLine = (idx: number, field: keyof VoucherInventoryLine, value: string | number) => {
    const updated = [...lines];
    updated[idx] = { ...updated[idx], [field]: value };
    updated[idx] = recalcLine(updated[idx], isInterState);
    onChange(updated);
  };

  const addLine = () => onChange([...lines, emptyLine()]);
  const removeLine = (idx: number) => onChange(lines.filter((_, i) => i !== idx));

  const showTaxCols = showTax && mode !== 'delivery' && mode !== 'grn';

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto border rounded-md">
        <Table>
          <TableHeader>
            <TableRow className="text-[10px]">
              <TableHead className="w-8">#</TableHead>
              <TableHead className="min-w-[160px]">Item</TableHead>
              <TableHead className="w-20">HSN/SAC</TableHead>
              <TableHead className="w-24">Godown</TableHead>
              <TableHead className="w-16">Qty</TableHead>
              <TableHead className="w-16">UOM</TableHead>
              <TableHead className="w-20">Rate</TableHead>
              <TableHead className="w-16">Disc%</TableHead>
              <TableHead className="w-20">Taxable</TableHead>
              {showTaxCols && <TableHead className="w-16">GST%</TableHead>}
              {showTaxCols && !isInterState && <TableHead className="w-16">CGST</TableHead>}
              {showTaxCols && !isInterState && <TableHead className="w-16">SGST</TableHead>}
              {showTaxCols && isInterState && <TableHead className="w-16">IGST</TableHead>}
              <TableHead className="w-20">Total</TableHead>
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.map((line, idx) => (
              <TableRow key={line.id} className="text-xs" onFocus={() => setFocusedIdx(idx)}>
                <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                <TableCell>
                  <Input value={line.item_name} onChange={e => updateLine(idx, 'item_name', e.target.value)}
                    onKeyDown={onEnterNext} className="h-7 text-xs" placeholder="Item name" />
                </TableCell>
                <TableCell>
                  <Input value={line.hsn_sac_code} onChange={e => updateLine(idx, 'hsn_sac_code', e.target.value)}
                    onKeyDown={onEnterNext} className="h-7 text-xs w-20" />
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
                <TableCell>
                  <Input type="number" value={line.discount_percent || ''} onChange={e => updateLine(idx, 'discount_percent', Number(e.target.value))}
                    onKeyDown={onEnterNext} className="h-7 text-xs w-16" />
                </TableCell>
                <TableCell className="font-mono text-right">{line.taxable_value.toLocaleString('en-IN')}</TableCell>
                {showTaxCols && (
                  <TableCell>
                    <Input type="number" value={line.gst_rate || ''} onChange={e => updateLine(idx, 'gst_rate', Number(e.target.value))}
                      onKeyDown={onEnterNext} className="h-7 text-xs w-16" />
                  </TableCell>
                )}
                {showTaxCols && !isInterState && <TableCell className="font-mono text-right text-[10px]">{line.cgst_amount.toLocaleString('en-IN')}</TableCell>}
                {showTaxCols && !isInterState && <TableCell className="font-mono text-right text-[10px]">{line.sgst_amount.toLocaleString('en-IN')}</TableCell>}
                {showTaxCols && isInterState && <TableCell className="font-mono text-right text-[10px]">{line.igst_amount.toLocaleString('en-IN')}</TableCell>}
                <TableCell className="font-mono text-right font-medium">{line.total.toLocaleString('en-IN')}</TableCell>
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
      <Button variant="outline" size="sm" onClick={addLine} className="text-xs">
        <Plus className="h-3 w-3 mr-1" /> Add Line
      </Button>
    </div>
  );
}
