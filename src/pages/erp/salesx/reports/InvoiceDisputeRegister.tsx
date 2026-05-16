/**
 * InvoiceDisputeRegister.tsx — UPRA-1 Phase A · T1-7
 * Sidebar route: sx-r-invoice-dispute
 * [JWT] GET /api/sales/invoice-disputes/:entityCode
 */
import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import { UniversalRegisterGrid } from '@/components/registers/UniversalRegisterGrid';
import type { RegisterColumn, RegisterMeta, SummaryCard, StatusOption } from '@/components/registers/UniversalRegisterTypes';
import {
  disputesKey, DISPUTE_STATUS_LABELS, DISPUTE_STATUS_COLOURS, DISPUTE_REASON_LABELS,
  type InvoiceDispute, type DisputeStatus,
} from '@/types/invoice-dispute';
import { dSum } from '@/lib/decimal-helpers';
import { InvoiceDisputeDetailPanel } from './detail/InvoiceDisputeDetailPanel';
import { InvoiceDisputePrint } from './print/InvoiceDisputePrint';

const fmtINR = (paise: number): string =>
  `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(paise / 100)}`;

function seedIfEmpty(entity: string): void {
  try {
    if (localStorage.getItem(disputesKey(entity))) return;
    const now = new Date().toISOString();
    const today = now.slice(0, 10);
    const seed: InvoiceDispute[] = [
      {
        id: 'dsp-seed-1', entity_id: entity, fiscal_year_id: 'FY-2025-26',
        dispute_no: 'DSP/2026/0001', dispute_date: today,
        distributor_id: 'dist-1', customer_id: 'cust-1',
        voucher_id: 'v-1', voucher_no: 'INV/25-26/0010',
        line_id: 'line-1', reason: 'short_supply',
        billed_quantity: 50, received_quantity: 48,
        disputed_amount_paise: 17000,
        distributor_remarks: 'Two units short on delivery — please credit.',
        photo_urls: [], status: 'under_review',
        reviewed_by: 'ops-1', reviewed_at: now,
        resolution_type: null, credit_note_voucher_id: null,
        approved_amount_paise: null, rejection_reason: null,
        internal_remarks: 'Driver confirms 48 dispatched',
        created_at: now, updated_at: now,
      },
      {
        id: 'dsp-seed-2', entity_id: entity, fiscal_year_id: 'FY-2025-26',
        dispute_no: 'DSP/2026/0002', dispute_date: today,
        distributor_id: 'dist-2', customer_id: 'cust-2',
        voucher_id: 'v-2', voucher_no: 'INV/25-26/0011',
        line_id: null, reason: 'damaged',
        billed_quantity: 100, received_quantity: 100,
        disputed_amount_paise: 50000,
        distributor_remarks: 'Multiple bags torn during transit. Photos attached.',
        photo_urls: [], status: 'open',
        reviewed_by: null, reviewed_at: null,
        resolution_type: null, credit_note_voucher_id: null,
        approved_amount_paise: null, rejection_reason: null,
        internal_remarks: '', created_at: now, updated_at: now,
      },
    ];
    localStorage.setItem(disputesKey(entity), JSON.stringify(seed));
  } catch { /* quota silent */ }
}

export function InvoiceDisputeRegisterPanel() {
  const { entityCode } = useCardEntitlement();
  const safeEntity = entityCode || 'SMRT';
  const [selected, setSelected] = useState<InvoiceDispute | null>(null);
  const [printing, setPrinting] = useState<InvoiceDispute | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => { seedIfEmpty(safeEntity); setTick(t => t + 1); }, [safeEntity]);

  const rows = useMemo<InvoiceDispute[]>(() => {
    try { return JSON.parse(localStorage.getItem(disputesKey(safeEntity)) || '[]') as InvoiceDispute[]; }
    catch { return []; }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeEntity, tick]);

  const meta: RegisterMeta<InvoiceDispute> = {
    registerCode: 'invoice_dispute_register',
    title: 'Invoice Dispute Register',
    description: 'Distributor-initiated disputes · short / damaged / wrong / rate',
    dateAccessor: r => r.dispute_date,
  };

  const columns: RegisterColumn<InvoiceDispute>[] = [
    { key: 'no', label: 'Dispute No', clickable: true, render: r => r.dispute_no, exportKey: 'dispute_no' },
    { key: 'date', label: 'Date', render: r => r.dispute_date, exportKey: 'dispute_date' },
    { key: 'invoice', label: 'Invoice', render: r => r.voucher_no, exportKey: 'voucher_no' },
    { key: 'reason', label: 'Reason', render: r => DISPUTE_REASON_LABELS[r.reason], exportKey: r => DISPUTE_REASON_LABELS[r.reason] },
    { key: 'billed', label: 'Billed Qty', align: 'right', render: r => r.billed_quantity, exportKey: 'billed_quantity' },
    { key: 'recv', label: 'Recv Qty', align: 'right', render: r => r.received_quantity, exportKey: 'received_quantity' },
    { key: 'amt', label: 'Disputed ₹', align: 'right', render: r => fmtINR(r.disputed_amount_paise), exportKey: r => r.disputed_amount_paise / 100 },
    { key: 'approved', label: 'Approved ₹', align: 'right',
      render: r => r.approved_amount_paise != null ? fmtINR(r.approved_amount_paise) : '—',
      exportKey: r => r.approved_amount_paise != null ? r.approved_amount_paise / 100 : '' },
    { key: 'status', label: 'Status', render: r => (
      <Badge variant="outline" className={`text-[10px] ${DISPUTE_STATUS_COLOURS[r.status]}`}>
        {DISPUTE_STATUS_LABELS[r.status]}
      </Badge>
    ), exportKey: 'status' },
  ];

  const statusOptions: StatusOption[] = (Object.keys(DISPUTE_STATUS_LABELS) as DisputeStatus[])
    .map(s => ({ value: s, label: DISPUTE_STATUS_LABELS[s] }));

  const summaryBuilder = (f: InvoiceDispute[]): SummaryCard[] => [
    { label: 'Total Disputes', value: String(f.length) },
    { label: 'Open', value: String(f.filter(r => r.status === 'open' || r.status === 'under_review').length), tone: 'warning' },
    { label: 'Approved', value: String(f.filter(r => r.status === 'approved' || r.status === 'credit_noted').length), tone: 'positive' },
    { label: 'Disputed ₹', value: fmtINR(dSum(f, r => r.disputed_amount_paise)), tone: 'negative' },
    { label: 'Credited ₹', value: fmtINR(dSum(f, r => r.approved_amount_paise ?? 0)), tone: 'positive' },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-4 p-6">
      <UniversalRegisterGrid<InvoiceDispute>
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
          {selected && <InvoiceDisputeDetailPanel dispute={selected} onPrint={() => setPrinting(selected)} />}
        </DialogContent>
      </Dialog>
      <Dialog open={!!printing} onOpenChange={o => !o && setPrinting(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          {printing && <InvoiceDisputePrint dispute={printing} onClose={() => setPrinting(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default InvoiceDisputeRegisterPanel;
