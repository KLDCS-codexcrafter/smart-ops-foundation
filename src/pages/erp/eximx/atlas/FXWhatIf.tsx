/**
 * @file        src/pages/erp/eximx/atlas/FXWhatIf.tsx
 * @purpose     FX scenario simulator UI · saves scenarios · consumes engines READ-ONLY
 * @sprint      T-Phase-1.EX-11-Atlas-FULL-BCD-FXWhatIf-BoardPack
 * @decisions   EX-11-Q3=a SCENARIO SIMULATOR · Q11=a localStorage persistence
 * @disciplines FR-30 · FR-50 · FR-58
 */
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrendingUp, TrendingDown, Save } from 'lucide-react';
import { computeFXScenarioForRealisation, saveScenario, loadFXScenarios } from '@/lib/fx-what-if-engine';
import { loadRealisations } from '@/lib/export-realisation-engine';
import type { FXScenario } from '@/types/fx-scenario';
import type { FXWhatIfOutput } from '@/lib/fx-what-if-engine';

export function FXWhatIf(): JSX.Element {
  const entityCode = 'sinha-trading';
  const [realisations] = useState(loadRealisations(entityCode));
  const [selectedId, setSelectedId] = useState(realisations[0]?.id ?? '');
  const [rateChangePct, setRateChangePct] = useState(5);
  const [output, setOutput] = useState<FXWhatIfOutput | null>(null);
  const [scenarios, setScenarios] = useState<FXScenario[]>([]);
  const [label, setLabel] = useState('');

  useEffect(() => { setScenarios(loadFXScenarios(entityCode)); }, []);

  const handleCompute = (): void => {
    const result = computeFXScenarioForRealisation(entityCode, selectedId, rateChangePct);
    setOutput(result);
  };

  const handleSave = (): void => {
    if (!output || !label.trim() || !selectedId) return;
    const r = realisations.find((x) => x.id === selectedId);
    if (!r) return;
    saveScenario(entityCode, { target_kind: 'realisation', target_id: selectedId, rate_change_pct: rateChangePct, scenario_label: label }, output, r.realisation_no, 'CFO Sinha', '');
    setScenarios(loadFXScenarios(entityCode));
    setLabel('');
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h2 className="text-xl font-bold"><TrendingUp className="w-5 h-5 inline mr-2" />FX What-If · Rate Scenario Simulator</h2>
        <p className="text-sm text-muted-foreground">Pick realisation + rate change → recompute INR + FEMA impact · saves scenarios</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Scenario Input</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>Realisation</Label>
            <select className="w-full border rounded p-2 text-sm bg-background" value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
              {realisations.map((r) => <option key={r.id} value={r.id}>{r.realisation_no} · {r.currency_code} · {r.fema_state}</option>)}
            </select>
          </div>
          <div><Label>Rate Change %</Label><Input type="number" value={rateChangePct} onChange={(e) => setRateChangePct(Number(e.target.value))} /></div>
          <div className="flex items-end"><Button onClick={handleCompute}>Compute Scenario</Button></div>
        </CardContent>
      </Card>

      {output && (
        <Card>
          <CardHeader><CardTitle>{rateChangePct >= 0 ? <><TrendingUp className="w-4 h-4 inline mr-2 text-green-600" />Upside Scenario</> : <><TrendingDown className="w-4 h-4 inline mr-2 text-red-600" />Downside Scenario</>}</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div><strong>Base Rate ({output.base_currency}):</strong> <span className="font-mono">₹{output.base_rate_inr}</span></div>
              <div><strong>Scenario Rate ({output.base_currency}):</strong> <span className="font-mono">₹{output.scenario_rate_inr}</span></div>
              <div><strong>Base Amount:</strong> <span className="font-mono">₹{output.base_amount_inr.toLocaleString()}</span></div>
              <div><strong>Scenario Amount:</strong> <span className="font-mono">₹{output.scenario_amount_inr.toLocaleString()}</span></div>
              <div className={output.delta_inr >= 0 ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}><strong>Delta:</strong> <span className="font-mono">₹{output.delta_inr.toLocaleString()} ({output.delta_pct}%)</span></div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">{output.impact_summary}</p>
            <div className="mt-4 flex flex-col md:flex-row gap-2 md:items-end">
              <div className="flex-1"><Label>Scenario Label</Label><Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. USD up 5%" /></div>
              <Button onClick={handleSave} disabled={!label.trim()}><Save className="w-4 h-4 mr-2" />Save</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Saved Scenarios ({scenarios.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Scenario No</TableHead><TableHead>Target</TableHead><TableHead>Label</TableHead><TableHead className="text-right">Δ%</TableHead><TableHead className="text-right">Δ (₹)</TableHead></TableRow></TableHeader>
            <TableBody>
              {scenarios.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-mono text-xs">{s.scenario_no}</TableCell>
                  <TableCell className="text-xs">{s.target_ref}</TableCell>
                  <TableCell className="text-xs">{s.scenario_label}</TableCell>
                  <TableCell className="text-right font-mono">{s.delta_pct}%</TableCell>
                  <TableCell className={`text-right font-mono ${s.delta_inr >= 0 ? 'text-green-600' : 'text-red-600'}`}>{s.delta_inr.toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
