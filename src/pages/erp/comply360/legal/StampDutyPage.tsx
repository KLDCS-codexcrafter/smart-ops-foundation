/**
 * @file        src/pages/erp/comply360/legal/StampDutyPage.tsx
 * @purpose     Sprint 76b · Stamp Duty register surface · consumes Pass A stamp-duty-engine.
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
import { Scroll, RefreshCcw, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { useEntityCode } from '@/hooks/useEntityCode';
import {
  computeStampDuty,
  recordInstrument,
  loadStampRegister,
  STATE_RATES,
  type InstrumentType,
  type IndianStateCode,
} from '@/lib/comply360-stamp-duty-engine';

const INSTRUMENTS: InstrumentType[] = [
  'sale_deed', 'lease_agreement', 'mortgage_deed', 'gift_deed',
  'partnership_deed', 'shareholders_agreement', 'loan_agreement',
];

function inr(n: number): string {
  return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

export default function StampDutyPage(): JSX.Element {
  const { entityCode, entityId } = useEntityCode();
  const [state, setState] = useState<IndianStateCode>('MH');
  const [instrument, setInstrument] = useState<InstrumentType>('sale_deed');
  const [consideration, setConsideration] = useState('2500000');
  const [execDate, setExecDate] = useState('2026-05-15');
  const [parties, setParties] = useState('Sinha Industries; Amith Enterprises');
  const [refNo, setRefNo] = useState('SD/2026/MH/0042');
  const [tick, setTick] = useState(0);

  const register = useMemo(() => {
    if (!entityCode) return [];
    return loadStampRegister(entityCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityCode, tick]);

  const states = Object.keys(STATE_RATES) as IndianStateCode[];
  const preview = computeStampDuty(
    { instrument_type: instrument, consideration_value: Number(consideration) || 0 },
    state,
  );

  if (!entityId || entityId === 'all') {
    return (
      <div className="p-6">
        <Card className="p-12 text-center">
          <Scroll className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-lg font-semibold mb-2">Select a company to continue</h2>
          <p className="text-muted-foreground">Choose an entity to view the stamp-duty register.</p>
        </Card>
      </div>
    );
  }

  const handleRecord = (): void => {
    const row = recordInstrument({
      entity_code: entityCode,
      instrument_type: instrument,
      state_code: state,
      consideration_value: Number(consideration) || 0,
      execution_date: execDate,
      parties: parties.split(';').map(p => p.trim()).filter(Boolean),
      reference_no: refNo,
    });
    setTick(t => t + 1);
    toast.success(`Recorded ${row.id} · duty ${inr(row.computation.stamp_duty)}`);
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Stamp Duty Register</h1>
          <p className="text-muted-foreground text-sm">State × instrument duty + registration fee · 10 states · 7 instruments.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setTick(t => t + 1)}>
          <RefreshCcw className="h-4 w-4 mr-1" /> Refresh
        </Button>
      </div>

      <Card className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <Label className="text-xs">State</Label>
          <Select value={state} onValueChange={(v) => setState(v as IndianStateCode)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{states.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Instrument</Label>
          <Select value={instrument} onValueChange={(v) => setInstrument(v as InstrumentType)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{INSTRUMENTS.map(i => <SelectItem key={i} value={i}>{i.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Consideration (₹)</Label>
          <Input value={consideration} onChange={(e) => setConsideration(e.target.value)} className="font-mono" />
        </div>
        <div><Label className="text-xs">Execution Date</Label><Input type="date" value={execDate} onChange={(e) => setExecDate(e.target.value)} /></div>
        <div><Label className="text-xs">Reference No</Label><Input value={refNo} onChange={(e) => setRefNo(e.target.value)} className="font-mono" /></div>
        <div className="md:col-span-1"><Label className="text-xs">Parties (semicolon-sep)</Label><Input value={parties} onChange={(e) => setParties(e.target.value)} /></div>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase">Rate</div>
          <div className="text-xl font-mono font-semibold mt-1">{preview.rate_percent}%</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase">Stamp Duty</div>
          <div className="text-xl font-mono font-semibold mt-1">{inr(preview.stamp_duty)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase">Registration Fee</div>
          <div className="text-xl font-mono font-semibold mt-1">{inr(preview.registration_fee)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase">Total Payable</div>
          <div className="text-xl font-mono font-semibold mt-1 text-emerald-600">{inr(preview.total_payable)}</div>
        </Card>
      </div>

      <Button onClick={handleRecord}>Record Instrument</Button>

      <Card className="p-4">
        <h2 className="text-sm font-semibold uppercase text-muted-foreground mb-2">Register ({register.length} instruments)</h2>
        {register.length === 0 ? (
          <div className="text-xs text-muted-foreground">No instruments recorded for {entityCode}.</div>
        ) : (
          <div className="space-y-2">
            {register.slice().reverse().map(r => (
              <div key={r.id} className="flex items-center justify-between border-b py-2 last:border-0 text-sm">
                <div>
                  <div className="font-mono">{r.id}</div>
                  <div className="text-xs text-muted-foreground">
                    {r.state_code} · {r.instrument_type.replace(/_/g, ' ')} · {r.execution_date} · {r.parties.join(' / ')}
                  </div>
                </div>
                <Badge className="bg-emerald-600 hover:bg-emerald-700 font-mono">
                  <CheckCircle2 className="h-3 w-3 mr-1" />{inr(r.computation.total_payable)}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
