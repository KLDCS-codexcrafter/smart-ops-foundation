/**
 * @file     LoanChargesMaster.tsx
 * @purpose  Focused modal for the 5-field loan charges rate card (processing,
 *           penal, bounce, foreclosure + GST toggle). Replaces inline inputs
 *           on BorrowingLedgerPanel Step 5.
 * @sprint   T-H1.5-D-D1
 */
import { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

export interface LoanChargesValue {
  processingFee: number;
  processingFeeGst: number;
  penalInterestRate: number;
  chequeBounceCharge: number;
  foreclosureChargeRate: number;
  gstOnChargesApplicable: boolean;
}

interface Props {
  open: boolean;
  value: LoanChargesValue;
  onChange: (next: LoanChargesValue) => void;
  onClose: () => void;
}

export function LoanChargesMaster({ open, value, onChange, onClose }: Props) {
  const [draft, setDraft] = useState<LoanChargesValue>(value);

  useEffect(() => {
    if (open) setDraft(value);
  }, [open, value]);

  const set = <K extends keyof LoanChargesValue>(k: K, v: LoanChargesValue[K]) =>
    setDraft(p => ({ ...p, [k]: v }));

  const save = () => {
    onChange(draft);
    onClose();
  };

  const penalAnnual = (draft.penalInterestRate * 365).toFixed(1);

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Loan Charges Master</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* One-Time */}
          <Section title="One-Time Charges">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Processing Fee (₹)</Label>
                <Input type="number" className="font-mono" value={draft.processingFee}
                  onChange={e => set('processingFee', Number(e.target.value) || 0)} />
              </div>
              <div>
                <Label className="text-xs">Processing Fee GST (%)</Label>
                <Input type="number" step="0.01" className="font-mono" value={draft.processingFeeGst}
                  onChange={e => set('processingFeeGst', Number(e.target.value) || 0)} />
              </div>
            </div>
          </Section>

          {/* Penal */}
          <Section title="Penal Charges">
            <Label className="text-xs">Penal Interest Rate (% per day)</Label>
            <Input type="number" step="0.001" className="font-mono" value={draft.penalInterestRate}
              onChange={e => set('penalInterestRate', Number(e.target.value) || 0)} />
            <p className="text-[10px] text-muted-foreground mt-1">
              = {penalAnnual}% p.a. on arrears
            </p>
          </Section>

          {/* Flat */}
          <Section title="Flat Charges">
            <div className="grid grid-cols-2 gap-3 items-end">
              <div>
                <Label className="text-xs">Cheque Bounce Charge (₹ per bounce)</Label>
                <Input type="number" className="font-mono" value={draft.chequeBounceCharge}
                  onChange={e => set('chequeBounceCharge', Number(e.target.value) || 0)} />
              </div>
              <div className="flex items-center gap-2 pb-2">
                <Switch checked={draft.gstOnChargesApplicable}
                  onCheckedChange={v => set('gstOnChargesApplicable', v)} />
                <Label className="text-xs">GST applicable on charges</Label>
              </div>
            </div>
          </Section>

          {/* Exit */}
          <Section title="Exit Charges">
            <Label className="text-xs">Foreclosure Rate (% of outstanding)</Label>
            <Input type="number" step="0.01" className="font-mono" value={draft.foreclosureChargeRate}
              onChange={e => set('foreclosureChargeRate', Number(e.target.value) || 0)} />
          </Section>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save}>Save Charges</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">{title}</p>
      {children}
    </div>
  );
}
