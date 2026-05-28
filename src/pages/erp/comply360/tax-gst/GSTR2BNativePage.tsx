/**
 * @file        src/pages/erp/comply360/tax-gst/GSTR2BNativePage.tsx
 * @purpose     NATIVE Comply360 GSTR-2B ITC reconciliation viewer · consumes Pass A engines + IMS state
 * @sprint      Sprint 70b · T-Phase-5.A.1.2-PASS-B · Block 3 · Q-LOCK-3-P1-D
 * @decisions   D-S69-1 (100% native) · DP-S70-4 · DP-S70-6 (IMS 3-state model)
 * @iso         Reliability · Auditability
 * @disciplines FR-7 · FR-13 · FR-19 (reads Pass A engines) · FR-91 honest disclosure
 * @reads-from  src/lib/comply360-gst-aggregator-engine.ts (aggregateInwardSupplies · computeTotalTax)
 *              src/lib/comply360-gstr-builder-engine.ts (buildGSTR2B · IMSActionInput)
 *              src/lib/comply360-ims-engine.ts (loadIMSActions)
 *              src/hooks/useEntityGSTINs.ts · src/hooks/useEntityCode.ts
 */
import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { RefreshCcw, FileJson, BookCheck, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  aggregateInwardSupplies,
  computeTotalTax,
  type CrossCardSupply,
} from '@/lib/comply360-gst-aggregator-engine';
import {
  buildGSTR2B,
  type GSTRBuilderResult,
  type IMSActionInput,
} from '@/lib/comply360-gstr-builder-engine';
import { loadIMSActions } from '@/lib/comply360-ims-engine';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useEntityGSTINs } from '@/hooks/useEntityGSTINs';

function defaultPeriod(): string {
  const d = new Date();
  const prev = new Date(d.getFullYear(), d.getMonth() - 1, 1);
  return `${String(prev.getMonth() + 1).padStart(2, '0')}-${prev.getFullYear()}`;
}

function inr(n: number): string {
  return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

interface Bucket {
  label: string;
  key: 'itc_eligible' | 'itc_ineligible' | 'itc_reversed' | 'vendor_pending';
  tone: 'good' | 'bad' | 'warn' | 'neutral';
}

const BUCKETS: Bucket[] = [
  { label: 'ITC Eligible', key: 'itc_eligible', tone: 'good' },
  { label: 'ITC Ineligible', key: 'itc_ineligible', tone: 'bad' },
  { label: 'ITC Reversed', key: 'itc_reversed', tone: 'warn' },
  { label: 'Vendor Pending', key: 'vendor_pending', tone: 'neutral' },
];

export default function GSTR2BNativePage(): JSX.Element {
  const { entityId } = useEntityCode();
  const { gstins, activeGSTIN, setActiveGSTIN } = useEntityGSTINs(entityId);
  const [returnPeriod, setReturnPeriod] = useState<string>(defaultPeriod());
  const [refreshTick, setRefreshTick] = useState(0);
  const [jsonOpen, setJsonOpen] = useState(false);

  const supplies = useMemo<CrossCardSupply[]>(() => {
    if (!entityId || entityId === 'all' || !activeGSTIN) return [];
    return aggregateInwardSupplies({
      entity_id: entityId,
      gstin: activeGSTIN,
      fy: 'FY25-26',
      return_period: returnPeriod,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityId, activeGSTIN, returnPeriod, refreshTick]);

  const imsActions: IMSActionInput[] = useMemo(() => {
    if (!entityId || entityId === 'all') return [];
    return loadIMSActions(entityId, returnPeriod).map(a => ({
      source_invoice_ref: a.source_invoice_ref,
      status: a.status,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityId, returnPeriod, refreshTick]);

  const totals = useMemo(() => computeTotalTax(supplies), [supplies]);
  const builderResult = useMemo<GSTRBuilderResult | null>(() => {
    if (!activeGSTIN || supplies.length === 0) return null;
    return buildGSTR2B(supplies, imsActions, { gstin: activeGSTIN, return_period: returnPeriod });
  }, [supplies, imsActions, activeGSTIN, returnPeriod]);

  const periodOptions = useMemo(() => {
    const out: string[] = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      out.push(`${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`);
    }
    return out;
  }, []);

  const summary = (builderResult?.payload as Record<string, unknown> | undefined)?.summary as
    | Record<Bucket['key'] | 'total', { taxable_value: number; igst: number; cgst: number; sgst: number; cess: number }>
    | undefined;

  const b2bDetails = (builderResult?.payload as Record<string, unknown> | undefined)?.b2b_details as
    | Array<{
        supplier_gstin: string; invoice_no: string; invoice_date: string;
        taxable_value: number; igst: number; cgst: number; sgst: number; cess: number;
        ims_status: string;
      }>
    | undefined;

  const handleDownloadJSON = (): void => {
    if (!builderResult) return;
    const blob = new Blob([JSON.stringify(builderResult.payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `GSTR2B_${activeGSTIN}_${returnPeriod}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('GSTR-2B JSON downloaded');
  };

  const toneClass = (tone: Bucket['tone']): string => {
    if (tone === 'good') return 'text-emerald-500';
    if (tone === 'bad') return 'text-destructive';
    if (tone === 'warn') return 'text-amber-500';
    return 'text-muted-foreground';
  };

  const statusBadge = (status: string): JSX.Element => {
    if (status === 'accepted') return <Badge className="bg-emerald-600 hover:bg-emerald-700">Accepted</Badge>;
    if (status === 'rejected') return <Badge variant="destructive">Rejected</Badge>;
    if (status === 'kept_pending') return <Badge variant="secondary">Kept Pending</Badge>;
    return <Badge variant="outline">Pending</Badge>;
  };

  if (!entityId || entityId === 'all') {
    return (
      <div className="p-6">
        <Card className="p-12 text-center">
          <BookCheck className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-lg font-semibold mb-2">Select a company to continue</h2>
          <p className="text-muted-foreground">Choose an entity from the header dropdown to view GSTR-2B.</p>
        </Card>
      </div>
    );
  }

  const errorCount = builderResult?.errors.length ?? 0;
  const warnCount = builderResult?.warnings.length ?? 0;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">GSTR-2B · ITC Reconciliation</h1>
          <p className="text-muted-foreground text-sm">Native Comply360 viewer · IMS-aware ITC classification</p>
        </div>
        <div className="flex items-center gap-2">
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
          <Select value={returnPeriod} onValueChange={setReturnPeriod}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {periodOptions.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => setRefreshTick(t => t + 1)}>
            <RefreshCcw className="h-4 w-4 mr-1" /> Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {BUCKETS.map(b => {
          const v = summary?.[b.key];
          const tax = v ? v.igst + v.cgst + v.sgst + v.cess : 0;
          return (
            <Card key={b.key} className="p-4">
              <div className="text-xs text-muted-foreground uppercase">{b.label}</div>
              <div className={`text-xl font-mono font-semibold mt-1 ${toneClass(b.tone)}`}>{inr(tax)}</div>
              <div className="text-xs text-muted-foreground mt-1">Taxable: {inr(v?.taxable_value ?? 0)}</div>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase">Total Inward Tax</div>
          <div className="text-2xl font-mono font-semibold mt-1">{inr(totals.igst + totals.cgst + totals.sgst + totals.cess)}</div>
          <div className="text-xs text-muted-foreground mt-1">{supplies.length} invoices · Taxable {inr(totals.taxable_value)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase">Validation</div>
          <div className="mt-2 flex items-center gap-2">
            {errorCount > 0
              ? <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />{errorCount} errors</Badge>
              : <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-700"><CheckCircle2 className="h-3 w-3 mr-1" />Clean</Badge>}
            {warnCount > 0 && <Badge variant="secondary">{warnCount} warnings</Badge>}
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Supplier GSTIN</TableHead>
              <TableHead>Invoice No</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Taxable</TableHead>
              <TableHead className="text-right">IGST</TableHead>
              <TableHead className="text-right">CGST</TableHead>
              <TableHead className="text-right">SGST</TableHead>
              <TableHead>IMS Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!b2bDetails || b2bDetails.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  No inward supplies recorded for this GSTIN/period.
                </TableCell>
              </TableRow>
            ) : b2bDetails.map((r, idx) => (
              <TableRow key={`${r.supplier_gstin}-${r.invoice_no}-${idx}`}>
                <TableCell className="font-mono">{r.supplier_gstin}</TableCell>
                <TableCell className="font-mono">{r.invoice_no}</TableCell>
                <TableCell className="font-mono">{r.invoice_date}</TableCell>
                <TableCell className="text-right font-mono">{inr(r.taxable_value)}</TableCell>
                <TableCell className="text-right font-mono">{inr(r.igst)}</TableCell>
                <TableCell className="text-right font-mono">{inr(r.cgst)}</TableCell>
                <TableCell className="text-right font-mono">{inr(r.sgst)}</TableCell>
                <TableCell>{statusBadge(r.ims_status)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <div className="flex items-center gap-2">
        <Button onClick={() => setJsonOpen(true)} disabled={!builderResult}>
          <FileJson className="h-4 w-4 mr-1" /> View Payload
        </Button>
      </div>

      <Dialog open={jsonOpen} onOpenChange={setJsonOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
          <DialogHeader><DialogTitle>GSTR-2B Payload · {activeGSTIN} · {returnPeriod}</DialogTitle></DialogHeader>
          <pre className="text-xs font-mono bg-muted p-3 rounded overflow-auto max-h-[50vh]">
            {builderResult ? JSON.stringify(builderResult.payload, null, 2) : '—'}
          </pre>
          <DialogFooter>
            <Button onClick={handleDownloadJSON}>Download</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
