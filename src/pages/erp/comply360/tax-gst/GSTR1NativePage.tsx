/**
 * @file        src/pages/erp/comply360/tax-gst/GSTR1NativePage.tsx
 * @purpose     NATIVE Comply360 GSTR-1 return builder · consumes Pass A aggregator + builder engines
 * @sprint      Sprint 70b · T-Phase-5.A.1.2-PASS-B · Block 1 · Q-LOCK-3-P1-D
 * @decisions   D-S69-1 (100% native) · DP-S70-4 (4 NEW Comply360 surfaces)
 * @iso         Reliability · Auditability
 * @disciplines FR-7 · FR-13 · FR-19 (reads Pass A engines · never modifies them) · FR-43 component tests · FR-91 honest disclosure
 * @reads-from  src/lib/comply360-gst-aggregator-engine.ts (aggregateOutwardSupplies · computeTotalTax)
 *              src/lib/comply360-gstr-builder-engine.ts (buildGSTR1 · validateGSTR1Payload)
 *              src/lib/comply360-statutory-memory.ts (recordFiling on Submit)
 *              src/hooks/useEntityGSTINs.ts · src/hooks/useEntityCode.ts
 */
import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RefreshCcw, Download, FileJson, Send, Receipt, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  aggregateOutwardSupplies,
  groupSuppliesByType,
  computeTotalTax,
  type CrossCardSupply,
} from '@/lib/comply360-gst-aggregator-engine';
import { buildGSTR1, type GSTRBuilderResult } from '@/lib/comply360-gstr-builder-engine';
import { recordFiling } from '@/lib/comply360-statutory-memory';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useEntityGSTINs } from '@/hooks/useEntityGSTINs';
import { logAudit } from '@/lib/audit-trail-engine'; // P8.4 · Block 4 residue · comply360_event

type TabKey = 'b2b' | 'b2cl' | 'b2cs' | 'export' | 'cdnr' | 'hsn';

function defaultReturnPeriod(): string {
  const d = new Date();
  const prev = new Date(d.getFullYear(), d.getMonth() - 1, 1);
  return `${String(prev.getMonth() + 1).padStart(2, '0')}-${prev.getFullYear()}`;
}

function inr(n: number): string {
  return '₹' + (n / 1).toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

export default function GSTR1NativePage(): JSX.Element {
  const { entityId } = useEntityCode();
  const { gstins, activeGSTIN, setActiveGSTIN } = useEntityGSTINs(entityId);
  const [returnPeriod, setReturnPeriod] = useState<string>(defaultReturnPeriod());
  const [tab, setTab] = useState<TabKey>('b2b');
  const [refreshTick, setRefreshTick] = useState(0);
  const [jsonOpen, setJsonOpen] = useState(false);
  const [arnDialogOpen, setArnDialogOpen] = useState(false);
  const [arnInput, setArnInput] = useState('');

  const supplies = useMemo<CrossCardSupply[]>(() => {
    if (!entityId || entityId === 'all' || !activeGSTIN) return [];
    return aggregateOutwardSupplies({
      entity_id: entityId,
      gstin: activeGSTIN,
      fy: 'FY25-26',
      return_period: returnPeriod,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityId, activeGSTIN, returnPeriod, refreshTick]);

  const grouped = useMemo(() => groupSuppliesByType(supplies), [supplies]);
  const totals = useMemo(() => computeTotalTax(supplies), [supplies]);
  const builderResult = useMemo<GSTRBuilderResult | null>(() => {
    if (!activeGSTIN || supplies.length === 0) return null;
    return buildGSTR1(supplies, { gstin: activeGSTIN, return_period: returnPeriod });
  }, [supplies, activeGSTIN, returnPeriod]);

  const periodOptions = useMemo(() => {
    const out: string[] = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      out.push(`${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`);
    }
    return out;
  }, []);

  const handleDownloadJSON = (): void => {
    if (!builderResult) return;
    const blob = new Blob([JSON.stringify(builderResult.payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `GSTR1_${activeGSTIN}_${returnPeriod}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('GSTR-1 JSON downloaded');
  };

  const handleDownloadCSV = (): void => {
    const rows = [['Invoice No', 'Date', 'Recipient GSTIN', 'HSN/SAC', 'Taxable', 'IGST', 'CGST', 'SGST']];
    for (const s of grouped.b2b) {
      rows.push([s.invoice_no, s.invoice_date, s.gstin_recipient ?? '', s.hsn_sac,
        String(s.taxable_value), String(s.igst), String(s.cgst), String(s.sgst)]);
    }
    const csv = rows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `GSTR1_${activeGSTIN}_${returnPeriod}_B2B.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('B2B CSV downloaded');
  };

  const handleSubmit = (): void => {
    toast.info('Direct submit available in Phase 8 P2BB. Use Phase 1 JSON download + GSTN portal upload, then enter ARN.');
    setArnDialogOpen(true);
  };

  const handleARNSubmit = (): void => {
    if (!arnInput.trim()) {
      toast.error('ARN required');
      return;
    }
    const recordId = `gstr-1-${returnPeriod.toLowerCase()}`;
    recordFiling(recordId, arnInput.trim());
    logAudit({
      entityCode: entityId,
      action: 'create',
      entityType: 'comply360_event',
      recordId,
      recordLabel: `GSTR-1 Filing · ${activeGSTIN} · ${returnPeriod}`,
      beforeState: null,
      afterState: { gstin: activeGSTIN, return_period: returnPeriod, arn: arnInput.trim() },
      reason: 'gstr1_filing_recorded',
      sourceModule: 'GSTR1NativePage',
    });
    toast.success(`Filing recorded · ARN ${arnInput}`);
    setArnDialogOpen(false);
    setArnInput('');
  };


  const errorCount = builderResult?.errors.length ?? 0;
  const warnCount = builderResult?.warnings.length ?? 0;

  const renderRows = (rows: CrossCardSupply[]): JSX.Element => {
    if (rows.length === 0) {
      return (
        <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">
          No invoices in this section for the selected period.
        </TableCell></TableRow>
      );
    }
    return (
      <>
        {rows.map((s) => (
          <TableRow key={`${s.source_card}-${s.source_ref}`}>
            <TableCell className="font-mono">{s.invoice_no}</TableCell>
            <TableCell className="font-mono">{s.invoice_date}</TableCell>
            <TableCell className="font-mono">{s.gstin_recipient ?? '—'}</TableCell>
            <TableCell className="font-mono">{s.hsn_sac}</TableCell>
            <TableCell className="text-right font-mono">{inr(s.taxable_value)}</TableCell>
            <TableCell className="text-right font-mono">{inr(s.igst)}</TableCell>
            <TableCell className="text-right font-mono">{inr(s.cgst)}</TableCell>
            <TableCell className="text-right font-mono">{inr(s.sgst)}</TableCell>
          </TableRow>
        ))}
      </>
    );
  };

  const sectionMap: Record<TabKey, CrossCardSupply[]> = {
    b2b: grouped.b2b,
    b2cl: grouped.b2cl,
    b2cs: grouped.b2cs,
    export: [...grouped.export_with_pmt, ...grouped.export_without_pmt],
    cdnr: [],
    hsn: supplies,
  };

  if (!entityId || entityId === 'all') {
    return (
      <div className="p-6">
        <Card className="p-12 text-center">
          <Receipt className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-lg font-semibold mb-2">Select a company to continue</h2>
          <p className="text-muted-foreground">Choose an entity from the header dropdown to view GSTR-1.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">GSTR-1 · Outward Supplies Return</h1>
          <p className="text-muted-foreground text-sm">Native Comply360 builder · consumes Cross-Card aggregation</p>
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase">Outward Supplies</div>
          <div className="text-2xl font-mono font-semibold mt-1">{supplies.length}</div>
          <div className="text-xs text-muted-foreground mt-1">invoices in {returnPeriod}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase">Total Tax Liability</div>
          <div className="text-2xl font-mono font-semibold mt-1">{inr(totals.igst + totals.cgst + totals.sgst + totals.cess)}</div>
          <div className="text-xs text-muted-foreground mt-1">Taxable: {inr(totals.taxable_value)}</div>
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
        <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
          <TabsList>
            <TabsTrigger value="b2b">B2B (4A) · {grouped.b2b.length}</TabsTrigger>
            <TabsTrigger value="b2cl">B2CL (5A) · {grouped.b2cl.length}</TabsTrigger>
            <TabsTrigger value="b2cs">B2CS (7) · {grouped.b2cs.length}</TabsTrigger>
            <TabsTrigger value="export">Exports (6A) · {grouped.export_with_pmt.length + grouped.export_without_pmt.length}</TabsTrigger>
            <TabsTrigger value="cdnr">CDNR (9B)</TabsTrigger>
            <TabsTrigger value="hsn">HSN</TabsTrigger>
          </TabsList>

          {(['b2b', 'b2cl', 'b2cs', 'export', 'cdnr', 'hsn'] as TabKey[]).map(key => (
            <TabsContent key={key} value={key} className="mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice No</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Recipient GSTIN</TableHead>
                    <TableHead>HSN/SAC</TableHead>
                    <TableHead className="text-right">Taxable</TableHead>
                    <TableHead className="text-right">IGST</TableHead>
                    <TableHead className="text-right">CGST</TableHead>
                    <TableHead className="text-right">SGST</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>{renderRows(sectionMap[key])}</TableBody>
              </Table>
            </TabsContent>
          ))}
        </Tabs>
      </Card>

      <div className="flex items-center gap-2 flex-wrap">
        <Button onClick={() => setJsonOpen(true)} disabled={!builderResult}>
          <FileJson className="h-4 w-4 mr-1" /> Prepare JSON
        </Button>
        <Button variant="outline" onClick={handleDownloadCSV} disabled={supplies.length === 0}>
          <Download className="h-4 w-4 mr-1" /> Download Excel (CSV · P1)
        </Button>
        <Button variant="outline" onClick={handleSubmit} disabled={!builderResult}>
          <Send className="h-4 w-4 mr-1" /> Submit (P8 P2BB)
        </Button>
      </div>

      {supplies.length === 0 && activeGSTIN && (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">
            No outward supplies recorded for <span className="font-mono">{activeGSTIN}</span> in {returnPeriod}.
            Verify Sales/Export data is recorded for this period.
          </p>
        </Card>
      )}

      <Dialog open={jsonOpen} onOpenChange={setJsonOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
          <DialogHeader><DialogTitle>GSTR-1 Payload · {activeGSTIN} · {returnPeriod}</DialogTitle></DialogHeader>
          <pre className="text-xs font-mono bg-muted p-3 rounded overflow-auto max-h-[50vh]">
            {builderResult ? JSON.stringify(builderResult.payload, null, 2) : '—'}
          </pre>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              if (builderResult) {
                navigator.clipboard.writeText(JSON.stringify(builderResult.payload, null, 2));
                toast.success('Copied to clipboard');
              }
            }}>Copy</Button>
            <Button onClick={handleDownloadJSON}>Download</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={arnDialogOpen} onOpenChange={setArnDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record Filing · Enter ARN</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>ARN (from GSTN portal)</Label>
            <Input value={arnInput} onChange={(e) => setArnInput(e.target.value)} placeholder="AA0326123456789" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setArnDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleARNSubmit}>Record</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
