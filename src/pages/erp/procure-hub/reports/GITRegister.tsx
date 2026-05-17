/**
 * GITRegister.tsx — UPRA-3 Phase A Step 2 · Tier-1 NEW Register #4
 * Canonical UniversalRegisterGrid<GitStage1Record>.
 * Sidebar module: git-register
 * [JWT] GET /api/procure/git/:entityCode
 */
import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import { UniversalRegisterGrid } from '@/components/registers/UniversalRegisterGrid';
import type { RegisterColumn, RegisterMeta, SummaryCard, StatusOption } from '@/components/registers/UniversalRegisterTypes';
import { gitStage1Key, type GitStage1Record, type GitStage1Status } from '@/types/git';
import { GITDetailPanel } from './detail/GITDetailPanel';
import { GITPrint } from './print/GITPrint';

const STATUS_LABELS: Record<GitStage1Status, string> = {
  in_transit: 'In Transit',
  received_at_gate: 'Received at Gate',
  rejected_at_gate: 'Rejected at Gate',
  partial_receive: 'Partial Receive',
};

function seedIfEmpty(entity: string): GitStage1Record[] {
  try {
    const raw = localStorage.getItem(gitStage1Key(entity));
    const list = raw ? (JSON.parse(raw) as GitStage1Record[]) : [];
    if (list.length > 0) return list;
    const now = new Date().toISOString();
    const today = now.slice(0, 10);
    const base = {
      entity_id: entity, fiscal_year_id: 'FY-2025-26',
      branch_id: null, godown_id: 'g-stores',
      quality_check_passed: true, quality_notes: '',
      stage2_grn_id: null, stage2_completed_at: null,
      notes: '', received_by_user_id: 'u-1',
      created_at: now, updated_at: now,
    };
    const seed: GitStage1Record[] = [
      {
        ...base, id: 'git-seed-1', git_no: 'GIT/2526/0001',
        po_id: 'po-1', po_no: 'PO/2526/0011',
        vendor_id: 'v-1', vendor_name: 'Maharashtra Steels Pvt Ltd',
        receipt_date: today, vehicle_no: 'MH-12-AB-1234', driver_name: 'Ravi Kumar',
        invoice_no: 'INV/2526/0091',
        lines: [
          { id: 'l1', po_line_id: 'pol-1', item_id: 'i-1', item_name: 'TMT Bars 12mm',
            qty_ordered: 100, qty_received: 100, qty_accepted: 100, qty_rejected: 0,
            uom: 'NOS', rejection_reason: null },
        ],
        status: 'received_at_gate',
      },
      {
        ...base, id: 'git-seed-2', git_no: 'GIT/2526/0002',
        po_id: 'po-2', po_no: 'PO/2526/0012',
        vendor_id: 'v-2', vendor_name: 'Bengaluru Castings',
        receipt_date: today, vehicle_no: 'KA-05-CD-5678', driver_name: 'Manjunath',
        invoice_no: null,
        lines: [
          { id: 'l2', po_line_id: 'pol-2', item_id: 'i-2', item_name: 'CI Castings 4kg',
            qty_ordered: 50, qty_received: 0, qty_accepted: 0, qty_rejected: 0,
            uom: 'NOS', rejection_reason: null },
        ],
        status: 'in_transit',
      },
      {
        ...base, id: 'git-seed-3', git_no: 'GIT/2526/0003',
        po_id: 'po-3', po_no: 'PO/2526/0013',
        vendor_id: 'v-3', vendor_name: 'Chennai Polymers',
        receipt_date: today, vehicle_no: 'TN-22-EF-9012', driver_name: 'Karthik',
        invoice_no: 'INV/2526/0099',
        lines: [
          { id: 'l3', po_line_id: 'pol-3', item_id: 'i-3', item_name: 'PVC Pipes 4"',
            qty_ordered: 200, qty_received: 180, qty_accepted: 175, qty_rejected: 5,
            uom: 'NOS', rejection_reason: 'Bent ends' },
        ],
        status: 'partial_receive',
      },
    ];
    localStorage.setItem(gitStage1Key(entity), JSON.stringify(seed));
    return seed;
  } catch { return []; }
}

export function GITRegisterPanel() {
  const { entityCode } = useCardEntitlement();
  const safeEntity = entityCode || 'SMRT';
  const [selected, setSelected] = useState<GitStage1Record | null>(null);
  const [printing, setPrinting] = useState<GitStage1Record | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => { seedIfEmpty(safeEntity); setTick(t => t + 1); }, [safeEntity]);

  const rows = useMemo<GitStage1Record[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(gitStage1Key(safeEntity)) || '[]') as GitStage1Record[];
    } catch { return []; }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeEntity, tick]);

  const meta: RegisterMeta<GitStage1Record> = {
    registerCode: 'git_register',
    title: 'GIT Register',
    description: 'Goods in Transit · Stage 1 · gate-receipt · Procure360-owned',
    dateAccessor: r => (r.receipt_date || r.created_at).slice(0, 10),
  };

  const sumQty = (r: GitStage1Record, k: 'qty_ordered' | 'qty_received' | 'qty_accepted' | 'qty_rejected') =>
    r.lines.reduce((a, l) => a + l[k], 0);

  const columns: RegisterColumn<GitStage1Record>[] = [
    { key: 'git_no', label: 'GIT No', clickable: true, render: r => r.git_no, exportKey: 'git_no' },
    { key: 'date', label: 'Receipt Date', render: r => r.receipt_date.slice(0, 10), exportKey: r => r.receipt_date.slice(0, 10) },
    { key: 'po', label: 'PO No', render: r => r.po_no, exportKey: 'po_no' },
    { key: 'vendor', label: 'Vendor', render: r => r.vendor_name, exportKey: 'vendor_name' },
    { key: 'vehicle', label: 'Vehicle', render: r => r.vehicle_no ?? '—', exportKey: r => r.vehicle_no ?? '' },
    { key: 'ordered', label: 'Ordered', align: 'right', render: r => sumQty(r, 'qty_ordered'), exportKey: r => sumQty(r, 'qty_ordered') },
    { key: 'received', label: 'Received', align: 'right', render: r => sumQty(r, 'qty_received'), exportKey: r => sumQty(r, 'qty_received') },
    { key: 'accepted', label: 'Accepted', align: 'right', render: r => sumQty(r, 'qty_accepted'), exportKey: r => sumQty(r, 'qty_accepted') },
    { key: 'rejected', label: 'Rejected', align: 'right', render: r => sumQty(r, 'qty_rejected'), exportKey: r => sumQty(r, 'qty_rejected') },
    { key: 'status', label: 'Status', render: r => <Badge variant="outline" className="text-[10px]">{STATUS_LABELS[r.status]}</Badge>, exportKey: 'status' },
  ];

  const statusOptions: StatusOption[] = (Object.keys(STATUS_LABELS) as GitStage1Status[])
    .map(s => ({ value: s, label: STATUS_LABELS[s] }));

  const summaryBuilder = (f: GitStage1Record[]): SummaryCard[] => {
    const inTransit = f.filter(r => r.status === 'in_transit').length;
    const received = f.filter(r => r.status === 'received_at_gate').length;
    const partial = f.filter(r => r.status === 'partial_receive').length;
    const rejected = f.filter(r => r.status === 'rejected_at_gate').length;
    return [
      { label: 'Total GIT', value: String(f.length) },
      { label: 'In Transit', value: String(inTransit), tone: 'warning' },
      { label: 'Received', value: String(received), tone: 'positive' },
      { label: 'Partial', value: String(partial) },
      { label: 'Rejected', value: String(rejected), tone: rejected > 0 ? 'negative' : 'neutral' },
    ];
  };

  return (
    <div className="max-w-7xl mx-auto space-y-4 p-6">
      <UniversalRegisterGrid<GitStage1Record>
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
          {selected && <GITDetailPanel git={selected} onPrint={() => setPrinting(selected)} />}
        </DialogContent>
      </Dialog>
      <Dialog open={!!printing} onOpenChange={o => !o && setPrinting(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          {printing && <GITPrint git={printing} onClose={() => setPrinting(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default GITRegisterPanel;
