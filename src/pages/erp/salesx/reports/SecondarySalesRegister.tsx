/**
 * SecondarySalesRegister.tsx — Tally-Prime style Secondary Sales register on UTS foundation
 * Sprint T-Phase-1.2.6c · D-226 UTS compliant
 */

import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import { UniversalRegisterGrid } from '@/components/registers/UniversalRegisterGrid';
import { DrillBreadcrumb } from '@/components/registers/DrillBreadcrumb';
import { DrillSourceBanner } from '@/components/registers/DrillSourceBanner';
import { useDrillDown } from '@/hooks/useDrillDown';
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
    </div>
  );
}

declare global {
  interface Window { __secondary_sales_unused__?: Badge }
}
