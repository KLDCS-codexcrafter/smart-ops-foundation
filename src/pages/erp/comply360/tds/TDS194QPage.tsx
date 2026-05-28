/**
 * @file        src/pages/erp/comply360/tds/TDS194QPage.tsx
 * @purpose     NATIVE Comply360 TDS 194Q (purchase of goods > ₹50L) return builder surface
 * @sprint      Sprint 72 · T-Phase-5.A.1.4 · Block 7 · DP-S72-3
 * @disciplines FR-7 · FR-13 · FR-19 (reads engines) · FR-43 · FR-91
 * @reads-from  comply360-tds-194q-engine · useEntityCode
 */
import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { RefreshCcw, FileJson, Percent, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { build194QReturn, type TDS194QDeducteeRow } from '@/lib/comply360-tds-194q-engine';
import { useEntityCode } from '@/hooks/useEntityCode';

function inr(n: number): string {
  return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

const QUARTERS: Array<'Q1' | 'Q2' | 'Q3' | 'Q4'> = ['Q1', 'Q2', 'Q3', 'Q4'];

export default function TDS194QPage(): JSX.Element {
  const { entityCode, entityId } = useEntityCode();
  const [quarter, setQuarter] = useState<'Q1' | 'Q2' | 'Q3' | 'Q4'>('Q4');
  const [refreshTick, setRefreshTick] = useState(0);
  const [jsonOpen, setJsonOpen] = useState(false);

  const result = useMemo(() => {
    if (!entityCode) return null;
    return build194QReturn({ entity_code: entityCode, fy: 'FY25-26', quarter });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityCode, quarter, refreshTick]);

  if (!entityId || entityId === 'all') {
    return (
      <div className="p-6">
        <Card className="p-12 text-center">
          <Percent className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-lg font-semibold mb-2">Select a company to continue</h2>
          <p className="text-muted-foreground">Choose an entity from the header dropdown to view 194Q return.</p>
        </Card>
      </div>
    );
  }

  const rows = (result?.payload.rows ?? []) as TDS194QDeducteeRow[];
  const totals = result?.payload.totals;
  const warnCount = result?.warnings.length ?? 0;
  const errorCount = result?.errors.length ?? 0;

  const handleDownload = (): void => {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result.payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TDS194Q_${entityCode}_FY25-26_${quarter}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('194Q return JSON downloaded');
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">TDS 194Q · Purchase of Goods</h1>
          <p className="text-muted-foreground text-sm">0.10% on purchases over ₹50L per seller per FY</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={quarter} onValueChange={(v) => setQuarter(v as 'Q1' | 'Q2' | 'Q3' | 'Q4')}>
            <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {QUARTERS.map((q) => <SelectItem key={q} value={q}>{q} FY25-26</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => setRefreshTick((t) => t + 1)}>
            <RefreshCcw className="h-4 w-4 mr-1" /> Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase">Deductions</div>
          <div className="text-xl font-mono font-semibold mt-1">{totals?.deduction_count ?? 0}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase">Gross Purchase</div>
          <div className="text-xl font-mono font-semibold mt-1">{inr(totals?.gross_amount ?? 0)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase">TDS Amount</div>
          <div className="text-xl font-mono font-semibold mt-1 text-amber-500">{inr(totals?.tds_amount ?? 0)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase">Validation</div>
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            {errorCount > 0
              ? <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />{errorCount} errors</Badge>
              : <Badge className="bg-emerald-600 hover:bg-emerald-700"><CheckCircle2 className="h-3 w-3 mr-1" />Clean</Badge>}
            {warnCount > 0 && <Badge variant="secondary">{warnCount} warnings</Badge>}
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <h2 className="text-sm font-semibold uppercase text-muted-foreground mb-3">Deductees · {quarter} FY25-26</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Party</TableHead>
              <TableHead>PAN</TableHead>
              <TableHead className="text-right">Total Purchase</TableHead>
              <TableHead className="text-right">Over ₹50L</TableHead>
              <TableHead className="text-right">Rate</TableHead>
              <TableHead className="text-right">TDS</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No 194Q deductions in {quarter}</TableCell></TableRow>
            )}
            {rows.map((r) => (
              <TableRow key={r.party_id}>
                <TableCell>{r.party_name}</TableCell>
                <TableCell className="font-mono">{r.pan ?? '—'}</TableCell>
                <TableCell className="text-right font-mono">{inr(r.total_purchase)}</TableCell>
                <TableCell className="text-right font-mono">{inr(r.threshold_excess)}</TableCell>
                <TableCell className="text-right font-mono">{r.rate}%</TableCell>
                <TableCell className="text-right font-mono text-amber-500">{inr(r.tds_amount)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <div className="flex items-center gap-2 flex-wrap">
        <Button onClick={() => setJsonOpen(true)} disabled={!result}>
          <FileJson className="h-4 w-4 mr-1" /> Prepare JSON
        </Button>
      </div>

      <Dialog open={jsonOpen} onOpenChange={setJsonOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
          <DialogHeader><DialogTitle>194Q Payload · {entityCode} · {quarter} FY25-26</DialogTitle></DialogHeader>
          <pre className="text-xs font-mono bg-muted p-3 rounded overflow-auto max-h-[50vh]">
            {result ? JSON.stringify(result.payload, null, 2) : '—'}
          </pre>
          <DialogFooter>
            <Button onClick={handleDownload}>Download</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
