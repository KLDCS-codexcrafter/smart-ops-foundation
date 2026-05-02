/**
 * DeliveryMemoRegister.tsx — Tally-Prime style DM register on UTS foundation.
 * Sprint T-Phase-1.2.6d.
 *
 * Q2-a sibling discipline: PackingSlipPrint (warehouse copy) is left
 * untouched; this register and DeliveryMemoPrint cover the customer-copy
 * workflow.
 */

import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import { UniversalRegisterGrid } from '@/components/registers/UniversalRegisterGrid';
import { DrillBreadcrumb } from '@/components/registers/DrillBreadcrumb';
import { DrillSourceBanner } from '@/components/registers/DrillSourceBanner';
import { useDrillDown } from '@/hooks/useDrillDown';
import type {
  RegisterColumn, RegisterMeta, SummaryCard, StatusOption,
} from '@/components/registers/UniversalRegisterTypes';
import {
  deliveryMemosKey, DM_STATUS_LABELS,
  type DeliveryMemo, type DMStatus,
} from '@/types/delivery-memo';
import { dSum } from '@/lib/decimal-helpers';
import { DeliveryMemoDetailPanel } from './detail/DeliveryMemoDetailPanel';
import { DeliveryMemoPrint } from './print/DeliveryMemoPrint';

const fmtINR = (n: number): string =>
  `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n)}`;

interface DeliveryMemoRegisterPanelProps {
  initialFilter?: { sourceLabel?: string; status?: DMStatus };
}

const DM_STATUS_COLORS: Record<DMStatus, string> = {
  draft: 'bg-slate-500/10 text-slate-700 border-slate-500/30',
  raised: 'bg-blue-500/10 text-blue-700 border-blue-500/30',
  lr_assigned: 'bg-amber-500/10 text-amber-700 border-amber-500/30',
  delivered: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30',
};

export function DeliveryMemoRegisterPanel({ initialFilter }: DeliveryMemoRegisterPanelProps = {}) {
  const { entityCode } = useCardEntitlement();
  const safeEntity = entityCode || 'SMRT';
  const drill = useDrillDown();
  const [printDM, setPrintDM] = useState<DeliveryMemo | null>(null);
  const [filter, setFilter] = useState(initialFilter);
  useEffect(() => { setFilter(initialFilter); }, [initialFilter]);

  const allDMs = useMemo<DeliveryMemo[]>(() => {
    try {
      // [JWT] GET /api/dispatch/delivery-memos/:entityCode
      return JSON.parse(localStorage.getItem(deliveryMemosKey(safeEntity)) || '[]') as DeliveryMemo[];
    } catch { return []; }
  }, [safeEntity]);

  const dms = useMemo<DeliveryMemo[]>(() => {
    if (!filter?.status) return allDMs;
    return allDMs.filter(d => d.status === filter.status);
  }, [allDMs, filter]);

  const meta: RegisterMeta<DeliveryMemo> = {
    registerCode: 'delivery_memo_register',
    title: 'Delivery Memo Register',
    description: 'Customer-copy authorisation · drill into details for line items + stock dialog',
    dateAccessor: r => r.effective_date ?? r.memo_date,
  };

  const columns: RegisterColumn<DeliveryMemo>[] = [
    { key: 'no', label: 'Memo No', clickable: true, render: r => r.memo_no, exportKey: 'memo_no' },
    { key: 'date', label: 'Date', render: r => r.memo_date, exportKey: 'memo_date' },
    { key: 'eff', label: 'Effective', render: r => r.effective_date ?? r.memo_date, exportKey: r => r.effective_date ?? r.memo_date },
    { key: 'customer', label: 'Customer', render: r => r.customer_name ?? '—', exportKey: r => r.customer_name ?? '' },
    { key: 'srm', label: 'SRM', render: r => r.supply_request_memo_no ?? '—', exportKey: r => r.supply_request_memo_no ?? '' },
    { key: 'lr', label: 'LR No', render: r => r.lr_no ?? '—', exportKey: r => r.lr_no ?? '' },
    { key: 'vehicle', label: 'Vehicle', render: r => r.vehicle_no ?? '—', exportKey: r => r.vehicle_no ?? '' },
    { key: 'lines', label: 'Lines', align: 'right', render: r => r.items.length, exportKey: r => r.items.length },
    { key: 'total', label: 'Total ₹', align: 'right', render: r => fmtINR(r.total_amount), exportKey: 'total_amount' },
    { key: 'status', label: 'Status', render: r => (
      <Badge variant="outline" className={`text-[10px] capitalize ${DM_STATUS_COLORS[r.status]}`}>
        {DM_STATUS_LABELS[r.status]}
      </Badge>
    ), exportKey: 'status' },
  ];

  const statusOptions: StatusOption[] = (Object.keys(DM_STATUS_LABELS) as DMStatus[])
    .map(s => ({ value: s, label: DM_STATUS_LABELS[s] }));

  const summaryBuilder = (f: DeliveryMemo[]): SummaryCard[] => {
    const dispatched = f.filter(d => d.status === 'raised' || d.status === 'lr_assigned');
    const delivered = f.filter(d => d.status === 'delivered');
    return [
      { label: 'Total Memos', value: String(f.length) },
      { label: 'Dispatched', value: String(dispatched.length), tone: 'warning' },
      { label: 'Delivered', value: String(delivered.length), tone: 'positive' },
      { label: 'LR Assigned', value: String(f.filter(d => d.lr_no).length) },
      { label: 'Total Value', value: fmtINR(dSum(f, d => d.total_amount)) },
    ];
  };

  const expandedRow = (d: DeliveryMemo) => (
    <div className="space-y-2">
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Line Items</div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Item</TableHead>
            <TableHead>UOM</TableHead>
            <TableHead className="text-right">Qty</TableHead>
            <TableHead className="text-right">Amount ₹</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {d.items.map(l => (
            <TableRow key={l.id}>
              <TableCell className="text-xs">{l.item_name}</TableCell>
              <TableCell className="text-xs">{l.uom ?? '—'}</TableCell>
              <TableCell className="text-right text-xs font-mono">{l.qty}</TableCell>
              <TableCell className="text-right text-xs font-mono">{fmtINR(l.amount)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  const currentDM = drill.current?.payload as DeliveryMemo | undefined;

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      <DrillSourceBanner sourceLabel={filter?.sourceLabel} onClear={() => setFilter(undefined)} />
      <DrillBreadcrumb rootLabel="Delivery Memo Register" trail={drill.trail} onGoTo={drill.goTo} onReset={drill.reset} />
      {!currentDM ? (
        <UniversalRegisterGrid<DeliveryMemo>
          entityCode={safeEntity}
          meta={meta}
          rows={dms}
          columns={columns}
          summaryBuilder={summaryBuilder}
          getExpandedRows={expandedRow}
          onNavigateToRecord={(d) => drill.push({
            id: `dm:${d.id}`, label: d.memo_no, level: 1,
            module: 'delivery_memo_register', payload: d,
          })}
          statusOptions={statusOptions}
          statusKey="status"
        />
      ) : (
        <DeliveryMemoDetailPanel dm={currentDM} onPrint={() => setPrintDM(currentDM)} />
      )}
      <Dialog open={!!printDM} onOpenChange={o => { if (!o) setPrintDM(null); }}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          {printDM && <DeliveryMemoPrint dm={printDM} onClose={() => setPrintDM(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default DeliveryMemoRegisterPanel;
