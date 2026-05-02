/**
 * @file     BankInstrumentPicker.tsx — Q4-c bank instrument capture
 * @sprint   T-Phase-2.7-c · Card #2.7 sub-sprint 3 of 5
 * @purpose  Universal bank-instrument picker reused across receipt + payment
 *           forms. 10 instrument types · conditional fields · live regex
 *           feedback via bank-instrument-validator. The "mandatory" decision
 *           is computed by the parent form via field_rules min_amount (Q1-c
 *           pure 2.7-b reuse) and passed in as `mandatoryReason` — picker
 *           itself contains zero new validation logic.
 */

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { AlertTriangle, CheckCircle2, IndianRupee } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  INSTRUMENT_OPTIONS,
  type InstrumentType,
  type InstrumentValue,
} from '@/components/uth/BankInstrumentPicker.helpers';
import { validateInstrument } from '@/lib/bank-instrument-validator';

interface BankInstrumentPickerProps {
  value: InstrumentValue;
  onChange: (next: InstrumentValue) => void;
  /** Used for the header amount badge (₹ formatted). */
  amount?: number;
  /** Non-null = picker is mandatory; banner + asterisks render. */
  mandatoryReason?: string | null;
  className?: string;
}

const inr = (n: number): string =>
  `₹ ${Math.round(n).toLocaleString('en-IN')}`;

export function BankInstrumentPicker({
  value,
  onChange,
  amount,
  mandatoryReason,
  className,
}: BankInstrumentPickerProps): JSX.Element {
  const isMandatory = !!mandatoryReason;
  const type = value.instrument_type;

  const showRefNo   = type !== null && type !== 'Cash';
  const showCheque  = type === 'Cheque';
  const showDeposit = type === 'Cheque';
  const showBank    = type === 'Cheque' || type === 'DD';

  const validation = useMemo(() => {
    if (!type) return { valid: true, format_ok: true, message: '', pattern_used: null };
    return validateInstrument(type, value.instrument_ref_no);
  }, [type, value.instrument_ref_no]);

  const refInvalid = !!type && type !== 'Cash' && !validation.valid;

  const set = (patch: Partial<InstrumentValue>): void => {
    onChange({ ...value, ...patch });
  };

  const reqMark = (
    <span className={cn('text-destructive ml-0.5', isMandatory ? 'inline' : 'hidden')}>*</span>
  );

  return (
    <Card className={cn('glass-card', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <CardTitle className="text-base flex items-center gap-2">
            Bank Instrument
            {isMandatory && (
              <Badge variant="destructive" className="text-[10px]">Required</Badge>
            )}
          </CardTitle>
          {typeof amount === 'number' && amount > 0 && (
            <Badge variant="outline" className="font-mono">
              <IndianRupee className="h-3 w-3 mr-1" />
              {inr(amount)}
            </Badge>
          )}
        </div>
        {isMandatory && (
          <div className="mt-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning flex items-start gap-2">
            <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>{mandatoryReason}</span>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">
              Instrument Type{reqMark}
            </Label>
            <Select
              value={type ?? ''}
              onValueChange={(v) => set({ instrument_type: (v || null) as InstrumentType | null })}
            >
              <SelectTrigger className="rounded-lg">
                <SelectValue placeholder="Select instrument" />
              </SelectTrigger>
              <SelectContent>
                {INSTRUMENT_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {showRefNo && (
            <div>
              <Label className="text-xs">
                Reference / UTR / Cheque #{reqMark}
              </Label>
              <div className="relative">
                <Input
                  value={value.instrument_ref_no ?? ''}
                  onChange={(e) => set({ instrument_ref_no: e.target.value || null })}
                  className={cn(
                    'rounded-lg font-mono pr-8',
                    refInvalid && 'border-destructive focus-visible:ring-destructive',
                  )}
                  placeholder="Enter reference"
                />
                {validation.valid && (value.instrument_ref_no ?? '').trim().length > 0 && (
                  <CheckCircle2 className="h-4 w-4 text-success absolute right-2 top-1/2 -translate-y-1/2" />
                )}
              </div>
              {refInvalid && (
                <p className="text-[11px] text-destructive mt-1">{validation.message}</p>
              )}
            </div>
          )}
        </div>

        {(showCheque || showBank || showDeposit) && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {showBank && (
              <div>
                <Label className="text-xs">Bank Name{reqMark}</Label>
                <Input
                  value={value.bank_name ?? ''}
                  onChange={(e) => set({ bank_name: e.target.value || null })}
                  className="rounded-lg"
                  placeholder="e.g. HDFC Bank"
                />
              </div>
            )}
            {showCheque && (
              <div>
                <Label className="text-xs">Cheque Date{reqMark}</Label>
                <Input
                  type="date"
                  value={value.cheque_date ?? ''}
                  onChange={(e) => set({ cheque_date: e.target.value || null })}
                  className="rounded-lg font-mono"
                />
              </div>
            )}
            {showDeposit && (
              <div>
                <Label className="text-xs">Deposit Date</Label>
                <Input
                  type="date"
                  value={value.deposit_date ?? ''}
                  onChange={(e) => set({ deposit_date: e.target.value || null })}
                  className="rounded-lg font-mono"
                  placeholder="Blank = in hand"
                />
                <p className="text-[10px] text-muted-foreground mt-1">Leave blank if cheque is in hand.</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
