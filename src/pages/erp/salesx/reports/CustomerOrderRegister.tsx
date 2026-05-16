/**
 * CustomerOrderRegister.tsx — UPRA-1 Phase A · T1-1
 * Canonical UniversalRegisterGrid<CustomerOrder> consumer.
 * Sidebar route: sx-r-customer-order
 * [JWT] GET /api/customer/orders/:entityCode
 */

import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import { UniversalRegisterGrid } from '@/components/registers/UniversalRegisterGrid';
import type { RegisterColumn, RegisterMeta, SummaryCard, StatusOption } from '@/components/registers/UniversalRegisterTypes';
import { customerOrdersKey, type CustomerOrder, type CustomerOrderStatus } from '@/types/customer-order';
import { dSum } from '@/lib/decimal-helpers';
import { CustomerOrderDetailPanel } from './detail/CustomerOrderDetailPanel';
import { CustomerOrderPrint } from './print/CustomerOrderPrint';

const fmtINR = (n: number): string =>
  `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n)}`;

const STATUS_LABELS: Record<CustomerOrderStatus, string> = {
  draft: 'Draft', placed: 'Placed', confirmed: 'Confirmed', packed: 'Packed',
  shipped: 'Shipped', delivered: 'Delivered', cancelled: 'Cancelled', returned: 'Returned',
};

/** UPRA-1 self-seed (Q6=(C) per sub-block · minimal demo). */
function seedIfEmpty(entity: string): CustomerOrder[] {
  try {
    const raw = localStorage.getItem(customerOrdersKey(entity));
    const list = raw ? (JSON.parse(raw) as CustomerOrder[]) : [];
    if (list.length > 0) return list;
    const now = new Date().toISOString();
    const today = now.slice(0, 10);
    const seed: CustomerOrder[] = [
      {
        id: 'co-seed-1', order_no: 'ORD/2026/0001', customer_id: 'cust-1',
        customer_name: 'Sharma Traders', entity_code: entity, fiscal_year_id: 'FY-2025-26',
        status: 'placed', lines: [{
          id: 'l1', item_id: 'i1', item_code: 'SKU-001', item_name: 'Steel Rod 12mm',
          uom: 'KG', qty: 50, unit_price_paise: 8500, line_total_paise: 425000,
        }], subtotal_paise: 425000, applied_schemes: [], scheme_discount_paise: 0,
        loyalty_points_redeemed: 0, loyalty_discount_paise: 0, net_payable_paise: 425000,
        loyalty_points_earned: 42, placed_at: today, delivered_at: null,
        created_at: now, updated_at: now,
      },
      {
        id: 'co-seed-2', order_no: 'ORD/2026/0002', customer_id: 'cust-2',
        customer_name: 'Gupta Enterprises', entity_code: entity, fiscal_year_id: 'FY-2025-26',
        status: 'delivered', lines: [{
          id: 'l1', item_id: 'i2', item_code: 'SKU-002', item_name: 'Cement Bag OPC 50kg',
          uom: 'BAG', qty: 20, unit_price_paise: 38000, line_total_paise: 760000,
        }], subtotal_paise: 760000, applied_schemes: [], scheme_discount_paise: 0,
        loyalty_points_redeemed: 0, loyalty_discount_paise: 0, net_payable_paise: 760000,
        loyalty_points_earned: 76, placed_at: today, delivered_at: today,
        created_at: now, updated_at: now,
      },
      {
        id: 'co-seed-3', order_no: 'ORD/2026/0003', customer_id: 'cust-3',
        customer_name: 'Patel Hardware', entity_code: entity, fiscal_year_id: 'FY-2025-26',
        status: 'confirmed', lines: [{
          id: 'l1', item_id: 'i3', item_code: 'SKU-003', item_name: 'PVC Pipe 1in',
          uom: 'MTR', qty: 100, unit_price_paise: 12500, line_total_paise: 1250000,
        }], subtotal_paise: 1250000, applied_schemes: [], scheme_discount_paise: 0,
        loyalty_points_redeemed: 0, loyalty_discount_paise: 0, net_payable_paise: 1250000,
        loyalty_points_earned: 125, placed_at: today, delivered_at: null,
        created_at: now, updated_at: now,
      },
    ];
    localStorage.setItem(customerOrdersKey(entity), JSON.stringify(seed));
    return seed;
  } catch { return []; }
}

export function CustomerOrderRegisterPanel() {
  const { entityCode } = useCardEntitlement();
  const safeEntity = entityCode || 'SMRT';
  const [selected, setSelected] = useState<CustomerOrder | null>(null);
  const [printing, setPrinting] = useState<CustomerOrder | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => { seedIfEmpty(safeEntity); setTick(t => t + 1); }, [safeEntity]);

  const orders = useMemo<CustomerOrder[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(customerOrdersKey(safeEntity)) || '[]') as CustomerOrder[];
    } catch { return []; }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeEntity, tick]);

  const meta: RegisterMeta<CustomerOrder> = {
    registerCode: 'customer_order_register',
    title: 'Customer Order Register',
    description: 'All customer orders · Tally-Prime register',
    dateAccessor: r => r.placed_at ?? r.created_at,
  };

  const columns: RegisterColumn<CustomerOrder>[] = [
    { key: 'order_no', label: 'Order No', clickable: true, render: r => r.order_no, exportKey: 'order_no' },
    { key: 'placed', label: 'Placed', render: r => r.placed_at ?? '—', exportKey: r => r.placed_at ?? '' },
    { key: 'customer', label: 'Customer', render: r => r.customer_name, exportKey: 'customer_name' },
    { key: 'lines', label: 'Lines', align: 'right', render: r => r.lines.length, exportKey: r => r.lines.length },
    { key: 'net', label: 'Net ₹', align: 'right', render: r => fmtINR(r.net_payable_paise / 100), exportKey: r => r.net_payable_paise / 100 },
    { key: 'status', label: 'Status', render: r => <Badge variant="outline" className="text-[10px]">{STATUS_LABELS[r.status]}</Badge>, exportKey: 'status' },
  ];

  const statusOptions: StatusOption[] = (Object.keys(STATUS_LABELS) as CustomerOrderStatus[])
    .map(s => ({ value: s, label: STATUS_LABELS[s] }));

  const summaryBuilder = (f: CustomerOrder[]): SummaryCard[] => [
    { label: 'Total Orders', value: String(f.length) },
    { label: 'Net Payable ₹', value: fmtINR(dSum(f, r => r.net_payable_paise / 100)), tone: 'positive' },
    { label: 'Total Lines', value: String(f.reduce((a, r) => a + r.lines.length, 0)) },
    { label: 'Schemes Applied', value: String(f.filter(r => r.applied_schemes.length > 0).length) },
    { label: 'Avg Order ₹', value: f.length ? fmtINR((dSum(f, r => r.net_payable_paise / 100)) / f.length) : '₹0' },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-4 p-6">
      <UniversalRegisterGrid<CustomerOrder>
        entityCode={safeEntity}
        meta={meta}
        rows={orders}
        columns={columns}
        statusOptions={statusOptions}
        statusKey="status"
        summaryBuilder={summaryBuilder}
        onNavigateToRecord={setSelected}
      />
      <Dialog open={!!selected} onOpenChange={o => !o && setSelected(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selected && <CustomerOrderDetailPanel order={selected} onPrint={() => setPrinting(selected)} />}
        </DialogContent>
      </Dialog>
      <Dialog open={!!printing} onOpenChange={o => !o && setPrinting(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          {printing && <CustomerOrderPrint order={printing} onClose={() => setPrinting(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default CustomerOrderRegisterPanel;
