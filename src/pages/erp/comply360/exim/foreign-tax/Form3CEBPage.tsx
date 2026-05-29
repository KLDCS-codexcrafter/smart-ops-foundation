/**
 * @file        src/pages/erp/comply360/exim/foreign-tax/Form3CEBPage.tsx
 * @purpose     Sprint 77b · Form 3CEB Section 92E TP report surface.
 *              Reads form-3ceb-engine (read-only §H boundary).
 * @sprint      Sprint 77b · T-Phase-5.A.1.9-PASS-B · Block 5
 * @disciplines FR-7 · FR-13 · FR-19 (engine 0-DIFF)
 */
import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building, CheckCircle2, AlertTriangle, RefreshCcw } from 'lucide-react';
import { toast } from 'sonner';
import { useEntityCode } from '@/hooks/useEntityCode';
import {
  buildForm3CEBSnapshot,
  saveForm3CEBSnapshot,
  loadForm3CEBSnapshots,
  summarizeForm3CEB,
} from '@/lib/form-3ceb-engine';

function inr(n: number): string { return '₹' + n.toLocaleString('en-IN'); }

export default function Form3CEBPage(): JSX.Element {
  const { entityCode, entityId } = useEntityCode();
  const [fy, setFy] = useState('FY25-26');
  const [tick, setTick] = useState(0);

  const snapshots = useMemo(() => {
    if (!entityCode) return [];
    return loadForm3CEBSnapshots(entityCode);
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

  const handleBuild = (): void => {
    const snap = buildForm3CEBSnapshot(entityCode, fy);
    saveForm3CEBSnapshot(entityCode, snap);
    setTick(t => t + 1);
    toast.success(`Form 3CEB ${snap.snapshot_no} built · ${snap.is_above_threshold ? 'above' : 'below'} threshold`);
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Form 3CEB · Section 92E Transfer-Pricing Report</h1>
          <p className="text-muted-foreground text-sm">CA-certified international related-party transactions report.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setTick(t => t + 1)}>
          <RefreshCcw className="h-4 w-4 mr-1" /> Refresh
        </Button>
      </div>

      <Card className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div><Label className="text-xs">Financial Year</Label><Input value={fy} onChange={(e) => setFy(e.target.value)} className="font-mono" /></div>
      </Card>

      <Button onClick={handleBuild}>Build 3CEB Snapshot</Button>

      <Card className="p-4">
        <h2 className="text-sm font-semibold uppercase text-muted-foreground mb-2">Persisted snapshots ({snapshots.length})</h2>
        {snapshots.length === 0 ? (
          <div className="text-xs text-muted-foreground">No 3CEB snapshots yet. Build one above.</div>
        ) : (
          <div className="space-y-2">
            {snapshots.slice().reverse().map(s => {
              const sm = summarizeForm3CEB(s);
              return (
                <div key={s.id} className="border-b py-2 last:border-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-mono text-sm">{s.snapshot_no}</div>
                      <div className="text-xs text-muted-foreground">
                        {s.financial_year} · {sm.parties} parties · {sm.transactions} txns · due {s.filing_due_date} ({sm.days_until_due}d)
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="outline" className="font-mono">{inr(sm.total_value_inr)}</Badge>
                      {sm.filing_required
                        ? <Badge className="bg-amber-600 hover:bg-amber-700"><AlertTriangle className="h-3 w-3 mr-1" />Filing required</Badge>
                        : <Badge className="bg-emerald-600 hover:bg-emerald-700"><CheckCircle2 className="h-3 w-3 mr-1" />Below threshold</Badge>}
                      <Badge variant="secondary">{s.status}</Badge>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
