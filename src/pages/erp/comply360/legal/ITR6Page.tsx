/**
 * @file        src/pages/erp/comply360/legal/ITR6Page.tsx
 * @purpose     Sprint 76b · ITR-6 (company income-tax return) surface · consumes Pass A itr6-engine.
 * @sprint      Sprint 76b · T-Phase-5.A.1.8-PASS-B · Block 6
 * @disciplines FR-7 · FR-13 · FR-19 (engine 0-DIFF) · FR-91
 */
import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building, AlertTriangle, CheckCircle2, Download, RefreshCcw } from 'lucide-react';
import { toast } from 'sonner';
import { useEntityCode } from '@/hooks/useEntityCode';
import {
  buildITR6,
  listITR6Returns,
  validateITR6,
  type CompanyTaxRegime,
} from '@/lib/comply360-itr6-engine';

const REGIMES: CompanyTaxRegime[] = ['standard', 'section_115BAA', 'section_115BAB'];

function inr(n: number): string {
  return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

export default function ITR6Page(): JSX.Element {
  const { entityCode, entityId } = useEntityCode();
  const [fy, setFy] = useState('FY25-26');
  const [pbt, setPbt] = useState('12500000');
  const [addback, setAddback] = useState('450000');
  const [deduction, setDeduction] = useState('120000');
  const [regime, setRegime] = useState<CompanyTaxRegime>('section_115BAA');
  const [tick, setTick] = useState(0);

  const returns = useMemo(() => {
    if (!entityCode) return [];
    return listITR6Returns(entityCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityCode, tick]);

  if (!entityId || entityId === 'all') {
    return (
      <div className="p-6">
        <Card className="p-12 text-center">
          <Building className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-lg font-semibold mb-2">Select a company to continue</h2>
          <p className="text-muted-foreground">Choose an entity to build ITR-6.</p>
        </Card>
      </div>
    );
  }

  const handleBuild = (): void => {
    const ret = buildITR6(entityCode, fy, {
      profit_before_tax_books: Number(pbt) || 0,
      add_disallowed_expenses: Number(addback) || 0,
      less_allowable_deductions: Number(deduction) || 0,
      depreciation_blocks_dpm: [
        { block_name: 'Plant & Machinery 15%', rate_percent: 15, opening_wdv: 8500000, additions: 1200000, deletions: 0 },
        { block_name: 'Computers 40%', rate_percent: 40, opening_wdv: 650000, additions: 380000, deletions: 0 },
      ],
      depreciation_blocks_doa: [
        { block_name: 'Factory Building 10%', rate_percent: 10, opening_wdv: 22000000, additions: 0, deletions: 0 },
      ],
      capital_gains: [
        { asset_description: 'Listed equity (STCG)', gain_type: 'short_term', sale_consideration: 850000, cost_of_acquisition: 720000 },
      ],
      regime,
    });
    setTick(t => t + 1);
    const v = validateITR6(ret);
    if (v.ok) toast.success(`ITR-6 ${ret.return_id} built`);
    else toast.error(`Validation: ${v.errors.join(', ')}`);
  };

  const handleDownload = (ret: typeof returns[number]): void => {
    const blob = new Blob([JSON.stringify(ret, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${ret.return_id.replace(/\//g, '_')}.json`; a.click();
    URL.revokeObjectURL(url);
    toast.success('ITR-6 JSON downloaded');
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">ITR-6 · Company Income-tax Return</h1>
          <p className="text-muted-foreground text-sm">Schedules BP · DPM · DOA · CG · regime-aware tax computation.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setTick(t => t + 1)}>
          <RefreshCcw className="h-4 w-4 mr-1" /> Refresh
        </Button>
      </div>

      <Card className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div><Label className="text-xs">FY</Label><Input value={fy} onChange={(e) => setFy(e.target.value)} className="font-mono" /></div>
        <div>
          <Label className="text-xs">Regime</Label>
          <Select value={regime} onValueChange={(v) => setRegime(v as CompanyTaxRegime)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{REGIMES.map(r => <SelectItem key={r} value={r}>{r.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div />
        <div><Label className="text-xs">Profit Before Tax (₹)</Label><Input value={pbt} onChange={(e) => setPbt(e.target.value)} className="font-mono" /></div>
        <div><Label className="text-xs">Add: Disallowed Expenses (₹)</Label><Input value={addback} onChange={(e) => setAddback(e.target.value)} className="font-mono" /></div>
        <div><Label className="text-xs">Less: Allowable Deductions (₹)</Label><Input value={deduction} onChange={(e) => setDeduction(e.target.value)} className="font-mono" /></div>
      </Card>

      <Button onClick={handleBuild}>Build ITR-6</Button>

      <Card className="p-4">
        <h2 className="text-sm font-semibold uppercase text-muted-foreground mb-2">Persisted returns ({returns.length})</h2>
        {returns.length === 0 ? (
          <div className="text-xs text-muted-foreground">No ITR-6 returns yet. Build one above.</div>
        ) : (
          <div className="space-y-2">
            {returns.slice().reverse().map(r => (
              <div key={r.return_id} className="flex items-center justify-between border-b py-2 last:border-0">
                <div>
                  <div className="font-mono text-sm">{r.return_id}</div>
                  <div className="text-xs text-muted-foreground">
                    {r.fy} · {r.ay} · {r.regime} · taxable {inr(r.taxable_income)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-emerald-600 hover:bg-emerald-700 font-mono">
                    <CheckCircle2 className="h-3 w-3 mr-1" />{inr(r.tax_computation.total_tax)}
                  </Badge>
                  {r.warnings.length > 0 && (
                    <Badge variant="secondary"><AlertTriangle className="h-3 w-3 mr-1" />{r.warnings.length}</Badge>
                  )}
                  <Button size="sm" variant="outline" onClick={() => handleDownload(r)}>
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
