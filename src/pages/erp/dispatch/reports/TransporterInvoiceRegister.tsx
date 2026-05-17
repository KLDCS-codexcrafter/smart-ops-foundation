/**
 * TransporterInvoiceRegister.tsx — UPRA-3 Phase A Step 2 · Tier-1 NEW Register #2
 * Canonical UniversalRegisterGrid<TransporterInvoice>.
 * Sidebar module: dh-r-transporter-invoice-register
 * [JWT] GET /api/dispatch/transporter-invoices/:entityCode
 */
import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import { UniversalRegisterGrid } from '@/components/registers/UniversalRegisterGrid';
import type { RegisterColumn, RegisterMeta, SummaryCard, StatusOption } from '@/components/registers/UniversalRegisterTypes';
import { transporterInvoicesKey, type TransporterInvoice, type InvoiceStatus } from '@/types/transporter-invoice';
import { TransporterInvoiceDetailPanel } from './detail/TransporterInvoiceDetailPanel';
import { TransporterInvoicePrint } from './print/TransporterInvoicePrint';

const STATUS_LABELS: Record<InvoiceStatus, string> = {
  uploaded: 'Uploaded', reconciling: 'Reconciling', reconciled: 'Reconciled',
  approved: 'Approved', partial_approved: 'Partial Approved',
  disputed: 'Disputed', paid: 'Paid', void: 'Void',
};

const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

function seedIfEmpty(entity: string): TransporterInvoice[] {
  try {
    const raw = localStorage.getItem(transporterInvoicesKey(entity));
    const list = raw ? (JSON.parse(raw) as TransporterInvoice[]) : [];
    if (list.length > 0) return list;
    const now = new Date().toISOString();
    const today = now.slice(0, 10);
    const base = {
      entity_id: entity, fiscal_year_id: 'FY-2025-26',
      period_from: today, period_to: today,
      lines: [], workflow_mode: 'flag_only' as const,
      tolerance_pct: 5, tolerance_amount: null,
      uploaded_at: now, uploaded_by: 'sys',
      upload_source: 'manual' as const,
      reconciled_at: null, reconciled_by: null, notes: '',
      created_at: now, updated_at: now,
    };
    const seed: TransporterInvoice[] = [
      {
        ...base, id: 'ti-seed-1', invoice_no: 'TI/2026/0001', invoice_date: today,
        logistic_id: 'lg-1', logistic_name: 'Bharat Roadways',
        total_declared: 42000, total_gst: 7560, grand_total: 49560,
        status: 'uploaded',
      },
      {
        ...base, id: 'ti-seed-2', invoice_no: 'TI/2026/0002', invoice_date: today,
        logistic_id: 'lg-2', logistic_name: 'Safe Express Logistics',
        total_declared: 88000, total_gst: 15840, grand_total: 103840,
        status: 'reconciled',
      },
      {
        ...base, id: 'ti-seed-3', invoice_no: 'TI/2026/0003', invoice_date: today,
        logistic_id: 'lg-3', logistic_name: 'TCI Freight',
        total_declared: 22500, total_gst: 4050, grand_total: 26550,
        status: 'disputed',
      },
    ];
    localStorage.setItem(transporterInvoicesKey(entity), JSON.stringify(seed));
    return seed;
  } catch { return []; }
}

export function TransporterInvoiceRegisterPanel() {
  const { entityCode } = useCardEntitlement();
  const safeEntity = entityCode || 'SMRT';
  const [selected, setSelected] = useState<TransporterInvoice | null>(null);
  const [printing, setPrinting] = useState<TransporterInvoice | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => { seedIfEmpty(safeEntity); setTick(t => t + 1); }, [safeEntity]);

  const rows = useMemo<TransporterInvoice[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(transporterInvoicesKey(safeEntity)) || '[]') as TransporterInvoice[];
    } catch { return []; }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeEntity, tick]);

  const meta: RegisterMeta<TransporterInvoice> = {
    registerCode: 'transporter_invoice_register',
    title: 'Transporter Invoice Register',
    description: 'Inbox of transporter invoices · upload → reconcile → approve → pay',
    dateAccessor: r => (r.invoice_date || r.uploaded_at).slice(0, 10),
  };

  const columns: RegisterColumn<TransporterInvoice>[] = [
    { key: 'invoice_no', label: 'Invoice No', clickable: true, render: r => r.invoice_no, exportKey: 'invoice_no' },
    { key: 'date', label: 'Date', render: r => r.invoice_date, exportKey: 'invoice_date' },
    { key: 'transporter', label: 'Transporter', render: r => r.logistic_name, exportKey: 'logistic_name' },
    { key: 'period', label: 'Period', render: r => `${r.period_from} → ${r.period_to}`, exportKey: r => `${r.period_from} → ${r.period_to}` },
    { key: 'lines', label: 'Lines', align: 'right', render: r => r.lines.length, exportKey: r => r.lines.length },
    { key: 'declared', label: 'Declared', align: 'right', render: r => <span className="font-mono">{fmt(r.total_declared)}</span>, exportKey: r => r.total_declared },
    { key: 'gst', label: 'GST', align: 'right', render: r => <span className="font-mono">{fmt(r.total_gst)}</span>, exportKey: r => r.total_gst },
    { key: 'total', label: 'Grand Total', align: 'right', render: r => <span className="font-mono">{fmt(r.grand_total)}</span>, exportKey: r => r.grand_total },
    { key: 'status', label: 'Status', render: r => <Badge variant="outline" className="text-[10px]">{STATUS_LABELS[r.status]}</Badge>, exportKey: 'status' },
  ];

  const statusOptions: StatusOption[] = (Object.keys(STATUS_LABELS) as InvoiceStatus[])
    .map(s => ({ value: s, label: STATUS_LABELS[s] }));

  const summaryBuilder = (f: TransporterInvoice[]): SummaryCard[] => {
    const declared = f.reduce((a, r) => a + r.total_declared, 0);
    const gst = f.reduce((a, r) => a + r.total_gst, 0);
    const total = f.reduce((a, r) => a + r.grand_total, 0);
    const disputed = f.filter(r => r.status === 'disputed').length;
    return [
      { label: 'Total Invoices', value: String(f.length) },
      { label: 'Declared', value: fmt(declared) },
      { label: 'GST', value: fmt(gst) },
      { label: 'Grand Total', value: fmt(total), tone: 'positive' },
      { label: 'Disputed', value: String(disputed), tone: disputed > 0 ? 'warning' : 'neutral' },
    ];
  };

  return (
    <div className="max-w-7xl mx-auto space-y-4 p-6">
      <UniversalRegisterGrid<TransporterInvoice>
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
          {selected && <TransporterInvoiceDetailPanel invoice={selected} onPrint={() => setPrinting(selected)} />}
        </DialogContent>
      </Dialog>
      <Dialog open={!!printing} onOpenChange={o => !o && setPrinting(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          {printing && <TransporterInvoicePrint invoice={printing} onClose={() => setPrinting(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default TransporterInvoiceRegisterPanel;
