/**
 * @file        src/pages/erp/comply360/tax-gst/extended/ExtendedFormShell.tsx
 * @purpose     Shared lean form-shell for the 9 Extended GST form surfaces
 * @sprint      Sprint 75 · T-Phase-5.A.1.7 · Q28 Part 1
 * @decisions   D-S69-1 (NATIVE) · DP-S75-1 (Option A · sub-shell)
 * @disciplines FR-7 · FR-13 · FR-19 (reads aggregator 0-DIFF) · FR-91
 */
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Receipt, FileJson, RefreshCcw, AlertTriangle, CheckCircle2, Download } from 'lucide-react';
import { toast } from 'sonner';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useEntityGSTINs } from '@/hooks/useEntityGSTINs';
import type { GSTRBuilderResult } from '@/lib/comply360-gstr-builder-engine';

export type PeriodKind = 'fy' | 'period' | 'quarter' | 'none';

interface Props {
  title: string;
  description: string;
  formCode: string;                // e.g. 'GSTR-4'
  fileTag: string;                 // e.g. 'GSTR4'
  periodKind: PeriodKind;
  build: (args: {
    entityId: string;
    gstin: string;
    fy: string;
    period: string;
    quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
    refreshTick: number;
  }) => GSTRBuilderResult | null;
}

const FY_OPTIONS = ['2024-25', '2023-24', '2022-23'];
const PERIOD_OPTIONS = ['04-2026', '05-2026', '06-2026', '03-2026'];
const QUARTER_OPTIONS: Array<'Q1' | 'Q2' | 'Q3' | 'Q4'> = ['Q1', 'Q2', 'Q3', 'Q4'];

function inr(n: number): string {
  return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

export default function ExtendedFormShell(props: Props): JSX.Element {
  const { title, description, formCode, fileTag, periodKind, build } = props;
  const { entityId } = useEntityCode();
  const { gstins, activeGSTIN, setActiveGSTIN } = useEntityGSTINs(entityId);
  const [fy, setFy] = useState<string>('2024-25');
  const [period, setPeriod] = useState<string>('04-2026');
  const [quarter, setQuarter] = useState<'Q1' | 'Q2' | 'Q3' | 'Q4'>('Q4');
  const [refreshTick, setRefreshTick] = useState(0);
  const [jsonOpen, setJsonOpen] = useState(false);

  if (!entityId || entityId === 'all') {
    return (
      <div className="p-6">
        <Card className="p-12 text-center">
          <Receipt className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-lg font-semibold mb-2">Select a company to continue</h2>
          <p className="text-muted-foreground">Choose an entity from the header dropdown to view {formCode}.</p>
        </Card>
      </div>
    );
  }

  const result = activeGSTIN
    ? build({ entityId, gstin: activeGSTIN, fy, period, quarter, refreshTick })
    : null;
  const errorCount = result?.errors.length ?? 0;
  const warnCount = result?.warnings.length ?? 0;

  const handleDownload = (): void => {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result.payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileTag}_${activeGSTIN}_${fy}${periodKind === 'period' ? '_' + period : ''}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${formCode} JSON downloaded`);
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{formCode} · {title}</h1>
          <p className="text-muted-foreground text-sm">{description}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={activeGSTIN} onValueChange={setActiveGSTIN}>
            <SelectTrigger className="w-[220px]"><SelectValue placeholder="Select GSTIN" /></SelectTrigger>
            <SelectContent>
              {gstins.length === 0 && <SelectItem value="__none__" disabled>No GSTINs registered</SelectItem>}
              {gstins.map(g => (
                <SelectItem key={g.gstin} value={g.gstin}>
                  <span className="font-mono">{g.gstin}</span> · {g.state}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(periodKind === 'fy' || periodKind === 'quarter') && (
            <Select value={fy} onValueChange={setFy}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {FY_OPTIONS.map(f => <SelectItem key={f} value={f}>FY {f}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          {periodKind === 'quarter' && (
            <Select value={quarter} onValueChange={(v) => setQuarter(v as 'Q1' | 'Q2' | 'Q3' | 'Q4')}>
              <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {QUARTER_OPTIONS.map(q => <SelectItem key={q} value={q}>{q}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          {periodKind === 'period' && (
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PERIOD_OPTIONS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <Button variant="outline" size="sm" onClick={() => setRefreshTick(t => t + 1)}>
            <RefreshCcw className="h-4 w-4 mr-1" /> Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase">Taxable Value</div>
          <div className="text-xl font-mono font-semibold mt-1">{inr(result?.totals.taxable_value ?? 0)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase">IGST</div>
          <div className="text-xl font-mono font-semibold mt-1">{inr(result?.totals.igst ?? 0)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase">CGST + SGST</div>
          <div className="text-xl font-mono font-semibold mt-1">{inr((result?.totals.cgst ?? 0) + (result?.totals.sgst ?? 0))}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase">Validation</div>
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            {errorCount > 0
              ? <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />{errorCount} errors</Badge>
              : <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-700"><CheckCircle2 className="h-3 w-3 mr-1" />Clean</Badge>}
            {warnCount > 0 && <Badge variant="secondary">{warnCount} warnings</Badge>}
          </div>
        </Card>
      </div>

      {(warnCount > 0 || errorCount > 0) && result && (
        <Card className="p-4 space-y-1">
          <h2 className="text-sm font-semibold uppercase text-muted-foreground">Diagnostics</h2>
          {result.errors.map((e, i) => (
            <div key={`e-${i}`} className="text-xs text-destructive">[{e.code}] {e.message}</div>
          ))}
          {result.warnings.map((w, i) => (
            <div key={`w-${i}`} className="text-xs text-amber-500">[{w.code}] {w.message}</div>
          ))}
        </Card>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <Button onClick={() => setJsonOpen(true)} disabled={!result}>
          <FileJson className="h-4 w-4 mr-1" /> Prepare JSON
        </Button>
        <Button variant="outline" onClick={handleDownload} disabled={!result}>
          <Download className="h-4 w-4 mr-1" /> Download
        </Button>
      </div>

      <Dialog open={jsonOpen} onOpenChange={setJsonOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
          <DialogHeader><DialogTitle>{formCode} Payload · {activeGSTIN}</DialogTitle></DialogHeader>
          <pre className="text-xs font-mono bg-muted p-3 rounded overflow-auto max-h-[50vh]">
            {result ? JSON.stringify(result.payload, null, 2) : '—'}
          </pre>
          <DialogFooter>
            <Button onClick={handleDownload}>Download</Button>
            <Label className="sr-only">Filename hint</Label>
            <Input className="hidden" readOnly value={fileTag} />
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
