/**
 * InwardReceiptRegister.tsx — UPRA-3 Phase B · T2-1 V2 (in-place replacement)
 * Canonical UniversalRegisterGrid<InwardReceipt> consumer.
 * Sidebar route: dh-i-inward-receipt-register (PRESERVED · DispatchHubPage import 0-diff)
 * Export name: InwardReceiptRegisterPanel (PRESERVED · default export retained)
 * NO workflow extraction (no inline workflow surface in legacy · approveInwardReceipt engine consumed by no UI in repo).
 * Tabs migrated to canonical statusOptions per master Q3.
 * Search box dropped (UniversalRegisterGrid has built-in search across exportKey columns).
 * Props.onModuleChange preserved for DispatchHubPage interface compat (currently unused in body).
 * [JWT] GET /api/logistic/inward-receipts
 */
import { useEffect, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import { UniversalRegisterGrid } from '@/components/registers/UniversalRegisterGrid';
import type { RegisterColumn, RegisterMeta, SummaryCard, StatusOption } from '@/components/registers/UniversalRegisterTypes';
import {
  INWARD_STATUS_LABELS, INWARD_STATUS_COLORS,
  type InwardReceipt, type InwardReceiptStatus,
} from '@/types/inward-receipt';
import { listInwardReceipts } from '@/lib/inward-receipt-engine';
import type { DispatchHubModule } from '../DispatchHubSidebar';
import { InwardReceiptDetailPanel } from './detail/InwardReceiptDetailPanel';
import { InwardReceiptPrint } from './print/InwardReceiptPrint';

interface Props { onModuleChange?: (m: DispatchHubModule) => void }

export function InwardReceiptRegisterPanel(_props: Props): JSX.Element {
  void _props;
  const { entityCode } = useCardEntitlement();
  const safeEntity = entityCode || 'SMRT';
  const [rows, setRows] = useState<InwardReceipt[]>([]);
  const [selected, setSelected] = useState<InwardReceipt | null>(null);
  const [printing, setPrinting] = useState<InwardReceipt | null>(null);

  useEffect(() => {
    setRows(listInwardReceipts(safeEntity));
  }, [safeEntity]);

  const meta: RegisterMeta<InwardReceipt> = {
    registerCode: 'inward_receipt_register',
    title: 'Inward Receipt Register',
    description: 'All vendor inward receipts · grouped by status · Tally-Prime register',
    dateAccessor: r => r.arrival_date,
  };

  const columns: RegisterColumn<InwardReceipt>[] = [
    { key: 'receipt_no', label: 'Receipt No', clickable: true, render: r => r.receipt_no, exportKey: 'receipt_no' },
    { key: 'date', label: 'Arrival', render: r => r.arrival_date, exportKey: 'arrival_date' },
    { key: 'vendor', label: 'Vendor', render: r => r.vendor_name, exportKey: 'vendor_name' },
    { key: 'po', label: 'PO No', render: r => r.po_no ?? '—', exportKey: r => r.po_no ?? '' },
    { key: 'vehicle', label: 'Vehicle', render: r => r.vehicle_no ?? '—', exportKey: r => r.vehicle_no ?? '' },
    { key: 'lines', label: 'Lines', align: 'right', render: r => r.total_lines, exportKey: r => r.total_lines },
    { key: 'quarantine', label: 'Quarantine', align: 'right', render: r => r.quarantine_lines, exportKey: r => r.quarantine_lines },
    {
      key: 'status', label: 'Status',
      render: r => <Badge variant="outline" className={INWARD_STATUS_COLORS[r.status]}>{INWARD_STATUS_LABELS[r.status]}</Badge>,
      exportKey: 'status',
    },
  ];

  const statusOptions: StatusOption[] = (Object.keys(INWARD_STATUS_LABELS) as InwardReceiptStatus[])
    .map(s => ({ value: s, label: INWARD_STATUS_LABELS[s] }));

  const summaryBuilder = (f: InwardReceipt[]): SummaryCard[] => {
    const arrived = f.filter(r => r.status === 'arrived').length;
    const quarantine = f.filter(r => r.status === 'quarantine').length;
    const released = f.filter(r => r.status === 'released').length;
    const rejected = f.filter(r => r.status === 'rejected').length;
    return [
      { label: 'Total Receipts', value: String(f.length) },
      { label: 'Arrived · awaiting routing', value: String(arrived), tone: 'warning' },
      { label: 'In Quarantine', value: String(quarantine), tone: quarantine > 0 ? 'warning' : 'neutral' },
      { label: 'Released', value: String(released), tone: 'positive' },
      { label: 'Rejected', value: String(rejected), tone: rejected > 0 ? 'negative' : 'neutral' },
    ];
  };

  return (
    <div className="max-w-7xl mx-auto space-y-4 p-6">
      <UniversalRegisterGrid<InwardReceipt>
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
          {selected && <InwardReceiptDetailPanel receipt={selected} onPrint={() => setPrinting(selected)} />}
        </DialogContent>
      </Dialog>
      <Dialog open={!!printing} onOpenChange={o => !o && setPrinting(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          {printing && <InwardReceiptPrint receipt={printing} onClose={() => setPrinting(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default InwardReceiptRegisterPanel;
