/**
 * @file        src/pages/erp/servicedesk/settings/RiskEngineSettings.tsx
 * @purpose     Q-LOCK-7 · 5 weight sliders + 2 thresholds + recompute on save
 * @sprint      T-Phase-1.C.1b · Block G.1
 * @iso        Functional Suitability + Usability
 */
import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import {
  getRiskEngineSettings,
  updateRiskEngineSettings,
  validateRiskWeights,
  type RiskEngineSettings as Settings,
} from '@/lib/cc-compliance-settings';
import { recomputeAllAMCRiskScores } from '@/lib/servicedesk-engine';

const ENTITY = 'OPRX';

export function RiskEngineSettings(): JSX.Element {
  const [s, setS] = useState<Settings>(getRiskEngineSettings(ENTITY));

  useEffect(() => setS(getRiskEngineSettings(ENTITY)), []);

  const sumCheck = validateRiskWeights(s.risk_factor_weights);

  const setW = (key: keyof Settings['risk_factor_weights'], v: number): void => {
    setS({ ...s, risk_factor_weights: { ...s.risk_factor_weights, [key]: v } });
  };

  const onSave = (): void => {
    try {
      updateRiskEngineSettings(ENTITY, s, 'current_user');
      const r = recomputeAllAMCRiskScores(ENTITY, 'current_user');
      toast.success(`Saved · recomputed ${r.recomputed} AMCs`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const fields: { key: keyof Settings['risk_factor_weights']; label: string }[] = [
    { key: 'payment_history', label: 'Payment History' },
    { key: 'expiry_proximity', label: 'Expiry Proximity' },
    { key: 'contract_value', label: 'Contract Value' },
    { key: 'service_status', label: 'Service Status' },
    { key: 'customer_activity', label: 'Customer Activity' },
  ];

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Risk Engine Settings</h1>
      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Factor weights</h2>
          <span className={`text-sm font-mono ${sumCheck.valid ? 'text-success' : 'text-destructive'}`}>
            sum = {sumCheck.sum} {sumCheck.valid ? '✓' : '✗'}
          </span>
        </div>
        {fields.map((f) => (
          <div key={f.key} className="space-y-2">
            <div className="flex justify-between text-sm">
              <Label>{f.label}</Label>
              <span className="font-mono">{s.risk_factor_weights[f.key]}</span>
            </div>
            <Slider
              value={[s.risk_factor_weights[f.key]]}
              min={0}
              max={50}
              step={1}
              onValueChange={(v) => setW(f.key, v[0] ?? 0)}
            />
          </div>
        ))}
      </Card>
      <Card className="p-5 space-y-3">
        <h2 className="font-semibold">Thresholds</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="th-h">High threshold</Label>
            <Input id="th-h" type="number" value={s.risk_threshold_high}
              onChange={(e) => setS({ ...s, risk_threshold_high: Number(e.target.value) })} />
          </div>
          <div>
            <Label htmlFor="th-m">Medium threshold</Label>
            <Input id="th-m" type="number" value={s.risk_threshold_medium}
              onChange={(e) => setS({ ...s, risk_threshold_medium: Number(e.target.value) })} />
          </div>
        </div>
      </Card>
      <div className="flex justify-end">
        <Button onClick={onSave} disabled={!sumCheck.valid || s.risk_threshold_high <= s.risk_threshold_medium}>
          Save and recompute
        </Button>
      </div>
    </div>
  );
}
