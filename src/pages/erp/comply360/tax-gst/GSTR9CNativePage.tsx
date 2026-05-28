/**
 * @file        src/pages/erp/comply360/tax-gst/GSTR9CNativePage.tsx
 * @purpose     NATIVE Comply360 GSTR-9C reconciliation surface · books vs GSTR-9 variances
 * @sprint      Sprint 74a · T-Phase-5.A.1.6-PASS-A · Block 6 · Q19 Annual Returns
 * @decisions   D-S69-1 · DP-S74-2 (buildGSTR9C) · DP-S74-4 (gstr9-reco SIBLING)
 * @disciplines FR-7 · FR-13 · FR-19 · FR-91
 * @reads-from  comply360-gstr-builder-engine (buildGSTR9 + buildGSTR9C) ·
 *              comply360-gstr9-reco-engine (reconcileGSTR9C)
 */
import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ShieldCheck, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  aggregateOutwardSupplies,
  aggregateInwardSupplies,
  type CrossCardSupply,
} from '@/lib/comply360-gst-aggregator-engine';
import {
  buildGSTR9,
  buildGSTR9C,
  type BooksAnnualTotals,
  type AuditorCertification,
} from '@/lib/comply360-gstr-builder-engine';
import { reconcileGSTR9C } from '@/lib/comply360-gstr9-reco-engine';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useEntityGSTINs } from '@/hooks/useEntityGSTINs';
import type { GSTR9Payload } from '@/lib/gst-portal-service';

function inr(n: number): string {
  return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

const FY_OPTIONS = ['2024-25', '2023-24'];

export default function GSTR9CNativePage(): JSX.Element {
  const { entityId } = useEntityCode();
  const { gstins, activeGSTIN, setActiveGSTIN } = useEntityGSTINs(entityId);
  const [fy, setFy] = useState<string>('2024-25');
  const [books, setBooks] = useState<BooksAnnualTotals>({
    turnover_per_books: 0,
    tax_per_books: 0,
    itc_per_books: 0,
  });
  const [auditor, setAuditor] = useState<AuditorCertification>({
    auditor_name: '',
    membership_no: '',
    firm_name: '',
    certification_date: new Date().toISOString().slice(0, 10),
  });

  const outward = useMemo<CrossCardSupply[]>(() => {
    if (!entityId || entityId === 'all' || !activeGSTIN) return [];
    return aggregateOutwardSupplies({ entity_id: entityId, gstin: activeGSTIN, fy: `FY${fy}`, return_period: '04-2025' });
  }, [entityId, activeGSTIN, fy]);

  const inward = useMemo<CrossCardSupply[]>(() => {
    if (!entityId || entityId === 'all' || !activeGSTIN) return [];
    return aggregateInwardSupplies({ entity_id: entityId, gstin: activeGSTIN, fy: `FY${fy}`, return_period: '04-2025' });
  }, [entityId, activeGSTIN, fy]);

  const gstr9 = useMemo(() => {
    if (!activeGSTIN) return null;
    return buildGSTR9(outward, inward, { gstin: activeGSTIN, fy });
  }, [outward, inward, activeGSTIN, fy]);

  const reco = useMemo(() => {
    if (!gstr9) return null;
    const payload = gstr9.payload as unknown as GSTR9Payload;
    return reconcileGSTR9C(payload, books);
  }, [gstr9, books]);

  const handleCertify = (): void => {
    if (!auditor.auditor_name || !auditor.membership_no) {
      toast.error('Auditor name and membership no. required');
      return;
    }
    if (!gstr9) return;
    const payload = gstr9.payload as unknown as GSTR9Payload;
    const out = buildGSTR9C(payload, books, auditor);
    if (out.errors.length > 0) {
      toast.error(`Certification rejected: ${out.errors[0].message}`);
      return;
    }
    toast.success(`GSTR-9C certified · ${out.warnings.length} variance flag(s)`);
  };

  if (!entityId || entityId === 'all') {
    return (
      <div className="p-6">
        <Card className="p-12 text-center">
          <ShieldCheck className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-lg font-semibold mb-2">Select a company to continue</h2>
          <p className="text-muted-foreground">Choose an entity to certify GSTR-9C reconciliation.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">GSTR-9C · Reconciliation Statement</h1>
          <p className="text-muted-foreground text-sm">Books vs GSTR-9 · Part B auditor certification</p>
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
        </div>
      </div>

      <Card className="p-4">
        <h2 className="text-sm font-semibold uppercase text-muted-foreground mb-3">Books-side totals (auditor input)</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label>Turnover per books</Label>
            <Input
              type="number"
              value={books.turnover_per_books || ''}
              onChange={(e) => setBooks({ ...books, turnover_per_books: Number(e.target.value) || 0 })}
            />
          </div>
          <div className="space-y-1">
            <Label>Tax per books</Label>
            <Input
              type="number"
              value={books.tax_per_books || ''}
              onChange={(e) => setBooks({ ...books, tax_per_books: Number(e.target.value) || 0 })}
            />
          </div>
          <div className="space-y-1">
            <Label>ITC per books</Label>
            <Input
              type="number"
              value={books.itc_per_books || ''}
              onChange={(e) => setBooks({ ...books, itc_per_books: Number(e.target.value) || 0 })}
            />
          </div>
        </div>
      </Card>

      {reco && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold uppercase text-muted-foreground">Reconciliation · 3 buckets</h2>
            {reco.overall === 'pass'
              ? <Badge className="bg-emerald-600"><CheckCircle2 className="h-3 w-3 mr-1" />Clean</Badge>
              : reco.overall === 'warn'
                ? <Badge variant="secondary">Warn</Badge>
                : <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Fail</Badge>}
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bucket</TableHead>
                <TableHead className="text-right">Per GSTR-9</TableHead>
                <TableHead className="text-right">Per Books</TableHead>
                <TableHead className="text-right">Variance</TableHead>
                <TableHead>Severity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reco.variances.map((v) => (
                <TableRow key={v.bucket}>
                  <TableCell className="capitalize">{v.bucket}</TableCell>
                  <TableCell className="text-right font-mono">{inr(v.per_gstr9)}</TableCell>
                  <TableCell className="text-right font-mono">{inr(v.per_books)}</TableCell>
                  <TableCell className="text-right font-mono">{inr(v.delta)}</TableCell>
                  <TableCell>
                    {v.severity === 'pass'
                      ? <Badge variant="default" className="bg-emerald-600">pass</Badge>
                      : v.severity === 'warn'
                        ? <Badge variant="secondary">warn</Badge>
                        : <Badge variant="destructive">fail</Badge>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Card className="p-4">
        <h2 className="text-sm font-semibold uppercase text-muted-foreground mb-3">Part B · Auditor certification</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="space-y-1">
            <Label>Auditor name</Label>
            <Input value={auditor.auditor_name} onChange={(e) => setAuditor({ ...auditor, auditor_name: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Membership no.</Label>
            <Input value={auditor.membership_no} onChange={(e) => setAuditor({ ...auditor, membership_no: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Firm name</Label>
            <Input value={auditor.firm_name} onChange={(e) => setAuditor({ ...auditor, firm_name: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Certification date</Label>
            <Input type="date" value={auditor.certification_date} onChange={(e) => setAuditor({ ...auditor, certification_date: e.target.value })} />
          </div>
        </div>
        <div className="mt-4">
          <Button onClick={handleCertify} disabled={!reco}>
            <ShieldCheck className="h-4 w-4 mr-1" /> Certify Part B
          </Button>
        </div>
      </Card>
    </div>
  );
}
