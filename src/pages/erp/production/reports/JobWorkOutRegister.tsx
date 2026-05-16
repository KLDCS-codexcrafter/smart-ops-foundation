/**
 * JobWorkOutRegister.tsx — UPRA-2 Phase A · T2-3 V2 (in-place replacement)
 * Canonical UniversalRegisterGrid<JobWorkOutOrder> consumer.
 * Sidebar route: rpt-jw-out-register (PRESERVED · ProductionPage import 0-diff)
 * Export name: JobWorkOutRegisterPanel (PRESERVED)
 * Preserves vendor + status filters via customFilters extension point.
 * [JWT] GET /api/production/job-work-out-orders/:entityCode
 */
import { useMemo, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useJobWorkOutOrders } from '@/hooks/useJobWorkOutOrders';
import { round2 } from '@/lib/decimal-helpers';
import { UniversalRegisterGrid } from '@/components/registers/UniversalRegisterGrid';
import type { RegisterColumn, RegisterMeta, SummaryCard, StatusOption } from '@/components/registers/UniversalRegisterTypes';
import type { JobWorkOutOrder, JobWorkOutOrderStatus } from '@/types/job-work-out-order';
import { JobWorkOutDetailPanel } from './detail/JobWorkOutDetailPanel';
import { JobWorkOutPrint } from './print/JobWorkOutPrint';

const STATUS_LABELS: Record<JobWorkOutOrderStatus, string> = {
  draft: 'Draft', sent: 'Sent', partially_received: 'Partial', received: 'Received',
  pre_closed: 'Pre-Closed', cancelled: 'Cancelled',
};

const fmtINR = (n: number): string =>
  `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n)}`;

export function JobWorkOutRegisterPanel(): JSX.Element {
  const { entityCode } = useEntityCode();
  const { jwos } = useJobWorkOutOrders(entityCode);
  const [vendorFilter, setVendorFilter] = useState('__all__');
  const [selected, setSelected] = useState<JobWorkOutOrder | null>(null);
  const [printing, setPrinting] = useState<JobWorkOutOrder | null>(null);

  const vendors = useMemo(() => {
    const map = new Map<string, string>();
    for (const j of jwos) map.set(j.vendor_id, j.vendor_name);
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [jwos]);

  const filteredByVendor = useMemo(
    () => vendorFilter === '__all__' ? jwos : jwos.filter(j => j.vendor_id === vendorFilter),
    [jwos, vendorFilter],
  );

  const meta: RegisterMeta<JobWorkOutOrder> = {
    registerCode: 'job_work_out_register',
    title: 'Job Work Out Register',
    description: 'Sub-contractor job work orders · Tally-Prime register',
    dateAccessor: r => r.jwo_date,
  };

  const columns: RegisterColumn<JobWorkOutOrder>[] = [
    { key: 'doc_no', label: 'Doc No', clickable: true, render: r => r.doc_no, exportKey: 'doc_no' },
    { key: 'jwo_date', label: 'JWO Date', render: r => r.jwo_date, exportKey: 'jwo_date' },
    { key: 'expected', label: 'Exp Return', render: r => r.expected_return_date, exportKey: 'expected_return_date' },
    { key: 'vendor', label: 'Vendor', render: r => r.vendor_name, exportKey: 'vendor_name' },
    { key: 'gstin', label: 'GSTIN', render: r => r.vendor_gstin ?? '—', exportKey: r => r.vendor_gstin ?? '' },
    { key: 'lines', label: 'Lines', align: 'right', render: r => r.lines.length, exportKey: r => r.lines.length },
    { key: 'sent', label: 'Sent Qty', align: 'right', render: r => r.total_sent_qty, exportKey: r => r.total_sent_qty },
    { key: 'received', label: 'Recvd Qty', align: 'right', render: r => r.total_received_qty, exportKey: r => r.total_received_qty },
    { key: 'value', label: 'JW Value ₹', align: 'right', render: r => fmtINR(r.total_jw_value), exportKey: r => r.total_jw_value },
    { key: 'process', label: 'Process', render: r => r.nature_of_processing ?? '—', exportKey: r => r.nature_of_processing ?? '' },
    { key: 'status', label: 'Status', render: r => <Badge variant="outline" className="text-[10px]">{STATUS_LABELS[r.status]}</Badge>, exportKey: 'status' },
  ];

  const statusOptions: StatusOption[] = (Object.keys(STATUS_LABELS) as JobWorkOutOrderStatus[])
    .map(s => ({ value: s, label: STATUS_LABELS[s] }));

  const summaryBuilder = (f: JobWorkOutOrder[]): SummaryCard[] => {
    let totalValue = 0, totalSent = 0, totalReceived = 0;
    for (const j of f) {
      totalValue = round2(totalValue + j.total_jw_value);
      totalSent += j.total_sent_qty;
      totalReceived += j.total_received_qty;
    }
    return [
      { label: 'Total JWOs', value: String(f.length) },
      { label: 'Total Value ₹', value: fmtINR(totalValue), tone: 'positive' },
      { label: 'Sent Qty', value: String(totalSent) },
      { label: 'Received Qty', value: String(totalReceived) },
      { label: 'Pending Qty', value: String(round2(totalSent - totalReceived)), tone: 'warning' },
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
      <UniversalRegisterGrid<JobWorkOutOrder>
        entityCode={entityCode}
        meta={meta}
        rows={filteredByVendor}
        columns={columns}
        statusOptions={statusOptions}
        statusKey="status"
        summaryBuilder={summaryBuilder}
        customFilters={vendorFilterUI}
        onNavigateToRecord={setSelected}
      />
      <Dialog open={!!selected} onOpenChange={o => !o && setSelected(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selected && <JobWorkOutDetailPanel jwo={selected} onPrint={() => setPrinting(selected)} />}
        </DialogContent>
      </Dialog>
      <Dialog open={!!printing} onOpenChange={o => !o && setPrinting(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          {printing && <JobWorkOutPrint jwo={printing} onClose={() => setPrinting(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default JobWorkOutRegisterPanel;
