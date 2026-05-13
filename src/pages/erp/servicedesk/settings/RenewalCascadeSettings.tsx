/**
 * @file        src/pages/erp/servicedesk/settings/RenewalCascadeSettings.tsx
 * @purpose     Q-LOCK-10 · 4-window cascade settings · validateRenewalCascade
 * @sprint      T-Phase-1.C.1b · Block G.2
 * @iso        Functional Suitability + Usability
 */
import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  getRenewalCascadeSettings,
  updateRenewalCascadeSettings,
  validateRenewalCascade,
  type RenewalCascadeSettings as Settings,
} from '@/lib/cc-compliance-settings';

const ENTITY = 'OPRX';

export function RenewalCascadeSettings(): JSX.Element {
  const [s, setS] = useState<Settings>(getRenewalCascadeSettings(ENTITY));
  useEffect(() => setS(getRenewalCascadeSettings(ENTITY)), []);

  const v = validateRenewalCascade(s);

  const onSave = (): void => {
    try {
      updateRenewalCascadeSettings(ENTITY, s, 'current_user');
      toast.success('Saved');
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const fields: { key: keyof Pick<Settings, 'first_reminder_days' | 'second_reminder_days' | 'third_reminder_days' | 'final_reminder_days'>; label: string }[] = [
    { key: 'first_reminder_days', label: 'First (days)' },
    { key: 'second_reminder_days', label: 'Second (days)' },
    { key: 'third_reminder_days', label: 'Third (days)' },
    { key: 'final_reminder_days', label: 'Final (days)' },
  ];

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Renewal Cascade Settings</h1>
      <Card className="p-5 space-y-3">
        <div className="grid grid-cols-2 gap-4">
          {fields.map((f) => (
            <div key={f.key}>
              <Label htmlFor={f.key}>{f.label}</Label>
              <Input
                id={f.key}
                type="number"
                value={s[f.key]}
                onChange={(e) => setS({ ...s, [f.key]: Number(e.target.value) })}
              />
            </div>
          ))}
        </div>
        <p className={`text-xs ${v.valid ? 'text-success' : 'text-destructive'}`}>
          {v.valid ? 'Validation: descending ✓' : v.error}
        </p>
      </Card>
      <Card className="p-5 space-y-2">
        <h2 className="font-semibold">OEM overrides</h2>
        <p className="text-xs text-muted-foreground">
          {Object.keys(s.oem_overrides).length} configured · Phase 2 expands editor.
        </p>
      </Card>
      <Card className="p-5 space-y-2">
        <h2 className="font-semibold">Customer-class overrides</h2>
        <p className="text-xs text-muted-foreground">
          {Object.keys(s.customer_class_overrides).length} configured · Phase 2 expands editor.
        </p>
      </Card>
      <div className="flex justify-end">
        <Button onClick={onSave} disabled={!v.valid}>Save</Button>
      </div>
    </div>
  );
}
