/**
 * @file        src/pages/erp/comply360/exim/foreign-tax/EqualisationLevyPage.tsx
 * @purpose     Sprint 77b · Equalisation Levy (Form 1) digital-services surface.
 * @sprint      Sprint 77b · T-Phase-5.A.1.9-PASS-B · Block 5
 * @disciplines FR-7 · FR-13 · FR-19 (engine 0-DIFF)
 */
import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building, RefreshCcw } from 'lucide-react';
import { toast } from 'sonner';
import { useEntityCode } from '@/hooks/useEntityCode';
import {
  computeEqualisationLevy,
  loadEqualisationLevyFilings,
  EQUALISATION_LEVY_RATE_PCT,
} from '@/lib/comply360-transfer-pricing-engine';

function inr(n: number): string { return '₹' + n.toLocaleString('en-IN'); }

export default function EqualisationLevyPage(): JSX.Element {
  const { entityCode, entityId } = useEntityCode();
  const [fy, setFy] = useState('FY25-26');
  const [consideration, setConsideration] = useState('1850000');
  const [tick, setTick] = useState(0);

  const filings = useMemo(() => {
    if (!entityCode) return [];
    return loadEqualisationLevyFilings(entityCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityCode, tick]);

  if (!entityId || entityId === 'all') {
    return (
      <div className="p-6">
        <Card className="p-12 text-center">
          <Building className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-lg font-semibold mb-2">Select a company to continue</h2>
        </Card>
      </div>
    );
  }

  const handleCompute = (): void => {
    const c = Number(consideration) || 0;
    const f = computeEqualisationLevy(entityCode, fy, c);
    setTick(t => t + 1);
    toast.success(`Levy ${inr(f.levy_amount_inr)} computed @ ${EQUALISATION_LEVY_RATE_PCT}%`);
  };

  const total = filings
    .filter(f => f.financial_year === fy)
    .reduce((s, f) => s + f.levy_amount_inr, 0);

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Equalisation Levy · Form 1 (Sec 165)</h1>
        <p className="text-muted-foreground text-sm">
          {EQUALISATION_LEVY_RATE_PCT}% on specified digital-services consideration paid to non-resident e-commerce operators.
        </p>
      </div>

      <Card className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div><Label className="text-xs">Financial Year</Label><Input value={fy} onChange={(e) => setFy(e.target.value)} className="font-mono" /></div>
        <div><Label className="text-xs">Taxable Consideration (₹)</Label><Input value={consideration} onChange={(e) => setConsideration(e.target.value)} className="font-mono" /></div>
        <div className="flex items-end gap-2">
          <Button onClick={handleCompute}>Compute & Record</Button>
          <Button variant="outline" size="sm" onClick={() => setTick(t => t + 1)}><RefreshCcw className="h-4 w-4" /></Button>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold uppercase text-muted-foreground">Filings ({filings.length})</h2>
          <Badge className="font-mono">FY total: {inr(total)}</Badge>
        </div>
        {filings.length === 0 ? (
          <div className="text-xs text-muted-foreground">No levy entries yet.</div>
        ) : (
          <div className="space-y-2">
            {filings.slice().reverse().map(f => (
              <div key={f.id} className="border-b py-2 last:border-0 flex items-center justify-between">
                <div>
                  <div className="font-mono text-xs">{f.id}</div>
                  <div className="text-xs text-muted-foreground">{f.financial_year} · consideration {inr(f.taxable_consideration_inr)}</div>
                </div>
                <Badge variant="outline" className="font-mono">{inr(f.levy_amount_inr)}</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
