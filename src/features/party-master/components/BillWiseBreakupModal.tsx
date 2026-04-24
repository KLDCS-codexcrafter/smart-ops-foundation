/**
 * @file     BillWiseBreakupModal.tsx
 * @purpose  Edit openingBalance with optional bill-wise breakup of outstanding invoices.
 * @sprint   T-H1.5-C-S4
 */
import { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SmartDateInput } from '@/components/ui/smart-date-input';
import { toIndianFormat } from '@/lib/keyboard';
import type { OpeningBill } from '../lib/party-tree-builder';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  openingBalance: number;
  bills: OpeningBill[];
  onSave: (next: { openingBalance: number; bills: OpeningBill[] }) => void;
}

export function BillWiseBreakupModal({ open, onOpenChange, openingBalance, bills, onSave }: Props) {
  const [draftBalance, setDraftBalance] = useState<number>(openingBalance);
  const [draftBills, setDraftBills] = useState<OpeningBill[]>(bills);

  useEffect(() => {
    if (open) {
      setDraftBalance(openingBalance);
      setDraftBills(bills);
    }
  }, [open, openingBalance, bills]);

  const upd = (idx: number, patch: Partial<OpeningBill>) =>
    setDraftBills(prev => prev.map((b, i) => i === idx ? { ...b, ...patch } : b));

  const add = () => setDraftBills(prev => [...prev, {
    id: `ob-${Date.now()}`, billNumber: '', billDate: '', amount: 0, dueDate: '',
  }]);
  const remove = (idx: number) => setDraftBills(prev => prev.filter((_, i) => i !== idx));

  const billsTotal = useMemo(() => draftBills.reduce((s, b) => s + (b.amount || 0), 0), [draftBills]);
  const mismatch = draftBills.length > 0 && Math.abs(billsTotal - draftBalance) > 0.01;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Opening Balance — Bill-Wise Breakup</DialogTitle>
          <DialogDescription>Total opening balance and optional individual outstanding invoices.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          <div>
            <Label className="text-xs">Opening Balance (₹)</Label>
            <Input type="number" value={draftBalance}
              onChange={e => setDraftBalance(Number(e.target.value) || 0)}
              className="h-9 text-xs font-mono" />
          </div>
          <div className="border-t border-border pt-3 space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Bill-Wise Breakup (optional)</Label>
              <span className={`text-[10px] font-mono ${mismatch ? 'text-destructive' : 'text-muted-foreground'}`}>
                Bills total: ₹{toIndianFormat(billsTotal)}
                {mismatch && ` (mismatch ₹${toIndianFormat(Math.abs(billsTotal - draftBalance))})`}
              </span>
            </div>
            {draftBills.length === 0 && (
              <div className="text-[11px] text-muted-foreground text-center py-3">No bill-wise breakup. Add lines below if needed.</div>
            )}
            {draftBills.map((b, idx) => (
              <div key={b.id} className="grid grid-cols-12 gap-2 items-end border border-border rounded-md p-2 bg-muted/20">
                <div className="col-span-3">
                  <Label className="text-[10px]">Bill No.</Label>
                  <Input value={b.billNumber} onChange={e => upd(idx, { billNumber: e.target.value })} className="h-8 text-xs font-mono" />
                </div>
                <div className="col-span-3">
                  <Label className="text-[10px]">Bill Date</Label>
                  <SmartDateInput value={b.billDate} onChange={v => upd(idx, { billDate: v })} className="h-8 text-xs" />
                </div>
                <div className="col-span-3">
                  <Label className="text-[10px]">Due Date</Label>
                  <SmartDateInput value={b.dueDate} onChange={v => upd(idx, { dueDate: v })} className="h-8 text-xs" />
                </div>
                <div className="col-span-2">
                  <Label className="text-[10px]">Amount (₹)</Label>
                  <Input type="number" value={b.amount}
                    onChange={e => upd(idx, { amount: Number(e.target.value) || 0 })}
                    className="h-8 text-xs font-mono text-right" />
                </div>
                <div className="col-span-1">
                  <Button variant="ghost" size="sm" onClick={() => remove(idx)} className="h-8 text-destructive">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={add} className="w-full gap-1 text-xs">
              <Plus className="h-3 w-3" /> Add Bill Line
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button data-primary onClick={() => { onSave({ openingBalance: draftBalance, bills: draftBills }); onOpenChange(false); }}>
            Save Opening Balance
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
