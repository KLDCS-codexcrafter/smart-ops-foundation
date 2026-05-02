/**
 * AgedGITReport.tsx — Aged Goods-in-Transit report
 * Sprint T-Phase-1.2.4 · Lists vendor invoices booked but physical receipt pending,
 * aged by days outstanding. Click "Confirm Receipt" to navigate to Stage 2 of GRN.
 *
 * [JWT] GET /api/inventory/grn?status=in_transit&entity=
 */
import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Truck, AlertTriangle, IndianRupee, CheckCircle2 } from 'lucide-react';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import { grnsKey, type GRN } from '@/types/grn';
import { dAdd, round2 } from '@/lib/decimal-helpers';
import { cn } from '@/lib/utils';

const fmtINR = (n: number): string =>
  `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n)}`;

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

const daysSince = (iso?: string | null): number => {
  if (!iso) return 0;
  const ms = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(ms / (24 * 60 * 60 * 1000)));
};

function loadGrns(key: string): GRN[] {
  // [JWT] GET /api/inventory/grn
  try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
}

interface AgedGITReportPanelProps {
  onNavigate?: (module: import('../InventoryHubSidebar.types').InventoryHubModule, ctx?: import('@/types/drill-context').DrillNavigationContext) => void;
}

export function AgedGITReportPanel({ onNavigate }: AgedGITReportPanelProps = {}) {
  void onNavigate;
  const { entityCode } = useCardEntitlement();
  const safeEntity = entityCode || 'DEMO';

  const inTransit = useMemo<GRN[]>(() => {
    const all = loadGrns(grnsKey(safeEntity));
    return all
      .filter(g => g.status === 'in_transit')
      .sort((a, b) => {
        const aT = a.invoice_received_at ?? a.created_at;
        const bT = b.invoice_received_at ?? b.created_at;
        return aT.localeCompare(bT); // oldest first
      });
  }, [safeEntity]);

  const kpis = useMemo(() => {
    let totalValue = 0;
    let b03 = 0, b47 = 0, b814 = 0, b15 = 0;
    for (const g of inTransit) {
      totalValue = dAdd(totalValue, g.total_value);
      const d = daysSince(g.invoice_received_at ?? g.created_at);
      if (d <= 3) b03 += 1;
      else if (d <= 7) b47 += 1;
      else if (d <= 14) b814 += 1;
      else b15 += 1;
    }
    return { totalValue: round2(totalValue), b03, b47, b814, b15 };
  }, [inTransit]);

  const navigateToStage2 = (grnId: string) => {
    // [JWT] navigate to GRN stage-2 form. For now, dispatch a CustomEvent the
    // sidebar can pick up; fall back to alerting the user with the ID.
    window.dispatchEvent(new CustomEvent('inventory-hub:open-grn-stage2', { detail: { grnId } }));
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Truck className="h-6 w-6 text-amber-500" />
            Aged Goods in Transit
          </h1>
          <p className="text-sm text-muted-foreground">
            Vendor invoices booked but material physical receipt pending
          </p>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <IndianRupee className="h-3 w-3" /> Value in Transit
            </CardDescription>
            <CardTitle className="text-xl font-mono">{fmtINR(kpis.totalValue)}</CardTitle>
          </CardHeader>
        </Card>
        <Card><CardHeader className="pb-2"><CardDescription>0-3 days</CardDescription>
          <CardTitle className="text-xl font-mono">{kpis.b03}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>4-7 days</CardDescription>
          <CardTitle className="text-xl font-mono">{kpis.b47}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>8-14 days</CardDescription>
          <CardTitle className="text-xl font-mono text-amber-600">{kpis.b814}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>15+ days</CardDescription>
          <CardTitle className="text-xl font-mono text-rose-600">{kpis.b15}</CardTitle></CardHeader></Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                {['GRN No', 'Vendor', 'Invoice No', 'Invoice Date', 'Days In Transit', 'Lines', 'Value', ''].map(h => (
                  <TableHead key={h} className="text-xs font-semibold uppercase">{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {inTransit.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    <CheckCircle2 className="h-10 w-10 mx-auto mb-2 opacity-30 text-emerald-500" />
                    <p className="text-sm">No goods in transit · all material received</p>
                  </TableCell>
                </TableRow>
              ) : inTransit.map(g => {
                const days = daysSince(g.invoice_received_at ?? g.created_at);
                const isCritical = days >= 15;
                const isWarning = days >= 8 && days < 15;
                return (
                  <TableRow
                    key={g.id}
                    className={cn(
                      isCritical && 'bg-rose-500/10 hover:bg-rose-500/15',
                      isWarning && 'bg-amber-500/10 hover:bg-amber-500/15',
                    )}
                  >
                    <TableCell><code className="text-xs font-mono">{g.grn_no}</code></TableCell>
                    <TableCell className="text-sm">{g.vendor_name}</TableCell>
                    <TableCell className="text-xs font-mono">{g.vendor_invoice_no || '—'}</TableCell>
                    <TableCell className="text-xs">
                      {g.vendor_invoice_date ? fmtDate(g.vendor_invoice_date) : '—'}
                    </TableCell>
                    <TableCell className="text-xs font-mono">
                      <span className="flex items-center gap-1">
                        {days} {days === 1 ? 'day' : 'days'}
                        {isCritical && <AlertTriangle className="h-3 w-3 text-rose-600" />}
                        {isWarning && <AlertTriangle className="h-3 w-3 text-amber-600" />}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs font-mono">{g.lines.length}</TableCell>
                    <TableCell className="text-xs font-mono">{fmtINR(g.total_value)}</TableCell>
                    <TableCell>
                      <Button
                        size="sm" variant="outline"
                        className="h-7 text-xs gap-1"
                        onClick={() => navigateToStage2(g.id)}
                      >
                        <CheckCircle2 className="h-3 w-3" /> Confirm Receipt
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {kpis.b15 > 0 && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-300 text-xs">
          <AlertTriangle className="h-4 w-4" />
          <span>
            <Badge variant="outline" className="border-rose-500/40 text-rose-700 mr-1">{kpis.b15}</Badge>
            shipment(s) aged 15+ days · escalate to vendor or write off
          </span>
        </div>
      )}
    </div>
  );
}
