/**
 * @file        src/pages/erp/comply360/environmental/Form5AnnualStatementPage.tsx
 * @purpose     Form 5 Annual Environmental Statement generator · 16th First-Class Standalone Page (sub-page)
 * @sprint      Sprint 90 · T-Phase-5.F.5.2 · DP-F5-2 · Q34
 */
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { recordForm5Statement } from '@/lib/comply360-environmental-engine';
import { getActiveBAPAccount } from '@/lib/comply360-audit-framework-engine';
import { toast } from 'sonner';

export default function Form5AnnualStatementPage(): JSX.Element {
  const [fy, setFy] = useState('FY25-26');
  const [premisesId, setPremisesId] = useState('P1');
  const [waterConsumption, setWaterConsumption] = useState(0);
  const [rawMaterial, setRawMaterial] = useState(0);
  const [hazardousWaste, setHazardousWaste] = useState(0);

  const handleGenerate = (): void => {
    const bap = getActiveBAPAccount();
    const stmt = recordForm5Statement({
      fy, premises_id: premisesId,
      water_consumption_kld: waterConsumption,
      raw_material_consumption_mt: rawMaterial,
      pollution_load_summary: 'Auto-generated from MaintainPro + Production data',
      hazardous_waste_generated_mt: hazardousWaste,
      filed_date: new Date().toISOString(),
      filing_status: 'draft',
    }, bap);
    toast.success(`Form 5 draft generated · ${stmt.id}`);
  };

  return (
    <div className="p-6 space-y-4">
      <header>
        <h1 className="text-2xl font-bold">Form 5 · Annual Environmental Statement</h1>
        <p className="text-sm text-muted-foreground">
          Auto-populate from MaintainPro / Production data · EP Act 1986 · Rule 14
        </p>
      </header>
      <Card className="p-4 space-y-3 max-w-xl">
        <div>
          <label className="text-xs text-muted-foreground">Financial Year</label>
          <Input value={fy} onChange={(e) => setFy(e.target.value)} placeholder="FY25-26" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Premises ID</label>
          <Input value={premisesId} onChange={(e) => setPremisesId(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Water consumption (KLD)</label>
          <Input type="number" value={waterConsumption} onChange={(e) => setWaterConsumption(Number(e.target.value))} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Raw material consumption (MT)</label>
          <Input type="number" value={rawMaterial} onChange={(e) => setRawMaterial(Number(e.target.value))} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Hazardous waste generated (MT)</label>
          <Input type="number" value={hazardousWaste} onChange={(e) => setHazardousWaste(Number(e.target.value))} />
        </div>
        <Button onClick={handleGenerate}>Generate Form 5 Draft</Button>
      </Card>
    </div>
  );
}
