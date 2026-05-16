/**
 * JobCardRegister.tsx — UPRA-2 Phase A · T1-1
 * Canonical UniversalRegisterGrid<JobCard> consumer.
 * Sidebar route: rpt-job-card-register
 * [JWT] GET /api/production/job-cards/:entityCode
 */

import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import { UniversalRegisterGrid } from '@/components/registers/UniversalRegisterGrid';
import type { RegisterColumn, RegisterMeta, SummaryCard, StatusOption } from '@/components/registers/UniversalRegisterTypes';
import { jobCardsKey, type JobCard, type JobCardStatus } from '@/types/job-card';
import { JobCardDetailPanel } from './detail/JobCardDetailPanel';
import { JobCardPrint } from './print/JobCardPrint';

const STATUS_LABELS: Record<JobCardStatus, string> = {
  planned: 'Planned', in_progress: 'In Progress', completed: 'Completed',
  cancelled: 'Cancelled', on_hold: 'On Hold',
};

function seedIfEmpty(entity: string): JobCard[] {
  try {
    const raw = localStorage.getItem(jobCardsKey(entity));
    const list = raw ? (JSON.parse(raw) as JobCard[]) : [];
    if (list.length > 0) return list;
    const now = new Date().toISOString();
    const today = now.slice(0, 10);
    const base = {
      entity_id: entity, fiscal_year_id: 'FY-2025-26',
      factory_id: 'fac-1', work_center_id: 'wc-1',
      production_order_line_id: null, shift_id: 'shift-A', shift_name: 'A',
      wastage_qty: 0, wastage_reason: null, wastage_notes: '',
      labour_cost: 0, machine_cost: 0, total_cost: 0,
      remarks: '', breakdown_notes: '', approval_history: [],
      qc_required: false, qc_scenario: null, linked_test_report_ids: [],
      routed_to_quarantine: false, source_ncr_id: null,
      created_at: now, created_by: 'sys', updated_at: now, updated_by: 'sys',
    };
    const seed: JobCard[] = [
      {
        ...base, id: 'jc-seed-1', doc_no: 'JC/2026/0001',
        machine_id: 'mc-cnc-01', production_order_id: 'po-1', production_order_no: 'PO/2026/0011',
        employee_id: 'e-1', employee_name: 'Ravi Kumar', employee_code: 'EMP-001',
        scheduled_start: `${today}T08:00:00Z`, scheduled_end: `${today}T14:00:00Z`,
        actual_start: `${today}T08:05:00Z`, actual_end: `${today}T13:55:00Z`,
        planned_qty: 100, produced_qty: 98, rejected_qty: 1, rework_qty: 1, uom: 'NOS',
        status: 'completed', status_history: [],
      },
      {
        ...base, id: 'jc-seed-2', doc_no: 'JC/2026/0002',
        machine_id: 'mc-lathe-02', production_order_id: 'po-2', production_order_no: 'PO/2026/0012',
        employee_id: 'e-2', employee_name: 'Priya Sharma', employee_code: 'EMP-002',
        scheduled_start: `${today}T08:00:00Z`, scheduled_end: `${today}T16:00:00Z`,
        actual_start: `${today}T08:10:00Z`, actual_end: null,
        planned_qty: 200, produced_qty: 120, rejected_qty: 0, rework_qty: 0, uom: 'NOS',
        status: 'in_progress', status_history: [],
      },
      {
        ...base, id: 'jc-seed-3', doc_no: 'JC/2026/0003',
        machine_id: 'mc-mill-03', production_order_id: 'po-3', production_order_no: 'PO/2026/0013',
        employee_id: 'e-3', employee_name: 'Amit Verma', employee_code: 'EMP-003',
        scheduled_start: `${today}T14:00:00Z`, scheduled_end: `${today}T22:00:00Z`,
        actual_start: null, actual_end: null,
        planned_qty: 150, produced_qty: 0, rejected_qty: 0, rework_qty: 0, uom: 'NOS',
        status: 'planned', status_history: [],
      },
    ];
    localStorage.setItem(jobCardsKey(entity), JSON.stringify(seed));
    return seed;
  } catch { return []; }
}

export function JobCardRegisterPanel() {
  const { entityCode } = useCardEntitlement();
  const safeEntity = entityCode || 'SMRT';
  const [selected, setSelected] = useState<JobCard | null>(null);
  const [printing, setPrinting] = useState<JobCard | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => { seedIfEmpty(safeEntity); setTick(t => t + 1); }, [safeEntity]);

  const rows = useMemo<JobCard[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(jobCardsKey(safeEntity)) || '[]') as JobCard[];
    } catch { return []; }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeEntity, tick]);

  const meta: RegisterMeta<JobCard> = {
    registerCode: 'job_card_register',
    title: 'Job Card Register',
    description: 'All job cards · production shop floor · Tally-Prime register',
    dateAccessor: r => (r.scheduled_start || r.created_at).slice(0, 10),
  };

  const columns: RegisterColumn<JobCard>[] = [
    { key: 'doc_no', label: 'Doc No', clickable: true, render: r => r.doc_no, exportKey: 'doc_no' },
    { key: 'date', label: 'Scheduled', render: r => r.scheduled_start.slice(0, 10), exportKey: r => r.scheduled_start.slice(0, 10) },
    { key: 'po', label: 'Prod Order', render: r => r.production_order_no, exportKey: 'production_order_no' },
    { key: 'operator', label: 'Operator', render: r => r.employee_name, exportKey: 'employee_name' },
    { key: 'machine', label: 'Machine', render: r => r.machine_id, exportKey: 'machine_id' },
    { key: 'planned', label: 'Planned', align: 'right', render: r => r.planned_qty, exportKey: r => r.planned_qty },
    { key: 'produced', label: 'Produced', align: 'right', render: r => r.produced_qty, exportKey: r => r.produced_qty },
    { key: 'wastage', label: 'Wastage', align: 'right', render: r => r.wastage_reason ?? '—', exportKey: r => r.wastage_reason ?? '' },
    { key: 'status', label: 'Status', render: r => <Badge variant="outline" className="text-[10px]">{STATUS_LABELS[r.status]}</Badge>, exportKey: 'status' },
  ];

  const statusOptions: StatusOption[] = (Object.keys(STATUS_LABELS) as JobCardStatus[])
    .map(s => ({ value: s, label: STATUS_LABELS[s] }));

  const summaryBuilder = (f: JobCard[]): SummaryCard[] => {
    const planned = f.reduce((a, r) => a + r.planned_qty, 0);
    const produced = f.reduce((a, r) => a + r.produced_qty, 0);
    const yieldPct = planned > 0 ? (produced / planned) * 100 : 0;
    const completed = f.filter(r => r.status === 'completed').length;
    return [
      { label: 'Total Job Cards', value: String(f.length) },
      { label: 'Planned Qty', value: String(planned) },
      { label: 'Produced Qty', value: String(produced), tone: 'positive' },
      { label: 'Yield %', value: `${yieldPct.toFixed(1)}%`, tone: yieldPct >= 95 ? 'positive' : 'warning' },
      { label: 'Completed', value: `${completed} / ${f.length}` },
    ];
  };

  return (
    <div className="max-w-7xl mx-auto space-y-4 p-6">
      <UniversalRegisterGrid<JobCard>
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
          {selected && <JobCardDetailPanel card={selected} onPrint={() => setPrinting(selected)} />}
        </DialogContent>
      </Dialog>
      <Dialog open={!!printing} onOpenChange={o => !o && setPrinting(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          {printing && <JobCardPrint card={printing} onClose={() => setPrinting(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default JobCardRegisterPanel;
