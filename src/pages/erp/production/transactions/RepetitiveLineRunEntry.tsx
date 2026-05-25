/**
 * @file     RepetitiveLineRunEntry.tsx
 * @sprint   T-Phase-3.PROD-4.5 · Theme A · Q-LOCK-3 A
 * @purpose  Start/log a repetitive line run · captures takt · OEE inputs.
 */
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useEntityCode } from '@/hooks/useEntityCode';
import {
  buildRepetitiveLineMetricsShell,
  computeOEETotal,
  computeLineEfficiency,
} from '@/lib/production-engine';
import type { RepetitiveLineMetrics } from '@/types/production-order';

export default function RepetitiveLineRunEntry(): JSX.Element {
  const { entityCode } = useEntityCode();
  const [lineId, setLineId] = useState('LINE-01');
  const [unitsTarget, setUnitsTarget] = useState(1000);
  const [takt, setTakt] = useState<number | ''>('');
  const [cycle, setCycle] = useState<number | ''>('');
  const [avail, setAvail] = useState<number | ''>('');
  const [perf, setPerf] = useState<number | ''>('');
  const [qual, setQual] = useState<number | ''>('');
  const [shell, setShell] = useState<RepetitiveLineMetrics | null>(null);

  const oeeTotal = computeOEETotal(
    avail === '' ? null : Number(avail),
    perf === '' ? null : Number(perf),
    qual === '' ? null : Number(qual),
  );
  const efficiency = computeLineEfficiency(
    takt === '' ? null : Number(takt),
    cycle === '' ? null : Number(cycle),
  );

  function handleStart(): void {
    if (!lineId.trim()) {
      toast.error('Line ID required');
      return;
    }
    // [JWT] POST /api/production/repetitive-line-runs
    const s = buildRepetitiveLineMetricsShell(lineId, unitsTarget);
    setShell(s);
    toast.success(`Repetitive line run started · ${lineId}`);
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Repetitive Line Run Entry</h1>
        <p className="text-sm text-muted-foreground">Entity: <span className="font-mono">{entityCode}</span></p>
      </div>

      <Card>
        <CardHeader><CardTitle>Line Run Configuration</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Line ID</Label>
            <Input value={lineId} onChange={(e) => setLineId(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Units Target (this run)</Label>
            <Input type="number" value={unitsTarget} onChange={(e) => setUnitsTarget(Number(e.target.value))} />
          </div>
          <div className="space-y-2">
            <Label>Takt Time (sec/unit)</Label>
            <Input type="number" value={takt} onChange={(e) => setTakt(e.target.value === '' ? '' : Number(e.target.value))} />
          </div>
          <div className="space-y-2">
            <Label>Cycle Time (sec/unit)</Label>
            <Input type="number" value={cycle} onChange={(e) => setCycle(e.target.value === '' ? '' : Number(e.target.value))} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>OEE Inputs (0-100)</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Availability</Label>
            <Input type="number" value={avail} onChange={(e) => setAvail(e.target.value === '' ? '' : Number(e.target.value))} />
          </div>
          <div className="space-y-2">
            <Label>Performance</Label>
            <Input type="number" value={perf} onChange={(e) => setPerf(e.target.value === '' ? '' : Number(e.target.value))} />
          </div>
          <div className="space-y-2">
            <Label>Quality</Label>
            <Input type="number" value={qual} onChange={(e) => setQual(e.target.value === '' ? '' : Number(e.target.value))} />
          </div>
          <div className="md:col-span-3 flex items-center gap-4 pt-2">
            <Badge variant="secondary">OEE Total: <span className="font-mono ml-2">{oeeTotal ?? '—'}</span></Badge>
            <Badge variant="secondary">Line Efficiency: <span className="font-mono ml-2">{efficiency ?? '—'}%</span></Badge>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleStart}>Start Line Run</Button>

      {shell && (
        <Card>
          <CardHeader><CardTitle>Active Run Shell</CardTitle></CardHeader>
          <CardContent>
            <pre className="text-xs font-mono whitespace-pre-wrap">{JSON.stringify(shell, null, 2)}</pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
