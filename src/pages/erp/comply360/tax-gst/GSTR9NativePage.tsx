/**
 * @file        src/pages/erp/comply360/tax-gst/GSTR9NativePage.tsx
 * @purpose     NATIVE Comply360 GSTR-9 annual return surface · consumes buildGSTR9 extension
 * @sprint      Sprint 74a · T-Phase-5.A.1.6-PASS-A · Block 6 · Q19 Annual Returns
 * @decisions   D-S69-1 · DP-S74-2 (builder extended in place)
 * @disciplines FR-7 · FR-13 · FR-19 (reads engines · 0-DIFF) · FR-91
 * @reads-from  comply360-gst-aggregator-engine · comply360-gstr-builder-engine (buildGSTR9) ·
 *              comply360-statutory-memory · useEntityGSTINs · useEntityCode
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
import { RefreshCcw, FileJson, Receipt, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  aggregateOutwardSupplies,
  aggregateInwardSupplies,
  type CrossCardSupply,
} from '@/lib/comply360-gst-aggregator-engine';
import { buildGSTR9, type GSTRBuilderResult } from '@/lib/comply360-gstr-builder-engine';
import { recordFiling } from '@/lib/comply360-statutory-memory';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useEntityGSTINs } from '@/hooks/useEntityGSTINs';

function inr(n: number): string {
  return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

const FY_OPTIONS = ['2024-25', '2023-24', '2022-23'];

export default function GSTR9NativePage(): JSX.Element {
  const { entityId } = useEntityCode();
  const { gstins, activeGSTIN, setActiveGSTIN } = useEntityGSTINs(entityId);
  const [fy, setFy] = useState<string>('2024-25');
  const [refreshTick, setRefreshTick] = useState(0);
  const [jsonOpen, setJsonOpen] = useState(false);
  const [arnOpen, setArnOpen] = useState(false);
  const [arnInput, setArnInput] = useState('');

  // Annual aggregation: combine the 12 monthly periods. Phase-1 approximation:
  // pull from FY tag aggregator (single call) — refines in Phase 2.
  const outward = useMemo<CrossCardSupply[]>(() => {
    if (!entityId || entityId === 'all' || !activeGSTIN) return [];
    return aggregateOutwardSupplies({ entity_id: entityId, gstin: activeGSTIN, fy: `FY${fy}`, return_period: '04-2025' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityId, activeGSTIN, fy, refreshTick]);

  const inward = useMemo<CrossCardSupply[]>(() => {
    if (!entityId || entityId === 'all' || !activeGSTIN) return [];
    return aggregateInwardSupplies({ entity_id: entityId, gstin: activeGSTIN, fy: `FY${fy}`, return_period: '04-2025' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityId, activeGSTIN, fy, refreshTick]);

  const builderResult = useMemo<GSTRBuilderResult | null>(() => {
    if (!activeGSTIN) return null;
    return buildGSTR9(outward, inward, { gstin: activeGSTIN, fy });
  }, [outward, inward, activeGSTIN, fy]);

  const payload = builderResult?.payload as Record<string, unknown> | undefined;
  const tbl4 = (payload?.tbl4 as { pt4A: { txval: number; iamt: number; camt: number; samt: number; csamt: number } } | undefined)?.pt4A;
  const tbl5 = (payload?.tbl5 as { pt5A: { txval: number } } | undefined)?.pt5A;
  const tbl6 = (payload?.tbl6 as { pt6A: { iamt: number; camt: number; samt: number; csamt: number } } | undefined)?.pt6A;

  const handleDownload = (): void => {
    if (!builderResult) return;
    const blob = new Blob([JSON.stringify(builderResult.payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `GSTR9_${activeGSTIN}_FY${fy}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('GSTR-9 JSON downloaded');
  };

  const handleARN = (): void => {
    if (!arnInput.trim()) { toast.error('ARN required'); return; }
    recordFiling(`gstr-9-fy${fy.replace('-', '')}`, arnInput.trim());
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
          <p className="text-muted-foreground">Choose an entity from the header dropdown to view GSTR-9.</p>
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
          <h1 className="text-2xl font-semibold">GSTR-9 · Annual Return</h1>
          <p className="text-muted-foreground text-sm">Consolidates 12 monthly filings into Tables 4–17 (GSTN annual schema)</p>
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
          <Select value={fy} onValueChange={setFy}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {FY_OPTIONS.map(f => <SelectItem key={f} value={f}>FY {f}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => setRefreshTick(t => t + 1)}>
            <RefreshCcw className="h-4 w-4 mr-1" /> Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase">Tbl 4 · Taxable Outward</div>
          <div className="text-xl font-mono font-semibold mt-1">{inr(tbl4?.txval ?? 0)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase">Tbl 5 · Zero / Exempt</div>
          <div className="text-xl font-mono font-semibold mt-1">{inr(tbl5?.txval ?? 0)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase">Tbl 6 · ITC Availed</div>
          <div className="text-xl font-mono font-semibold mt-1 text-emerald-500">
            {inr((tbl6?.iamt ?? 0) + (tbl6?.camt ?? 0) + (tbl6?.samt ?? 0) + (tbl6?.csamt ?? 0))}
          </div>
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
        <h2 className="text-sm font-semibold uppercase text-muted-foreground mb-3">Tbl 9 · Tax Payable vs Paid via ITC</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Component</TableHead>
              <TableHead className="text-right">IGST</TableHead>
              <TableHead className="text-right">CGST</TableHead>
              <TableHead className="text-right">SGST</TableHead>
              <TableHead className="text-right">Cess</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>Tax Payable</TableCell>
              <TableCell className="text-right font-mono">{inr(tbl4?.iamt ?? 0)}</TableCell>
              <TableCell className="text-right font-mono">{inr(tbl4?.camt ?? 0)}</TableCell>
              <TableCell className="text-right font-mono">{inr(tbl4?.samt ?? 0)}</TableCell>
              <TableCell className="text-right font-mono">{inr(tbl4?.csamt ?? 0)}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Paid via ITC</TableCell>
              <TableCell className="text-right font-mono text-emerald-500">−{inr(tbl6?.iamt ?? 0)}</TableCell>
              <TableCell className="text-right font-mono text-emerald-500">−{inr(tbl6?.camt ?? 0)}</TableCell>
              <TableCell className="text-right font-mono text-emerald-500">−{inr(tbl6?.samt ?? 0)}</TableCell>
              <TableCell className="text-right font-mono text-emerald-500">−{inr(tbl6?.csamt ?? 0)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Card>

      <div className="flex items-center gap-2 flex-wrap">
        <Button onClick={() => setJsonOpen(true)} disabled={!builderResult}>
          <FileJson className="h-4 w-4 mr-1" /> Prepare JSON
        </Button>
        <Button variant="outline" onClick={() => setArnOpen(true)} disabled={!builderResult}>
          Record ARN
        </Button>
      </div>

      <Dialog open={jsonOpen} onOpenChange={setJsonOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
          <DialogHeader><DialogTitle>GSTR-9 Payload · {activeGSTIN} · FY {fy}</DialogTitle></DialogHeader>
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
