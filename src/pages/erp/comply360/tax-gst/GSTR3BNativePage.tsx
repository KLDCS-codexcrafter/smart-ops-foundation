/**
 * @file        src/pages/erp/comply360/tax-gst/GSTR3BNativePage.tsx
 * @purpose     NATIVE Comply360 GSTR-3B summary return · consumes builder + ECRS engines
 * @sprint      Sprint 71 · T-Phase-5.A.1.3 · Block 5 · Q-LOCK-3-P1-D
 * @decisions   D-S69-1 (100% native) · DP-S71-1 (GSTR-3B builder) · DP-S71-3 (ECRS)
 * @iso         Reliability · Auditability
 * @disciplines FR-7 · FR-13 · FR-19 (reads engines · never modifies them) · FR-91
 * @reads-from  comply360-gst-aggregator-engine · comply360-gstr-builder-engine ·
 *              comply360-ecrs-engine · comply360-statutory-memory · useEntityGSTINs · useEntityCode
 */
import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RefreshCcw, FileJson, Send, Receipt, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  aggregateOutwardSupplies,
  aggregateInwardSupplies,
  computeTotalTax,
  type CrossCardSupply,
} from '@/lib/comply360-gst-aggregator-engine';
import { buildGSTR3B, type GSTRBuilderResult } from '@/lib/comply360-gstr-builder-engine';
import {
  loadECRS,
  computeNetPayable,
  type ECRSBalance,
} from '@/lib/comply360-ecrs-engine';
import { recordFiling } from '@/lib/comply360-statutory-memory';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useEntityGSTINs } from '@/hooks/useEntityGSTINs';
import { logAudit } from '@/lib/audit-trail-engine'; // P8.4 · Block 4 residue · comply360_event

function defaultPeriod(): string {
  const d = new Date();
  const prev = new Date(d.getFullYear(), d.getMonth() - 1, 1);
  return `${String(prev.getMonth() + 1).padStart(2, '0')}-${prev.getFullYear()}`;
}

function inr(n: number): string {
  return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

export default function GSTR3BNativePage(): JSX.Element {
  const { entityId } = useEntityCode();
  const { gstins, activeGSTIN, setActiveGSTIN } = useEntityGSTINs(entityId);
  const [returnPeriod, setReturnPeriod] = useState<string>(defaultPeriod());
  const [refreshTick, setRefreshTick] = useState(0);
  const [jsonOpen, setJsonOpen] = useState(false);
  const [arnOpen, setArnOpen] = useState(false);
  const [arnInput, setArnInput] = useState('');

  const outward = useMemo<CrossCardSupply[]>(() => {
    if (!entityId || entityId === 'all' || !activeGSTIN) return [];
    return aggregateOutwardSupplies({ entity_id: entityId, gstin: activeGSTIN, fy: 'FY25-26', return_period: returnPeriod });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityId, activeGSTIN, returnPeriod, refreshTick]);

  const inward = useMemo<CrossCardSupply[]>(() => {
    if (!entityId || entityId === 'all' || !activeGSTIN) return [];
    return aggregateInwardSupplies({ entity_id: entityId, gstin: activeGSTIN, fy: 'FY25-26', return_period: returnPeriod });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityId, activeGSTIN, returnPeriod, refreshTick]);

  const builderResult = useMemo<GSTRBuilderResult | null>(() => {
    if (!activeGSTIN) return null;
    return buildGSTR3B(outward, inward, { gstin: activeGSTIN, return_period: returnPeriod });
  }, [outward, inward, activeGSTIN, returnPeriod]);

  const outwardTotals = useMemo(() => computeTotalTax(outward), [outward]);
  const inwardTotals = useMemo(() => computeTotalTax(inward), [inward]);

  const ledger = useMemo(() => {
    if (!entityId || entityId === 'all') return null;
    return loadECRS(entityId, returnPeriod);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityId, returnPeriod, refreshTick]);

  const liability: ECRSBalance = useMemo(() => ({
    igst: Math.max(0, outwardTotals.igst - inwardTotals.igst),
    cgst: Math.max(0, outwardTotals.cgst - inwardTotals.cgst),
    sgst: Math.max(0, outwardTotals.sgst - inwardTotals.sgst),
    cess: Math.max(0, outwardTotals.cess - inwardTotals.cess),
  }), [outwardTotals, inwardTotals]);

  const netPayable = useMemo(() => {
    if (!ledger) return liability;
    return computeNetPayable(liability, ledger);
  }, [liability, ledger]);

  const periodOptions = useMemo(() => {
    const out: string[] = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      out.push(`${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`);
    }
    return out;
  }, []);

  const handleDownload = (): void => {
    if (!builderResult) return;
    const blob = new Blob([JSON.stringify(builderResult.payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `GSTR3B_${activeGSTIN}_${returnPeriod}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('GSTR-3B JSON downloaded');
  };

  const handleSubmit = (): void => {
    toast.info('Direct submit available in Phase 8. Use JSON download + GSTN portal, then enter ARN.');
    setArnOpen(true);
  };

  const handleARN = (): void => {
    if (!arnInput.trim()) { toast.error('ARN required'); return; }
    const recordId = `gstr-3b-${returnPeriod.toLowerCase()}`;
    recordFiling(recordId, arnInput.trim());
    logAudit({
      entityCode: entityId,
      action: 'create',
      entityType: 'comply360_event',
      recordId,
      recordLabel: `GSTR-3B Filing · ${activeGSTIN} · ${returnPeriod}`,
      beforeState: null,
      afterState: { gstin: activeGSTIN, return_period: returnPeriod, arn: arnInput.trim(), net_payable: totalNet },
      reason: 'gstr3b_filing_recorded',
      sourceModule: 'GSTR3BNativePage',
    });
    toast.success(`Filing recorded · ARN ${arnInput}`);
    setArnOpen(false);
    setArnInput('');
  };


  if (!entityId || entityId === 'all') {
    return (
      <div className="p-6">
        <Card className="p-12 text-center">
          <Receipt className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-lg font-semibold mb-2">Select a company to continue</h2>
          <p className="text-muted-foreground">Choose an entity from the header dropdown to view GSTR-3B.</p>
        </Card>
      </div>
    );
  }

  const errorCount = builderResult?.errors.length ?? 0;
  const warnCount = builderResult?.warnings.length ?? 0;
  const totalNet = netPayable.igst + netPayable.cgst + netPayable.sgst + netPayable.cess;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">GSTR-3B · Summary Return</h1>
          <p className="text-muted-foreground text-sm">Native Comply360 summary return · ECRS-aware net payable</p>
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
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase">Outward Tax</div>
          <div className="text-xl font-mono font-semibold mt-1">{inr(outwardTotals.igst + outwardTotals.cgst + outwardTotals.sgst + outwardTotals.cess)}</div>
          <div className="text-xs text-muted-foreground mt-1">{outward.length} invoices</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase">ITC Available</div>
          <div className="text-xl font-mono font-semibold mt-1 text-emerald-500">{inr(inwardTotals.igst + inwardTotals.cgst + inwardTotals.sgst + inwardTotals.cess)}</div>
          <div className="text-xs text-muted-foreground mt-1">{inward.length} invoices</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase">Net Payable</div>
          <div className="text-xl font-mono font-semibold mt-1 text-amber-500">{inr(totalNet)}</div>
          <div className="text-xs text-muted-foreground mt-1">After ECRS offset</div>
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

      <Card className="p-4">
        <h2 className="text-sm font-semibold uppercase text-muted-foreground mb-3">3.1 Outward + RCM · Tax Liability</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Component</TableHead>
              <TableHead className="text-right">Taxable</TableHead>
              <TableHead className="text-right">IGST</TableHead>
              <TableHead className="text-right">CGST</TableHead>
              <TableHead className="text-right">SGST</TableHead>
              <TableHead className="text-right">Cess</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>Outward (taxable)</TableCell>
              <TableCell className="text-right font-mono">{inr(outwardTotals.taxable_value)}</TableCell>
              <TableCell className="text-right font-mono">{inr(outwardTotals.igst)}</TableCell>
              <TableCell className="text-right font-mono">{inr(outwardTotals.cgst)}</TableCell>
              <TableCell className="text-right font-mono">{inr(outwardTotals.sgst)}</TableCell>
              <TableCell className="text-right font-mono">{inr(outwardTotals.cess)}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>ITC (inward)</TableCell>
              <TableCell className="text-right font-mono">{inr(inwardTotals.taxable_value)}</TableCell>
              <TableCell className="text-right font-mono text-emerald-500">−{inr(inwardTotals.igst)}</TableCell>
              <TableCell className="text-right font-mono text-emerald-500">−{inr(inwardTotals.cgst)}</TableCell>
              <TableCell className="text-right font-mono text-emerald-500">−{inr(inwardTotals.sgst)}</TableCell>
              <TableCell className="text-right font-mono text-emerald-500">−{inr(inwardTotals.cess)}</TableCell>
            </TableRow>
            <TableRow className="font-semibold">
              <TableCell>Net Liability</TableCell>
              <TableCell className="text-right font-mono">—</TableCell>
              <TableCell className="text-right font-mono">{inr(liability.igst)}</TableCell>
              <TableCell className="text-right font-mono">{inr(liability.cgst)}</TableCell>
              <TableCell className="text-right font-mono">{inr(liability.sgst)}</TableCell>
              <TableCell className="text-right font-mono">{inr(liability.cess)}</TableCell>
            </TableRow>
            <TableRow className="font-semibold text-amber-500">
              <TableCell>Net Payable (after ECRS)</TableCell>
              <TableCell className="text-right font-mono">—</TableCell>
              <TableCell className="text-right font-mono">{inr(netPayable.igst)}</TableCell>
              <TableCell className="text-right font-mono">{inr(netPayable.cgst)}</TableCell>
              <TableCell className="text-right font-mono">{inr(netPayable.sgst)}</TableCell>
              <TableCell className="text-right font-mono">{inr(netPayable.cess)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Card>

      <div className="flex items-center gap-2 flex-wrap">
        <Button onClick={() => setJsonOpen(true)} disabled={!builderResult}>
          <FileJson className="h-4 w-4 mr-1" /> Prepare JSON
        </Button>
        <Button variant="outline" onClick={handleSubmit} disabled={!builderResult}>
          <Send className="h-4 w-4 mr-1" /> Submit (P8 P2BB)
        </Button>
      </div>

      <Dialog open={jsonOpen} onOpenChange={setJsonOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
          <DialogHeader><DialogTitle>GSTR-3B Payload · {activeGSTIN} · {returnPeriod}</DialogTitle></DialogHeader>
          <pre className="text-xs font-mono bg-muted p-3 rounded overflow-auto max-h-[50vh]">
            {builderResult ? JSON.stringify(builderResult.payload, null, 2) : '—'}
          </pre>
          <DialogFooter>
            <Button onClick={handleDownload}>Download</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={arnOpen} onOpenChange={setArnOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record Filing · Enter ARN</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>ARN (from GSTN portal)</Label>
            <Input value={arnInput} onChange={(e) => setArnInput(e.target.value)} placeholder="AB0326123456789" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setArnOpen(false)}>Cancel</Button>
            <Button onClick={handleARN}>Record</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
