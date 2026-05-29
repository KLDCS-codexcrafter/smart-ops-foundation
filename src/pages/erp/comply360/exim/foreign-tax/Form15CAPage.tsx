/**
 * @file        src/pages/erp/comply360/exim/foreign-tax/Form15CAPage.tsx
 * @purpose     Sprint 77b · Form 15CA / 15CB foreign-remittance certificate surface.
 *              Reads form-15ca-15cb-engine (read-only §H boundary).
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
import { useEntityCode } from '@/hooks/useEntityCode';
import { loadForm15CAs, classifyForm15CAPart } from '@/lib/form-15ca-15cb-engine';
import { FORM_15CA_PART_DESCRIPTIONS } from '@/types/form-15ca-15cb';

function inr(n: number): string { return '₹' + n.toLocaleString('en-IN'); }

export default function Form15CAPage(): JSX.Element {
  const { entityCode, entityId } = useEntityCode();
  const [tick, setTick] = useState(0);
  const [amount, setAmount] = useState('850000');
  const [dtaa, setDtaa] = useState(false);
  const [aoCert, setAoCert] = useState(false);

  const submissions = useMemo(() => {
    if (!entityCode) return [];
    return loadForm15CAs(entityCode);
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

  const part = classifyForm15CAPart(Number(amount) || 0, dtaa, aoCert);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Form 15CA / 15CB · Foreign Remittance Certificate</h1>
          <p className="text-muted-foreground text-sm">CBDT Part A/B/C/D classifier · CA digital signature workflow.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setTick(t => t + 1)}>
          <RefreshCcw className="h-4 w-4 mr-1" /> Refresh
        </Button>
      </div>

      <Card className="p-4">
        <h2 className="text-sm font-semibold uppercase text-muted-foreground mb-3">Part Classifier</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          <div><Label className="text-xs">Amount (₹)</Label><Input value={amount} onChange={(e) => setAmount(e.target.value)} className="font-mono" /></div>
          <div className="flex items-center gap-2 pt-5">
            <input type="checkbox" checked={dtaa} onChange={(e) => setDtaa(e.target.checked)} /> <Label>DTAA exempt</Label>
          </div>
          <div className="flex items-center gap-2 pt-5">
            <input type="checkbox" checked={aoCert} onChange={(e) => setAoCert(e.target.checked)} /> <Label>AO certificate</Label>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge className="bg-primary font-mono">{part}</Badge>
          <span className="text-xs text-muted-foreground">{FORM_15CA_PART_DESCRIPTIONS[part]}</span>
        </div>
      </Card>

      <Card className="p-4">
        <h2 className="text-sm font-semibold uppercase text-muted-foreground mb-2">Submissions ({submissions.length})</h2>
        {submissions.length === 0 ? (
          <div className="text-xs text-muted-foreground">No 15CA submissions yet.</div>
        ) : (
          <div className="space-y-2">
            {submissions.slice(0, 20).map(s => (
              <div key={s.id} className="border-b py-2 last:border-0 flex items-center justify-between">
                <div>
                  <div className="font-mono text-sm">{s.form_15ca_ref}</div>
                  <div className="text-xs text-muted-foreground">{s.part} · {s.rbi_purpose_code} · {s.currency_code} · TDS {s.tds_rate_pct}%</div>
                </div>
                <div className="flex gap-2 items-center">
                  <Badge variant="outline" className="font-mono">{inr(s.amount_inr)}</Badge>
                  <Badge variant="secondary">{s.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
