/**
 * @file        src/pages/erp/eximx/import/ImportPOList.tsx
 * @purpose     Import PO list · status badges · search · navigate to new/detail
 * @sprint      T-Phase-1.EX-3-ImportPO-ForeignVendor-DualRate
 * @decisions   EX-3-Q12=a list route
 */
import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, FileText, AlertCircle, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEntityCode } from '@/hooks/useEntityCode';
import { loadImportPOs } from '@/lib/import-po-engine';
import { SINHA_IMPORT_POS } from '@/data/sinha-import-po-seed-data';
import type { ImportPOStatus } from '@/types/import-purchase-order';
// RPT-2b-i · additive chart wrap
import { TableChartToggle } from '@/components/operix-core/report-framework';
import { signReport, getKpi, defaultChartConfig } from '@/lib/report-framework';
import { useDrillDown } from '@/hooks/useDrillDown';


const STATUS_COLOR: Record<ImportPOStatus, string> = {
  draft: 'bg-muted text-muted-foreground',
  pending_approval: 'bg-warning/20 text-warning',
  approved: 'bg-success/20 text-success',
  sent_to_vendor: 'bg-primary/20 text-primary',
  in_transit: 'bg-accent/20 text-accent-foreground',
  goods_arrived: 'bg-primary/20 text-primary',
  boe_filed: 'bg-success/20 text-success',
  closed: 'bg-muted text-muted-foreground',
  cancelled: 'bg-destructive/20 text-destructive',
};

export function ImportPOList(): JSX.Element {
  const navigate = useNavigate();
  const { entityCode } = useEntityCode();
  const [search, setSearch] = useState('');

  const pos = useMemo(() => (entityCode ? loadImportPOs(entityCode) : SINHA_IMPORT_POS), [entityCode]);
  const filtered = pos.filter((p) =>
    p.po_number.toLowerCase().includes(search.toLowerCase()) ||
    p.foreign_vendor_id.toLowerCase().includes(search.toLowerCase()) ||
    p.currency_code.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><FileText className="w-6 h-6" /> Import Orders</h1>
          <p className="text-sm text-muted-foreground">Cross-border Purchase Orders · 11 Incoterms · Dual Rate Discipline (Moat #16) · {pos.length} active</p>
        </div>
        <Button onClick={() => navigate('/erp/eximx/import/orders/new')}>
          <Plus className="w-4 h-4 mr-2" /> New Import PO
        </Button>
      </div>

      <Card className="border-l-4 border-l-primary">
        <CardContent className="p-3 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-primary mt-0.5" />
          <span><strong>Dual Rate Discipline (Moat #16):</strong> Booking rate (Purchase dept) governs PO. Customs valuation rate (Import dept) governs BoE filing duties. The rate ladder on each PO tracks both with audit trail.</span>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center justify-between">
            <span>All Import POs ({filtered.length})</span>
            <div className="relative max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search PO · vendor · currency..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>PO Number</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Currency</TableHead>
                <TableHead>Booking Rate</TableHead>
                <TableHead>Incoterm</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Lines</TableHead>
                <TableHead>Est. Landed (INR)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((po) => (
                <TableRow key={po.id} className="cursor-pointer hover:bg-muted/40" onClick={() => navigate(`/erp/eximx/import/orders/${po.id}`)}>
                  <TableCell className="font-mono font-semibold">{po.po_number}</TableCell>
                  <TableCell className="font-mono text-xs">{po.foreign_vendor_id}</TableCell>
                  <TableCell><Badge variant="outline">{po.currency_code}</Badge></TableCell>
                  <TableCell className="font-mono">{po.booking_rate.toFixed(2)}</TableCell>
                  <TableCell><Badge>{po.incoterm}</Badge></TableCell>
                  <TableCell><Badge className={STATUS_COLOR[po.status]}>{po.status}</Badge></TableCell>
                  <TableCell className="text-center">{po.lines.length}</TableCell>
                  <TableCell className="font-mono text-xs">₹{po.estimated_landed_inr.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
