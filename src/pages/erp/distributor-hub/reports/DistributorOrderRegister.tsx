/**
 * DistributorOrderRegister.tsx — UPRA-3 Phase A Step 2 · Tier-1 NEW Register #1
 * Canonical UniversalRegisterGrid<DistributorOrder>.
 * Sidebar module: dh-r-distributor-order-register
 * [JWT] GET /api/distributor/orders/:entityCode
 */
import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import { UniversalRegisterGrid } from '@/components/registers/UniversalRegisterGrid';
import type { RegisterColumn, RegisterMeta, SummaryCard, StatusOption } from '@/components/registers/UniversalRegisterTypes';
import { distributorOrdersKey, type DistributorOrder, type DistributorOrderStatus } from '@/types/distributor-order';
import { formatINR } from '@/lib/india-validations';
import { DistributorOrderDetailPanel } from './detail/DistributorOrderDetailPanel';
import { DistributorOrderPrint } from './print/DistributorOrderPrint';

const STATUS_LABELS: Record<DistributorOrderStatus, string> = {
  draft: 'Draft', submitted: 'Submitted', approved: 'Approved',
  rejected: 'Rejected', invoiced: 'Invoiced', cancelled: 'Cancelled',
};

function seedIfEmpty(entity: string): DistributorOrder[] {
  try {
    const raw = localStorage.getItem(distributorOrdersKey(entity));
    const list = raw ? (JSON.parse(raw) as DistributorOrder[]) : [];
    if (list.length > 0) return list;
    const now = new Date().toISOString();
    const today = now.slice(0, 10);
    const base = {
      entity_code: entity, fiscal_year_id: 'FY-2025-26',
      lines: [], notes: '', delivery_address: 'Mumbai 400001',
      expected_delivery_date: today, rejection_reason: null, linked_invoice_id: null,
      reviewed_at: null, reviewed_by: null, created_at: now, updated_at: now,
    };
    const seed: DistributorOrder[] = [
      {
        ...base, id: 'do-seed-1', order_no: 'DO/2026/0001',
        partner_id: 'p-1', partner_code: 'DIST-MH-01', partner_name: 'Mumbai Trading Co.',
        status: 'submitted', submitted_at: now,
        total_taxable_paise: 4500000, total_tax_paise: 810000, grand_total_paise: 5310000,
      },
      {
        ...base, id: 'do-seed-2', order_no: 'DO/2026/0002',
        partner_id: 'p-2', partner_code: 'DIST-KA-02', partner_name: 'Bengaluru Distributors',
        status: 'approved', submitted_at: now,
        total_taxable_paise: 2200000, total_tax_paise: 396000, grand_total_paise: 2596000,
      },
      {
        ...base, id: 'do-seed-3', order_no: 'DO/2026/0003',
        partner_id: 'p-3', partner_code: 'DIST-TN-03', partner_name: 'Chennai Hub Traders',
        status: 'invoiced', submitted_at: now,
        total_taxable_paise: 8800000, total_tax_paise: 1584000, grand_total_paise: 10384000,
      },
    ];
    localStorage.setItem(distributorOrdersKey(entity), JSON.stringify(seed));
    return seed;
  } catch { return []; }
}

export function DistributorOrderRegisterPanel() {
  const { entityCode } = useCardEntitlement();
  const safeEntity = entityCode || 'SMRT';
  const [selected, setSelected] = useState<DistributorOrder | null>(null);
  const [printing, setPrinting] = useState<DistributorOrder | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => { seedIfEmpty(safeEntity); setTick(t => t + 1); }, [safeEntity]);

  const rows = useMemo<DistributorOrder[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(distributorOrdersKey(safeEntity)) || '[]') as DistributorOrder[];
    } catch { return []; }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeEntity, tick]);

  const meta: RegisterMeta<DistributorOrder> = {
    registerCode: 'distributor_order_register',
    title: 'Distributor Order Register',
    description: 'All distributor orders · submitted · approved · invoiced',
    dateAccessor: r => (r.submitted_at || r.created_at).slice(0, 10),
  };

  const columns: RegisterColumn<DistributorOrder>[] = [
    { key: 'order_no', label: 'Order No', clickable: true, render: r => r.order_no, exportKey: 'order_no' },
    { key: 'date', label: 'Submitted', render: r => r.submitted_at.slice(0, 10), exportKey: r => r.submitted_at.slice(0, 10) },
    { key: 'partner_code', label: 'Code', render: r => r.partner_code, exportKey: 'partner_code' },
    { key: 'partner', label: 'Partner', render: r => r.partner_name, exportKey: 'partner_name' },
    { key: 'taxable', label: 'Taxable', align: 'right', render: r => <span className="font-mono">{formatINR(r.total_taxable_paise)}</span>, exportKey: r => r.total_taxable_paise / 100 },
    { key: 'tax', label: 'Tax', align: 'right', render: r => <span className="font-mono">{formatINR(r.total_tax_paise)}</span>, exportKey: r => r.total_tax_paise / 100 },
    { key: 'total', label: 'Grand Total', align: 'right', render: r => <span className="font-mono">{formatINR(r.grand_total_paise)}</span>, exportKey: r => r.grand_total_paise / 100 },
    { key: 'status', label: 'Status', render: r => <Badge variant="outline" className="text-[10px]">{STATUS_LABELS[r.status]}</Badge>, exportKey: 'status' },
  ];

  const statusOptions: StatusOption[] = (Object.keys(STATUS_LABELS) as DistributorOrderStatus[])
    .map(s => ({ value: s, label: STATUS_LABELS[s] }));

  const summaryBuilder = (f: DistributorOrder[]): SummaryCard[] => {
    const taxable = f.reduce((a, r) => a + r.total_taxable_paise, 0);
    const tax = f.reduce((a, r) => a + r.total_tax_paise, 0);
    const total = f.reduce((a, r) => a + r.grand_total_paise, 0);
    const invoiced = f.filter(r => r.status === 'invoiced').length;
    return [
      { label: 'Total Orders', value: String(f.length) },
      { label: 'Taxable', value: formatINR(taxable) },
      { label: 'Tax', value: formatINR(tax) },
      { label: 'Grand Total', value: formatINR(total), tone: 'positive' },
      { label: 'Invoiced', value: `${invoiced} / ${f.length}` },
    ];
  };

  return (
    <div className="max-w-7xl mx-auto space-y-4 p-6">
      <UniversalRegisterGrid<DistributorOrder>
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
          {selected && <DistributorOrderDetailPanel order={selected} onPrint={() => setPrinting(selected)} />}
        </DialogContent>
      </Dialog>
      <Dialog open={!!printing} onOpenChange={o => !o && setPrinting(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          {printing && <DistributorOrderPrint order={printing} onClose={() => setPrinting(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default DistributorOrderRegisterPanel;
