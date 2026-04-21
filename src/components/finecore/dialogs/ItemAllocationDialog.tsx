/**
 * ItemAllocationDialog.tsx — Tally Prime-style multi-godown/batch/serial allocation.
 *
 * PURPOSE       Capture per-line ItemAllocation[] (godown × batch × serials × qty).
 * DEPENDENCIES  shadcn Dialog/Table/Select/Input/Button/Badge, sonner
 * TALLY-ON-TOP BEHAVIOR  none
 * SPEC DOC      Owner Q2/Q3 — auto-open + smart-skip rules
 */
import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import type { ItemAllocation } from '@/types/voucher';

export interface GodownLite { id: string; name: string; }
export interface BatchLite  { id: string; batch_no: string; mfg_date?: string; exp_date?: string; available_qty: number; godown_id: string; }
export interface SerialLite { id: string; serial_no: string; status: string; godown_id: string; batch_id?: string; }

interface ItemAllocationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemName: string;
  lineQty: number;
  lineRate: number;
  lineDiscountAmount: number;
  godowns: GodownLite[];
  batches: BatchLite[];
  serials: SerialLite[];
  isBatchTracked: boolean;
  isSerialTracked: boolean;
  initial: ItemAllocation[];
  onSave: (allocations: ItemAllocation[]) => void;
}

function emptyAllocation(godownId?: string): ItemAllocation {
  return {
    id: `alloc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    godown_id: godownId ?? '',
    godown_name: '',
    qty: 0, rate: 0, discount_amount: 0, taxable_value: 0,
    serial_ids: [],
  };
}

export function ItemAllocationDialog({
  open, onOpenChange, itemName, lineQty, lineRate, lineDiscountAmount,
  godowns, batches, serials, isBatchTracked, isSerialTracked,
  initial, onSave,
}: ItemAllocationDialogProps) {
  const [rows, setRows] = useState<ItemAllocation[]>(
    initial.length > 0 ? initial : [emptyAllocation(godowns[0]?.id)],
  );

  const totalQty = useMemo(() => rows.reduce((s, r) => s + (r.qty || 0), 0), [rows]);
  const qtyDelta = +(lineQty - totalQty).toFixed(3);
  const qtyOk = Math.abs(qtyDelta) < 0.001;

  const addRow = () => setRows(r => [...r, emptyAllocation(godowns[0]?.id)]);
  const removeRow = (i: number) => setRows(r => r.filter((_, idx) => idx !== i));
  const update = (i: number, patch: Partial<ItemAllocation>) =>
    setRows(r => r.map((row, idx) => idx === i ? { ...row, ...patch } : row));

  const batchesForGodown = (godownId: string) => batches.filter(b => b.godown_id === godownId);
  const serialsForBatch = (godownId: string, batchId?: string) =>
    serials.filter(s => s.godown_id === godownId && (!batchId || s.batch_id === batchId) && s.status === 'available');

  const recomputeLineFinancials = (row: ItemAllocation, qty: number): ItemAllocation => {
    const qtyShare = lineQty > 0 ? qty / lineQty : 0;
    const disc = +(lineDiscountAmount * qtyShare).toFixed(2);
    const taxable = +(qty * lineRate - disc).toFixed(2);
    return { ...row, qty, rate: lineRate, discount_amount: disc, taxable_value: taxable };
  };

  const handleSave = () => {
    if (!qtyOk) {
      toast.error(`Allocation total ${totalQty.toFixed(3)} does not equal line qty ${lineQty.toFixed(3)}`);
      return;
    }
    for (const r of rows) {
      if (!r.godown_id) { toast.error('Every allocation needs a godown'); return; }
      if (isBatchTracked && !r.batch_id) { toast.error('Batch-tracked items need a batch on every allocation'); return; }
      if (isSerialTracked) {
        const expected = Math.round(r.qty);
        if ((r.serial_ids?.length ?? 0) !== expected) {
          toast.error(`Serial-tracked: allocation qty ${expected} must match ${r.serial_ids?.length ?? 0} selected serials`);
          return;
        }
      }
    }
    const snapped = rows.map(r => {
      const gName = godowns.find(g => g.id === r.godown_id)?.name ?? '';
      const bNo = batches.find(b => b.id === r.batch_id)?.batch_no;
      return { ...r, godown_name: gName, batch_no: bNo };
    });
    onSave(snapped);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>Stock Item Allocations</DialogTitle>
          <DialogDescription>
            <span className="font-medium text-foreground">{itemName}</span>
            <span className="mx-2 opacity-50">·</span>
            Line Qty: <span className="font-mono">{lineQty.toFixed(3)}</span>
            {isBatchTracked && <Badge variant="outline" className="ml-2 text-xs">Batch tracked</Badge>}
            {isSerialTracked && <Badge variant="outline" className="ml-1 text-xs">Serial tracked</Badge>}
          </DialogDescription>
        </DialogHeader>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">Godown</TableHead>
              {isBatchTracked && <TableHead className="w-[180px]">Batch</TableHead>}
              {isSerialTracked && <TableHead className="w-[160px]">Serials</TableHead>}
              <TableHead className="w-[110px] text-right">Qty</TableHead>
              <TableHead className="w-[110px] text-right">Rate</TableHead>
              <TableHead className="w-[110px] text-right">Taxable</TableHead>
              <TableHead className="w-[40px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, i) => (
              <TableRow key={row.id}>
                <TableCell>
                  <Select value={row.godown_id} onValueChange={v => update(i, { godown_id: v, batch_id: undefined, serial_ids: [] })}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {godowns.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </TableCell>

                {isBatchTracked && (
                  <TableCell>
                    <Select value={row.batch_id ?? ''} onValueChange={v => update(i, { batch_id: v, serial_ids: [] })} disabled={!row.godown_id}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {batchesForGodown(row.godown_id).map(b => (
                          <SelectItem key={b.id} value={b.id}>
                            <span className="font-mono text-sm">{b.batch_no}</span>
                            <span className="ml-2 text-xs text-muted-foreground">avail {b.available_qty}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                )}

                {isSerialTracked && (
                  <TableCell>
                    <Select
                      value=""
                      onValueChange={v => {
                        const current = row.serial_ids ?? [];
                        if (current.includes(v)) return;
                        update(i, { serial_ids: [...current, v] });
                      }}
                      disabled={!row.godown_id}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder={`${row.serial_ids?.length ?? 0} selected`} />
                      </SelectTrigger>
                      <SelectContent>
                        {serialsForBatch(row.godown_id, row.batch_id).map(s => (
                          <SelectItem key={s.id} value={s.id}>{s.serial_no}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {row.serial_ids && row.serial_ids.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {row.serial_ids.map(sid => {
                          const s = serials.find(x => x.id === sid);
                          return (
                            <Badge key={sid} variant="outline" className="text-[10px]">
                              {s?.serial_no ?? sid}
                              <button
                                className="ml-1 opacity-60 hover:opacity-100"
                                onClick={() => update(i, { serial_ids: (row.serial_ids ?? []).filter(x => x !== sid) })}
                              >×</button>
                            </Badge>
                          );
                        })}
                      </div>
                    )}
                  </TableCell>
                )}

                <TableCell className="text-right">
                  <Input
                    type="number"
                    value={row.qty || ''}
                    onChange={e => {
                      const n = parseFloat(e.target.value) || 0;
                      update(i, recomputeLineFinancials(row, n));
                    }}
                    className="h-8 text-right font-mono"
                  />
                </TableCell>
                <TableCell className="text-right font-mono text-sm">{row.rate.toFixed(2)}</TableCell>
                <TableCell className="text-right font-mono text-sm">{row.taxable_value.toFixed(2)}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeRow(i)} disabled={rows.length <= 1}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <div className="flex items-center justify-between pt-2">
          <Button variant="outline" size="sm" onClick={addRow}>
            <Plus className="h-4 w-4 mr-1" /> Add allocation
          </Button>
          <div className={`text-sm font-medium ${qtyOk ? 'text-emerald-600' : 'text-destructive'}`}>
            {qtyOk ? (
              <>Allocated: <span className="font-mono">{totalQty.toFixed(3)}</span> / {lineQty.toFixed(3)}</>
            ) : (
              <span className="flex items-center gap-1">
                <AlertTriangle className="h-4 w-4" />
                {qtyDelta > 0 ? `${qtyDelta.toFixed(3)} more to allocate` : `${Math.abs(qtyDelta).toFixed(3)} over-allocated`}
              </span>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button data-primary onClick={handleSave} disabled={!qtyOk}>Save Allocations</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
