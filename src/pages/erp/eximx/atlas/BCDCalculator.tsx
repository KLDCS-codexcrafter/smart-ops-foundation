/**
 * @file        src/pages/erp/eximx/atlas/BCDCalculator.tsx
 * @purpose     Interactive BCD modeling UI · saves snapshots · consumes duty-waterfall-engine READ-ONLY
 * @sprint      T-Phase-1.EX-11-Atlas-FULL-BCD-FXWhatIf-BoardPack
 * @decisions   EX-11-Q2=a STANDALONE · Q10=a FR-26 persistence
 * @disciplines FR-30 · FR-50 · FR-58
 */
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calculator, Save } from 'lucide-react';
import { computeBCDCalculation, saveSnapshot, loadBCDSnapshots } from '@/lib/bcd-calculator-engine';
import type { BCDCalcSnapshot } from '@/types/bcd-calc-snapshot';
import type { BCDCalcOutput } from '@/lib/bcd-calculator-engine';

export function BCDCalculator(): JSX.Element {
  const entityCode = 'sinha-steel';
  const [cthCode, setCthCode] = useState('7208');
  const [countryCode, setCountryCode] = useState('CN');
  const [cifValueInr, setCifValueInr] = useState(1000000);
  const [effectiveDate] = useState('2026-05-21');
  const [output, setOutput] = useState<BCDCalcOutput | null>(null);
  const [snapshots, setSnapshots] = useState<BCDCalcSnapshot[]>([]);
  const [label, setLabel] = useState('');

  useEffect(() => { setSnapshots(loadBCDSnapshots(entityCode)); }, []);

  const handleCompute = (): void => {
    const result = computeBCDCalculation(entityCode, { cth_code: cthCode, country_code: countryCode, cif_value_inr: cifValueInr, effective_date: effectiveDate, fta_treaty_code: null });
    setOutput(result);
  };

  const handleSave = (): void => {
    if (!output || !label.trim()) return;
    saveSnapshot(entityCode, { cth_code: cthCode, country_code: countryCode, cif_value_inr: cifValueInr, effective_date: effectiveDate, fta_treaty_code: null }, output, label, 'CFO Sinha', '');
    setSnapshots(loadBCDSnapshots(entityCode));
    setLabel('');
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h2 className="text-xl font-bold"><Calculator className="w-5 h-5 inline mr-2" />BCD Calculator · Interactive Duty Modeling</h2>
        <p className="text-sm text-muted-foreground">CTH × Country × CIF → full duty waterfall · saves snapshots for comparison</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Input</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div><Label>CTH Code</Label><Input value={cthCode} onChange={(e) => setCthCode(e.target.value)} /></div>
          <div><Label>Country</Label><Input value={countryCode} onChange={(e) => setCountryCode(e.target.value)} /></div>
          <div><Label>CIF (₹)</Label><Input type="number" value={cifValueInr} onChange={(e) => setCifValueInr(Number(e.target.value))} /></div>
          <div className="flex items-end"><Button onClick={handleCompute}>Compute</Button></div>
        </CardContent>
      </Card>

      {output && (
        <Card>
          <CardHeader><CardTitle>Duty Waterfall</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Component</TableHead><TableHead className="text-right">Amount (₹)</TableHead></TableRow></TableHeader>
              <TableBody>
                <TableRow><TableCell>BCD</TableCell><TableCell className="text-right font-mono">{output.bcd_inr.toLocaleString()}</TableCell></TableRow>
                <TableRow><TableCell>SWS</TableCell><TableCell className="text-right font-mono">{output.sws_inr.toLocaleString()}</TableCell></TableRow>
                <TableRow><TableCell>IGST</TableCell><TableCell className="text-right font-mono">{output.igst_inr.toLocaleString()}</TableCell></TableRow>
                <TableRow><TableCell>Comp Cess</TableCell><TableCell className="text-right font-mono">{output.comp_cess_inr.toLocaleString()}</TableCell></TableRow>
                <TableRow><TableCell>Anti-Dumping</TableCell><TableCell className="text-right font-mono">{output.anti_dumping_inr.toLocaleString()}</TableCell></TableRow>
                <TableRow><TableCell>Safeguard</TableCell><TableCell className="text-right font-mono">{output.safeguard_inr.toLocaleString()}</TableCell></TableRow>
                <TableRow><TableCell>Landing</TableCell><TableCell className="text-right font-mono">{output.landing_inr.toLocaleString()}</TableCell></TableRow>
                <TableRow className="font-bold"><TableCell>Total Custom Duty</TableCell><TableCell className="text-right font-mono">{output.total_custom_duty_inr.toLocaleString()}</TableCell></TableRow>
                <TableRow className="font-bold"><TableCell>Total Landed Value</TableCell><TableCell className="text-right font-mono">{output.total_landed_value_inr.toLocaleString()}</TableCell></TableRow>
                <TableRow><TableCell>Effective Rate %</TableCell><TableCell className="text-right font-mono">{output.effective_rate_pct}%</TableCell></TableRow>
              </TableBody>
            </Table>
            <div className="mt-4 flex flex-col md:flex-row gap-2 md:items-end">
              <div className="flex-1"><Label>Snapshot Label</Label><Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. China steel baseline" /></div>
              <Button onClick={handleSave} disabled={!label.trim()}><Save className="w-4 h-4 mr-2" />Save</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Saved Snapshots ({snapshots.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Snapshot No</TableHead><TableHead>Label</TableHead><TableHead>CTH×Country</TableHead><TableHead className="text-right">CIF</TableHead><TableHead className="text-right">Duty</TableHead><TableHead className="text-right">Eff %</TableHead></TableRow></TableHeader>
            <TableBody>
              {snapshots.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-mono text-xs">{s.snapshot_no}</TableCell>
                  <TableCell className="text-xs">{s.scenario_label}</TableCell>
                  <TableCell className="text-xs">{s.cth_code} × {s.country_code}</TableCell>
                  <TableCell className="text-right font-mono">{s.cif_value_inr.toLocaleString()}</TableCell>
                  <TableCell className="text-right font-mono">{s.total_custom_duty_inr.toLocaleString()}</TableCell>
                  <TableCell className="text-right font-mono">{s.cif_value_inr > 0 ? Math.round((s.total_custom_duty_inr / s.cif_value_inr) * 10000) / 100 : 0}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
