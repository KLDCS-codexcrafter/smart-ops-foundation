/**
 * PurchaseOrderRegister.tsx — UPRA-4 Phase B · T1-2 NEW canonical Register
 * Canonical UniversalRegisterGrid<Order> consumer · filtered to base_voucher_type === 'Purchase Order'.
 * Sidebar route: procure-purchase-order-register (NEW additive · Procure360Page switch case)
 * Data via useOrders(entityCode) hook · CONSUME-ONLY (no mutations).
 * STATUS_LABELS + STATUS_COLORS inlined per PE-Q6=(A) · type file 0-diff.
 * [JWT] GET /api/orders?entity={code}&type=PurchaseOrder
 */
import { useMemo, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useOrders } from '@/hooks/useOrders';
import { UniversalRegisterGrid } from '@/components/registers/UniversalRegisterGrid';
import type { RegisterColumn, RegisterMeta, SummaryCard, StatusOption } from '@/components/registers/UniversalRegisterTypes';
import type { Order } from '@/types/order';
import { PurchaseOrderDetailPanel } from './detail/PurchaseOrderDetailPanel';
import { PurchaseOrderPrint } from './print/PurchaseOrderPrint';

const inr = (n: number): string =>
  `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const STATUS_LABELS: Record<Order['status'], string> = {
  open: 'Open',
  partial: 'Partial',
  closed: 'Closed',
  preclosed: 'Pre-Closed',
  cancelled: 'Cancelled',
};

const STATUS_COLORS: Record<Order['status'], string> = {
  open: 'bg-primary/10 text-primary',
  partial: 'bg-warning/10 text-warning',
  closed: 'bg-success/10 text-success',
  preclosed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-destructive/10 text-destructive',
};

export function PurchaseOrderRegisterPanel(): JSX.Element {
  const { entityCode } = useEntityCode();
  const safeEntity = entityCode || 'SMRT';
  const { orders } = useOrders(safeEntity);
  const [selected, setSelected] = useState<Order | null>(null);
  const [printing, setPrinting] = useState<Order | null>(null);

  const rows = useMemo(
    () => orders.filter(o => o.base_voucher_type === 'Purchase Order'),
    [orders],
  );

  const meta: RegisterMeta<Order> = {
    registerCode: 'purchase_order_register',
    title: 'Purchase Order Register',
    description: 'All Purchase Orders · commitment documents · zero GL/stock/GST impact · Tally-Prime register',
    dateAccessor: r => r.date,
  };

  const columns: RegisterColumn<Order>[] = [
    { key: 'order_no', label: 'PO No', clickable: true, render: r => r.order_no, exportKey: 'order_no' },
    { key: 'date', label: 'Date', render: r => r.date, exportKey: 'date' },
    { key: 'party', label: 'Vendor', render: r => r.party_name, exportKey: 'party_name' },
    { key: 'gstin', label: 'GSTIN', render: r => r.party_gstin ?? '—', exportKey: r => r.party_gstin ?? '' },
    { key: 'ref', label: 'Indent/RFQ Ref', render: r => r.ref_no ?? '—', exportKey: r => r.ref_no ?? '' },
    { key: 'valid_till', label: 'Valid Till', render: r => r.valid_till ?? '—', exportKey: r => r.valid_till ?? '' },
    { key: 'lines', label: 'Lines', align: 'right', render: r => r.lines.length, exportKey: r => r.lines.length },
    { key: 'gross', label: 'Gross', align: 'right', render: r => inr(r.gross_amount), exportKey: r => r.gross_amount },
    { key: 'tax', label: 'Tax', align: 'right', render: r => inr(r.total_tax), exportKey: r => r.total_tax },
    { key: 'net', label: 'Net Amount', align: 'right', render: r => inr(r.net_amount), exportKey: r => r.net_amount },
    {
      key: 'status', label: 'Status',
      render: r => <Badge variant="outline" className={STATUS_COLORS[r.status]}>{STATUS_LABELS[r.status]}</Badge>,
      exportKey: 'status',
    },
  ];

  const statusOptions: StatusOption[] = (Object.keys(STATUS_LABELS) as Order['status'][])
    .map(s => ({ value: s, label: STATUS_LABELS[s] }));

  const summaryBuilder = (f: Order[]): SummaryCard[] => {
    const open = f.filter(r => r.status === 'open').length;
    const partial = f.filter(r => r.status === 'partial').length;
    const closed = f.filter(r => r.status === 'closed').length;
    const cancelled = f.filter(r => r.status === 'cancelled' || r.status === 'preclosed').length;
    const totalNet = f.reduce((a, r) => a + r.net_amount, 0);
    return [
      { label: 'Total Orders', value: String(f.length) },
      { label: 'Open', value: String(open), tone: 'positive' },
      { label: 'Partial', value: String(partial), tone: 'warning' },
      { label: 'Closed', value: String(closed) },
      { label: 'Cancelled/Pre-Closed', value: String(cancelled) },
      { label: 'Total Net', value: inr(totalNet) },
    ];
  };

  return (
    <div className="max-w-7xl mx-auto space-y-4 p-6">
      <UniversalRegisterGrid<Order>
        entityCode={safeEntity}
        meta={meta}
        rows={rows}
        columns={columns}
        statusOptions={statusOptions}
        statusKey="status"
        summaryBuilder={summaryBuilder}
        onNavigateToRecord={setSelected}
      />
      <Dialog open={!!selected} onOpenChange={o => !o && setSelected(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selected && <PurchaseOrderDetailPanel order={selected} onPrint={() => setPrinting(selected)} />}
        </DialogContent>
      </Dialog>
      <Dialog open={!!printing} onOpenChange={o => !o && setPrinting(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          {printing && <PurchaseOrderPrint order={printing} onClose={() => setPrinting(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
