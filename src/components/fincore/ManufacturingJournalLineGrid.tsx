/**
 * ManufacturingJournalLineGrid.tsx — Line grid for Manufacturing Journal.
 *
 * Three sides of lines: consumption, production, byproduct. All three use the
 * same grid shape but differ in header labels and whether Explode button
 * applies (explode is only meaningful on consumption lines sourced from a
 * Semi-Finished sub-BOM).
 *
 * PER-LINE EXPLODE (design decision Q2): when a consumption line has
 * `component_type === 'semi_finished' && sub_bom_id !== null`, the grid
 * renders an Explode button on that row. User click → parent calls
 * `onExplode(idx)` which does the sub-BOM lookup + line replacement.
 *
 * VALUATION (design decision Q1): matches StockAdjustment precedent —
 * rate = 0, value = qty (qty-as-placeholder). Real valuation arrives in a
 * future "Stock Valuation Engine" sprint.
 *
 * INPUT        lines, side, onChange, onExplode? (only for consumption)
 * OUTPUT       onChange(updated)
 */

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableHead, TableHeader, TableRow, TableCell } from '@/components/ui/table';
import { Plus, Trash2, Layers } from 'lucide-react';
import { onEnterNext } from '@/lib/keyboard';
import type { BomComponentType } from '@/types/bom';

export interface ManufacturingJournalLine {
  id: string;
  item_id: string;
  item_name: string;
  item_code: string;
  godown_id: string;
  godown_name: string;
  /** Required: units of the product made (production side) or components consumed (consumption side). */
  qty: number;
  uom: string;
  /** Placeholder valuation — always 0 in S1b. See file header for rationale. */
  rate: number;
  value: number;
  /** For consumption lines sourced from a BOM component. Enables Explode button. */
  component_type?: BomComponentType | null;
  sub_bom_id?: string | null;
  /** Wastage embedded for consumption lines only. Display-only in grid. */
  wastage_percent?: number | null;
}

export type MfgJournalSide = 'consumption' | 'production' | 'byproduct';

interface MfgJournalLineGridProps {
  lines: ManufacturingJournalLine[];
  onChange: (lines: ManufacturingJournalLine[]) => void;
  side: MfgJournalSide;
  /** Called when user clicks Explode on a sub-BOM-sourced consumption line.
      Parent is responsible for lookup + replacement. */
  onExplode?: (lineIdx: number) => void;
}

function sideLabel(side: MfgJournalSide): string {
  if (side === 'consumption') return 'Consumption (Dr WIP / Cr Stock)';
  if (side === 'production') return 'Production (Dr FG Stock / Cr WIP)';
  return 'Byproducts (Dr FG / Cr Recovery Ledger)';
}

function emptyLine(): ManufacturingJournalLine {
  return {
    id: `mjl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    item_id: '', item_name: '', item_code: '',
    godown_id: '', godown_name: '',
    qty: 0, uom: 'NOS',
    rate: 0, value: 0,
    component_type: null, sub_bom_id: null, wastage_percent: null,
  };
}

export function ManufacturingJournalLineGrid({
  lines, onChange, side, onExplode,
}: MfgJournalLineGridProps) {
  const updateLine = (idx: number, field: keyof ManufacturingJournalLine, val: string | number | null) => {
    const updated = [...lines];
    updated[idx] = { ...updated[idx], [field]: val };
    // Valuation stays qty-as-placeholder: value = qty (no multiplication by rate, matching S1b decision)
    if (field === 'qty') {
      updated[idx].value = updated[idx].qty;
    }
    onChange(updated);
  };

  const addLine = () => onChange([...lines, emptyLine()]);
  const removeLine = (idx: number) => onChange(lines.filter((_, i) => i !== idx));

  const totalQty = lines.reduce((s, l) => s + l.qty, 0);
  const explodeAllowed = side === 'consumption' && !!onExplode;

  return (
    <div data-keyboard-form className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {sideLabel(side)}
      </p>
      <div className="overflow-x-auto border rounded-md">
        <Table>
          <TableHeader>
            <TableRow className="text-[10px]">
              <TableHead className="w-8">#</TableHead>
              <TableHead className="min-w-[160px]">Item</TableHead>
              <TableHead className="w-24">Godown</TableHead>
              <TableHead className="w-16">Qty</TableHead>
              <TableHead className="w-16">UOM</TableHead>
              <TableHead className="w-20">Value</TableHead>
              {explodeAllowed && <TableHead className="w-20">Sub-BOM</TableHead>}
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.map((line, idx) => {
              const canExplode = explodeAllowed
                && line.component_type === 'semi_finished'
                && !!line.sub_bom_id;
              return (
                <TableRow key={line.id} className="text-xs">
                  <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                  <TableCell>
                    <Input
                      value={line.item_name}
                      onChange={e => updateLine(idx, 'item_name', e.target.value)}
                      onKeyDown={onEnterNext}
                      className="h-7 text-xs"
                      placeholder="Item"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={line.godown_name}
                      onChange={e => updateLine(idx, 'godown_name', e.target.value)}
                      onKeyDown={onEnterNext}
                      className="h-7 text-xs w-24"
                      placeholder="Godown"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={line.qty || ''}
                      onChange={e => updateLine(idx, 'qty', Number(e.target.value))}
                      onKeyDown={onEnterNext}
                      className="h-7 text-xs w-16"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={line.uom}
                      onChange={e => updateLine(idx, 'uom', e.target.value)}
                      onKeyDown={onEnterNext}
                      className="h-7 text-xs w-16"
                    />
                  </TableCell>
                  <TableCell className="font-mono text-right text-muted-foreground">
                    {line.value.toLocaleString('en-IN')}
                  </TableCell>
                  {explodeAllowed && (
                    <TableCell>
                      {canExplode ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 px-2 text-[10px]"
                          onClick={() => onExplode?.(idx)}
                        >
                          <Layers className="h-3 w-3 mr-1" />
                          Explode
                        </Button>
                      ) : line.component_type === 'semi_finished' ? (
                        <Badge variant="secondary" className="text-[10px]">No sub-BOM</Badge>
                      ) : (
                        <span className="text-muted-foreground text-[10px]">—</span>
                      )}
                    </TableCell>
                  )}
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => removeLine(idx)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={addLine} className="text-xs">
          <Plus className="h-3 w-3 mr-1" /> Add Line
        </Button>
        <span className="text-xs font-mono text-muted-foreground">
          Total qty: {totalQty.toLocaleString('en-IN')}
        </span>
      </div>
    </div>
  );
}
