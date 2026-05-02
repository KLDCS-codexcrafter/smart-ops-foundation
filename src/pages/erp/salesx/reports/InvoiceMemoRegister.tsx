/**
 * InvoiceMemoRegister.tsx — Tally-Prime style IM register on UTS foundation
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
  invoiceMemosKey, IM_STATUS_LABELS,
  type InvoiceMemo, type IMStatus,
} from '@/types/invoice-memo';
import { dSum } from '@/lib/decimal-helpers';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { IMDetailPanel } from './detail/IMDetailPanel';
import { IMPrint } from './print/IMPrint';

const fmtINR = (n: number): string =>
  `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n)}`;

interface IMRegisterPanelProps {
  initialFilter?: { sourceLabel?: string; status?: IMStatus };
}

export function InvoiceMemoRegisterPanel({ initialFilter }: IMRegisterPanelProps = {}) {
  const { entityCode } = useCardEntitlement();
  const safeEntity = entityCode || 'SMRT';
  const drill = useDrillDown();
  const [printIM, setPrintIM] = useState<InvoiceMemo | null>(null);
  const [filter, setFilter] = useState(initialFilter);
  useEffect(() => { setFilter(initialFilter); }, [initialFilter]);

  const allIms = useMemo<InvoiceMemo[]>(() => {
    try {
      // [JWT] GET /api/salesx/invoice-memos/:entityCode
      return JSON.parse(localStorage.getItem(invoiceMemosKey(safeEntity)) || '[]') as InvoiceMemo[];
    } catch { return []; }
  }, [safeEntity]);

  const ims = useMemo(() => filter?.status
    ? allIms.filter(i => i.status === filter.status)
    : allIms, [allIms, filter]);

  const meta: RegisterMeta<InvoiceMemo> = {
    registerCode: 'invoice_memo_register',
    title: 'Invoice Memo Register',
    description: 'IMs · authorise Accounts to post Sales Invoice · drill for line items',
    dateAccessor: r => r.effective_date ?? r.memo_date,
  };

  const columns: RegisterColumn<InvoiceMemo>[] = [
    { key: 'no', label: 'Memo No', clickable: true, render: r => r.memo_no, exportKey: 'memo_no' },
    { key: 'date', label: 'Date', render: r => r.memo_date, exportKey: 'memo_date' },
    { key: 'eff', label: 'Effective', render: r => r.effective_date ?? r.memo_date, exportKey: r => r.effective_date ?? r.memo_date },
    { key: 'cust', label: 'Customer', render: r => r.customer_name ?? '—', exportKey: r => r.customer_name ?? '' },
    { key: 'so', label: 'SO No', render: r => r.sales_order_no ?? '—', exportKey: r => r.sales_order_no ?? '' },
    { key: 'inv', label: 'Invoice No', render: r => r.invoice_voucher_no ?? '—', exportKey: r => r.invoice_voucher_no ?? '' },
    { key: 'lines', label: 'Lines', align: 'right', render: r => r.items.length, exportKey: r => r.items.length },
    { key: 'tax', label: 'Tax ₹', align: 'right', render: r => fmtINR(r.tax_amount), exportKey: 'tax_amount' },
    { key: 'total', label: 'Total ₹', align: 'right', render: r => fmtINR(r.total_amount), exportKey: 'total_amount' },
    { key: 'status', label: 'Status', render: r => (
      <Badge variant="outline" className="text-[10px] capitalize">{IM_STATUS_LABELS[r.status]}</Badge>
    ), exportKey: 'status' },
  ];

  const statusOptions: StatusOption[] = (Object.keys(IM_STATUS_LABELS) as IMStatus[])
    .map(s => ({ value: s, label: IM_STATUS_LABELS[s] }));

  const summaryBuilder = (f: InvoiceMemo[]): SummaryCard[] => [
    { label: 'Total IMs', value: String(f.length) },
    { label: 'Raised', value: String(f.filter(i => i.status === 'raised').length), tone: 'warning' },
    { label: 'Posted', value: String(f.filter(i => i.status === 'invoice_posted').length), tone: 'positive' },
    { label: 'Tax Total', value: fmtINR(dSum(f, i => i.tax_amount)) },
    { label: 'Grand Total', value: fmtINR(dSum(f, i => i.total_amount)) },
  ];

  const expandedRow = (i: InvoiceMemo) => (
    <div className="space-y-2">
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Line Items</div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Item</TableHead>
            <TableHead>UOM</TableHead>
            <TableHead className="text-right">Qty</TableHead>
            <TableHead className="text-right">Rate ₹</TableHead>
            <TableHead className="text-right">Tax %</TableHead>
            <TableHead className="text-right">Amount ₹</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {i.items.map(l => (
            <TableRow key={l.id}>
              <TableCell className="text-xs">{l.item_name}</TableCell>
              <TableCell className="text-xs">{l.uom ?? '—'}</TableCell>
              <TableCell className="text-right text-xs font-mono">{l.qty}</TableCell>
              <TableCell className="text-right text-xs font-mono">{fmtINR(l.rate)}</TableCell>
              <TableCell className="text-right text-xs font-mono">{l.tax_pct}</TableCell>
              <TableCell className="text-right text-xs font-mono">{fmtINR(l.amount)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  const currentIM = drill.current?.payload as InvoiceMemo | undefined;

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      <DrillSourceBanner sourceLabel={filter?.sourceLabel} onClear={() => setFilter(undefined)} />
      <DrillBreadcrumb rootLabel="Invoice Memo Register" trail={drill.trail} onGoTo={drill.goTo} onReset={drill.reset} />
      {!currentIM ? (
        <UniversalRegisterGrid<InvoiceMemo>
          entityCode={safeEntity}
          meta={meta}
          rows={ims}
          columns={columns}
          summaryBuilder={summaryBuilder}
          getExpandedRows={expandedRow}
          onNavigateToRecord={(i) => drill.push({
            id: `im:${i.id}`, label: i.memo_no, level: 1,
            module: 'invoice_memo_register', payload: i,
          })}
          statusOptions={statusOptions}
          statusKey="status"
        />
      ) : (
        <IMDetailPanel im={currentIM} onPrint={() => setPrintIM(currentIM)} />
      )}
      <Dialog open={!!printIM} onOpenChange={o => { if (!o) setPrintIM(null); }}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          {printIM && <IMPrint im={printIM} onClose={() => setPrintIM(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
