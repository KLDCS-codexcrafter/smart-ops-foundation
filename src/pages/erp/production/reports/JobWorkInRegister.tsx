/**
 * JobWorkInRegister.tsx — UPRA-2 Phase A · T2-4 V2 (in-place replacement)
 * Canonical UniversalRegisterGrid<JobWorkReceipt> consumer · trivial (no Detail/Print).
 * Sidebar route: rpt-jw-in-register (PRESERVED)
 * Export name: JobWorkInRegisterPanel (PRESERVED)
 * Preserves the vendor filter from old code via customFilters.
 * [JWT] GET /api/production/job-work-receipts/:entityCode
 */
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useJobWorkReceipts } from '@/hooks/useJobWorkReceipts';
import { UniversalRegisterGrid } from '@/components/registers/UniversalRegisterGrid';
import type { RegisterColumn, RegisterMeta, SummaryCard, StatusOption } from '@/components/registers/UniversalRegisterTypes';
import type { JobWorkReceipt, JobWorkReceiptStatus } from '@/types/job-work-receipt';

const STATUS_LABELS: Record<JobWorkReceiptStatus, string> = {
  draft: 'Draft', received: 'Received', cancelled: 'Cancelled',
};

export function JobWorkInRegisterPanel(): JSX.Element {
  const { entityCode } = useEntityCode();
  const { receipts } = useJobWorkReceipts(entityCode);
  const [vendorFilter, setVendorFilter] = useState('__all__');

  const vendors = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of receipts) map.set(r.vendor_id, r.vendor_name);
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [receipts]);

  const filteredByVendor = useMemo(
    () => vendorFilter === '__all__' ? receipts : receipts.filter(r => r.vendor_id === vendorFilter),
    [receipts, vendorFilter],
  );

  const meta: RegisterMeta<JobWorkReceipt> = {
    registerCode: 'job_work_in_register',
    title: 'Job Work IN Register',
    description: 'Receipts back from sub-contractors · Tally-Prime register',
    dateAccessor: r => r.receipt_date,
  };

  const columns: RegisterColumn<JobWorkReceipt>[] = [
    { key: 'doc_no', label: 'Doc No', render: r => r.doc_no, exportKey: 'doc_no' },
    { key: 'receipt_date', label: 'Date', render: r => r.receipt_date, exportKey: 'receipt_date' },
    { key: 'jwo', label: 'JWO No', render: r => r.job_work_out_order_no, exportKey: 'job_work_out_order_no' },
    { key: 'vendor', label: 'Vendor', render: r => r.vendor_name, exportKey: 'vendor_name' },
    { key: 'received', label: 'Received', align: 'right', render: r => r.total_received_qty, exportKey: r => r.total_received_qty },
    { key: 'rejected', label: 'Rejected', align: 'right', render: r => r.total_rejected_qty, exportKey: r => r.total_rejected_qty },
    { key: 'lines', label: 'Lines', align: 'right', render: r => r.lines.length, exportKey: r => r.lines.length },
    { key: 'complete', label: 'JWO Complete', render: r => r.marks_jwo_complete ? 'Yes' : 'No', exportKey: r => r.marks_jwo_complete ? 'Yes' : 'No' },
    { key: 'status', label: 'Status', render: r => <Badge variant="outline" className="text-[10px]">{STATUS_LABELS[r.status]}</Badge>, exportKey: 'status' },
  ];

  const statusOptions: StatusOption[] = (Object.keys(STATUS_LABELS) as JobWorkReceiptStatus[])
    .map(s => ({ value: s, label: STATUS_LABELS[s] }));

  const summaryBuilder = (f: JobWorkReceipt[]): SummaryCard[] => {
    const received = f.reduce((a, r) => a + r.total_received_qty, 0);
    const rejected = f.reduce((a, r) => a + r.total_rejected_qty, 0);
    return [
      { label: 'Total Receipts', value: String(f.length) },
      { label: 'Received Qty', value: String(received), tone: 'positive' },
      { label: 'Rejected Qty', value: String(rejected), tone: rejected > 0 ? 'warning' : 'neutral' },
      { label: 'Draft', value: String(f.filter(r => r.status === 'draft').length) },
      { label: 'Marks JWO Complete', value: String(f.filter(r => r.marks_jwo_complete).length) },
    ];
  };

  const vendorFilterUI = (
    <div>
      <Label className="text-xs text-muted-foreground block mb-1">Vendor</Label>
      <Select value={vendorFilter} onValueChange={setVendorFilter}>
        <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">All vendors</SelectItem>
          {vendors.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-4 p-6">
      <UniversalRegisterGrid<JobWorkReceipt>
        entityCode={entityCode}
        meta={meta}
        rows={filteredByVendor}
        columns={columns}
        statusOptions={statusOptions}
        statusKey="status"
        summaryBuilder={summaryBuilder}
        customFilters={vendorFilterUI}
      />
    </div>
  );
}

export default JobWorkInRegisterPanel;
