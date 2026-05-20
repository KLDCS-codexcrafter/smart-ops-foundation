/**
 * @file        src/pages/erp/eximx/import/CIList.tsx
 * @purpose     Commercial Invoice list · status badges · linked PO/MLGIT · Saathi tile
 * @sprint      T-Phase-1.EX-5-CommercialInvoice-6PartAllocation-CIFWaterfall
 */
import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, FileText, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEntityCode } from '@/hooks/useEntityCode';
import { loadCIs, countCIsWithRevaluation } from '@/lib/commercial-invoice-engine';
import { SINHA_COMMERCIAL_INVOICES } from '@/data/sinha-commercial-invoice-seed-data';
import type { CIStatus } from '@/types/commercial-invoice';

const STATE_CLASS: Record<CIStatus, string> = {
  draft: 'bg-muted text-muted-foreground',
  received_from_vendor: 'bg-primary/15 text-primary',
  sent_to_cha: 'bg-warning/15 text-warning',
  boe_filed: 'bg-warning/15 text-warning',
  reconciled: 'bg-success/15 text-success',
  closed: 'bg-muted text-muted-foreground',
  cancelled: 'bg-destructive/15 text-destructive',
};

export function CIList(): JSX.Element {
  const navigate = useNavigate();
  const { entityCode } = useEntityCode();
  const [search, setSearch] = useState('');

  const cis = useMemo(
    () => (entityCode ? loadCIs(entityCode) : SINHA_COMMERCIAL_INVOICES),
    [entityCode],
  );
  const revalCount = useMemo(() => countCIsWithRevaluation(cis), [cis]);
  const filtered = cis.filter((c) =>
    c.ci_number.toLowerCase().includes(search.toLowerCase()) ||
    c.related_import_po_no.toLowerCase().includes(search.toLowerCase()) ||
    c.vendor_invoice_no.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileText className="w-6 h-6" /> Commercial Invoices
        </h1>
        <p className="text-sm text-muted-foreground">
          6-Part Allocation · 6-basis CIF pro-rata · 10-row duty waterfall · {cis.length} invoices · {revalCount} with CICustomeVal revaluation
        </p>
      </div>

      <Card className="border-l-4 border-l-primary">
        <CardContent className="p-3 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-primary mt-0.5" />
          <span>
            <strong>Moats #15 + #1 + #9:</strong> Each CI line carries a 6-Part Allocation (Valuation · CIF Body ·
            Rule 10 Loadings · Duty Waterfall · Duty Summary · Per-Batch Expense Band). CICustomeVal edits cross-write
            ReconciliationEvents on the linked MLGIT (Moat #15 FULL ANCHOR). 6 CIF pro-rata bases honored (founder caveat).
          </span>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center justify-between">
            <span>Invoices ({filtered.length})</span>
            <div className="relative max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search CI · PO · Vendor Inv..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>CI No</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Vendor Inv</TableHead>
                <TableHead>PO</TableHead>
                <TableHead>MLGIT</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">FOB (₹)</TableHead>
                <TableHead className="text-right">CIF (₹)</TableHead>
                <TableHead className="text-right">Actual CIF (₹)</TableHead>
                <TableHead className="text-center">Reval</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => {
                const hasReval = c.lines.some((l) => l.allocation.part_c.customs_revaluation_history.length > 0);
                return (
                  <TableRow key={c.id} className="cursor-pointer hover:bg-muted/40" onClick={() => navigate(`/erp/eximx/import/commercial-invoices/${c.id}`)}>
                    <TableCell className="font-mono font-semibold">{c.ci_number}</TableCell>
                    <TableCell className="font-mono text-xs">{c.ci_date}</TableCell>
                    <TableCell className="font-mono text-xs">{c.vendor_invoice_no}</TableCell>
                    <TableCell className="font-mono text-xs">{c.related_import_po_no}</TableCell>
                    <TableCell className="font-mono text-xs">{c.related_mlgit_no ?? '—'}</TableCell>
                    <TableCell><Badge className={STATE_CLASS[c.status]}>{c.status}</Badge></TableCell>
                    <TableCell className="font-mono text-xs text-right">₹{c.total_fob_value_inr.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</TableCell>
                    <TableCell className="font-mono text-xs text-right">₹{c.total_cif_value_inr.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</TableCell>
                    <TableCell className="font-mono text-xs text-right">₹{c.total_actual_cif_inr.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</TableCell>
                    <TableCell className="text-center">{hasReval ? <Badge className="bg-warning/15 text-warning">Yes</Badge> : <Badge variant="outline">—</Badge>}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
