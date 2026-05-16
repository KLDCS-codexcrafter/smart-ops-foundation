/**
 * CustomerVoucherRegister.tsx — UPRA-1 Phase A · T1-2 · UNIFIED In + Out via discriminator
 * Sidebar route: sx-r-customer-voucher
 * [JWT] GET /api/servicedesk/customer-vouchers/:entityCode
 */

import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import { UniversalRegisterGrid } from '@/components/registers/UniversalRegisterGrid';
import type { RegisterColumn, RegisterMeta, SummaryCard, StatusOption } from '@/components/registers/UniversalRegisterTypes';
import {
  customerInVoucherKey, customerOutVoucherKey,
  type CustomerInVoucher, type CustomerOutVoucher,
} from '@/types/customer-voucher';
import { dSum } from '@/lib/decimal-helpers';
import { CustomerVoucherDetailPanel } from './detail/CustomerVoucherDetailPanel';
import { CustomerVoucherPrint } from './print/CustomerVoucherPrint';

const fmtINR = (paise: number): string =>
  `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(paise / 100)}`;

export type CustomerVoucherUnified =
  | (CustomerInVoucher & { _kind: 'in'; _id: string; _status: string; _date: string })
  | (CustomerOutVoucher & { _kind: 'out'; _id: string; _status: string; _date: string });

function loadAll(entity: string): CustomerVoucherUnified[] {
  const safe = <T,>(k: string): T[] => {
    try { return JSON.parse(localStorage.getItem(k) || '[]') as T[]; } catch { return []; }
  };
  const ins = safe<CustomerInVoucher>(customerInVoucherKey(entity)).map(v => ({
    ...v, _kind: 'in' as const, _id: `in-${v.id}`,
    _status: v.warranty_status_at_intake, _date: v.received_at.slice(0, 10),
  }));
  const outs = safe<CustomerOutVoucher>(customerOutVoucherKey(entity)).map(v => ({
    ...v, _kind: 'out' as const, _id: `out-${v.id}`,
    _status: v.paid ? 'paid' : 'unpaid', _date: v.delivered_at.slice(0, 10),
  }));
  return [...ins, ...outs];
}

function seedIfEmpty(entity: string): void {
  const inK = customerInVoucherKey(entity);
  const outK = customerOutVoucherKey(entity);
  try {
    if (!localStorage.getItem(inK)) {
      const now = new Date().toISOString();
      const ins: CustomerInVoucher[] = [
        {
          id: 'civ-seed-1', voucher_no: 'CIV/2026/0001', entity_id: entity, fiscal_year_id: 'FY-2025-26',
          branch_id: 'BR-01', ticket_id: 'TKT-001', serial: 'SR-A1001', internal_no: 'INT-001',
          warranty_status_at_intake: 'in_warranty', condition_notes: 'Device powers on; LCD cracked.',
          photos: [], received_by: 'Operator', received_at: now,
          created_at: now, updated_at: now, audit_trail: [],
        },
        {
          id: 'civ-seed-2', voucher_no: 'CIV/2026/0002', entity_id: entity, fiscal_year_id: 'FY-2025-26',
          branch_id: 'BR-01', ticket_id: 'TKT-002', serial: 'SR-A1002', internal_no: 'INT-002',
          warranty_status_at_intake: 'out_of_warranty', condition_notes: 'Battery swelling.',
          photos: [], received_by: 'Operator', received_at: now,
          created_at: now, updated_at: now, audit_trail: [],
        },
      ];
      localStorage.setItem(inK, JSON.stringify(ins));
    }
    if (!localStorage.getItem(outK)) {
      const now = new Date().toISOString();
      const outs: CustomerOutVoucher[] = [
        {
          id: 'cov-seed-1', voucher_no: 'COV/2026/0001', entity_id: entity, fiscal_year_id: 'FY-2025-26',
          branch_id: 'BR-01', ticket_id: 'TKT-001', resolution_summary: 'LCD replaced',
          old_serial: 'SR-A1001', new_serial: 'SR-A1001', circle_readings: [],
          spares_consumed_summary: 'LCD module', charges_paise: 350000, paid: true,
          payment_method: 'upi', delivered_to: 'Customer A', delivered_at: now,
          acknowledgement_signed: true, acknowledgement_signature_url: null,
          created_at: now, updated_at: now, created_by: 'Tech', audit_trail: [],
        },
        {
          id: 'cov-seed-2', voucher_no: 'COV/2026/0002', entity_id: entity, fiscal_year_id: 'FY-2025-26',
          branch_id: 'BR-01', ticket_id: 'TKT-002', resolution_summary: 'Battery replaced',
          old_serial: 'SR-A1002', new_serial: 'SR-A1002', circle_readings: [],
          spares_consumed_summary: 'Battery', charges_paise: 180000, paid: false,
          payment_method: null, delivered_to: 'Customer B', delivered_at: now,
          acknowledgement_signed: false, acknowledgement_signature_url: null,
          created_at: now, updated_at: now, created_by: 'Tech', audit_trail: [],
        },
      ];
      localStorage.setItem(outK, JSON.stringify(outs));
    }
  } catch { /* quota silent */ }
}

export function CustomerVoucherRegisterPanel() {
  const { entityCode } = useCardEntitlement();
  const safeEntity = entityCode || 'SMRT';
  const [selected, setSelected] = useState<CustomerVoucherUnified | null>(null);
  const [printing, setPrinting] = useState<CustomerVoucherUnified | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => { seedIfEmpty(safeEntity); setTick(t => t + 1); }, [safeEntity]);

  const rows = useMemo<(CustomerVoucherUnified & { id: string })[]>(
    () => loadAll(safeEntity).map(v => ({ ...v, id: v._id })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [safeEntity, tick],
  );

  const meta: RegisterMeta<CustomerVoucherUnified & { id: string }> = {
    registerCode: 'customer_voucher_register',
    title: 'Customer Voucher Register',
    description: 'Unified In + Out vouchers · ServiceDesk · drill into details',
    dateAccessor: r => r._date,
  };

  const columns: RegisterColumn<CustomerVoucherUnified & { id: string }>[] = [
    { key: 'voucher_no', label: 'Voucher No', clickable: true, render: r => r.voucher_no, exportKey: 'voucher_no' },
    { key: 'direction', label: 'Direction', render: r => (
      <Badge variant="outline" className={`text-[10px] ${r._kind === 'in'
        ? 'bg-primary/10 text-primary border-primary/30'
        : 'bg-warning/10 text-warning border-warning/30'}`}>{r._kind === 'in' ? 'In' : 'Out'}</Badge>
    ), exportKey: r => r._kind },
    { key: 'date', label: 'Date', render: r => r._date, exportKey: r => r._date },
    { key: 'ticket', label: 'Ticket', render: r => r.ticket_id, exportKey: 'ticket_id' },
    { key: 'serial', label: 'Serial', render: r => r._kind === 'in' ? r.serial : `${r.old_serial} → ${r.new_serial}`,
      exportKey: r => r._kind === 'in' ? r.serial : `${r.old_serial} -> ${r.new_serial}` },
    { key: 'detail', label: 'Detail', render: r => r._kind === 'in' ? r.condition_notes : r.resolution_summary,
      exportKey: r => r._kind === 'in' ? r.condition_notes : r.resolution_summary },
    { key: 'charges', label: 'Charges ₹', align: 'right',
      render: r => r._kind === 'out' ? fmtINR(r.charges_paise) : '—',
      exportKey: r => r._kind === 'out' ? r.charges_paise / 100 : 0 },
    { key: 'status', label: 'Status', render: r => (
      <Badge variant="outline" className="text-[10px] capitalize">{r._status.replace(/_/g, ' ')}</Badge>
    ), exportKey: r => r._status },
  ];

  const statusOptions: StatusOption[] = [
    { value: 'in_warranty', label: 'In Warranty' },
    { value: 'expired', label: 'Expired' },
    { value: 'oem_warranty_only', label: 'OEM Warranty Only' },
    { value: 'amc_covered', label: 'AMC Covered' },
    { value: 'out_of_warranty', label: 'Out of Warranty' },
    { value: 'paid', label: 'Out · Paid' },
    { value: 'unpaid', label: 'Out · Unpaid' },
  ];

  const summaryBuilder = (f: (CustomerVoucherUnified & { id: string })[]): SummaryCard[] => {
    const ins = f.filter(r => r._kind === 'in');
    const outs = f.filter(r => r._kind === 'out') as (CustomerOutVoucher & { _kind: 'out' })[];
    const charges = dSum(outs, r => r.charges_paise / 100);
    return [
      { label: 'Total Vouchers', value: String(f.length) },
      { label: 'In', value: String(ins.length), tone: 'neutral' },
      { label: 'Out', value: String(outs.length), tone: 'neutral' },
      { label: 'Charges Out ₹', value: fmtINR(charges * 100), tone: 'positive' },
      { label: 'Unpaid Out', value: String(outs.filter(r => !r.paid).length), tone: 'warning' },
    ];
  };

  return (
    <div className="max-w-7xl mx-auto space-y-4 p-6">
      <UniversalRegisterGrid<CustomerVoucherUnified & { id: string }>
        entityCode={safeEntity}
        meta={meta}
        rows={rows}
        columns={columns}
        statusOptions={statusOptions}
        statusKey="_status"
        summaryBuilder={summaryBuilder}
        onNavigateToRecord={setSelected}
      />
      <Dialog open={!!selected} onOpenChange={o => !o && setSelected(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selected && <CustomerVoucherDetailPanel voucher={selected} onPrint={() => setPrinting(selected)} />}
        </DialogContent>
      </Dialog>
      <Dialog open={!!printing} onOpenChange={o => !o && setPrinting(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          {printing && <CustomerVoucherPrint voucher={printing} onClose={() => setPrinting(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default CustomerVoucherRegisterPanel;
