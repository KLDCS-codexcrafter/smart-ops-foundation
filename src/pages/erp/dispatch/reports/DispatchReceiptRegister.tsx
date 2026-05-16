/**
 * DispatchReceiptRegister.tsx — UPRA-1 Phase A · T1-3
 * Sidebar route: dh-r-dispatch-receipt
 * [JWT] GET /api/logistic/dispatch-receipts/:entityCode
 */
import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import { UniversalRegisterGrid } from '@/components/registers/UniversalRegisterGrid';
import type { RegisterColumn, RegisterMeta, SummaryCard, StatusOption } from '@/components/registers/UniversalRegisterTypes';
import {
  dispatchReceiptsKey, DISPATCH_RECEIPT_STATUS_LABELS, DISPATCH_RECEIPT_STATUS_COLORS,
  type DispatchReceipt, type DispatchReceiptStatus,
} from '@/types/dispatch-receipt';
import { dSum } from '@/lib/decimal-helpers';
import { DispatchReceiptDetailPanel } from './detail/DispatchReceiptDetailPanel';
import { DispatchReceiptPrint } from './print/DispatchReceiptPrint';

function seedIfEmpty(entity: string): void {
  try {
    if (localStorage.getItem(dispatchReceiptsKey(entity))) return;
    const now = new Date().toISOString();
    const today = now.slice(0, 10);
    const seed: DispatchReceipt[] = [
      {
        id: 'dr-seed-1', entity_id: entity, fiscal_year_id: 'FY-2025-26',
        receipt_no: 'DR/25-26/0001', status: 'delivered',
        dispatch_memo_id: null, dispatch_memo_no: 'DM/25-26/0010',
        invoice_id: null, invoice_no: 'INV/25-26/0010',
        customer_id: 'cust-1', customer_name: 'Sharma Traders',
        destination: 'Mumbai', vehicle_no: 'MH-12-AB-1234',
        lr_no: 'LR-001', transporter_id: null, transporter_name: 'Speedy Carriers',
        delivery_date: today, delivery_time: '14:30', pod_received: true, pod_id: null,
        receiver_name: 'Rakesh', receiver_mobile: '9876543210', receiver_signature: null,
        lines: [{ id: 'l1', item_id: 'i1', item_code: 'SKU-001', item_name: 'Steel Rod 12mm',
          uom: 'KG', dispatched_qty: 50, delivered_qty: 50, returned_qty: 0, damage_qty: 0, remarks: '' }],
        total_dispatched: 50, total_delivered: 50, total_returned: 0, total_damage: 0,
        narration: 'Delivered in full', created_at: now, updated_at: now,
        closed_at: now, cancelled_at: null,
      },
      {
        id: 'dr-seed-2', entity_id: entity, fiscal_year_id: 'FY-2025-26',
        receipt_no: 'DR/25-26/0002', status: 'in_transit',
        dispatch_memo_id: null, dispatch_memo_no: 'DM/25-26/0011',
        invoice_id: null, invoice_no: 'INV/25-26/0011',
        customer_id: 'cust-2', customer_name: 'Gupta Enterprises',
        destination: 'Pune', vehicle_no: 'MH-14-CD-5678',
        lr_no: 'LR-002', transporter_id: null, transporter_name: 'Reliable Logistics',
        delivery_date: today, delivery_time: '—', pod_received: false, pod_id: null,
        receiver_name: '', receiver_mobile: '', receiver_signature: null,
        lines: [{ id: 'l1', item_id: 'i2', item_code: 'SKU-002', item_name: 'Cement OPC 50kg',
          uom: 'BAG', dispatched_qty: 200, delivered_qty: 0, returned_qty: 0, damage_qty: 0, remarks: 'En route' }],
        total_dispatched: 200, total_delivered: 0, total_returned: 0, total_damage: 0,
        narration: 'In transit', created_at: now, updated_at: now,
        closed_at: null, cancelled_at: null,
      },
      {
        id: 'dr-seed-3', entity_id: entity, fiscal_year_id: 'FY-2025-26',
        receipt_no: 'DR/25-26/0003', status: 'partial',
        dispatch_memo_id: null, dispatch_memo_no: 'DM/25-26/0012',
        invoice_id: null, invoice_no: 'INV/25-26/0012',
        customer_id: 'cust-3', customer_name: 'Patel Hardware',
        destination: 'Nashik', vehicle_no: 'MH-15-EF-9012',
        lr_no: 'LR-003', transporter_id: null, transporter_name: 'Speedy Carriers',
        delivery_date: today, delivery_time: '11:00', pod_received: true, pod_id: null,
        receiver_name: 'Suresh', receiver_mobile: '9123456780', receiver_signature: null,
        lines: [{ id: 'l1', item_id: 'i3', item_code: 'SKU-003', item_name: 'PVC Pipe 1in',
          uom: 'MTR', dispatched_qty: 500, delivered_qty: 480, returned_qty: 0, damage_qty: 20, remarks: '20 mtr damaged' }],
        total_dispatched: 500, total_delivered: 480, total_returned: 0, total_damage: 20,
        narration: '20 mtr damaged in transit', created_at: now, updated_at: now,
        closed_at: now, cancelled_at: null,
      },
    ];
    localStorage.setItem(dispatchReceiptsKey(entity), JSON.stringify(seed));
  } catch { /* quota silent */ }
}

export function DispatchReceiptRegisterPanel() {
  const { entityCode } = useCardEntitlement();
  const safeEntity = entityCode || 'SMRT';
  const [selected, setSelected] = useState<DispatchReceipt | null>(null);
  const [printing, setPrinting] = useState<DispatchReceipt | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => { seedIfEmpty(safeEntity); setTick(t => t + 1); }, [safeEntity]);

  const rows = useMemo<DispatchReceipt[]>(() => {
    try { return JSON.parse(localStorage.getItem(dispatchReceiptsKey(safeEntity)) || '[]') as DispatchReceipt[]; }
    catch { return []; }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeEntity, tick]);

  const meta: RegisterMeta<DispatchReceipt> = {
    registerCode: 'dispatch_receipt_register',
    title: 'Dispatch Receipt Register',
    description: 'Outbound delivery confirmations · POD pairing',
    dateAccessor: r => r.effective_date ?? r.delivery_date,
  };

  const columns: RegisterColumn<DispatchReceipt>[] = [
    { key: 'receipt_no', label: 'Receipt No', clickable: true, render: r => r.receipt_no, exportKey: 'receipt_no' },
    { key: 'date', label: 'Date', render: r => r.delivery_date, exportKey: 'delivery_date' },
    { key: 'customer', label: 'Customer', render: r => r.customer_name, exportKey: 'customer_name' },
    { key: 'invoice', label: 'Invoice', render: r => r.invoice_no ?? '—', exportKey: r => r.invoice_no ?? '' },
    { key: 'transporter', label: 'Transporter', render: r => r.transporter_name ?? '—', exportKey: r => r.transporter_name ?? '' },
    { key: 'vehicle', label: 'Vehicle', render: r => r.vehicle_no ?? '—', exportKey: r => r.vehicle_no ?? '' },
    { key: 'dispatched', label: 'Dispatched', align: 'right', render: r => r.total_dispatched, exportKey: 'total_dispatched' },
    { key: 'delivered', label: 'Delivered', align: 'right', render: r => r.total_delivered, exportKey: 'total_delivered' },
    { key: 'damage', label: 'Damage', align: 'right', render: r => r.total_damage, exportKey: 'total_damage' },
    { key: 'pod', label: 'POD', render: r => r.pod_received ? '✓' : '—', exportKey: r => r.pod_received ? 'Yes' : 'No' },
    { key: 'status', label: 'Status', render: r => (
      <Badge className={`text-[10px] ${DISPATCH_RECEIPT_STATUS_COLORS[r.status]}`}>
        {DISPATCH_RECEIPT_STATUS_LABELS[r.status]}
      </Badge>
    ), exportKey: 'status' },
  ];

  const statusOptions: StatusOption[] = (Object.keys(DISPATCH_RECEIPT_STATUS_LABELS) as DispatchReceiptStatus[])
    .map(s => ({ value: s, label: DISPATCH_RECEIPT_STATUS_LABELS[s] }));

  const summaryBuilder = (f: DispatchReceipt[]): SummaryCard[] => [
    { label: 'Total Receipts', value: String(f.length) },
    { label: 'Delivered', value: String(f.filter(r => r.status === 'delivered').length), tone: 'positive' },
    { label: 'In Transit', value: String(f.filter(r => r.status === 'in_transit').length), tone: 'warning' },
    { label: 'Total Damage Qty', value: String(dSum(f, r => r.total_damage)), tone: 'negative' },
    { label: 'With POD', value: String(f.filter(r => r.pod_received).length) },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-4 p-6">
      <UniversalRegisterGrid<DispatchReceipt>
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
          {selected && <DispatchReceiptDetailPanel receipt={selected} onPrint={() => setPrinting(selected)} />}
        </DialogContent>
      </Dialog>
      <Dialog open={!!printing} onOpenChange={o => !o && setPrinting(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          {printing && <DispatchReceiptPrint receipt={printing} onClose={() => setPrinting(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default DispatchReceiptRegisterPanel;
