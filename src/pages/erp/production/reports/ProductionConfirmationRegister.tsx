/**
 * ProductionConfirmationRegister.tsx — UPRA-2 Phase A · T1-3
 * Canonical UniversalRegisterGrid<ProductionConfirmation> consumer.
 * NOT a replacement for ProductionTraceRegister (Q2=(B) sibling-untouched).
 * Sidebar route: rpt-production-confirmation-register
 * [JWT] GET /api/production/confirmations/:entityCode
 */

import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import { UniversalRegisterGrid } from '@/components/registers/UniversalRegisterGrid';
import type { RegisterColumn, RegisterMeta, SummaryCard, StatusOption } from '@/components/registers/UniversalRegisterTypes';
import {
  productionConfirmationsKey, type ProductionConfirmation, type ProductionConfirmationStatus,
} from '@/types/production-confirmation';
import { ProductionConfirmationDetailPanel } from './detail/ProductionConfirmationDetailPanel';
import { ProductionConfirmationPrint } from './print/ProductionConfirmationPrint';

const STATUS_LABELS: Record<ProductionConfirmationStatus, string> = {
  draft: 'Draft', confirmed: 'Confirmed', cancelled: 'Cancelled',
};

function seedIfEmpty(entity: string): ProductionConfirmation[] {
  try {
    const raw = localStorage.getItem(productionConfirmationsKey(entity));
    const list = raw ? (JSON.parse(raw) as ProductionConfirmation[]) : [];
    if (list.length > 0) return list;
    const now = new Date().toISOString();
    const today = now.slice(0, 10);
    const base = {
      entity_id: entity, fiscal_year_id: 'FY-2025-26',
      department_id: 'dep-1', department_name: 'Plant A',
      confirmed_by_user_id: 'u-1', confirmed_by_name: 'Ravi Kumar',
      status_history: [], notes: '', linked_test_report_ids: [],
      created_at: now, created_by: 'sys', updated_at: now, updated_by: 'sys',
    };
    const mkLine = (i: number, plan: number, actual: number, item: string): ProductionConfirmation['lines'][number] => ({
      id: `l${i}`, line_no: i, output_index: 0,
      output_item_id: `item-${i}`, output_item_code: `SKU-${i}`, output_item_name: item,
      planned_qty: plan, actual_qty: actual, uom: 'NOS',
      destination_godown_id: 'g-1', destination_godown_name: 'Finished Goods',
      batch_no: `B-${today}-${i}`, serial_nos: [], heat_no: null,
      qc_required: false, qc_scenario: null, routed_to_quarantine: false,
      yield_pct: plan > 0 ? (actual / plan) * 100 : 0,
      qty_variance: actual - plan, remarks: '',
    });
    const seed: ProductionConfirmation[] = [
      {
        ...base, id: 'pc-seed-1', doc_no: 'PC/2026/0001', status: 'confirmed', confirmation_date: today,
        production_order_id: 'po-1', production_order_no: 'PO/2026/0011',
        lines: [mkLine(1, 100, 98, 'Steel Rod 12mm')],
        total_actual_qty: 98, total_planned_qty: 100, overall_yield_pct: 98, marks_po_complete: true,
      },
      {
        ...base, id: 'pc-seed-2', doc_no: 'PC/2026/0002', status: 'confirmed', confirmation_date: today,
        production_order_id: 'po-2', production_order_no: 'PO/2026/0012',
        lines: [mkLine(1, 200, 195, 'Cement Bag OPC 50kg')],
        total_actual_qty: 195, total_planned_qty: 200, overall_yield_pct: 97.5, marks_po_complete: false,
      },
      {
        ...base, id: 'pc-seed-3', doc_no: 'PC/2026/0003', status: 'draft', confirmation_date: today,
        production_order_id: 'po-3', production_order_no: 'PO/2026/0013',
        lines: [mkLine(1, 150, 0, 'PVC Pipe 1in')],
        total_actual_qty: 0, total_planned_qty: 150, overall_yield_pct: 0, marks_po_complete: false,
      },
    ];
    localStorage.setItem(productionConfirmationsKey(entity), JSON.stringify(seed));
    return seed;
  } catch { return []; }
}

export function ProductionConfirmationRegisterPanel() {
  const { entityCode } = useCardEntitlement();
  const safeEntity = entityCode || 'SMRT';
  const [selected, setSelected] = useState<ProductionConfirmation | null>(null);
  const [printing, setPrinting] = useState<ProductionConfirmation | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => { seedIfEmpty(safeEntity); setTick(t => t + 1); }, [safeEntity]);

  const rows = useMemo<ProductionConfirmation[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(productionConfirmationsKey(safeEntity)) || '[]') as ProductionConfirmation[];
    } catch { return []; }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeEntity, tick]);

  const meta: RegisterMeta<ProductionConfirmation> = {
    registerCode: 'production_confirmation_register',
    title: 'Production Confirmation Register',
    description: 'All production confirmations · Tally-Prime register',
    dateAccessor: r => r.confirmation_date,
  };

  const columns: RegisterColumn<ProductionConfirmation>[] = [
    { key: 'doc_no', label: 'Doc No', clickable: true, render: r => r.doc_no, exportKey: 'doc_no' },
    { key: 'date', label: 'Date', render: r => r.confirmation_date, exportKey: 'confirmation_date' },
    { key: 'po', label: 'Prod Order', render: r => r.production_order_no, exportKey: 'production_order_no' },
    { key: 'department', label: 'Department', render: r => r.department_name, exportKey: 'department_name' },
    { key: 'confirmed_by', label: 'Confirmed By', render: r => r.confirmed_by_name, exportKey: 'confirmed_by_name' },
    { key: 'actual', label: 'Actual', align: 'right', render: r => r.total_actual_qty, exportKey: r => r.total_actual_qty },
    { key: 'planned', label: 'Planned', align: 'right', render: r => r.total_planned_qty, exportKey: r => r.total_planned_qty },
    { key: 'yield', label: 'Yield %', align: 'right', render: r => `${r.overall_yield_pct.toFixed(1)}%`, exportKey: r => r.overall_yield_pct },
    { key: 'po_complete', label: 'PO Complete', render: r => r.marks_po_complete ? <Badge variant="default" className="text-[10px]">Yes</Badge> : <Badge variant="outline" className="text-[10px]">No</Badge>, exportKey: r => r.marks_po_complete ? 'Yes' : 'No' },
    { key: 'status', label: 'Status', render: r => <Badge variant="outline" className="text-[10px]">{STATUS_LABELS[r.status]}</Badge>, exportKey: 'status' },
  ];

  const statusOptions: StatusOption[] = (Object.keys(STATUS_LABELS) as ProductionConfirmationStatus[])
    .map(s => ({ value: s, label: STATUS_LABELS[s] }));

  const summaryBuilder = (f: ProductionConfirmation[]): SummaryCard[] => {
    const actual = f.reduce((a, r) => a + r.total_actual_qty, 0);
    const planned = f.reduce((a, r) => a + r.total_planned_qty, 0);
    const avgYield = f.length > 0 ? f.reduce((a, r) => a + r.overall_yield_pct, 0) / f.length : 0;
    const poComplete = f.filter(r => r.marks_po_complete).length;
    return [
      { label: 'Total Confirmations', value: String(f.length) },
      { label: 'Total Actual Qty', value: String(actual), tone: 'positive' },
      { label: 'Total Planned Qty', value: String(planned) },
      { label: 'Avg Yield %', value: `${avgYield.toFixed(1)}%`, tone: avgYield >= 95 ? 'positive' : 'warning' },
      { label: 'Marks PO Complete', value: `${poComplete} / ${f.length}` },
    ];
  };

  return (
    <div className="max-w-7xl mx-auto space-y-4 p-6">
      <UniversalRegisterGrid<ProductionConfirmation>
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
          {selected && <ProductionConfirmationDetailPanel confirmation={selected} onPrint={() => setPrinting(selected)} />}
        </DialogContent>
      </Dialog>
      <Dialog open={!!printing} onOpenChange={o => !o && setPrinting(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          {printing && <ProductionConfirmationPrint confirmation={printing} onClose={() => setPrinting(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ProductionConfirmationRegisterPanel;
