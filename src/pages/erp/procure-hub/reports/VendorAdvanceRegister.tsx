/**
 * @file        VendorAdvanceRegister.tsx
 * @sprint      T-Phase-2.HK-5-2 · Block H · D-NEW-GP
 * @purpose     Register of vendor advances · status badges · outstanding summary
 */
import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Wallet, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { useEntityCode } from '@/hooks/useEntityCode';
import {
  listVendorAdvances,
  getOutstandingAdvances,
  refundUnusedAdvance,
} from '@/lib/vendor-advance-engine';
import type { VendorAdvance, VendorAdvanceStatus } from '@/types/vendor-advance';

const inr = (n: number): string =>
  '₹' + new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n);

const fmtDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

const STATUS_VARIANT: Record<VendorAdvanceStatus, string> = {
  paid: 'bg-primary/10 text-primary',
  partial_adjusted: 'bg-warning/10 text-warning',
  fully_adjusted: 'bg-success/10 text-success',
  refunded: 'bg-muted text-muted-foreground',
};

const STATUS_LABEL: Record<VendorAdvanceStatus, string> = {
  paid: 'Paid',
  partial_adjusted: 'Partial Adjusted',
  fully_adjusted: 'Fully Adjusted',
  refunded: 'Refunded',
};

export function VendorAdvanceRegister(): JSX.Element {
  const { entityCode } = useEntityCode();
  const [refresh, setRefresh] = useState(0);

  const advances = useMemo<VendorAdvance[]>(
    () => listVendorAdvances(entityCode),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entityCode, refresh],
  );
  const outstanding = useMemo(
    () => getOutstandingAdvances(entityCode),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entityCode, refresh],
  );

  useEffect(() => { /* mount */ }, []);

  const handleRefund = (id: string): void => {
    const updated = refundUnusedAdvance(entityCode, id);
    if (updated) {
      toast.success('Advance marked refunded');
      setRefresh((r) => r + 1);
    } else {
      toast.error('Refund failed');
    }
  };

  const totalOutstanding = outstanding.reduce((s, o) => s + o.outstanding_amount, 0);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Wallet className="h-6 w-6 text-primary" /> Vendor Advance Register
        </h1>
        <p className="text-sm text-muted-foreground">
          N1 · All advances · outstanding vs adjusted · refund unused.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground uppercase">Total Advances</div>
          <div className="text-2xl font-mono font-bold mt-1">{advances.length}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground uppercase">Vendors w/ Outstanding</div>
          <div className="text-2xl font-mono font-bold mt-1">{outstanding.length}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground uppercase">Outstanding ₹</div>
          <div className="text-2xl font-mono font-bold mt-1">{inr(totalOutstanding)}</div>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Advances</CardTitle></CardHeader>
        <CardContent className="p-0">
          {advances.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No advances recorded yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Paid On</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>PO</TableHead>
                  <TableHead className="text-right">Advance</TableHead>
                  <TableHead className="text-right">Adjusted</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {advances.map((a) => {
                  const out = a.advance_amount - a.advance_adjusted_amount;
                  const canRefund = a.status === 'paid' || a.status === 'partial_adjusted';
                  return (
                    <TableRow key={a.id}>
                      <TableCell className="font-mono text-xs">{fmtDate(a.advance_paid_at)}</TableCell>
                      <TableCell>{a.vendor_name}</TableCell>
                      <TableCell className="font-mono text-xs">{a.po_no ?? '—'}</TableCell>
                      <TableCell className="text-right font-mono">{inr(a.advance_amount)}</TableCell>
                      <TableCell className="text-right font-mono">{inr(a.advance_adjusted_amount)}</TableCell>
                      <TableCell className="text-right font-mono">{inr(out)}</TableCell>
                      <TableCell>
                        <Badge className={STATUS_VARIANT[a.status]}>{STATUS_LABEL[a.status]}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {canRefund && (
                          <Button size="sm" variant="ghost" onClick={() => handleRefund(a.id)}>
                            <RotateCcw className="h-3 w-3 mr-1" /> Refund
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
