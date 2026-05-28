/**
 * @file        src/pages/erp/comply360/exim/EWB02Page.tsx
 * @purpose     Sprint 76b · EWB-02 consolidated e-way bill surface · consumes Pass A ewb02-consolidation-engine.
 * @sprint      Sprint 76b · T-Phase-5.A.1.8-PASS-B · Block 4 · DP-S76-3
 * @disciplines FR-7 · FR-13 · FR-19 (engine 0-DIFF) · FR-91
 */
import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RefreshCcw, Truck, AlertTriangle, CheckCircle2, FileJson } from 'lucide-react';
import { toast } from 'sonner';
import { useEntityCode } from '@/hooks/useEntityCode';
import { loadEWayBills } from '@/lib/comply360-eway-engine';
import { buildEWB02, groupEWBsByVehicle, type ConveyanceMeta } from '@/lib/comply360-ewb02-consolidation-engine';

function inr(n: number): string {
  return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

export default function EWB02Page(): JSX.Element {
  const { entityCode, entityId } = useEntityCode();
  const [vehicleNo, setVehicleNo] = useState('');
  const [fromState, setFromState] = useState('27');
  const [toState, setToState] = useState('29');
  const [fromPlace, setFromPlace] = useState('Mumbai');
  const [toPlace, setToPlace] = useState('Bengaluru');
  const [tick, setTick] = useState(0);

  const ewbs = useMemo(() => {
    if (!entityCode) return [];
    return loadEWayBills(entityCode, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityCode, tick]);

  const groups = useMemo(() => groupEWBsByVehicle(ewbs), [ewbs]);
  const vehiclesAvailable = Array.from(groups.keys());

  if (!entityId || entityId === 'all') {
    return (
      <div className="p-6">
        <Card className="p-12 text-center">
          <Truck className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-lg font-semibold mb-2">Select a company to continue</h2>
          <p className="text-muted-foreground">Choose an entity to consolidate EWBs into EWB-02.</p>
        </Card>
      </div>
    );
  }

  const conveyance: ConveyanceMeta = {
    vehicle_no: vehicleNo, from_state_code: fromState, to_state_code: toState,
    from_place: fromPlace, to_place: toPlace,
  };
  const matching = vehicleNo ? (groups.get(vehicleNo) ?? []) : [];
  const cewb = vehicleNo && matching.length > 0 ? buildEWB02(matching, conveyance) : null;

  const handleDownload = (): void => {
    if (!cewb) return;
    const blob = new Blob([JSON.stringify(cewb, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `EWB02_${entityCode}_${cewb.cewb_no || 'draft'}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('EWB-02 JSON downloaded');
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">EWB-02 · Consolidated E-Way Bill</h1>
          <p className="text-muted-foreground text-sm">Group multiple EWBs on the same conveyance into one CEWB envelope.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setTick(t => t + 1)}>
          <RefreshCcw className="h-4 w-4 mr-1" /> Refresh
        </Button>
      </div>

      <Card className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <Label className="text-xs">Vehicle No</Label>
          <Input value={vehicleNo} onChange={(e) => setVehicleNo(e.target.value.toUpperCase())} placeholder="MH12AB1234" className="font-mono" />
        </div>
        <div>
          <Label className="text-xs">From State Code · Place</Label>
          <div className="flex gap-2">
            <Input value={fromState} onChange={(e) => setFromState(e.target.value)} className="w-20 font-mono" />
            <Input value={fromPlace} onChange={(e) => setFromPlace(e.target.value)} />
          </div>
        </div>
        <div>
          <Label className="text-xs">To State Code · Place</Label>
          <div className="flex gap-2">
            <Input value={toState} onChange={(e) => setToState(e.target.value)} className="w-20 font-mono" />
            <Input value={toPlace} onChange={(e) => setToPlace(e.target.value)} />
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <h2 className="text-sm font-semibold uppercase text-muted-foreground mb-2">Available vehicles ({vehiclesAvailable.length})</h2>
        {vehiclesAvailable.length === 0 ? (
          <div className="text-xs text-muted-foreground">No active EWBs in store. Generate EWBs in the E-Way Bill tab first.</div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {vehiclesAvailable.map(v => (
              <Button key={v} variant={v === vehicleNo ? 'default' : 'outline'} size="sm" onClick={() => setVehicleNo(v)}>
                <span className="font-mono">{v}</span> · {groups.get(v)?.length ?? 0} EWBs
              </Button>
            ))}
          </div>
        )}
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase">EWBs in CEWB</div>
          <div className="text-xl font-mono font-semibold mt-1">{cewb?.ewb_count ?? 0}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase">Invoice Value</div>
          <div className="text-xl font-mono font-semibold mt-1">{inr(cewb?.total_invoice_value ?? 0)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase">Taxable Value</div>
          <div className="text-xl font-mono font-semibold mt-1">{inr(cewb?.total_taxable_value ?? 0)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase">CEWB No</div>
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            {cewb?.cewb_no
              ? <Badge className="bg-emerald-600 hover:bg-emerald-700 font-mono"><CheckCircle2 className="h-3 w-3 mr-1" />{cewb.cewb_no}</Badge>
              : <Badge variant="secondary"><AlertTriangle className="h-3 w-3 mr-1" />Not generated</Badge>}
          </div>
        </Card>
      </div>

      {cewb && (cewb.warnings.length + cewb.errors.length > 0) && (
        <Card className="p-4 space-y-1">
          <h2 className="text-sm font-semibold uppercase text-muted-foreground">Diagnostics</h2>
          {cewb.errors.map((e, i) => <div key={`e-${i}`} className="text-xs text-destructive">{e}</div>)}
          {cewb.warnings.map((w, i) => <div key={`w-${i}`} className="text-xs text-amber-500">{w}</div>)}
        </Card>
      )}

      <Button onClick={handleDownload} disabled={!cewb || !cewb.valid}>
        <FileJson className="h-4 w-4 mr-1" /> Download EWB-02 JSON
      </Button>
    </div>
  );
}
