/**
 * @file        src/pages/erp/comply360/exim/EInvoicePage.tsx
 * @purpose     E-Invoice (IRN) batch surface · consumes comply360-einvoice-aggregator-engine
 * @sprint      Sprint 73b · T-Phase-5.A.1.5-PASS-B · Block 3
 * @disciplines FR-7 · FR-13 · FR-19 · FR-91
 */
import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { RefreshCcw, FileJson, FileText, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  buildEInvoiceBatch,
  validateBatch,
} from '@/lib/comply360-einvoice-aggregator-engine';
import { useEntityCode } from '@/hooks/useEntityCode';
import { logAudit } from '@/lib/audit-trail-engine'; // P8.4 · Block 4 residue · comply360_event

function inr(n: number): string {
  return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

const PERIODS: Array<{ value: string; label: string }> = [
  { value: '04-2026', label: 'Apr 2026' },
  { value: '05-2026', label: 'May 2026' },
  { value: '06-2026', label: 'Jun 2026' },
];

export default function EInvoicePage(): JSX.Element {
  const { entityCode, entityId } = useEntityCode();
  const [period, setPeriod] = useState<string>('04-2026');
  const [refreshTick, setRefreshTick] = useState(0);
  const [jsonOpen, setJsonOpen] = useState(false);

  const batch = useMemo(() => {
    if (!entityCode) return null;
    return buildEInvoiceBatch({
      entity_code: entityCode,
      fy: 'FY25-26',
      return_period: period,
      min_invoice_value: 50000,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityCode, period, refreshTick]);

  if (!entityId || entityId === 'all') {
    return (
      <div className="p-6">
        <Card className="p-12 text-center">
          <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-lg font-semibold mb-2">Select a company to continue</h2>
          <p className="text-muted-foreground">Choose an entity from the header dropdown to view e-invoice batch.</p>
        </Card>
      </div>
    );
  }

  const items = batch?.items ?? [];
  const summary = batch ? validateBatch(batch) : null;

  const handleGenerate = (): void => {
    if (!batch) return;
    const recordId = `einv-${entityCode}-${period}-${Date.now()}`;
    toast.success(`Generate IRN Batch · ${batch.valid_count} valid items queued`);
    logAudit({
      entityCode,
      action: 'create',
      entityType: 'comply360_event',
      recordId,
      recordLabel: `E-Invoice Batch · ${entityCode} · ${period}`,
      beforeState: null,
      afterState: { period, valid_count: batch.valid_count, total_count: batch.items.length },
      reason: 'einvoice_batch_generated',
      sourceModule: 'EInvoicePage',
    });
  };

  const handleDownload = (): void => {
    if (!batch) return;
    const blob = new Blob([JSON.stringify(batch, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `EInvoiceBatch_${entityCode}_${period}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('E-Invoice batch JSON downloaded');
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">E-Invoice · IRN Batch</h1>
          <p className="text-muted-foreground text-sm">Aggregated IRP payloads · per-row validation · cross-card consumption</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PERIODS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => setRefreshTick((t) => t + 1)}>
            <RefreshCcw className="h-4 w-4 mr-1" /> Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase">Total Eligible</div>
          <div className="text-xl font-mono font-semibold mt-1">{batch?.total_count ?? 0}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase">Valid</div>
          <div className="text-xl font-mono font-semibold mt-1 text-emerald-500">{summary?.valid ?? 0}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase">Invalid</div>
          <div className="text-xl font-mono font-semibold mt-1 text-destructive">{summary?.invalid ?? 0}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase">Batch Status</div>
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            {summary?.ok
              ? <Badge className="bg-emerald-600 hover:bg-emerald-700"><CheckCircle2 className="h-3 w-3 mr-1" />Clean</Badge>
              : <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Errors</Badge>}
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <h2 className="text-sm font-semibold uppercase text-muted-foreground mb-3">Vouchers · {period}</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Voucher No</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Errors</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 && (
              <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">No eligible vouchers in {period}</TableCell></TableRow>
            )}
            {items.map((it) => (
              <TableRow key={it.voucher_id}>
                <TableCell className="font-mono">{it.voucher_no}</TableCell>
                <TableCell>
                  {it.status === 'valid'
                    ? <Badge className="bg-emerald-600 hover:bg-emerald-700">Valid</Badge>
                    : <Badge variant="destructive">Invalid</Badge>}
                </TableCell>
                <TableCell className="text-right font-mono text-xs">{it.errors.join('; ') || '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="text-xs text-muted-foreground mt-2">Total invoice value (summed): {inr(items.reduce((a, i) => a + (i.payload.ValDtls?.TotInvVal ?? 0), 0))}</div>
      </Card>

      <div className="flex items-center gap-2 flex-wrap">
        <Button onClick={handleGenerate} disabled={!summary?.ok || (batch?.valid_count ?? 0) === 0}>
          <FileText className="h-4 w-4 mr-1" /> Generate IRN Batch
        </Button>
        <Button variant="outline" onClick={() => setJsonOpen(true)} disabled={!batch}>
          <FileJson className="h-4 w-4 mr-1" /> View Payload
        </Button>
      </div>

      <Dialog open={jsonOpen} onOpenChange={setJsonOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
          <DialogHeader><DialogTitle>E-Invoice Batch · {entityCode} · {period}</DialogTitle></DialogHeader>
          <pre className="text-xs font-mono bg-muted p-3 rounded overflow-auto max-h-[50vh]">
            {batch ? JSON.stringify(batch, null, 2) : '—'}
          </pre>
          <DialogFooter>
            <Button onClick={handleDownload}>Download</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
