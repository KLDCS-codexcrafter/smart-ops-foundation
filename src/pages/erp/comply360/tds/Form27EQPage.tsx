/**
 * @file        src/pages/erp/comply360/tds/Form27EQPage.tsx
 * @purpose     Sprint 76b · TCS 27EQ quarterly return surface · consumes Pass A tcs-27eq-engine.
 * @sprint      Sprint 76b · T-Phase-5.A.1.8-PASS-B · Block 3 · DP-S76-3
 * @disciplines FR-7 · FR-13 · FR-19 (engine 0-DIFF) · FR-91
 */
import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCcw, Download, Receipt, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { useEntityCode } from '@/hooks/useEntityCode';
import { build27EQ, listCollectionCodes } from '@/lib/comply360-tcs-27eq-engine';

const FY_OPTIONS = ['FY25-26', 'FY24-25', 'FY23-24'];
const QUARTERS: Array<'Q1' | 'Q2' | 'Q3' | 'Q4'> = ['Q1', 'Q2', 'Q3', 'Q4'];

function inr(n: number): string {
  return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

export default function Form27EQPage(): JSX.Element {
  const { entityCode, entityId } = useEntityCode();
  const [fy, setFy] = useState<string>('FY25-26');
  const [quarter, setQuarter] = useState<'Q1' | 'Q2' | 'Q3' | 'Q4'>('Q1');
  const [tick, setTick] = useState(0);

  const ret = useMemo(() => {
    if (!entityCode) return null;
    return build27EQ({ entity_code: entityCode, fy }, quarter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityCode, fy, quarter, tick]);

  if (!entityId || entityId === 'all') {
    return (
      <div className="p-6">
        <Card className="p-12 text-center">
          <Receipt className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-lg font-semibold mb-2">Select a company to continue</h2>
          <p className="text-muted-foreground">Choose an entity to view Form 27EQ.</p>
        </Card>
      </div>
    );
  }

  const handleDownload = (): void => {
    if (!ret) return;
    const blob = new Blob([JSON.stringify(ret, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `27EQ_${entityCode}_${fy}_${quarter}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Form 27EQ JSON downloaded');
  };

  const codes = listCollectionCodes();
  const errCount = ret?.errors.length ?? 0;
  const warnCount = ret?.warnings.length ?? 0;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Form 27EQ · TCS Quarterly Return</h1>
          <p className="text-muted-foreground text-sm">§206C collections grouped by code (6CE / 6CL / 6CM / 6CO / 6CR / 6CP).</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={fy} onValueChange={setFy}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {FY_OPTIONS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={quarter} onValueChange={(v) => setQuarter(v as 'Q1' | 'Q2' | 'Q3' | 'Q4')}>
            <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {QUARTERS.map(q => <SelectItem key={q} value={q}>{q}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => setTick(t => t + 1)}>
            <RefreshCcw className="h-4 w-4 mr-1" /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownload} disabled={!ret}>
            <Download className="h-4 w-4 mr-1" /> Download
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase">Collections</div>
          <div className="text-xl font-mono font-semibold mt-1">{ret?.totals.collection_count ?? 0}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase">Gross Amount</div>
          <div className="text-xl font-mono font-semibold mt-1">{inr(ret?.totals.gross_amount ?? 0)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase">TCS Collected</div>
          <div className="text-xl font-mono font-semibold mt-1">{inr(ret?.totals.tcs_amount ?? 0)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase">Status</div>
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            {errCount > 0
              ? <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />{errCount} errors</Badge>
              : <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-700"><CheckCircle2 className="h-3 w-3 mr-1" />Clean</Badge>}
            {warnCount > 0 && <Badge variant="secondary">{warnCount} warn</Badge>}
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <h2 className="text-sm font-semibold uppercase text-muted-foreground mb-2">Per-code summary</h2>
        <div className="space-y-1 text-sm">
          {ret && ret.by_code.length > 0 ? ret.by_code.map(r => (
            <div key={r.collection_code} className="flex items-center justify-between border-b py-1 last:border-0">
              <span className="font-mono">{r.collection_code}</span>
              <span className="text-muted-foreground">{r.collection_count} entries · {r.collectee_count} parties</span>
              <span className="font-mono">{inr(r.gross_amount)}</span>
              <span className="font-mono text-emerald-600">{inr(r.tcs_amount)}</span>
            </div>
          )) : (
            <div className="text-muted-foreground text-xs">No collections in {fy} {quarter}. Supported codes: {codes.join(' · ')}.</div>
          )}
        </div>
      </Card>

      {(warnCount + errCount) > 0 && ret && (
        <Card className="p-4 space-y-1">
          <h2 className="text-sm font-semibold uppercase text-muted-foreground">Diagnostics</h2>
          {ret.errors.map((e, i) => <div key={`e-${i}`} className="text-xs text-destructive">{e}</div>)}
          {ret.warnings.map((w, i) => <div key={`w-${i}`} className="text-xs text-amber-500">{w}</div>)}
        </Card>
      )}
    </div>
  );
}
