/**
 * ItemParametersDialog.tsx — Dynamic form from Parametric Hub template.
 *
 * PURPOSE       Capture parameter_values keyed by parameter_code.
 * DEPENDENCIES  shadcn Dialog/Input/Select, SmartDateInput, sonner
 * TALLY-ON-TOP BEHAVIOR  none
 * SPEC DOC      Parametric Hub + Owner Q1=B (open only when template has ≥1 params)
 */
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SmartDateInput } from '@/components/ui/smart-date-input';
import { onEnterNext } from '@/lib/keyboard';
import { toast } from 'sonner';
import type { ParameterEntry } from '@/pages/erp/inventory/Parametric';

interface ItemParametersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemName: string;
  templateName: string;
  parameters: ParameterEntry[];
  initial: Record<string, string>;
  onSave: (values: Record<string, string>) => void;
}

export function ItemParametersDialog({
  open, onOpenChange, itemName, templateName, parameters, initial, onSave,
}: ItemParametersDialogProps) {
  const [values, setValues] = useState<Record<string, string>>(initial ?? {});
  const set = (code: string, v: string) => setValues(s => ({ ...s, [code]: v }));

  const handleSave = () => {
    for (const p of parameters) {
      const v = values[p.parameter_code] ?? p.default_value ?? '';
      if (p.is_mandatory && !v) { toast.error(`"${p.parameter_name}" is required`); return; }
      if (p.parameter_type === 'number' && v !== '') {
        const n = parseFloat(v);
        if (Number.isNaN(n)) { toast.error(`"${p.parameter_name}" must be a number`); return; }
        if (p.validation_min != null && n < p.validation_min) { toast.error(`"${p.parameter_name}" must be ≥ ${p.validation_min}`); return; }
        if (p.validation_max != null && n > p.validation_max) { toast.error(`"${p.parameter_name}" must be ≤ ${p.validation_max}`); return; }
      }
    }
    onSave(values);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Item Parameters</DialogTitle>
          <DialogDescription>
            <span className="font-medium text-foreground">{itemName}</span>
            <span className="mx-2 opacity-50">·</span>
            Template: <span className="font-medium">{templateName}</span>
          </DialogDescription>
        </DialogHeader>

        <div data-keyboard-form className="space-y-3 py-2">
          {parameters.map(p => (
            <div key={p.id} className="grid grid-cols-[1fr,2fr] items-center gap-3">
              <Label className="text-sm">
                {p.parameter_name}
                {p.is_mandatory && <span className="ml-1 text-destructive">*</span>}
                {p.unit && <span className="ml-1 text-xs text-muted-foreground">({p.unit})</span>}
              </Label>
              {p.parameter_type === 'simple' && (
                <Input value={values[p.parameter_code] ?? ''} onChange={e => set(p.parameter_code, e.target.value)} onKeyDown={onEnterNext} className="h-9" />
              )}
              {p.parameter_type === 'number' && (
                <Input type="number" value={values[p.parameter_code] ?? ''} onChange={e => set(p.parameter_code, e.target.value)} onKeyDown={onEnterNext} className="h-9 font-mono" />
              )}
              {p.parameter_type === 'list' && (
                <Select value={values[p.parameter_code] ?? ''} onValueChange={v => set(p.parameter_code, v)}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {(p.list_options ?? []).map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
              {p.parameter_type === 'date' && (
                <SmartDateInput value={values[p.parameter_code] ?? ''} onChange={v => set(p.parameter_code, v)} className="h-9" />
              )}
              {p.parameter_type === 'yes-no' && (
                <Select value={values[p.parameter_code] ?? ''} onValueChange={v => set(p.parameter_code, v)}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button data-primary onClick={handleSave}>Save Parameters</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
