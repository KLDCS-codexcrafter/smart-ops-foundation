/**
 * @file        src/pages/erp/servicedesk/settings/TellicallerTriggersSettings.tsx
 * @purpose     Tellicaller Trigger settings UI · 4-stage cascade · consumes READ-ONLY getTellicallerTriggerSettings
 * @sprint      T-Phase-1.C.2 · Block B.3 · MOAT #24 banking
 * @iso        Functional Suitability + Maintainability
 */
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  getTellicallerTriggerSettings,
  updateTellicallerTriggerSettings,
} from '@/lib/cc-compliance-settings';

const E = 'DEMO';

export function TellicallerTriggersSettings(): JSX.Element {
  const [settings, setSettings] = useState(() => getTellicallerTriggerSettings(E));

  function save(): void {
    const next = updateTellicallerTriggerSettings(E, settings, 'admin');
    setSettings(next);
    toast.success('Tellicaller triggers saved');
  }

  function updateTrigger(idx: number, days: number): void {
    const triggers = settings.triggers.map((t, i) => (i === idx ? { ...t, trigger_at_days: days } : t));
    setSettings({ ...settings, triggers });
  }

  return (
    <div className="p-6 space-y-4 max-w-3xl">
      <h1 className="text-xl font-bold">Tellicaller Triggers</h1>
      {settings.triggers.length === 0 && (
        <Card className="p-4 text-sm text-muted-foreground">No triggers configured.</Card>
      )}
      {settings.triggers.map((t, idx) => (
        <Card key={t.trigger_id} className="p-4 grid grid-cols-3 gap-3 items-end">
          <div className="space-y-1">
            <Label>{t.trigger_name}</Label>
            <p className="text-xs text-muted-foreground">{t.script_id} · {t.assignment_rule}</p>
          </div>
          <div className="space-y-1">
            <Label>Trigger at days</Label>
            <Input
              type="number"
              value={t.trigger_at_days}
              onChange={(e) => updateTrigger(idx, Number(e.target.value))}
            />
          </div>
          <div className="text-xs text-muted-foreground">
            Lang: {t.language_pref} · OEM overrides: {Object.keys(t.oem_overrides ?? {}).length}
          </div>
        </Card>
      ))}
      <div className="flex justify-end">
        <Button onClick={save}>Save All</Button>
      </div>
    </div>
  );
}

export default TellicallerTriggersSettings;
