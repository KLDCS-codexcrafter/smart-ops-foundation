/**
 * SecondarySalesRegister.tsx — Tally-Prime style Secondary Sales register on UTS foundation
 * Sprint T-Phase-1.2.6c · D-226 UTS compliant
 */

import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ShieldCheck } from 'lucide-react';

import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import { UniversalRegisterGrid } from '@/components/registers/UniversalRegisterGrid';
import { DrillBreadcrumb } from '@/components/registers/DrillBreadcrumb';
import { DrillSourceBanner } from '@/components/registers/DrillSourceBanner';
import { useDrillDown } from '@/hooks/useDrillDown';
import { ReportChart } from '@/components/operix-core/report-framework';
import { signReport, getKpi, defaultChartConfig } from '@/lib/report-framework';
import type {
  RegisterColumn, RegisterMeta, SummaryCard, StatusOption,
} from '@/components/registers/UniversalRegisterTypes';
import {
  secondarySalesKey, END_CUSTOMER_LABELS,
  type SecondarySales, type EndCustomerType,
} from '@/types/secondary-sales';
import { dSum } from '@/lib/decimal-helpers';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SecondarySalesDetailPanel } from './detail/SecondarySalesDetailPanel';
import { SecondarySalesPrint } from './print/SecondarySalesPrint';

const fmtINR = (n: number): string =>
  `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n)}`;

interface SecondarySalesRegisterPanelProps {
  initialFilter?: { sourceLabel?: string; endCustomerType?: EndCustomerType };
}

export function SecondarySalesRegisterPanel({ initialFilter }: SecondarySalesRegisterPanelProps = {}) {
  const { entityCode } = useCardEntitlement();
  const safeEntity = entityCode || 'SMRT';
  const drill = useDrillDown();
  const [printSec, setPrintSec] = useState<SecondarySales | null>(null);
  const [filter, setFilter] = useState(initialFilter);
  useEffect(() => { setFilter(initialFilter); }, [initialFilter]);

  const allSecs = useMemo<SecondarySales[]>(() => {
    try {
      // [JWT] GET /api/salesx/secondary-sales/:entityCode
      return JSON.parse(localStorage.getItem(secondarySalesKey(safeEntity)) || '[]') as SecondarySales[];
    } catch { return []; }
  }, [safeEntity]);

  const secs = useMemo(() => filter?.endCustomerType
    ? allSecs.filter(s => s.end_customer_type === filter.endCustomerType)
    : allSecs, [allSecs, filter]);

  const meta: RegisterMeta<SecondarySales> = {
    registerCode: 'secondary_sales_register',
    title: 'Secondary Sales Register',
    description: 'Distributor sell-through · drill for line items + print',
    dateAccessor: r => r.effective_date ?? r.sale_date,
  };

  const columns: RegisterColumn<SecondarySales>[] = [
    { key: 'no', label: 'Code', clickable: true, render: r => r.secondary_code, exportKey: 'secondary_code' },
    { key: 'date', label: 'Date', render: r => r.sale_date, exportKey: 'sale_date' },
    { key: 'eff', label: 'Effective', render: r => r.effective_date ?? r.sale_date, exportKey: r => r.effective_date ?? r.sale_date },
    { key: 'dist', label: 'Distributor', render: r => r.distributor_name, exportKey: 'distributor_name' },
    { key: 'ect', label: 'End Customer Type', render: r => END_CUSTOMER_LABELS[r.end_customer_type], exportKey: 'end_customer_type' },
    { key: 'enduser', label: 'End Customer', render: r => r.end_customer_name ?? '—', exportKey: r => r.end_customer_name ?? '' },
    { key: 'mode', label: 'Capture', render: r => r.capture_mode, exportKey: 'capture_mode' },
    { key: 'lines', label: 'Lines', align: 'right', render: r => r.lines.length, exportKey: r => r.lines.length },
    { key: 'total', label: 'Total ₹', align: 'right', render: r => fmtINR(r.total_amount), exportKey: 'total_amount' },
  ];

  const statusOptions: StatusOption[] = (Object.keys(END_CUSTOMER_LABELS) as EndCustomerType[])
    .map(t => ({ value: t, label: END_CUSTOMER_LABELS[t] }));

  const summaryBuilder = (f: SecondarySales[]): SummaryCard[] => [
    { label: 'Records', value: String(f.length) },
    { label: 'Sub-dealers', value: String(f.filter(s => s.end_customer_type === 'sub_dealer').length) },
    { label: 'Retailers', value: String(f.filter(s => s.end_customer_type === 'retailer').length) },
    { label: 'API Captured', value: String(f.filter(s => s.capture_mode === 'api').length), tone: 'positive' },
    { label: 'Total Value', value: fmtINR(dSum(f, s => s.total_amount)) },
  ];

  const expandedRow = (s: SecondarySales) => (
    <div className="space-y-2">
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Line Items</div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Item Code</TableHead>
            <TableHead>Item Name</TableHead>
            <TableHead>UOM</TableHead>
            <TableHead className="text-right">Qty</TableHead>
            <TableHead className="text-right">Rate ₹</TableHead>
            <TableHead className="text-right">Amount ₹</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {s.lines.map(l => (
            <TableRow key={l.id}>
              <TableCell className="text-xs font-mono">{l.item_code}</TableCell>
              <TableCell className="text-xs">{l.item_name}</TableCell>
              <TableCell className="text-xs">{l.uom}</TableCell>
              <TableCell className="text-right text-xs font-mono">{l.qty}</TableCell>
              <TableCell className="text-right text-xs font-mono">{fmtINR(l.rate)}</TableCell>
              <TableCell className="text-right text-xs font-mono">{fmtINR(l.amount)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  const currentSec = drill.current?.payload as SecondarySales | undefined;

  const chartRows = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of allSecs) {
      const d = (s.effective_date ?? s.sale_date ?? '').slice(0, 10);
      if (!d) continue;
      m.set(d, (m.get(d) ?? 0) + s.total_amount);
    }
    return Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([date, secondary_value]) => ({ date, secondary_value }));
  }, [allSecs]);
  const chartConfig = getKpi('sx-secondary')?.defaultChart ?? defaultChartConfig({
    chartType: 'line', xKey: 'date',
    series: [{ key: 'secondary_value', label: 'Secondary Value ₹' }],
    title: 'Secondary sales by date',
  });
  const integrityHash = useMemo(() => signReport(chartRows), [chartRows]);
  const shortHash = integrityHash.replace('fnv1a:', '').slice(0, 10);

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      <DrillSourceBanner sourceLabel={filter?.sourceLabel} onClear={() => setFilter(undefined)} />
      <DrillBreadcrumb rootLabel="Secondary Sales Register" trail={drill.trail} onGoTo={drill.goTo} onReset={drill.reset} />
      {!currentSec ? (
        <UniversalRegisterGrid<SecondarySales>
          entityCode={safeEntity}
          meta={meta}
          rows={secs}
          columns={columns}
          summaryBuilder={summaryBuilder}
          getExpandedRows={expandedRow}
          onNavigateToRecord={(s) => drill.push({
            id: `sec:${s.id}`, label: s.secondary_code, level: 1,
            module: 'secondary_sales_register', payload: s,
          })}
          statusOptions={statusOptions}
          statusKey="end_customer_type"
        />
      ) : (
        <SecondarySalesDetailPanel sec={currentSec} onPrint={() => setPrintSec(currentSec)} />
      )}
      <Dialog open={!!printSec} onOpenChange={o => { if (!o) setPrintSec(null); }}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          {printSec && <SecondarySalesPrint sec={printSec} onClose={() => setPrintSec(null)} />}
        </DialogContent>
      </Dialog>
      <Card className="p-3 space-y-2" data-testid="sx-secondary-dashboard-host">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-[10px] font-mono" data-testid="sx-secondary-integrity-badge" title={integrityHash}>
            <ShieldCheck className="h-3 w-3 mr-1" />{shortHash}
          </Badge>
        </div>
        {chartRows.length === 0 ? (
          <div className="text-sm text-muted-foreground py-6 text-center">No secondary sales yet</div>
        ) : (
          <div className="w-full h-72" data-testid="sx-secondary-chart-host">
            <ReportChart data={chartRows} config={chartConfig} />
          </div>
        )}
      </Card>
    </div>
  );
}

