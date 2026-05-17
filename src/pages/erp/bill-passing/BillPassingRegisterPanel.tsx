/**
 * BillPassingRegisterPanel.tsx — UPRA-3 Phase C · T2-3 V2 (in-place replacement)
 * Canonical UniversalRegisterGrid<BillPassingRecord> consumer.
 * Sidebar route: 'bill-passing-register' (PRESERVED · BillPassingPage switch 0-diff)
 * Export name: BillPassingRegisterPanel (named export · PRESERVED · no default export per legacy)
 * NO workflow extraction (approveBill/rejectBill live in sibling MatchReviewPanel · D-NEW-S preserved per PC-Q1=(A)).
 * Tabs/summary/search migrated to canonical UniversalRegisterGrid surface per master Q3.
 * STATUS_LABELS + STATUS_COLORS inlined per PC-Q4=(A) · type file 0-diff.
 * Legacy `inr(n)` helper preserved verbatim per PC-Q5=(A) corrected · BillPassing fields are rupees
 * (NOT paise) · formatINR from india-validations is WRONG utility (paise-based).
 * [JWT] GET /api/procure/bill-passing
 */
import { useMemo, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useEntityCode } from '@/hooks/useEntityCode';
import { listBillPassing } from '@/lib/bill-passing-engine';
import { UniversalRegisterGrid } from '@/components/registers/UniversalRegisterGrid';
import type { RegisterColumn, RegisterMeta, SummaryCard, StatusOption } from '@/components/registers/UniversalRegisterTypes';
import type { BillPassingRecord, BillPassingStatus } from '@/types/bill-passing';
import { BillPassingDetailPanel } from './detail/BillPassingDetailPanel';
import { BillPassingPrint } from './print/BillPassingPrint';

const STATUS_LABELS: Record<BillPassingStatus, string> = {
  pending_match: 'Pending Match',
  matched_clean: 'Matched (Clean)',
  matched_with_variance: 'Matched (Variance)',
  awaiting_qa: 'Awaiting QA',
  qa_failed: 'QA Failed',
  approved_for_fcpi: 'Approved for FCPI',
  fcpi_drafted: 'FCPI Drafted',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
};

const STATUS_COLORS: Record<BillPassingStatus, string> = {
  pending_match: 'bg-muted text-muted-foreground',
  matched_clean: 'bg-success/10 text-success',
  matched_with_variance: 'bg-warning/10 text-warning',
  awaiting_qa: 'bg-primary/10 text-primary',
  qa_failed: 'bg-destructive/10 text-destructive',
  approved_for_fcpi: 'bg-emerald-100 text-emerald-700',
  fcpi_drafted: 'bg-blue-100 text-blue-700',
  rejected: 'bg-destructive/10 text-destructive',
  cancelled: 'bg-muted text-muted-foreground',
};

function inr(n: number): string {
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(iso: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

export function BillPassingRegisterPanel(): JSX.Element {
  const { entityCode } = useEntityCode();
  const rows = useMemo(() => listBillPassing(entityCode), [entityCode]);
  const [selected, setSelected] = useState<BillPassingRecord | null>(null);
  const [printing, setPrinting] = useState<BillPassingRecord | null>(null);

  const meta: RegisterMeta<BillPassingRecord> = {
    registerCode: 'bill_passing_register',
    title: 'Bill Passing Register',
    description: 'All bills · PO/GRN/Invoice 3-way and 4-way match · FCPI status · Tally-Prime register',
    dateAccessor: r => r.bill_date,
  };

  const columns: RegisterColumn<BillPassingRecord>[] = [
    { key: 'bill_no', label: 'Bill No', clickable: true, render: r => r.bill_no, exportKey: 'bill_no' },
    { key: 'date', label: 'Date', render: r => fmtDate(r.bill_date), exportKey: r => r.bill_date },
    { key: 'vendor', label: 'Vendor', render: r => r.vendor_name, exportKey: 'vendor_name' },
    { key: 'po', label: 'PO No', render: r => r.po_no, exportKey: 'po_no' },
    { key: 'inv', label: 'Inv No', render: r => r.vendor_invoice_no, exportKey: 'vendor_invoice_no' },
    {
      key: 'match', label: 'Match',
      render: r => <Badge variant="outline" className="text-[10px]">{r.match_type}</Badge>,
      exportKey: 'match_type',
    },
    { key: 'po_value', label: 'PO ₹', align: 'right', render: r => inr(r.total_po_value), exportKey: r => r.total_po_value },
    { key: 'inv_value', label: 'Invoice ₹', align: 'right', render: r => inr(r.total_invoice_value), exportKey: r => r.total_invoice_value },
    {
      key: 'variance_pct', label: 'Variance %', align: 'right',
      render: r => `${r.variance_pct.toFixed(2)}%`,
      exportKey: r => r.variance_pct,
    },
    {
      key: 'status', label: 'Status',
      render: r => <Badge variant="outline" className={STATUS_COLORS[r.status]}>{STATUS_LABELS[r.status]}</Badge>,
      exportKey: 'status',
    },
    {
      key: 'fcpi', label: 'FCPI',
      render: r => <span className="font-mono text-xs">{r.fcpi_voucher_id ?? '—'}</span>,
      exportKey: r => r.fcpi_voucher_id ?? '',
    },
  ];

  const statusOptions: StatusOption[] = (Object.keys(STATUS_LABELS) as BillPassingStatus[])
    .map(s => ({ value: s, label: STATUS_LABELS[s] }));

  const summaryBuilder = (f: BillPassingRecord[]): SummaryCard[] => {
    const poTotal = f.reduce((s, b) => s + b.total_po_value, 0);
    const invTotal = f.reduce((s, b) => s + b.total_invoice_value, 0);
    const variance = f.reduce((s, b) => s + b.total_variance, 0);
    const approvedCount = f.filter(b => b.status === 'approved_for_fcpi' || b.status === 'fcpi_drafted').length;
    return [
      { label: 'Total Bills', value: String(f.length) },
      { label: 'PO Total', value: inr(poTotal) },
      { label: 'Invoice Total', value: inr(invTotal) },
      { label: 'Variance', value: inr(variance), tone: variance > 0 ? 'warning' : 'neutral' },
      { label: 'Approved for FCPI', value: String(approvedCount), tone: 'positive' },
    ];
  };

  return (
    <div className="max-w-7xl mx-auto space-y-4 p-6">
      <UniversalRegisterGrid<BillPassingRecord>
        entityCode={entityCode}
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
          {selected && <BillPassingDetailPanel bill={selected} onPrint={() => setPrinting(selected)} />}
        </DialogContent>
      </Dialog>
      <Dialog open={!!printing} onOpenChange={o => !o && setPrinting(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          {printing && <BillPassingPrint bill={printing} onClose={() => setPrinting(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
