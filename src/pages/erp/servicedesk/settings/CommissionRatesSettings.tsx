/**
 * @file        src/pages/erp/servicedesk/settings/CommissionRatesSettings.tsx
 * @purpose     Commission Rates settings UI · consumes READ-ONLY getCommissionRateSettings + updateCommissionRateSettings
 * @sprint      T-Phase-1.C.2 · Block B.1 · MOAT #24 banking
 * @iso        Functional Suitability + Maintainability + Reliability
 */
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  getCommissionRateSettings,
  updateCommissionRateSettings,
} from '@/lib/cc-compliance-settings';

const E = 'DEMO';

export function CommissionRatesSettings(): JSX.Element {
  const [settings, setSettings] = useState(() => getCommissionRateSettings(E));

  function save(): void {
    try {
      const next = updateCommissionRateSettings(E, settings, 'admin');
      setSettings(next);
      toast.success('Commission rates saved');
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <div className="p-6 space-y-4 max-w-3xl">
      <h1 className="text-xl font-bold">Commission Rates</h1>
      <Card className="p-4 space-y-3">
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <Label>Salesman Default %</Label>
            <Input
              type="number"
              step="0.1"
              value={settings.salesman_default_rate}
              onChange={(e) =>
                setSettings({ ...settings, salesman_default_rate: Number(e.target.value) })
              }
            />
          </div>
          <div className="space-y-1">
            <Label>Receiver Default %</Label>
            <Input
              type="number"
              step="0.1"
              value={settings.receiver_default_rate}
              onChange={(e) =>
                setSettings({ ...settings, receiver_default_rate: Number(e.target.value) })
              }
            />
          </div>
          <div className="space-y-1">
            <Label>AMC Default %</Label>
            <Input
              type="number"
              step="0.1"
              value={settings.amc_default_rate}
              onChange={(e) =>
                setSettings({ ...settings, amc_default_rate: Number(e.target.value) })
              }
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Branch overrides: {Object.keys(settings.branch_overrides).length} configured.
        </p>
        <div className="flex justify-end">
          <Button onClick={save}>Save All</Button>
        </div>
      </Card>
    </div>
  );
}

export default CommissionRatesSettings;
