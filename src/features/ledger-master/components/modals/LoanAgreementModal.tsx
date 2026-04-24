/**
 * @file     LoanAgreementModal.tsx
 * @purpose  Focused modal that captures the loan-agreement essentials for a
 *           Borrowing ledger: lender + loan type + principal + rate + tenure.
 *           Used inside BorrowingLedgerPanel Step 3.
 * @sprint   T-H1.5-C-S6.5b
 */
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

export type LenderType = 'bank' | 'nbfc' | 'director' | 'group_company' | 'individual' | 'other';
export type LoanType = 'term_loan' | 'od' | 'cc' | 'demand_loan' | 'vehicle_loan';

export interface LoanAgreementValue {
  lenderName: string;
  lenderType: LenderType;
  loanType: LoanType;
  loanAmount: number;
  interestRate: number;
  tenureMonths: number;
}

interface Props {
  open: boolean;
  value: LoanAgreementValue;
  onChange: (v: LoanAgreementValue) => void;
  onClose: () => void;
}

export function LoanAgreementModal({ open, value, onChange, onClose }: Props) {
  const set = <K extends keyof LoanAgreementValue>(k: K, v: LoanAgreementValue[K]) =>
    onChange({ ...value, [k]: v });

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Loan Agreement</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Lender Name</Label>
            <Input value={value.lenderName} onChange={e => set('lenderName', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Lender Type</Label>
              <Select value={value.lenderType} onValueChange={v => set('lenderType', v as LenderType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank">Bank</SelectItem>
                  <SelectItem value="nbfc">NBFC</SelectItem>
                  <SelectItem value="director">Director</SelectItem>
                  <SelectItem value="group_company">Group Company</SelectItem>
                  <SelectItem value="individual">Individual</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Loan Type</Label>
              <Select value={value.loanType} onValueChange={v => set('loanType', v as LoanType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="term_loan">Term Loan</SelectItem>
                  <SelectItem value="od">Overdraft (OD)</SelectItem>
                  <SelectItem value="cc">Cash Credit (CC)</SelectItem>
                  <SelectItem value="demand_loan">Demand Loan</SelectItem>
                  <SelectItem value="vehicle_loan">Vehicle Loan</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Principal (₹)</Label>
              <Input type="number" className="font-mono"
                value={value.loanAmount}
                onChange={e => set('loanAmount', Number(e.target.value) || 0)} />
            </div>
            <div>
              <Label className="text-xs">Interest Rate (%)</Label>
              <Input type="number" step="0.01" className="font-mono"
                value={value.interestRate}
                onChange={e => set('interestRate', Number(e.target.value) || 0)} />
            </div>
            <div>
              <Label className="text-xs">Tenure (months)</Label>
              <Input type="number" className="font-mono"
                value={value.tenureMonths}
                onChange={e => set('tenureMonths', Number(e.target.value) || 0)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
